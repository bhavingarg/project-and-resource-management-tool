import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { ViewEmployeesScreen } from './manage-employees/view-employees.screen';
import { UpdateEmployeeScreen } from './manage-employees/update-employee.screen';
import { DeactivateEmployeeScreen } from './manage-employees/deactivate-employee.screen';
import { ManageSkillsScreen } from './manage-employees/manage-skills.screen';
import { AssignManagerScreen } from './manage-employees/assign-manager.screen';

const MENU_ITEMS = [
    '1. View All Employees',
    '2. Update Employee',
    '3. Deactivate Employee',
    '4. Manage Employee Skills',
    '5. Assign Manager',
    '6. Back',
] as const;

export const ManageEmployeesScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('Manage Employees');
            for (const item of MENU_ITEMS) {
                console.log(`  ${item}`);
            }

            const choice = (await prompt('\n  Select option: ')).trim();

            switch (choice) {
                case '1':
                    await ViewEmployeesScreen.show();
                    break;
                case '2':
                    await UpdateEmployeeScreen.show();
                    break;
                case '3':
                    await DeactivateEmployeeScreen.show();
                    break;
                case '4':
                    await ManageSkillsScreen.show();
                    break;
                case '5':
                    await AssignManagerScreen.show();
                    break;
                case '6':
                    return;
                default:
                    console.log('  Invalid option. Please try again.');
            }
        }
    },
};
