export type UserRole = 'ADMIN' | 'MANAGER' | 'RESOURCE';

export interface LoginSession {
    role: UserRole;
    username: string;
    forcePasswordChange: boolean;
}
