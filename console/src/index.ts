import 'dotenv/config';
import { LoginScreen } from './screens/login.screen';
import { ChangePasswordScreen } from './screens/change-password.screen';
import { RoleRouter } from './screens/role.router';

const main = async (): Promise<void> => {
    const session = await LoginScreen.show();

    if (session.forcePasswordChange) {
        await ChangePasswordScreen.show();
    }

    await RoleRouter.navigate(session.role, session.username);
};

main();
