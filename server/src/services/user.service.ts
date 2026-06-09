import bcrypt from 'bcrypt';
import { CreateUserRequestDto, UserSummaryDto, ResetPasswordRequestDto } from '../models/user.dto';
import { IUserRepository } from '../repositories/user.repository';
import { IEmployeeRepository } from '../repositories/employee.repository';
import { IAuthService } from './auth.service';
import { UserRole } from '../models/user.model';

const BCRYPT_ROUNDS = 12;

export interface IUserService {
    createUser(dto: CreateUserRequestDto): Promise<UserSummaryDto>;
    getAllUsers(): Promise<UserSummaryDto[]>;
    findByUsernameOrId(usernameOrId: string): Promise<UserSummaryDto>;
    resetPassword(userId: number, dto: ResetPasswordRequestDto): Promise<void>;
    deactivateUser(userId: number): Promise<void>;
    reactivateUser(userId: number): Promise<void>;
}

export const createUserService = (
    userRepository: IUserRepository,
    authService: IAuthService,
    employeeRepository: IEmployeeRepository,
): IUserService => ({
    async createUser(dto: CreateUserRequestDto): Promise<UserSummaryDto> {
        const usernameExists = await userRepository.existsByUsername(dto.username);
        if (usernameExists) {
            throw new Error(`Username '${dto.username}' is already taken`);
        }

        const emailExists = await userRepository.existsByEmail(dto.email);
        if (emailExists) {
            throw new Error(`Email '${dto.email}' is already registered`);
        }

        const passwordError = authService.validatePasswordStrength(dto.temporaryPassword);
        if (passwordError) {
            throw new Error(passwordError);
        }

        const requiresEmployeeProfile = dto.role === UserRole.MANAGER || dto.role === UserRole.EMPLOYEE;

        const passwordHash = await bcrypt.hash(dto.temporaryPassword, BCRYPT_ROUNDS);
        const newUserId = await userRepository.create(
            dto.fullName,
            dto.email,
            dto.username,
            passwordHash,
            dto.role,
        );

        if (requiresEmployeeProfile) {
            try {
                await employeeRepository.createForUser(newUserId, dto.fullName, dto.email);
            } catch (error) {
                await userRepository.deleteById(newUserId);
                throw error;
            }
        }

        return {
            id: newUserId,
            username: dto.username,
            fullName: dto.fullName,
            email: dto.email,
            role: dto.role,
            isActive: true,
        };
    },

    async getAllUsers(): Promise<UserSummaryDto[]> {
        return userRepository.findAll();
    },

    async findByUsernameOrId(usernameOrId: string): Promise<UserSummaryDto> {
        const user = await userRepository.findByUsernameOrId(usernameOrId);
        if (!user) {
            throw new Error(`User '${usernameOrId}' not found`);
        }
        return user;
    },

    async resetPassword(userId: number, dto: ResetPasswordRequestDto): Promise<void> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const passwordError = authService.validatePasswordStrength(dto.newTemporaryPassword);
        if (passwordError) {
            throw new Error(passwordError);
        }

        const passwordHash = await bcrypt.hash(dto.newTemporaryPassword, BCRYPT_ROUNDS);
        await userRepository.updatePassword(userId, passwordHash);
    },

    async deactivateUser(userId: number): Promise<void> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (!user.isActive) {
            throw new Error('User is already inactive');
        }
        await userRepository.setActiveStatus(userId, false);

        const employee = await employeeRepository.findByUserId(userId);
        if (employee && employee.isActive) {
            await employeeRepository.endActiveAllocations(employee.id);
            await employeeRepository.deactivate(employee.id);
        }
    },

    async reactivateUser(userId: number): Promise<void> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (user.isActive) {
            throw new Error('User is already active');
        }
        await userRepository.setActiveStatus(userId, true);

        const employee = await employeeRepository.findByUserId(userId);
        if (employee && !employee.isActive) {
            await employeeRepository.reactivate(employee.id);
        }
    },
});
