import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { formatDisplayDate } from '../../../utils/date.util';
import { projectApiService } from '../../../services/project.service';
import { ProjectSummaryDto } from '../../../models/project.dto';

const printProjectsTable = (projects: ProjectSummaryDto[]): void => {
    const separator = `  ${'─'.repeat(76)}`;
    console.log(separator);
    console.log(
        `  ${'ID'.padEnd(5)} ${'Name'.padEnd(18)} ${'Manager'.padEnd(15)} ` +
        `${'End Date'.padEnd(12)} ${'Status'.padEnd(10)} SP Done/Total`,
    );
    console.log(separator);
    for (const project of projects) {
        const storyPoints = `${project.storyPointsDone} / ${project.totalStoryPoints}`;
        console.log(
            `  ${String(project.id).padEnd(5)} ${project.name.padEnd(18)} ` +
            `${project.managerName.padEnd(15)} ${formatDisplayDate(project.endDate).padEnd(12)} ` +
            `${project.status.padEnd(10)} ${storyPoints}`,
        );
    }
    console.log(separator);
};

export const ViewProjectsScreen = {
    async show(): Promise<void> {
        display.header('All Projects');

        try {
            const projects = await projectApiService.getAllProjects();
            if (projects.length === 0) {
                console.log('  No projects found.');
            } else {
                printProjectsTable(projects);
            }
        } catch (error) {
            console.log(`  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  [B] Back');
    },
};
