import { createEmployeeService } from '../services/employee.service';
import { IEmployeeRepository } from '../repositories/employee.repository';
import { IUserRepository } from '../repositories/user.repository';
import { IAllocationRepository } from '../repositories/allocation.repository';
import { UserRole } from '../models/user.model';
import { SkillCategory, ProficiencyLevel } from '../models/employee.model';

const makeEmployeeRepo = (overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository => ({
    findAll: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    assignManager: jest.fn(),
    getActiveAllocationCount: jest.fn(),
    getActiveAllocationSummaries: jest.fn(),
    endActiveAllocations: jest.fn(),
    getSkills: jest.fn(),
    addSkill: jest.fn(),
    updateSkillProficiency: jest.fn(),
    removeSkill: jest.fn(),
    findSkillById: jest.fn(),
    ...overrides,
});

const makeUserRepo = (overrides: Partial<IUserRepository> = {}): IUserRepository => ({
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

const makeAllocRepo = (overrides: Partial<IAllocationRepository> = {}): IAllocationRepository => ({
    findAllActive: jest.fn(),
    findById: jest.fn(),
    findActiveByProject: jest.fn(),
    findActiveLinesByEmployee: jest.fn(),
    getOverlappingUtilisation: jest.fn(),
    create: jest.fn(),
    endById: jest.fn(),
    endActiveAllocationsByManager: jest.fn().mockResolvedValue(undefined),
    recomputeResourceStatus: jest.fn().mockResolvedValue(undefined),
    findAllByUserId: jest.fn(),
    ...overrides,
});

const fakeEmployee = {
    userId: 1, fullName: 'Alice', jobTitle: 'Dev', department: 'Eng',
    status: 'active', utilisationPercent: 0, isActive: true, managerId: null, reportingToId: null,
};

describe('EmployeeService', () => {
    describe('getAllEmployees', () => {
        it('returns all employees', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findAll: jest.fn().mockResolvedValue([fakeEmployee]) }),
                makeUserRepo(), makeAllocRepo(),
            );
            const result = await svc.getAllEmployees();
            expect(result).toHaveLength(1);
        });
    });

    describe('getEmployee', () => {
        it('returns employee when found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(fakeEmployee) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.getEmployee(1)).resolves.toEqual(fakeEmployee);
        });

        it('throws when not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(null) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.getEmployee(99)).rejects.toThrow(/not found/i);
        });
    });

    describe('updateEmployee', () => {
        it('calls repo update', async () => {
            const update = jest.fn().mockResolvedValue(undefined);
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(fakeEmployee), update }),
                makeUserRepo(), makeAllocRepo(),
            );
            await svc.updateEmployee(1, { department: 'Eng' });
            expect(update).toHaveBeenCalledWith(1, { department: 'Eng' });
        });

        it('throws when not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(null) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.updateEmployee(99, { department: 'y' })).rejects.toThrow(/not found/i);
        });
    });

    describe('deactivateEmployee', () => {
        it('ends allocations and sets inactive', async () => {
            const endActiveAllocations = jest.fn().mockResolvedValue(undefined);
            const setActiveStatus = jest.fn().mockResolvedValue(undefined);
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(fakeEmployee), endActiveAllocations }),
                makeUserRepo({ setActiveStatus }),
                makeAllocRepo(),
            );
            await svc.deactivateEmployee(1);
            expect(endActiveAllocations).toHaveBeenCalledWith(1);
            expect(setActiveStatus).toHaveBeenCalledWith(1, false);
        });

        it('throws if already inactive', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue({ ...fakeEmployee, isActive: false }) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.deactivateEmployee(1)).rejects.toThrow(/already inactive/i);
        });

        it('throws if employee not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(null) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.deactivateEmployee(99)).rejects.toThrow(/not found/i);
        });
    });

    describe('getDeactivateWarning', () => {
        it('returns count and summaries when allocated', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({
                    findByUserId: jest.fn().mockResolvedValue(fakeEmployee),
                    getActiveAllocationCount: jest.fn().mockResolvedValue(2),
                    getActiveAllocationSummaries: jest.fn().mockResolvedValue(['P1', 'P2']),
                }),
                makeUserRepo(), makeAllocRepo(),
            );
            const result = await svc.getDeactivateWarning(1);
            expect(result).toEqual({ allocationCount: 2, allocationSummaries: ['P1', 'P2'] });
        });

        it('returns zero count with empty summaries when not allocated', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({
                    findByUserId: jest.fn().mockResolvedValue(fakeEmployee),
                    getActiveAllocationCount: jest.fn().mockResolvedValue(0),
                }),
                makeUserRepo(), makeAllocRepo(),
            );
            const result = await svc.getDeactivateWarning(1);
            expect(result).toEqual({ allocationCount: 0, allocationSummaries: [] });
        });
    });

    describe('assignManager', () => {
        it('throws when employee not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(null) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.assignManager(99, 2)).rejects.toThrow(/not found/i);
        });

        it('throws when manager user not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(fakeEmployee) }),
                makeUserRepo({ findById: jest.fn().mockResolvedValue(null) }),
                makeAllocRepo(),
            );
            await expect(svc.assignManager(1, 99)).rejects.toThrow(/not found/i);
        });

        it('throws when user is not manager/admin', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(fakeEmployee) }),
                makeUserRepo({ findById: jest.fn().mockResolvedValue({ id: 2, role: UserRole.RESOURCE }) }),
                makeAllocRepo(),
            );
            await expect(svc.assignManager(1, 2)).rejects.toThrow(/MANAGER or ADMIN/i);
        });

        it('assigns manager when valid', async () => {
            const assignManager = jest.fn().mockResolvedValue(undefined);
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(fakeEmployee), assignManager }),
                makeUserRepo({ findById: jest.fn().mockResolvedValue({ id: 2, role: UserRole.MANAGER }) }),
                makeAllocRepo(),
            );
            await svc.assignManager(1, 2);
            expect(assignManager).toHaveBeenCalledWith(1, 2);
        });
    });

    describe('getSkills', () => {
        it('returns skills', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ getSkills: jest.fn().mockResolvedValue([{ id: 1, skillName: 'TypeScript' }]) }),
                makeUserRepo(), makeAllocRepo(),
            );
            const result = await svc.getSkills(1);
            expect(result).toHaveLength(1);
        });
    });

    describe('addSkill', () => {
        it('throws when employee not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(null) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.addSkill(99, { skillName: 'TS', category: SkillCategory.BACKEND, proficiencyLevel: ProficiencyLevel.INTERMEDIATE }))
                .rejects.toThrow(/not found/i);
        });

        it('calls addSkill on repo', async () => {
            const addSkill = jest.fn().mockResolvedValue(undefined);
            const svc = createEmployeeService(
                makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(fakeEmployee), addSkill }),
                makeUserRepo(), makeAllocRepo(),
            );
            await svc.addSkill(1, { skillName: 'TS', category: SkillCategory.BACKEND, proficiencyLevel: ProficiencyLevel.INTERMEDIATE });
            expect(addSkill).toHaveBeenCalledWith(1, 'TS', SkillCategory.BACKEND, ProficiencyLevel.INTERMEDIATE);
        });
    });

    describe('updateSkill', () => {
        it('throws when skill not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findSkillById: jest.fn().mockResolvedValue(null) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.updateSkill(1, 99, { proficiencyLevel: ProficiencyLevel.ADVANCED })).rejects.toThrow(/not found/i);
        });

        it('updates skill proficiency', async () => {
            const updateSkillProficiency = jest.fn().mockResolvedValue(undefined);
            const svc = createEmployeeService(
                makeEmployeeRepo({
                    findSkillById: jest.fn().mockResolvedValue({ id: 1, skillName: 'TS' }),
                    updateSkillProficiency,
                }),
                makeUserRepo(), makeAllocRepo(),
            );
            await svc.updateSkill(1, 1, { proficiencyLevel: ProficiencyLevel.ADVANCED });
            expect(updateSkillProficiency).toHaveBeenCalledWith(1, ProficiencyLevel.ADVANCED);
        });
    });

    describe('removeSkill', () => {
        it('throws when skill not found', async () => {
            const svc = createEmployeeService(
                makeEmployeeRepo({ findSkillById: jest.fn().mockResolvedValue(null) }),
                makeUserRepo(), makeAllocRepo(),
            );
            await expect(svc.removeSkill(1, 99)).rejects.toThrow(/not found/i);
        });

        it('removes skill', async () => {
            const removeSkill = jest.fn().mockResolvedValue(undefined);
            const svc = createEmployeeService(
                makeEmployeeRepo({
                    findSkillById: jest.fn().mockResolvedValue({ id: 1, skillName: 'TS' }),
                    removeSkill,
                }),
                makeUserRepo(), makeAllocRepo(),
            );
            await svc.removeSkill(1, 1);
            expect(removeSkill).toHaveBeenCalledWith(1);
        });
    });
});
