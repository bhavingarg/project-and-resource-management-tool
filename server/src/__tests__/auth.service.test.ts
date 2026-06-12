import { createAuthService } from '../services/auth.service';
import { IAuthRepository } from '../repositories/auth.repository';
import { UserRole } from '../models/user.model';

// Mock AppConfig before it tries to read env vars
jest.mock('../config/app.config', () => ({
    AppConfig: { jwtSecret: 'test-secret', jwtExpiresInSeconds: 3600 },
}));

// bcrypt is slow at real rounds — mock it for tests
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

import bcrypt from 'bcrypt';
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const makeRepo = (overrides: Partial<IAuthRepository> = {}): IAuthRepository => ({
    findActiveUserByUsername: jest.fn(),
    updatePassword: jest.fn(),
    ...overrides,
});

describe('AuthService', () => {
    describe('validatePasswordStrength', () => {
        const service = createAuthService(makeRepo());

        it('accepts a valid password', () => {
            expect(service.validatePasswordStrength('Password1')).toBeNull();
        });

        it('rejects passwords shorter than 8 chars', () => {
            expect(service.validatePasswordStrength('Pass1')).toMatch(/at least 8/i);
        });

        it('rejects passwords without an uppercase letter', () => {
            expect(service.validatePasswordStrength('password1')).toMatch(/uppercase/i);
        });

        it('rejects passwords without a number', () => {
            expect(service.validatePasswordStrength('Password')).toMatch(/number/i);
        });
    });

    describe('login', () => {
        const fakeUser = {
            id: 1,
            username: 'admin',
            passwordHash: 'hashed',
            role: UserRole.ADMIN,
            forcePasswordChange: false,
        };

        it('throws when user not found', async () => {
            const repo = makeRepo({ findActiveUserByUsername: jest.fn().mockResolvedValue(null) });
            await expect(createAuthService(repo).login({ username: 'x', password: 'y' }))
                .rejects.toThrow('Invalid username or password');
        });

        it('throws when password does not match', async () => {
            const repo = makeRepo({ findActiveUserByUsername: jest.fn().mockResolvedValue(fakeUser) });
            (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);
            await expect(createAuthService(repo).login({ username: 'admin', password: 'wrong' }))
                .rejects.toThrow('Invalid username or password');
        });

        it('returns a token on success', async () => {
            const repo = makeRepo({ findActiveUserByUsername: jest.fn().mockResolvedValue(fakeUser) });
            (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
            const result = await createAuthService(repo).login({ username: 'admin', password: 'Password1' });
            expect(result.token).toBeTruthy();
            expect(result.role).toBe(UserRole.ADMIN);
        });
    });

    describe('changePassword', () => {
        it('throws on weak password', async () => {
            const repo = makeRepo();
            await expect(createAuthService(repo).changePassword(1, 'weak'))
                .rejects.toThrow();
        });

        it('hashes and updates on valid password', async () => {
            const updatePassword = jest.fn().mockResolvedValue(undefined);
            const repo = makeRepo({ updatePassword });
            (mockBcrypt.hash as jest.Mock).mockResolvedValue('newhash');
            await createAuthService(repo).changePassword(1, 'NewPass1');
            expect(updatePassword).toHaveBeenCalledWith(1, 'newhash');
        });
    });
});
