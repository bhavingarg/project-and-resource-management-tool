export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface LoginSession {
    role: UserRole;
    username: string;
    forcePasswordChange: boolean;
}
