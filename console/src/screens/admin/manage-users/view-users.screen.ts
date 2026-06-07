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
    const activeCount = users.filter((u) => u.isActive).length;
    const inactiveCount = users.length - activeCount;

    console.log(separator);
    console.log(header);
    console.log(separator);
    for (const user of users) {
        const status = user.isActive ? STATUS_ACTIVE : STATUS_INACTIVE;
        console.log(
            `  ${String(user.id).padEnd(5)} ${user.username.padEnd(20)} ${user.role.padEnd(10)} ${status}`,
        );
    }
    console.log(separator);
    console.log(`  Total: ${users.length}   |   Active: ${activeCount}   |   Inactive: ${inactiveCount}`);
};

const reactivateFlow = async (): Promise<void> => {
    const input = (await prompt('  Enter User ID to reactivate: ')).trim();
    if (!input) return;

    try {
        const user = await userApiService.findByUsernameOrId(input);

        if (user.isActive) {
            console.log(`  User '${user.username}' is already active.`);
            return;
        }

        console.log(`\n  User: ${user.fullName} (${user.role}) — currently Inactive`);
        console.log('');
        console.log('  Reactivate this account?');
        console.log('  [Y] Yes     [B] Cancel');
        const confirm = (await prompt('  Select: ')).trim().toUpperCase();

        if (confirm !== 'Y') {
            console.log('  Cancelled.');
            return;
        }

        await userApiService.reactivateUser(user.id);
        console.log(`\n  Account reactivated. ${user.fullName} can now log in.`);
        console.log('  Note: Previous allocations are NOT restored. Admin must re-allocate manually if needed.');
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
                console.log('');
                console.log(hasInactive ? '  [R] Reactivate a user     [B] Back' : '  [B] Back');
                const choice = (await prompt('  Select: ')).trim().toUpperCase();
                if (choice === 'R' && hasInactive) {
                    await reactivateFlow();
                }
            }
        } catch (error) {
            console.log(`  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
