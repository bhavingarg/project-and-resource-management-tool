import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { parseInputDate, formatDisplayDate } from '../../utils/date.util';
import { managerApiService } from '../../services/manager.service';
import { allocationApiService } from '../../services/allocation.service';
import { aiApiService } from '../../services/ai.service';
import { ManagerProjectDto } from '../../models/manager.dto';
import { ProjectAllocationDto } from '../../models/allocation.dto';
import { SkillMatchResultDto } from '../../models/ai.dto';

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

const setAndConfirmAllocation = async (projectId: number, resourceUserId: number): Promise<void> => {
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

    await allocationApiService.createAllocation({ resourceUserId, projectId, utilisationPercent, fromDate, toDate });
    console.log('\n  Allocation saved. ✓');
};

const wrapReason = (text: string): string => {
    const indent = ' '.repeat(20);
    const width = 58;
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        if (current.length + word.length + 1 > width && current.length > 0) {
            lines.push(current);
            current = word;
        } else {
            current = current.length > 0 ? `${current} ${word}` : word;
        }
    }
    if (current.length > 0) lines.push(current);
    return lines.join(`\n${indent}`);
};

const printAiMatches = (matches: SkillMatchResultDto[]): void => {
    console.log('\n  ┌─────────────────────────────────────────────────────┐');
    console.log('  │              AI Recommended Resources               │');
    console.log('  └─────────────────────────────────────────────────────┘');
    matches.forEach((match, i) => {
        const availBar = '█'.repeat(Math.round(match.freePercent / 10)) + '░'.repeat(10 - Math.round(match.freePercent / 10));
        console.log(`\n  ${i + 1}. ${match.fullName}`);
        console.log(`     Availability : ${availBar} ${match.freePercent}% free`);
        console.log(`     Manager      : ${match.currentManager ?? '(unassigned)'}`);
        console.log(`     Skills       : ${wrapReason(match.skills.length > 0 ? match.skills.join(', ') : '(none listed)')}`);
        console.log(`     Reason       : ${wrapReason(match.reason)}`);
    });
    console.log('\n  ─────────────────────────────────────────────────────');
};

const findResourceWithAiFlow = async (): Promise<void> => {
    const project = await selectProject();
    if (!project) return;

    console.log('\n  Describe your requirement (e.g. "Java backend developer for 3 months"):');
    const requirement = (await prompt('  > ')).trim();
    if (!requirement) {
        console.log('  Requirement cannot be empty.');
        return;
    }

    console.log('\n  Asking AI...');
    let result;
    try {
        result = await aiApiService.skillMatch(requirement, project.name);
    } catch (error) {
        console.log(`\n  Error: ${extractErrorMessage(error)}`);
        return;
    }

    if (result.matches.length === 0) {
        console.log('\n  No team members currently have free capacity.');
        return;
    }

    printAiMatches(result.matches);
    const selection = (await prompt('\n  Select employee (enter #, or 0 to cancel)')).trim();
    const index = Number(selection) - 1;
    if (Number.isNaN(index) || index < 0 || index >= result.matches.length) {
        console.log('  Cancelled.');
        return;
    }

    const match = result.matches[index];
    console.log(`\n  ── ${match.fullName} (${match.freePercent}% free) ──`);
    await setAndConfirmAllocation(project.id, match.userId);
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
            `  ${String(index + 1).padEnd(4)} ${allocation.resourceName.padEnd(18)} ` +
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
    console.log(`\n  End ${target.resourceName}'s allocation on ${project.name}?`);
    console.log('  [Y] Yes, End Now    [B] Cancel');
    const confirm = (await prompt('  Select')).trim().toUpperCase();
    if (confirm !== 'Y') {
        console.log('  Cancelled.');
        return;
    }

    await allocationApiService.endAllocation(target.id);
    console.log(`\n  Allocation ended. ${target.resourceName} freed from ${project.name}. ✓`);
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
