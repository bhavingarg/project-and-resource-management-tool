import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { employeeApiService } from '../../../services/employee.service';

export const DeactivateEmployeeScreen = {
    async show(): Promise<void> {
        display.header('Deactivate Resource');

        const idInput = (await prompt('  Enter User ID: ')).trim();
        if (!idInput) return;

        const userId = Number(idInput);
        try {
            const employee = await employeeApiService.getEmployee(userId);

            if (!employee.isActive) {
                console.log(`\n  Resource '${employee.fullName}' is already inactive.`);
                await prompt('\n  Press Enter to continue...');
                return;
            }

            console.log(`\n  ── ${employee.fullName} ${'─'.repeat(Math.max(0, 38 - employee.fullName.length))}`);
            console.log(`  Status : ${employee.status ?? 'BENCH'}`);

            const warning = await employeeApiService.getDeactivateWarning(userId);

            if (warning.allocationCount > 0) {
                console.log(`\n  ⚠  Warning: This resource has ${warning.allocationCount} active allocation(s).`);
                console.log('     Ending their employment will remove them from:');
                for (const summary of warning.allocationSummaries) {
                    console.log(`       - ${summary}`);
                }
            }

            console.log(`\n  Are you sure you want to deactivate ${employee.fullName}?`);
            console.log('  This will: set is_active = false, end all active allocations today,');
            console.log('  and block their login account.');
            console.log('');
            console.log('  [Y] Yes, Deactivate     [B] Cancel');
            const confirm = (await prompt('  Select: ')).trim().toUpperCase();

            if (confirm !== 'Y') {
                console.log('  Cancelled.');
                await prompt('\n  Press Enter to continue...');
                return;
            }

            await employeeApiService.deactivateEmployee(userId);
            console.log(`\n  Resource deactivated. ✓`);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
