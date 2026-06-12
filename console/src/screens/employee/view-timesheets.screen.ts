import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { formatDisplayDate } from '../../utils/date.util';
import { timesheetApiService } from '../../services/timesheet.service';
import { TimesheetSummaryDto } from '../../models/timesheet.dto';

const SEP = `  ${'─'.repeat(50)}`;

const printSummaryTable = (timesheets: TimesheetSummaryDto[]): void => {
    console.log(`\n${SEP}`);
    console.log(`  ${'Week Start'.padEnd(14)} ${'Total Hrs'.padEnd(12)} Status`);
    console.log(SEP);
    for (const ts of timesheets) {
        const flag = ts.status === 'MISSED' ? '  ⚠' : '';
        console.log(
            `  ${formatDisplayDate(ts.weekStartDate).padEnd(14)} ${`${ts.totalHours} hrs`.padEnd(12)} ${ts.status}${flag}`,
        );
    }
    console.log(SEP);
};

export const ViewTimesheetsScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('My Timesheets');

            let timesheets: TimesheetSummaryDto[];
            try {
                timesheets = await timesheetApiService.getMyTimesheets();
            } catch (error) {
                console.log(`\n  Error: ${extractErrorMessage(error)}`);
                await prompt('\n  Press Enter to continue...');
                return;
            }

            if (timesheets.length === 0) {
                console.log('\n  No timesheets found.');
                await prompt('\n  Press Enter to continue...');
                return;
            }

            printSummaryTable(timesheets);

            console.log('\n  [V] View week details     [B] Back');
            const choice = (await prompt('  Select: ')).trim().toUpperCase();

            if (choice === 'B') return;

            if (choice === 'V') {
                const submitted = timesheets.filter((ts) => ts.status === 'SUBMITTED');
                if (submitted.length === 0) {
                    console.log('\n  No submitted timesheets to view.');
                    continue;
                }

                console.log('\n  Submitted weeks:');
                submitted.forEach((ts, i) => {
                    console.log(`    ${i + 1}. ${formatDisplayDate(ts.weekStartDate)}`);
                });

                const input = (await prompt('  Select week (#): ')).trim();
                const index = Number(input) - 1;
                if (Number.isNaN(index) || index < 0 || index >= submitted.length) {
                    console.log('  Invalid selection.');
                    continue;
                }

                try {
                    const detail = await timesheetApiService.getMyWeekDetail(submitted[index].weekStartDate);
                    display.header(`Week: ${formatDisplayDate(detail.weekStartDate)}`);
                    console.log(`\n  Status: ${detail.status}    Total: ${detail.totalHours} hrs`);
                    console.log(`\n${SEP}`);
                    console.log(`  ${'Project'.padEnd(24)} ${'Hrs'.padEnd(6)} Activity Tags`);
                    console.log(SEP);
                    for (const entry of detail.entries) {
                        const tags = entry.tags.length > 0 ? entry.tags.join(', ') : '(none)';
                        console.log(`  ${entry.projectName.padEnd(24)} ${String(entry.hoursWorked).padEnd(6)} ${tags}`);
                    }
                    console.log(SEP);
                } catch (error) {
                    console.log(`\n  Error: ${extractErrorMessage(error)}`);
                }
                await prompt('\n  Press Enter to continue...');
            }
        }
    },
};
