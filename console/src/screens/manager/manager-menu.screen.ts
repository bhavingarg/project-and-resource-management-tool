import { display, formatDateTime } from '../../utils/display.util';
import { prompt } from '../../utils/input.util';
import { sessionStore } from '../../services/session.store';
import { ResourceDashboardScreen } from './resource-dashboard.screen';
import { AllocateResourceScreen } from './allocate-resource.screen';
import { MyProjectsScreen } from './my-projects.screen';
import { ManagerTimesheetsScreen } from './timesheets.screen';

export const ManagerMenuScreen = {
    async show(username: string): Promise<void> {
        let running = true;

        while (running) {
            display.header(`Welcome, ${username}!  |  ${formatDateTime()}`);
            console.log('\n1. Resource Dashboard');
            console.log('2. Allocate Resource');
            console.log('3. My Projects');
            console.log('4. Timesheets');
            console.log('5. AI Assistant');
            console.log('6. Logout\n');

            const option = await prompt('Enter option');

            switch (option) {
                case '1':
                    await ResourceDashboardScreen.show();
                    break;
                case '2':
                    await AllocateResourceScreen.show();
                    break;
                case '3':
                    await MyProjectsScreen.show();
                    break;
                case '4':
                    await ManagerTimesheetsScreen.show();
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
