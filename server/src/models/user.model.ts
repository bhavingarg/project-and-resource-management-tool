export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    RESOURCE = 'RESOURCE',
}

export interface User {
    id: number;
    fullName: string;
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
