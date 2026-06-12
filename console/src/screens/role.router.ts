import { UserRole } from '../models/session.model';
import { AdminMenuScreen } from './admin/admin-menu.screen';
import { EmployeeMenuScreen } from './employee/employee-menu.screen';
import { ManagerMenuScreen } from './manager/manager-menu.screen';

type MenuScreen = (username: string) => Promise<void>;

const ROLE_SCREENS: Record<UserRole, MenuScreen> = {
    ADMIN: AdminMenuScreen.show.bind(AdminMenuScreen),
    MANAGER: ManagerMenuScreen.show.bind(ManagerMenuScreen),
    RESOURCE: EmployeeMenuScreen.show.bind(EmployeeMenuScreen),
};

export const RoleRouter = {
    async navigate(role: UserRole, username: string): Promise<void> {
        const showMenu = ROLE_SCREENS[role];
        await showMenu(username);
    },
};
