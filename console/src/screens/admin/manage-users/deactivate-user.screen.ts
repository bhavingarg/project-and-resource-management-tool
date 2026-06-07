import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { userApiService } from '../../../services/user.service';

export const DeactivateUserScreen = {
    async show(): Promise<void> {
        display.header('Deactivate User');

        const input = (await prompt('  Enter username or user ID: ')).trim();
        if (!input) { console.log('  Input cannot be empty.'); return; }

        try {
            const user = await userApiService.findByUsernameOrId(input);
            console.log(`  Found: ${user.fullName} (${user.username}) — ${user.role}`);

            if (!user.isActive) {
                console.log('  This user is already inactive.');
                await prompt('\n  Press Enter to continue...');
                return;
            }

            const confirm = (await prompt(`  Deactivate '${user.username}'? (Y/N): `)).trim().toUpperCase();
            if (confirm !== 'Y') {
                console.log('  Cancelled.');
                await prompt('\n  Press Enter to continue...');
                return;
            }

            await userApiService.deactivateUser(user.id);
            console.log(`\n  User '${user.username}' has been deactivated.`);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
