import { prompt, promptHidden } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { userApiService } from '../../../services/user.service';
import { UserRole } from '../../../models/session.model';
import { CreateUserRequestDto } from '../../../models/user.dto';

const VALID_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

const promptRole = async (): Promise<UserRole | null> => {
    console.log('  Roles: ADMIN, MANAGER, EMPLOYEE');
    const input = (await prompt('  Role: ')).trim().toUpperCase() as UserRole;
    if (!VALID_ROLES.includes(input)) {
        console.log('  Invalid role. Please enter ADMIN, MANAGER, or EMPLOYEE.');
        return null;
    }
    return input;
};

export const CreateUserScreen = {
    async show(): Promise<void> {
        display.header('Create User Account');

        const fullName = (await prompt('  Full Name: ')).trim();
        if (!fullName) { console.log('  Full name cannot be empty.'); return; }

        const email = (await prompt('  Email: ')).trim();
        if (!email) { console.log('  Email cannot be empty.'); return; }

        const username = (await prompt('  Username: ')).trim();
        if (!username) { console.log('  Username cannot be empty.'); return; }

        const temporaryPassword = await promptHidden('  Temporary Password: ');
        if (!temporaryPassword) { console.log('  Password cannot be empty.'); return; }

        const role = await promptRole();
        if (!role) return;

        const dto: CreateUserRequestDto = { fullName, email, username, temporaryPassword, role };

        try {
            const user = await userApiService.createUser(dto);
            console.log(`\n  User '${user.username}' (ID: ${user.id}) created successfully.`);
            console.log('  The user will be prompted to change their password on first login.');
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
