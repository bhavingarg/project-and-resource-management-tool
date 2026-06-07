import { display } from '../utils/display.util';
import { prompt, promptHidden } from '../utils/input.util';
import { authService } from '../services/auth.service';
import { LoginSession } from '../models/session.model';

export const LoginScreen = {
    async show(): Promise<LoginSession> {
        display.header('PROJECT & RESOURCE MANAGEMENT TOOL', 'Learn & Code — Final Project');

        let session: LoginSession | null = null;

        while (!session) {
            console.log('\n1. Login\n2. Exit\n');
            const option = await prompt('Enter option');

            if (option === '1') {
                session = await attemptLogin();
            } else if (option === '2') {
                console.log('Goodbye.');
                process.exit(0);
            } else {
                console.log('Invalid option. Please try again.');
            }
        }

        return session;
    },
};

const attemptLogin = async (): Promise<LoginSession | null> => {
    const username = await prompt('Username');
    const password = await promptHidden('Password');

    try {
        const session = await authService.login(username, password);
        return session;
    } catch (error) {
        console.log(`\nLogin failed: ${(error as Error).message}\n`);
        return null;
    }
};
