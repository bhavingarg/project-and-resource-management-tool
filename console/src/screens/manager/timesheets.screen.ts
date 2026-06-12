import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { parseInputDate, formatDisplayDate, getCurrentWeekMonday } from '../../utils/date.util';
import { timesheetApiService } from '../../services/timesheet.service';
import { TeamTimesheetRowDto } from '../../models/timesheet.dto';

const SEP = `  ${'─'.repeat(62)}`;

const printTeamTable = (rows: TeamTimesheetRowDto[]): void => {
    console.log(`\n${SEP}`);
    console.log(`  ${'Employee'.padEnd(20)} ${'Project'.padEnd(20)} ${'Hrs'.padEnd(6)} Status`);
    console.log(SEP);
    for (const row of rows) {
        const flag = row.status === 'MISSED' ? '  ⚠' : '';
        console.log(
            `  ${row.resourceName.padEnd(20)} ${row.projectName.padEnd(20)} ${String(row.hoursWorked).padEnd(6)} ${row.status}${flag}`,
        );
    }
    console.log(SEP);
};

export const ManagerTimesheetsScreen = {
    async show(): Promise<void> {
        let weekStartDate = getCurrentWeekMonday();

        while (true) {
            display.header('Timesheets — My Team');

            let rows: TeamTimesheetRowDto[];
            try {
                rows = await timesheetApiService.getTeamTimesheets(weekStartDate);
            } catch (error) {
                console.log(`\n  Error: ${extractErrorMessage(error)}`);
                await prompt('\n  Press Enter to continue...');
                return;
            }

            console.log(`\n  Week: ${formatDisplayDate(weekStartDate)}`);

            if (rows.length === 0) {
                console.log('\n  No allocations found for this week.');
            } else {
                printTeamTable(rows);
            }

            console.log('\n  [V] View employee detail     [R] Change week     [B] Back');
            const choice = (await prompt('  Select: ')).trim().toUpperCase();

            if (choice === 'B') return;

            if (choice === 'R') {
                const weekInput = (await prompt('  Enter week start (DD-MM-YYYY): ')).trim();
                const parsed = parseInputDate(weekInput);
                if (!parsed) {
                    console.log('  Invalid date. Use DD-MM-YYYY.');
                    continue;
                }
                weekStartDate = parsed;
                continue;
            }

            if (choice === 'V') {
                const idInput = (await prompt('  Enter Employee User ID: ')).trim();
                const userId = Number(idInput);
                if (!idInput || Number.isNaN(userId)) {
                    console.log('  Invalid user ID.');
                    continue;
                }
                try {
                    const detail = await timesheetApiService.getTeamMemberWeekDetail(userId, weekStartDate);
                    display.header(`Timesheet — Week ${formatDisplayDate(weekStartDate)}`);
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
