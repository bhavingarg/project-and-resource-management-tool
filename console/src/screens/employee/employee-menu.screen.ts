import { display, formatDateTime } from '../../utils/display.util';
import { prompt } from '../../utils/input.util';
import { sessionStore } from '../../services/session.store';
import { formatDisplayDate } from '../../utils/date.util';
import { timesheetApiService } from '../../services/timesheet.service';
import { SubmitTimesheetScreen } from './submit-timesheet.screen';
import { ViewTimesheetsScreen } from './view-timesheets.screen';
import { ViewAllocationsScreen } from './view-allocations.screen';

const printTimesheetReminder = async (): Promise<void> => {
    try {
        const reminder = await timesheetApiService.getReminder();
        if (reminder.isMissing) {
            console.log(
                `\n  ⚠  Reminder: Timesheet for week ${formatDisplayDate(reminder.weekStartDate)} has not been submitted.`,
            );
        }
    } catch {
        // Non-critical — never block menu on reminder failure
    }
};

export const EmployeeMenuScreen = {
    async show(username: string): Promise<void> {
        let running = true;

        while (running) {
            display.header(`Welcome, ${username}!  |  ${formatDateTime()}`);
            await printTimesheetReminder();
            console.log('\n1. Submit Timesheet');
            console.log('2. View My Timesheets');
            console.log('3. View My Allocations');
            console.log('4. Logout\n');

            const option = await prompt('Enter option');

            switch (option) {
                case '1':
                    await SubmitTimesheetScreen.show(username);
                    break;
                case '2':
                    await ViewTimesheetsScreen.show();
                    break;
                case '3':
                    await ViewAllocationsScreen.show();
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
