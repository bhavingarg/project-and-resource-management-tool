import { prompt, promptHidden } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { userApiService } from '../../../services/user.service';
import { UserRole } from '../../../models/session.model';
import { CreateUserRequestDto } from '../../../models/user.dto';

const ROLE_MAP: Record<string, UserRole> = {
    '1': 'ADMIN',
    '2': 'MANAGER',
    '3': 'EMPLOYEE',
};

const promptRole = async (): Promise<UserRole | null> => {
    console.log('  Role: (1) Admin  (2) Manager  (3) Employee');
    const input = (await prompt('  Select: ')).trim();
    const role = ROLE_MAP[input];
    if (!role) {
        console.log('  Invalid selection. Please enter 1, 2, or 3.');
        return null;
    }
    return role;
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
            if (role !== 'ADMIN') {
                console.log('  Employee profile created. Set Department and Designation via Manage Employees > Update Employee.');
            }
            console.log('  The user will be prompted to change their password on first login.');
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue...');
    },
};
