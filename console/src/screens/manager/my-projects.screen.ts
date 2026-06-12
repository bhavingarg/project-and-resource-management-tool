import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { formatDisplayDate } from '../../utils/date.util';
import { managerApiService } from '../../services/manager.service';
import { ManagerProjectDto, ManagerProjectDetailDto } from '../../models/manager.dto';
import { formatHealth } from './manager-format';

const printProjectsList = (projects: ManagerProjectDto[]): void => {
    console.log(`\n  ${'#'.padEnd(4)} ${'Project'.padEnd(20)} ${'End Date'.padEnd(12)} Health`);
    console.log(`  ${'─'.repeat(56)}`);
    projects.forEach((project, index) => {
        console.log(
            `  ${String(index + 1).padEnd(4)} ${project.name.padEnd(20)} ` +
            `${formatDisplayDate(project.endDate).padEnd(12)} ${formatHealth(project.health)}`,
        );
    });
};

const printProjectDetail = (detail: ManagerProjectDetailDto): void => {
    console.log(`\n  ── ${detail.name} ${'─'.repeat(Math.max(0, 38 - detail.name.length))}`);
    console.log(`  Health Status : ${formatHealth(detail.health)}`);

    console.log('\n  Milestones:');
    if (detail.milestones.length === 0) {
        console.log('    (none)');
    } else {
        console.log(`    ${'Title'.padEnd(20)} ${'Due Date'.padEnd(12)} Status`);
        for (const milestone of detail.milestones) {
            const overdueMark = milestone.isOverdue ? '  ⚠ OVERDUE' : '';
            console.log(`    ${milestone.title.padEnd(20)} ${formatDisplayDate(milestone.dueDate).padEnd(12)} ${milestone.status}${overdueMark}`);
        }
    }

    console.log('\n  Allocated Resources:');
    if (detail.allocatedResources.length === 0) {
        console.log('    (none)');
    } else {
        console.log(`    ${'Name'.padEnd(18)} ${'%'.padEnd(5)} ${'From'.padEnd(12)} To`);
        for (const resource of detail.allocatedResources) {
            console.log(
                `    ${resource.resourceName.padEnd(18)} ${`${resource.utilisationPercent}%`.padEnd(5)} ` +
                `${formatDisplayDate(resource.fromDate).padEnd(12)} ${formatDisplayDate(resource.toDate)}`,
            );
        }
    }
};

const showProjectDetail = async (projectId: number): Promise<void> => {
    let detail: ManagerProjectDetailDto;
    try {
        detail = await managerApiService.getProjectDetail(projectId);
    } catch (error) {
        console.log(`\n  Error: ${extractErrorMessage(error)}`);
        await prompt('\n  Press Enter to continue');
        return;
    }

    while (true) {
        printProjectDetail(detail);
        console.log('\n  [A] Get AI Risk Summary     [B] Back');
        const choice = (await prompt('  Select')).trim().toUpperCase();

        if (choice === 'B') return;
        if (choice === 'A') {
            console.log('\n  AI Risk Summary will be available with the AI Assistant feature.');
            await prompt('\n  Press Enter to continue');
        } else {
            console.log('  Invalid option.');
        }
    }
};

export const MyProjectsScreen = {
    async show(): Promise<void> {
        display.header('My Projects');

        let projects: ManagerProjectDto[];
        try {
            projects = await managerApiService.getProjects();
        } catch (error) {
            console.log(`  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue');
            return;
        }

        if (projects.length === 0) {
            console.log('  You have no projects.');
            await prompt('\n  Press Enter to continue');
            return;
        }

        while (true) {
            display.header('My Projects');
            printProjectsList(projects);

            console.log('\n  Enter project number to view details, or [B] Back');
            const choice = (await prompt('  Select')).trim().toUpperCase();

            if (choice === 'B') return;

            const index = Number(choice) - 1;
            if (Number.isNaN(index) || index < 0 || index >= projects.length) {
                console.log('  Invalid selection.');
                continue;
            }
            await showProjectDetail(projects[index].id);
        }
    },
};
