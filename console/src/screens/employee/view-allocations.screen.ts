import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { formatDisplayDate } from '../../utils/date.util';
import { allocationApiService } from '../../services/allocation.service';
import { MyAllocationDto } from '../../models/allocation.dto';

export const ViewAllocationsScreen = {
    async show(): Promise<void> {
        display.header('My Allocations');

        let allocations: MyAllocationDto[];
        try {
            allocations = await allocationApiService.getMyAllocations();
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue...');
            return;
        }

        if (allocations.length === 0) {
            console.log('\n  No allocations found.');
            await prompt('\n  Press Enter to continue...');
            return;
        }

        const SEP = `  ${'─'.repeat(66)}`;
        console.log(`\n${SEP}`);
        console.log(
            `  ${'Project'.padEnd(22)} ${'%'.padEnd(5)} ${'From'.padEnd(13)} ${'To'.padEnd(13)} Status`,
        );
        console.log(SEP);

        let totalActive = 0;
        for (const alloc of allocations) {
            if (alloc.status === 'ACTIVE') totalActive += alloc.utilisationPercent;
            console.log(
                `  ${alloc.projectName.padEnd(22)} ${`${alloc.utilisationPercent}%`.padEnd(5)} ` +
                `${formatDisplayDate(alloc.fromDate).padEnd(13)} ${formatDisplayDate(alloc.toDate).padEnd(13)} ${alloc.status}`,
            );
        }
        console.log(SEP);
        console.log(`  Total Active Utilisation: ${totalActive}%`);

        await prompt('\n  Press Enter to continue...');
    },
};
