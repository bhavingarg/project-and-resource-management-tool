import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { parseInputDate, formatDisplayDate } from '../../../utils/date.util';
import { projectApiService } from '../../../services/project.service';
import { MilestoneSummaryDto, MilestoneDto } from '../../../models/project.dto';
import { MILESTONE_STATUS_MAP, MILESTONE_STATUS_PROMPT } from './project-options';

const printMilestonesTable = (summary: MilestoneSummaryDto): void => {
    const separator = `  ${'─'.repeat(56)}`;
    console.log(separator);
    console.log(`  ${'#'.padEnd(4)} ${'Title'.padEnd(20)} ${'Due Date'.padEnd(12)} ${'Story Pts'.padEnd(10)} Status`);
    console.log(separator);
    summary.milestones.forEach((milestone, index) => {
        console.log(
            `  ${String(index + 1).padEnd(4)} ${milestone.title.padEnd(20)} ` +
            `${formatDisplayDate(milestone.dueDate).padEnd(12)} ${String(milestone.storyPoints).padEnd(10)} ${milestone.status}`,
        );
    });
    console.log(separator);
    console.log(
        `  Total: ${summary.totalStoryPoints} SP   |   ` +
        `Completed: ${summary.completedStoryPoints} SP   |   ` +
        `Remaining: ${summary.remainingStoryPoints} SP`,
    );
};

const addMilestoneFlow = async (projectId: number): Promise<void> => {
    const title = (await prompt('  Milestone Title ')).trim();
    if (!title) {
        console.log('  Title is required.');
        return;
    }

    const dueInput = (await prompt('  Due Date (DD-MM-YYYY)')).trim();
    const dueDate = parseInputDate(dueInput);
    if (!dueDate) {
        console.log('  Invalid due date. Use DD-MM-YYYY.');
        return;
    }

    const storyPointsInput = (await prompt('  Story Points    ')).trim();
    const storyPoints = Number(storyPointsInput);
    if (Number.isNaN(storyPoints) || storyPoints < 0) {
        console.log('  Story points must be a non-negative number.');
        return;
    }

    await projectApiService.addMilestone(projectId, { title, dueDate, storyPoints });
    console.log('\n  Milestone added. ✓');
};

const updateMilestoneStatusFlow = async (projectId: number, milestones: MilestoneDto[]): Promise<void> => {
    if (milestones.length === 0) {
        console.log('  No milestones to update.');
        return;
    }

    const numberInput = (await prompt('  Enter Milestone #')).trim();
    const index = Number(numberInput) - 1;
    if (Number.isNaN(index) || index < 0 || index >= milestones.length) {
        console.log('  Invalid selection.');
        return;
    }

    console.log(`  New Status : ${MILESTONE_STATUS_PROMPT}`);
    const statusChoice = (await prompt('  Enter choice')).trim();
    const status = MILESTONE_STATUS_MAP[statusChoice];
    if (!status) {
        console.log('  Invalid status.');
        return;
    }

    await projectApiService.updateMilestoneStatus(projectId, milestones[index].id, { status });
    console.log('\n  Milestone updated. ✓');
};

export const ManageMilestonesScreen = {
    async show(): Promise<void> {
        display.header('Milestones');

        const idInput = (await prompt('  Enter Project ID')).trim();
        if (!idInput) return;
        const projectId = Number(idInput);

        let project;
        try {
            project = await projectApiService.getProject(projectId);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue');
            return;
        }

        console.log(`\n  ── ${project.name} ${'─'.repeat(Math.max(0, 38 - project.name.length))}`);

        while (true) {
            let summary: MilestoneSummaryDto;
            try {
                summary = await projectApiService.getMilestones(projectId);
            } catch (error) {
                console.log(`\n  Error: ${extractErrorMessage(error)}`);
                await prompt('\n  Press Enter to continue');
                return;
            }

            if (summary.milestones.length === 0) {
                console.log('  No milestones yet.');
            } else {
                printMilestonesTable(summary);
            }

            console.log('\n  1. Add Milestone');
            console.log('  2. Update Milestone Status');
            console.log('  3. Back');

            const choice = (await prompt('\n  Enter option')).trim();
            try {
                if (choice === '1') {
                    await addMilestoneFlow(projectId);
                } else if (choice === '2') {
                    await updateMilestoneStatusFlow(projectId, summary.milestones);
                } else if (choice === '3') {
                    return;
                } else {
                    console.log('  Invalid option.');
                }
            } catch (error) {
                console.log(`  Error: ${extractErrorMessage(error)}`);
            }

            await prompt('\n  Press Enter to continue');
        }
    },
};
