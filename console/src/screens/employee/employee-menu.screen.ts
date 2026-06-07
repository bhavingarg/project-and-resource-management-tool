import { display, formatDateTime } from '../../utils/display.util';
import { prompt } from '../../utils/input.util';
import { sessionStore } from '../../services/session.store';

export const EmployeeMenuScreen = {
    async show(username: string): Promise<void> {
        let running = true;

        while (running) {
            display.header(`Welcome, ${username}!  |  ${formatDateTime()}`);
            console.log('\n1. Submit Timesheet');
            console.log('2. View My Timesheets');
            console.log('3. View My Allocations');
            console.log('4. Logout\n');

            const option = await prompt('Enter option');

            switch (option) {
                case '1':
                case '2':
                case '3':
                    console.log('\nComing soon...\n');
                    break;
                case '4':
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
