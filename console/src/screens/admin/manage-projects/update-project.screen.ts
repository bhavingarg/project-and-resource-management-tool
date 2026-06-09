import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { parseInputDate, formatDisplayDate } from '../../../utils/date.util';
import { projectApiService } from '../../../services/project.service';
import { UpdateProjectRequestDto, ProjectDetailDto } from '../../../models/project.dto';
import { PROJECT_STATUS_MAP, UPDATE_STATUS_PROMPT } from './project-options';

const promptOptionalDate = async (label: string): Promise<string | null | undefined> => {
    const input = (await prompt(label)).trim();
    if (!input) return undefined;
    const parsed = parseInputDate(input);
    return parsed === null ? null : parsed;
};

const buildUpdateDto = async (project: ProjectDetailDto): Promise<UpdateProjectRequestDto | null> => {
    const dto: UpdateProjectRequestDto = {};

    const name = (await prompt(`  Project Name [${project.name}]`)).trim();
    if (name) dto.name = name;

    const description = (await prompt(`  Description [${project.description ?? ''}]`)).trim();
    if (description) dto.description = description;

    const startDate = await promptOptionalDate(`  Start Date [${formatDisplayDate(project.startDate)}] (DD-MM-YYYY)`);
    if (startDate === null) {
        console.log('  Invalid start date. Use DD-MM-YYYY.');
        return null;
    }
    if (startDate) dto.startDate = startDate;

    const endDate = await promptOptionalDate(`  End Date [${formatDisplayDate(project.endDate)}] (DD-MM-YYYY)`);
    if (endDate === null) {
        console.log('  Invalid end date. Use DD-MM-YYYY.');
        return null;
    }
    if (endDate) dto.endDate = endDate;

    console.log(`  Status [${project.status}] : ${UPDATE_STATUS_PROMPT}`);
    const statusChoice = (await prompt('  Enter choice (or Enter to keep)')).trim();
    if (statusChoice) {
        const status = PROJECT_STATUS_MAP[statusChoice];
        if (!status) {
            console.log('  Invalid status.');
            return null;
        }
        dto.status = status;
    }

    const managerInput = (await prompt(`  Assign Manager (User ID) [${project.managerId}]`)).trim();
    if (managerInput) {
        const managerId = Number(managerInput);
        if (Number.isNaN(managerId)) {
            console.log('  Manager ID must be a number.');
            return null;
        }
        dto.managerId = managerId;
    }

    const storyPointsInput = (await prompt(`  Total Story Points [${project.totalStoryPoints}]`)).trim();
    if (storyPointsInput) {
        const totalStoryPoints = Number(storyPointsInput);
        if (Number.isNaN(totalStoryPoints) || totalStoryPoints < 0) {
            console.log('  Total story points must be a non-negative number.');
            return null;
        }
        dto.totalStoryPoints = totalStoryPoints;
    }

    return dto;
};

export const UpdateProjectScreen = {
    async show(): Promise<void> {
        display.header('Update Project Details');

        const idInput = (await prompt('  Enter Project ID')).trim();
        if (!idInput) return;

        try {
            const project = await projectApiService.getProject(Number(idInput));

            console.log(`\n  ── ${project.name} ${'─'.repeat(Math.max(0, 38 - project.name.length))}`);
            console.log('  (Press Enter to keep current value)\n');

            const dto = await buildUpdateDto(project);
            if (dto === null) {
                await prompt('\n  Press Enter to continue');
                return;
            }

            if (Object.keys(dto).length === 0) {
                console.log('\n  No changes made.');
            } else {
                await projectApiService.updateProject(project.id, dto);
                console.log('\n  Project updated. ✓');
            }
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue');
    },
};
