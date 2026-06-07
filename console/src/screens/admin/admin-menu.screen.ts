import { display, formatDateTime } from '../../utils/display.util';
import { prompt } from '../../utils/input.util';
import { sessionStore } from '../../services/session.store';
import { ManageUsersScreen } from './manage-users.screen';

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
                case '2':
                case '3':
                    console.log('\nComing soon...\n');
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
