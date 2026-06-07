import 'dotenv/config';
import { LoginScreen } from './screens/login.screen';

const main = async (): Promise<void> => {
    await LoginScreen.show();
};

main();
