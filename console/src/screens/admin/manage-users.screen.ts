import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { CreateUserScreen } from './manage-users/create-user.screen';
import { ViewUsersScreen } from './manage-users/view-users.screen';
import { ResetPasswordScreen } from './manage-users/reset-password.screen';
import { DeactivateUserScreen } from './manage-users/deactivate-user.screen';

const MENU_ITEMS = [
    '1. Create User Account',
    '2. View All Users',
    '3. Reset User Password',
    '4. Deactivate User',
    '5. Back',
] as const;

export const ManageUsersScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('Manage Users');
            for (const item of MENU_ITEMS) {
                console.log(`  ${item}`);
            }

            const choice = (await prompt('\n  Select option: ')).trim();

            switch (choice) {
                case '1':
                    await CreateUserScreen.show();
                    break;
                case '2':
                    await ViewUsersScreen.show();
                    break;
                case '3':
                    await ResetPasswordScreen.show();
                    break;
                case '4':
                    await DeactivateUserScreen.show();
                    break;
                case '5':
                    return;
                default:
                    console.log('  Invalid option. Please try again.');
            }
        }
    },
};
