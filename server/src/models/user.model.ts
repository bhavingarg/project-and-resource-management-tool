export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
}

export interface User {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    forcePasswordChange: boolean;
}

export interface AuthenticatedUser {
    userId: number;
    username: string;
    role: UserRole;
}
