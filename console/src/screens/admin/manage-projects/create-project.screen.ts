import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { parseInputDate } from '../../../utils/date.util';
import { projectApiService } from '../../../services/project.service';
import { CreateProjectRequestDto, ProjectStatus } from '../../../models/project.dto';
import { PROJECT_STATUS_MAP, CREATE_STATUS_PROMPT } from './project-options';

const CREATE_STATUS_KEYS = ['1', '2', '3'];

export const CreateProjectScreen = {
    async show(): Promise<void> {
        display.header('Create Project');

        const name = (await prompt('  Project Name       ')).trim();
        if (!name) {
            console.log('  Project name is required.');
            await prompt('\n  Press Enter to continue');
            return;
        }

        const description = (await prompt('  Description        ')).trim();

        const startInput = (await prompt('  Start Date (DD-MM-YYYY)')).trim();
        const startDate = parseInputDate(startInput);
        if (!startDate) {
            console.log('  Invalid start date. Use DD-MM-YYYY.');
            await prompt('\n  Press Enter to continue');
            return;
        }

        const endInput = (await prompt('  End Date (DD-MM-YYYY)')).trim();
        const endDate = parseInputDate(endInput);
        if (!endDate) {
            console.log('  Invalid end date. Use DD-MM-YYYY.');
            await prompt('\n  Press Enter to continue');
            return;
        }

        console.log(`  Status             : ${CREATE_STATUS_PROMPT}`);
        const statusChoice = (await prompt('  Enter choice       ')).trim();
        if (!CREATE_STATUS_KEYS.includes(statusChoice)) {
            console.log('  Invalid status.');
            await prompt('\n  Press Enter to continue');
            return;
        }
        const status: ProjectStatus = PROJECT_STATUS_MAP[statusChoice];

        const managerInput = (await prompt('  Assign Manager (User ID)')).trim();
        const managerId = Number(managerInput);
        if (!managerInput || Number.isNaN(managerId)) {
            console.log('  A valid manager ID is required.');
            await prompt('\n  Press Enter to continue');
            return;
        }

        const storyPointsInput = (await prompt('  Total Story Points ')).trim();
        const totalStoryPoints = Number(storyPointsInput);
        if (Number.isNaN(totalStoryPoints) || totalStoryPoints < 0) {
            console.log('  Total story points must be a non-negative number.');
            await prompt('\n  Press Enter to continue');
            return;
        }

        const dto: CreateProjectRequestDto = {
            name,
            startDate,
            endDate,
            status,
            managerId,
            totalStoryPoints,
        };
        if (description) dto.description = description;

        try {
            await projectApiService.createProject(dto);
            console.log(`\n  Project '${name}' created. ✓`);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue');
    },
};
