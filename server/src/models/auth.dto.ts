import { UserRole } from './user.model';

export interface LoginRequestDto {
    username: string;
    password: string;
}

export interface LoginResponseDto {
    token: string;
    role: UserRole;
    username: string;
    forcePasswordChange: boolean;
}

export interface ChangePasswordRequestDto {
    newPassword: string;
}
