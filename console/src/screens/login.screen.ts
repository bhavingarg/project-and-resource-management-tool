import { display } from '../utils/display.util';
import { prompt } from '../utils/input.util';

export const LoginScreen = {
    async show(): Promise<void> {
        display.header('PROJECT & RESOURCE MANAGEMENT TOOL', 'Learn & Code — Final Project');

        let handled = false;
        while (!handled) {
            console.log('\n1. Login\n2. Exit\n');

            const option = await prompt('Enter option');

            if (option === '1') {
                // Auth flow — implemented in auth feature
                console.log('Login coming soon...');
                handled = true;
            } else if (option === '2') {
                console.log('Goodbye.');
                process.exit(0);
            } else {
                console.log('Invalid option. Please try again.');
            }
        }
    },
};
