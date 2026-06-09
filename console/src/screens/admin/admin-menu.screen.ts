import { display, formatDateTime } from '../../utils/display.util';
import { prompt } from '../../utils/input.util';
import { sessionStore } from '../../services/session.store';
import { ManageUsersScreen } from './manage-users.screen';
import { ManageEmployeesScreen } from './manage-employees.screen';
import { ManageProjectsScreen } from './manage-projects.screen';
import { ViewAllocationsScreen } from './view-allocations.screen';

export const AdminMenuScreen = {
    async show(username: string): Promise<void> {
        let running = true;

        while (running) {
            display.header('ADMIN PANEL', `Welcome, ${username}  |  ${formatDateTime()}`);
            console.log('\n1. Manage Employees');
            console.log('2. Manage Projects');
            console.log('3. View All Allocations');
            console.log('4. Manage Users');
            console.log('5. System Configuration');
            console.log('6. Logout\n');

            const option = await prompt('Enter option');

            switch (option) {
                case '1':
                    await ManageEmployeesScreen.show();
                    break;
                case '2':
                    await ManageProjectsScreen.show();
                    break;
                case '3':
                    await ViewAllocationsScreen.show();
                    break;
                case '4':
                    await ManageUsersScreen.show();
                    break;
                case '5':
                    console.log('\nComing soon...\n');
                    break;
                case '6':
                    sessionStore.clearToken();
                    console.log('Logged out.');
                    running = false;
                    break;
                default:
                    console.log('Invalid option. Please try again.');
            }
        }
    },
};
