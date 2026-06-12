import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { employeeApiService } from '../../../services/employee.service';
import { UpdateEmployeeRequestDto } from '../../../models/employee.dto';

export const UpdateEmployeeScreen = {
    async show(): Promise<void> {
        display.header('Update Resource');

        const idInput = (await prompt('  Enter User ID: ')).trim();
        if (!idInput) return;

        const userId = Number(idInput);
        try {
            const employee = await employeeApiService.getEmployee(userId);

            console.log(`\n  ── ${employee.fullName} ${'─'.repeat(Math.max(0, 38 - employee.fullName.length))}`);
            console.log(`  Email       : ${employee.email}`);
            console.log(`  Department  : ${employee.department ?? '(not set)'}`);
            console.log(`  Designation : ${employee.designation ?? '(not set)'}`);
            console.log('\n  (Press Enter to keep current value)\n');

            const fullName = (await prompt(`  Full Name [${employee.fullName}]: `)).trim();
            const email = (await prompt(`  Email [${employee.email}]: `)).trim();
            const department = (await prompt(`  Department [${employee.department ?? ''}]: `)).trim();
            const designation = (await prompt(`  Designation [${employee.designation ?? ''}]: `)).trim();

            const dto: UpdateEmployeeRequestDto = {};
            if (fullName) dto.fullName = fullName;
            if (email) dto.email = email;
            if (department) dto.department = department;
            if (designation) dto.designation = designation;

            if (Object.keys(dto).length === 0) {
                console.log('\n  No changes made.');
            } else {
                await employeeApiService.updateEmployee(userId, dto);
                console.log('\n  Resource updated. ✓');
            }
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
