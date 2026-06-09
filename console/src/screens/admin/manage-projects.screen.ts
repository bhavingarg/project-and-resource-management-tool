import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { CreateProjectScreen } from './manage-projects/create-project.screen';
import { ViewProjectsScreen } from './manage-projects/view-projects.screen';
import { UpdateProjectScreen } from './manage-projects/update-project.screen';
import { ManageMilestonesScreen } from './manage-projects/manage-milestones.screen';

const MENU_ITEMS = [
    '1. Create Project',
    '2. View All Projects',
    '3. Update Project Details',
    '4. Manage Milestones',
    '5. Back',
] as const;

export const ManageProjectsScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('Manage Projects');
            for (const item of MENU_ITEMS) {
                console.log(`  ${item}`);
            }

            const choice = (await prompt('\n  Enter option')).trim();

            switch (choice) {
                case '1':
                    await CreateProjectScreen.show();
                    break;
                case '2':
                    await ViewProjectsScreen.show();
                    break;
                case '3':
                    await UpdateProjectScreen.show();
                    break;
                case '4':
                    await ManageMilestonesScreen.show();
                    break;
                case '5':
                    return;
                default:
                    console.log('  Invalid option. Please try again.');
            }
        }
    },
};
