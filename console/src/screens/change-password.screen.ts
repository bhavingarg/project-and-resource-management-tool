import { display } from '../utils/display.util';
import { promptHidden } from '../utils/input.util';
import { authService } from '../services/auth.service';

export const ChangePasswordScreen = {
    async show(): Promise<void> {
        display.header('CHANGE PASSWORD', 'You must set a new password to continue.');

        let passwordChanged = false;

        while (!passwordChanged) {
            console.log('');
            const newPassword = await promptHidden('New Password    ');
            const confirmPassword = await promptHidden('Confirm Password');

            if (newPassword !== confirmPassword) {
                console.log('\nPasswords do not match. Please try again.');
                continue;
            }

            try {
                await authService.changePassword(newPassword);
                console.log('\nPassword updated. Welcome! ✓\n');
                passwordChanged = true;
            } catch (error) {
                console.log(`\n${(error as Error).message}. Please try again.`);
            }
        }
    },
};
