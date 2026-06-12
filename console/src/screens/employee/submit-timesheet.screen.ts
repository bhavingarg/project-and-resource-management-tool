import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { parseInputDate, formatDisplayDate, getLastWeekMonday } from '../../utils/date.util';
import { timesheetApiService } from '../../services/timesheet.service';
import { ActiveAllocationForWeekDto, SubmitTimesheetEntryDto } from '../../models/timesheet.dto';

const MAX_WEEKLY_HOURS = 40;

const ACTIVITY_TAGS = [
    'Backend API Development',
    'Microservices / Architecture',
    'Database Design & Queries',
    'WebSocket / Real-time Features',
    'Frontend Development',
    'Code Review / Mentoring',
    'Bug Fixing',
    'DevOps / Deployment',
    'Testing & QA',
    'Documentation',
];

const selectTags = async (): Promise<string[]> => {
    console.log('\n    What did you work on? Select activity tags:');
    ACTIVITY_TAGS.forEach((tag, i) => {
        console.log(`      ${String(i + 1).padEnd(3)} ${tag}`);
    });
    console.log(`      ${String(ACTIVITY_TAGS.length + 1).padEnd(3)} Other (type manually)`);

    const input = (await prompt('    Select tags (comma-separated numbers, or Enter to skip): ')).trim();
    if (!input) return [];

    const tags: string[] = [];
    for (const part of input.split(',')) {
        const n = Number(part.trim());
        if (n >= 1 && n <= ACTIVITY_TAGS.length) {
            tags.push(ACTIVITY_TAGS[n - 1]);
        } else if (n === ACTIVITY_TAGS.length + 1) {
            const custom = (await prompt('    Enter custom tag: ')).trim();
            if (custom) tags.push(custom);
        }
    }
    return [...new Set(tags)];
};

const collectEntries = async (
    allocations: ActiveAllocationForWeekDto[],
): Promise<SubmitTimesheetEntryDto[] | null> => {
    const entries: SubmitTimesheetEntryDto[] = [];
    for (let i = 0; i < allocations.length; i++) {
        const alloc = allocations[i];
        const maxHrs = ((alloc.utilisationPercent / 100) * MAX_WEEKLY_HOURS).toFixed(1);

        console.log(`\n  ${'─'.repeat(50)}`);
        console.log(`  PROJECT ${i + 1} OF ${allocations.length}  —  ${alloc.projectName}`);
        console.log(`    Allocation: ${alloc.utilisationPercent}%   |   Expected: ${maxHrs} hrs max`);
        console.log(`  ${'─'.repeat(50)}`);

        const hrsInput = (await prompt('  Hours worked this week: ')).trim();
        const hoursWorked = Number(hrsInput);
        if (Number.isNaN(hoursWorked) || hoursWorked < 0) {
            console.log('\n  Invalid hours. Cancelling.');
            return null;
        }

        const tags = await selectTags();
        entries.push({ allocationId: alloc.allocationId, hoursWorked, tags });
    }
    return entries;
};

export const SubmitTimesheetScreen = {
    async show(username: string): Promise<void> {
        display.header('Submit Timesheet');
        console.log(`\n  Resource: ${username}`);

        const weekInput = (await prompt('  Week start (DD-MM-YYYY) or Enter for last Monday: ')).trim();
        const weekStartDate = weekInput ? parseInputDate(weekInput) : getLastWeekMonday();

        if (!weekStartDate) {
            console.log('  Invalid date format. Use DD-MM-YYYY.');
            await prompt('\n  Press Enter to continue...');
            return;
        }

        let allocations: ActiveAllocationForWeekDto[];
        try {
            allocations = await timesheetApiService.getActiveAllocationsForWeek(weekStartDate);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue...');
            return;
        }

        if (allocations.length === 0) {
            console.log(`\n  No active allocations found for week ${formatDisplayDate(weekStartDate)}.`);
            await prompt('\n  Press Enter to continue...');
            return;
        }

        const entries = await collectEntries(allocations);
        if (!entries) {
            await prompt('\n  Press Enter to continue...');
            return;
        }

        // Show summary
        console.log(`\n  ${'─'.repeat(50)}`);
        console.log('  SUMMARY');
        console.log(`  ${'─'.repeat(50)}`);
        let totalHours = 0;
        for (const entry of entries) {
            const alloc = allocations.find((a) => a.allocationId === entry.allocationId)!;
            const tagLabel = entry.tags.length > 0 ? `[${entry.tags.join(', ')}]` : '(no tags)';
            console.log(
                `  ${alloc.projectName.padEnd(22)} ${String(entry.hoursWorked).padStart(5)} hrs   ${tagLabel}`,
            );
            totalHours += entry.hoursWorked;
        }
        console.log(`  ${'─'.repeat(50)}`);
        console.log(`  Total: ${totalHours} / ${MAX_WEEKLY_HOURS} hrs max`);

        console.log('\n  [S] Submit     [B] Back');
        const confirm = (await prompt('  Select: ')).trim().toUpperCase();
        if (confirm !== 'S') {
            console.log('  Cancelled.');
            await prompt('\n  Press Enter to continue...');
            return;
        }

        try {
            await timesheetApiService.submitTimesheet({ weekStartDate, entries });
            console.log('\n  Timesheet submitted successfully.');
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }
        await prompt('\n  Press Enter to continue...');
    },
};
