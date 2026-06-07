import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { userApiService } from '../../../services/user.service';
import { UserSummaryDto } from '../../../models/user.dto';

const STATUS_ACTIVE = 'Active  ';
const STATUS_INACTIVE = 'Inactive';

const printUsersTable = (users: UserSummaryDto[]): void => {
    const header = `  ${'ID'.padEnd(5)} ${'Username'.padEnd(20)} ${'Role'.padEnd(10)} Status`;
    const separator = `  ${'─'.repeat(50)}`;
    console.log(separator);
    console.log(header);
    console.log(separator);
    for (const user of users) {
        const status = user.isActive ? STATUS_ACTIVE : STATUS_INACTIVE;
        const tag = user.isActive ? '' : ' [R] Reactivate';
        console.log(
            `  ${String(user.id).padEnd(5)} ${user.username.padEnd(20)} ${user.role.padEnd(10)} ${status}${tag}`,
        );
    }
    console.log(separator);
};

const reactivateFlow = async (): Promise<void> => {
    const input = (await prompt('  Enter user ID or username to reactivate: ')).trim();
    if (!input) return;

    try {
        const user = await userApiService.findByUsernameOrId(input);
        if (user.isActive) {
            console.log(`  User '${user.username}' is already active.`);
            return;
        }
        await userApiService.reactivateUser(user.id);
        console.log(`  User '${user.username}' has been reactivated.`);
    } catch (error) {
        console.log(`  Error: ${extractErrorMessage(error)}`);
    }
};

export const ViewUsersScreen = {
    async show(): Promise<void> {
        display.header('View All Users');

        try {
            const users = await userApiService.getAllUsers();

            if (users.length === 0) {
                console.log('  No users found.');
            } else {
                printUsersTable(users);

                const hasInactive = users.some((u: UserSummaryDto) => !u.isActive);
                if (hasInactive) {
                    console.log('');
                    const choice = (await prompt('  Reactivate a user? (Y/N): ')).trim().toUpperCase();
                    if (choice === 'Y') {
                        await reactivateFlow();
                    }
                }
            }
        } catch (error) {
            console.log(`  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
