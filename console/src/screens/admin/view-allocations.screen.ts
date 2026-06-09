import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { formatDisplayDate } from '../../utils/date.util';
import { allocationApiService } from '../../services/allocation.service';
import { AllocationSummaryDto } from '../../models/allocation.dto';

const printAllocationsTable = (allocations: AllocationSummaryDto[]): void => {
    const separator = `  ${'─'.repeat(62)}`;
    console.log(separator);
    console.log(
        `  ${'Employee'.padEnd(18)} ${'Project'.padEnd(18)} ${'%'.padEnd(5)} ` +
        `${'From'.padEnd(12)} To`,
    );
    console.log(separator);
    for (const allocation of allocations) {
        console.log(
            `  ${allocation.employeeName.padEnd(18)} ${allocation.projectName.padEnd(18)} ` +
            `${`${allocation.utilisationPercent}%`.padEnd(5)} ` +
            `${formatDisplayDate(allocation.fromDate).padEnd(12)} ${formatDisplayDate(allocation.toDate)}`,
        );
    }
    console.log(separator);
    console.log(`  Total Active Allocations: ${allocations.length}`);
};

interface FilterResult {
    allocations: AllocationSummaryDto[];
    label: string;
}

const promptValueFilter = async (
    values: string[],
    fieldLabel: string,
    select: (value: string) => AllocationSummaryDto[],
): Promise<FilterResult | null> => {
    const uniqueValues = [...new Set(values)].sort();
    if (uniqueValues.length === 0) {
        console.log(`  No ${fieldLabel} available.`);
        return null;
    }

    console.log(`\n  Filter by ${fieldLabel}:`);
    uniqueValues.forEach((value, index) => {
        console.log(`    ${index + 1}. ${value}`);
    });
    const choice = (await prompt('  Select')).trim();
    const index = Number(choice) - 1;
    if (Number.isNaN(index) || index < 0 || index >= uniqueValues.length) {
        console.log('  Invalid selection.');
        return null;
    }
    const selected = uniqueValues[index];
    return { allocations: select(selected), label: `${fieldLabel} = ${selected}` };
};

export const ViewAllocationsScreen = {
    async show(): Promise<void> {
        display.header('All Allocations');

        let allAllocations: AllocationSummaryDto[];
        try {
            allAllocations = await allocationApiService.getAllAllocations();
        } catch (error) {
            console.log(`  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue');
            return;
        }

        if (allAllocations.length === 0) {
            console.log('  No active allocations found.');
            await prompt('\n  Press Enter to continue');
            return;
        }

        let view = allAllocations;
        let activeFilter = '';

        while (true) {
            display.header('All Allocations');
            if (activeFilter) {
                console.log(`  Filter: ${activeFilter}`);
            }
            printAllocationsTable(view);

            console.log('\n  [F] Filter by employee/project   [C] Clear filter   [B] Back');
            const choice = (await prompt('  Select')).trim().toUpperCase();

            if (choice === 'B') {
                return;
            }
            if (choice === 'C') {
                view = allAllocations;
                activeFilter = '';
                continue;
            }
            if (choice === 'F') {
                console.log('\n  Filter by:');
                console.log('    1. Employee');
                console.log('    2. Project');
                const filterType = (await prompt('  Select')).trim();

                let filtered: FilterResult | null = null;
                if (filterType === '1') {
                    filtered = await promptValueFilter(
                        allAllocations.map((a) => a.employeeName),
                        'Employee',
                        (value) => allAllocations.filter((a) => a.employeeName === value),
                    );
                } else if (filterType === '2') {
                    filtered = await promptValueFilter(
                        allAllocations.map((a) => a.projectName),
                        'Project',
                        (value) => allAllocations.filter((a) => a.projectName === value),
                    );
                } else {
                    console.log('  Invalid selection.');
                }

                if (filtered) {
                    view = filtered.allocations;
                    activeFilter = filtered.label;
                }
                continue;
            }

            console.log('  Invalid option.');
        }
    },
};
