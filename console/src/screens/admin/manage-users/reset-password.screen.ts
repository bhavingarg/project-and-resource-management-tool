import { prompt, promptHidden } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { userApiService } from '../../../services/user.service';

export const ResetPasswordScreen = {
    async show(): Promise<void> {
        display.header('Reset User Password');

        const input = (await prompt('  Enter username or user ID: ')).trim();
        if (!input) { console.log('  Input cannot be empty.'); return; }

        try {
            const user = await userApiService.findByUsernameOrId(input);
            console.log(`  Found: ${user.fullName} (${user.username}) — ${user.role}`);

            const newPassword = await promptHidden('  New Temporary Password: ');
            if (!newPassword) { console.log('  Password cannot be empty.'); return; }

            const confirm = await promptHidden('  Confirm Password: ');
            if (newPassword !== confirm) {
                console.log('  Passwords do not match.');
                return;
            }

            await userApiService.resetPassword(user.id, { newTemporaryPassword: newPassword });
            console.log(`\n  Password reset for '${user.username}'. They will be prompted to change it on next login.`);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
