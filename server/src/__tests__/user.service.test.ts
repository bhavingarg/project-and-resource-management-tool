import { createUserService } from '../services/user.service';
import { IUserRepository } from '../repositories/user.repository';
import { IAuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

const makeRepo = (overrides: Partial<IUserRepository> = {}): IUserRepository => ({
    findAll: jest.fn(),
    findById: jest.fn(),
    findByUsernameOrId: jest.fn(),
    existsByUsername: jest.fn(),
    existsByEmail: jest.fn(),
    create: jest.fn(),
    updatePassword: jest.fn(),
    deleteById: jest.fn(),
    setActiveStatus: jest.fn(),
    ...overrides,
});

const makeAuth = (overrides: Partial<IAuthService> = {}): IAuthService => ({
    login: jest.fn(),
    changePassword: jest.fn(),
    validatePasswordStrength: jest.fn().mockReturnValue(null),
    ...overrides,
});

const fakeSummary = {
    id: 1, username: 'jdoe', fullName: 'John Doe',
    email: 'j@test.com', role: UserRole.RESOURCE, isActive: true,
};

describe('UserService', () => {
    describe('createUser', () => {
        it('throws if username already taken', async () => {
            const repo = makeRepo({ existsByUsername: jest.fn().mockResolvedValue(true) });
            const svc = createUserService(repo, makeAuth());
            await expect(svc.createUser({
                username: 'jdoe', fullName: 'J', email: 'e@t.com',
                temporaryPassword: 'P1', role: UserRole.RESOURCE,
            })).rejects.toThrow(/already taken/i);
        });

        it('throws if email already registered', async () => {
            const repo = makeRepo({
                existsByUsername: jest.fn().mockResolvedValue(false),
                existsByEmail: jest.fn().mockResolvedValue(true),
            });
            const svc = createUserService(repo, makeAuth());
            await expect(svc.createUser({
                username: 'jdoe', fullName: 'J', email: 'e@t.com',
                temporaryPassword: 'P1', role: UserRole.RESOURCE,
            })).rejects.toThrow(/already registered/i);
        });

        it('throws if password is weak', async () => {
            const repo = makeRepo({
                existsByUsername: jest.fn().mockResolvedValue(false),
                existsByEmail: jest.fn().mockResolvedValue(false),
            });
            const auth = makeAuth({ validatePasswordStrength: jest.fn().mockReturnValue('too weak') });
            const svc = createUserService(repo, auth);
            await expect(svc.createUser({
                username: 'jdoe', fullName: 'J', email: 'e@t.com',
                temporaryPassword: 'weak', role: UserRole.RESOURCE,
            })).rejects.toThrow('too weak');
        });

        it('creates and returns user dto on valid input', async () => {
            const create = jest.fn().mockResolvedValue(42);
            const repo = makeRepo({
                existsByUsername: jest.fn().mockResolvedValue(false),
                existsByEmail: jest.fn().mockResolvedValue(false),
                create,
            });
            const svc = createUserService(repo, makeAuth());
            const result = await svc.createUser({
                username: 'jdoe', fullName: 'John Doe', email: 'j@t.com',
                temporaryPassword: 'Password1', role: UserRole.RESOURCE,
            });
            expect(result.id).toBe(42);
            expect(result.username).toBe('jdoe');
            expect(create).toHaveBeenCalled();
        });
    });

    describe('getAllUsers', () => {
        it('returns users from repo', async () => {
            const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([fakeSummary]) });
            const result = await createUserService(repo, makeAuth()).getAllUsers();
            expect(result).toHaveLength(1);
        });
    });

    describe('findByUsernameOrId', () => {
        it('throws when not found', async () => {
            const repo = makeRepo({ findByUsernameOrId: jest.fn().mockResolvedValue(null) });
            await expect(createUserService(repo, makeAuth()).findByUsernameOrId('ghost'))
                .rejects.toThrow(/not found/i);
        });

        it('returns user when found', async () => {
            const repo = makeRepo({ findByUsernameOrId: jest.fn().mockResolvedValue(fakeSummary) });
            const result = await createUserService(repo, makeAuth()).findByUsernameOrId('jdoe');
            expect(result.username).toBe('jdoe');
        });
    });

    describe('resetPassword', () => {
        it('throws when user not found', async () => {
            const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
            await expect(createUserService(repo, makeAuth()).resetPassword(99, { newTemporaryPassword: 'P1' }))
                .rejects.toThrow('User not found');
        });

        it('updates password when valid', async () => {
            const updatePassword = jest.fn().mockResolvedValue(undefined);
            const repo = makeRepo({
                findById: jest.fn().mockResolvedValue(fakeSummary),
                updatePassword,
            });
            await createUserService(repo, makeAuth()).resetPassword(1, { newTemporaryPassword: 'NewPass1' });
            expect(updatePassword).toHaveBeenCalledWith(1, 'hashed');
        });
    });
});
