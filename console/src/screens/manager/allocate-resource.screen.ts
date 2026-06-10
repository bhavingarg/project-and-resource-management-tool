import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { parseInputDate, formatDisplayDate } from '../../utils/date.util';
import { managerApiService } from '../../services/manager.service';
import { allocationApiService } from '../../services/allocation.service';
import { ManagerProjectDto, TeamMemberDto } from '../../models/manager.dto';
import { ProjectAllocationDto } from '../../models/allocation.dto';

const MENU_ITEMS = [
    '1. Find resource using AI (recommended)',
    '2. Allocate directly (I already know who I want)',
    '3. End an existing allocation',
    '4. Back',
] as const;

const selectProject = async (): Promise<ManagerProjectDto | null> => {
    const projects = await managerApiService.getProjects();
    if (projects.length === 0) {
        console.log('  You have no projects to allocate to.');
        return null;
    }

    console.log('\n  Your Projects:');
    for (const project of projects) {
        console.log(`    ${project.id}. ${project.name}  (${project.status})`);
    }

    const idInput = (await prompt('\n  Enter Project ID')).trim();
    const project = projects.find((entry) => entry.id === Number(idInput));
    if (!project) {
        console.log('  Invalid project selection.');
        return null;
    }
    return project;
};

const setAndConfirmAllocation = async (projectId: number, employeeUserId: number): Promise<void> => {
    const utilisationInput = (await prompt('  Utilisation %  ')).trim();
    const utilisationPercent = Number(utilisationInput);
    if (Number.isNaN(utilisationPercent) || utilisationPercent < 1 || utilisationPercent > 100) {
        console.log('  Utilisation must be between 1 and 100.');
        return;
    }

    const fromInput = (await prompt('  From Date (DD-MM-YYYY)')).trim();
    const fromDate = parseInputDate(fromInput);
    if (!fromDate) {
        console.log('  Invalid from date. Use DD-MM-YYYY.');
        return;
    }

    const toInput = (await prompt('  To Date (DD-MM-YYYY)')).trim();
    const toDate = parseInputDate(toInput);
    if (!toDate) {
        console.log('  Invalid to date. Use DD-MM-YYYY.');
        return;
    }

    console.log('\n  [C] Confirm Allocation     [B] Cancel');
    const confirm = (await prompt('  Select')).trim().toUpperCase();
    if (confirm !== 'C') {
        console.log('  Cancelled.');
        return;
    }

    await allocationApiService.createAllocation({ employeeUserId, projectId, utilisationPercent, fromDate, toDate });
    console.log('\n  Allocation saved. ✓');
};

const printCandidates = (candidates: TeamMemberDto[]): void => {
    console.log('\n  ──────────────────────────────────────────────');
    console.log('  AVAILABLE TEAM RESOURCES');
    console.log('  (AI-assisted ranking arrives with the AI Assistant feature)');
    console.log('  ──────────────────────────────────────────────');
    console.log(`  ${'#'.padEnd(4)} ${'ID'.padEnd(6)} ${'Name'.padEnd(18)} ${'Free'.padEnd(8)} Skills`);
    candidates.forEach((member, index) => {
        const free = `${100 - member.utilisationPercent}%`;
        const skills = member.skills.length > 0 ? member.skills.join(', ') : '(none)';
        console.log(`  ${String(index + 1).padEnd(4)} ${String(member.userId).padEnd(6)} ${member.fullName.padEnd(18)} ${free.padEnd(8)} ${skills}`);
    });
};

const findResourceWithAiFlow = async (): Promise<void> => {
    const project = await selectProject();
    if (!project) return;

    console.log('\n  Describe your requirement (e.g. "Java backend developer for 3 months"):');
    await prompt('  > ');

    const dashboard = await managerApiService.getResourceDashboard();
    const candidates = [...dashboard.bench, ...dashboard.active]
        .filter((member) => member.utilisationPercent < 100)
        .sort((a, b) => a.utilisationPercent - b.utilisationPercent);

    if (candidates.length === 0) {
        console.log('\n  No team members currently have free capacity.');
        return;
    }

    printCandidates(candidates);
    const selection = (await prompt('\n  Select employee (enter #, or 0 to cancel)')).trim();
    const index = Number(selection) - 1;
    if (Number.isNaN(index) || index < 0 || index >= candidates.length) {
        console.log('  Cancelled.');
        return;
    }

    const member = candidates[index];
    console.log(`\n  ── ${member.fullName} (${100 - member.utilisationPercent}% free) ──`);
    await setAndConfirmAllocation(project.id, member.userId);
};

const allocateDirectlyFlow = async (): Promise<void> => {
    const project = await selectProject();
    if (!project) return;

    const idInput = (await prompt('  Enter Employee ID')).trim();
    if (!idInput) return;

    await setAndConfirmAllocation(project.id, Number(idInput));
};

const printProjectAllocations = (allocations: ProjectAllocationDto[]): void => {
    console.log('\n  Active Allocations on this project:');
    console.log(`  ${'#'.padEnd(4)} ${'Employee'.padEnd(18)} ${'%'.padEnd(5)} ${'From'.padEnd(12)} To`);
    allocations.forEach((allocation, index) => {
        console.log(
            `  ${String(index + 1).padEnd(4)} ${allocation.employeeName.padEnd(18)} ` +
            `${`${allocation.utilisationPercent}%`.padEnd(5)} ` +
            `${formatDisplayDate(allocation.fromDate).padEnd(12)} ${formatDisplayDate(allocation.toDate)}`,
        );
    });
};

const endAllocationFlow = async (): Promise<void> => {
    const project = await selectProject();
    if (!project) return;

    const allocations = await allocationApiService.getProjectAllocations(project.id);
    if (allocations.length === 0) {
        console.log('  No active allocations on this project.');
        return;
    }

    printProjectAllocations(allocations);
    const selection = (await prompt('\n  Select allocation to end (#)')).trim();
    const index = Number(selection) - 1;
    if (Number.isNaN(index) || index < 0 || index >= allocations.length) {
        console.log('  Invalid selection.');
        return;
    }

    const target = allocations[index];
    console.log(`\n  End ${target.employeeName}'s allocation on ${project.name}?`);
    console.log('  [Y] Yes, End Now    [B] Cancel');
    const confirm = (await prompt('  Select')).trim().toUpperCase();
    if (confirm !== 'Y') {
        console.log('  Cancelled.');
        return;
    }

    await allocationApiService.endAllocation(target.id);
    console.log(`\n  Allocation ended. ${target.employeeName} freed from ${project.name}. ✓`);
};

export const AllocateResourceScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('Allocate Resource');
            for (const item of MENU_ITEMS) {
                console.log(`  ${item}`);
            }

            const choice = (await prompt('\n  Enter option')).trim();
            try {
                if (choice === '1') {
                    await findResourceWithAiFlow();
                } else if (choice === '2') {
                    await allocateDirectlyFlow();
                } else if (choice === '3') {
                    await endAllocationFlow();
                } else if (choice === '4') {
                    return;
                } else {
                    console.log('  Invalid option.');
                    continue;
                }
            } catch (error) {
                console.log(`  Error: ${extractErrorMessage(error)}`);
            }

            await prompt('\n  Press Enter to continue');
        }
    },
};
