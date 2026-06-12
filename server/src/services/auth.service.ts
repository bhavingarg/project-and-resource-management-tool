import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppConfig } from '../config/app.config';
import { LoginRequestDto, LoginResponseDto } from '../models/auth.dto';
import { AuthenticatedUser } from '../models/user.model';
import { IAuthRepository } from '../repositories/auth.repository';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
// Password must have at least one uppercase letter and one number
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).+$/;

export interface IAuthService {
    login(dto: LoginRequestDto): Promise<LoginResponseDto>;
    changePassword(userId: number, newPassword: string): Promise<void>;
    validatePasswordStrength(password: string): string | null;
}

export const createAuthService = (repository: IAuthRepository): IAuthService => {

    const validatePasswordStrength = (password: string): string | null => {
        if (password.length < MIN_PASSWORD_LENGTH)
            return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
        if (!PASSWORD_PATTERN.test(password))
            return 'Password must contain at least one uppercase letter and one number';
        return null;
    };

    return {
        async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
            // Check if the user exists and is active
            const user = await repository.findActiveUserByUsername(dto.username);
            if (!user) throw new Error('Invalid username or password');

            // Check if the password matches
            const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
            if (!passwordMatches) throw new Error('Invalid username or password');

            // Build the JWT with just enough info to identify the user on future requests
            const payload: AuthenticatedUser = {
                userId: user.id,
                username: user.username,
                role: user.role,
            };

            const token = jwt.sign(payload, AppConfig.jwtSecret, {
                expiresIn: AppConfig.jwtExpiresInSeconds,
            });

            return {
                token,
                role: user.role,
                username: user.username,
                forcePasswordChange: user.forcePasswordChange,
            };
        },

        async changePassword(userId: number, newPassword: string): Promise<void> {
            const error = validatePasswordStrength(newPassword);
            if (error) throw new Error(error);

            const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
            await repository.updatePassword(userId, passwordHash);
        },

        validatePasswordStrength,
    };
};
