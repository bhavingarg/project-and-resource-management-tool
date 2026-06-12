import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { employeeApiService } from '../../../services/employee.service';

export const AssignManagerScreen = {
    async show(): Promise<void> {
        display.header('Assign Manager to Resource');

        const empInput = (await prompt('  Resource User ID : ')).trim();
        if (!empInput) return;

        const managerInput = (await prompt('  Manager User ID  : ')).trim();
        if (!managerInput) return;

        const employeeUserId = Number(empInput);
        const managerId = Number(managerInput);

        try {
            const employee = await employeeApiService.getEmployee(employeeUserId);
            await employeeApiService.assignManager(employeeUserId, managerId);
            console.log(`\n  Manager assigned to '${employee.fullName}'. ✓`);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
