import { UserRole } from './user.model';

export interface CreateUserRequestDto {
    fullName: string;
    email: string;
    username: string;
    temporaryPassword: string;
    role: UserRole;
}

export interface UserSummaryDto {
    id: number;
    username: string;
    fullName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
}

export interface ResetPasswordRequestDto {
    newTemporaryPassword: string;
}
