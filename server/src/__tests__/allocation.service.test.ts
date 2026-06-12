import { createAllocationService } from '../services/allocation.service';
import { IAllocationRepository } from '../repositories/allocation.repository';
import { IProjectRepository } from '../repositories/project.repository';
import { IEmployeeRepository } from '../repositories/employee.repository';
import { ProjectStatus, ProjectHealth } from '../models/project.model';

const makeAllocationRepo = (overrides: Partial<IAllocationRepository> = {}): IAllocationRepository => ({
    findAllActive: jest.fn(),
    findActiveByProject: jest.fn(),
    findActiveLinesByEmployee: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    endById: jest.fn(),
    endActiveAllocationsByManager: jest.fn().mockResolvedValue(undefined),
    recomputeResourceStatus: jest.fn(),
    getOverlappingUtilisation: jest.fn().mockResolvedValue(0),
    findAllByUserId: jest.fn(),
    ...overrides,
});

const makeProjectRepo = (overrides: Partial<IProjectRepository> = {}): IProjectRepository => ({
    findAllSummaries: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getMilestones: jest.fn(),
    findMilestoneById: jest.fn(),
    addMilestone: jest.fn(),
    updateMilestoneStatus: jest.fn(),
    ...overrides,
});

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

const activeProject = {
    id: 10, managerId: 1, name: 'P', status: ProjectStatus.ACTIVE,
    health: ProjectHealth.ON_TRACK, startDate: '2026-01-01', endDate: '2026-12-31',
    totalStoryPoints: 0, completedStoryPoints: 0,
};

const activeResource = { userId: 5, isActive: true, reportingToId: 1 } as any;

describe('AllocationService', () => {
    describe('createAllocation', () => {
        it('throws on invalid from date', async () => {
            const svc = createAllocationService(makeAllocationRepo(), makeProjectRepo(), makeEmployeeRepo());
            await expect(svc.createAllocation(1, {
                resourceUserId: 5, projectId: 10,
                utilisationPercent: 50, fromDate: 'bad', toDate: '2026-12-31',
            })).rejects.toThrow(/valid dates/i);
        });

        it('throws when from >= to date', async () => {
            const svc = createAllocationService(makeAllocationRepo(), makeProjectRepo(), makeEmployeeRepo());
            await expect(svc.createAllocation(1, {
                resourceUserId: 5, projectId: 10,
                utilisationPercent: 50, fromDate: '2026-12-31', toDate: '2026-01-01',
            })).rejects.toThrow(/before to date/i);
        });

        it('throws when utilisation < 1', async () => {
            const svc = createAllocationService(makeAllocationRepo(), makeProjectRepo(), makeEmployeeRepo());
            await expect(svc.createAllocation(1, {
                resourceUserId: 5, projectId: 10,
                utilisationPercent: 0, fromDate: '2026-01-01', toDate: '2026-12-31',
            })).rejects.toThrow(/between 1 and 100/i);
        });

        it('throws when project not found', async () => {
            const projectRepo = makeProjectRepo({ findById: jest.fn().mockResolvedValue(null) });
            const svc = createAllocationService(makeAllocationRepo(), projectRepo, makeEmployeeRepo());
            await expect(svc.createAllocation(1, {
                resourceUserId: 5, projectId: 99,
                utilisationPercent: 50, fromDate: '2026-01-01', toDate: '2026-12-31',
            })).rejects.toThrow(/not found/i);
        });

        it('throws when manager does not own the project', async () => {
            const projectRepo = makeProjectRepo({ findById: jest.fn().mockResolvedValue({ ...activeProject, managerId: 99 }) });
            const svc = createAllocationService(makeAllocationRepo(), projectRepo, makeEmployeeRepo());
            await expect(svc.createAllocation(1, {
                resourceUserId: 5, projectId: 10,
                utilisationPercent: 50, fromDate: '2026-01-01', toDate: '2026-12-31',
            })).rejects.toThrow(/your own projects/i);
        });

        it('throws on over-allocation', async () => {
            const projectRepo = makeProjectRepo({ findById: jest.fn().mockResolvedValue(activeProject) });
            const employeeRepo = makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(activeResource) });
            const allocationRepo = makeAllocationRepo({ getOverlappingUtilisation: jest.fn().mockResolvedValue(80) });
            const svc = createAllocationService(allocationRepo, projectRepo, employeeRepo);
            await expect(svc.createAllocation(1, {
                resourceUserId: 5, projectId: 10,
                utilisationPercent: 30, fromDate: '2026-01-01', toDate: '2026-12-31',
            })).rejects.toThrow(/over-allocation/i);
        });

        it('creates allocation successfully', async () => {
            const create = jest.fn().mockResolvedValue(undefined);
            const recomputeResourceStatus = jest.fn().mockResolvedValue(undefined);
            const projectRepo = makeProjectRepo({ findById: jest.fn().mockResolvedValue(activeProject) });
            const employeeRepo = makeEmployeeRepo({ findByUserId: jest.fn().mockResolvedValue(activeResource) });
            const allocationRepo = makeAllocationRepo({ create, recomputeResourceStatus });
            const svc = createAllocationService(allocationRepo, projectRepo, employeeRepo);
            await svc.createAllocation(1, {
                resourceUserId: 5, projectId: 10,
                utilisationPercent: 50, fromDate: '2026-01-01', toDate: '2026-12-31',
            });
            expect(create).toHaveBeenCalled();
            expect(recomputeResourceStatus).toHaveBeenCalledWith(5);
        });
    });

    describe('endAllocation', () => {
        it('throws when allocation not found', async () => {
            const allocationRepo = makeAllocationRepo({ findById: jest.fn().mockResolvedValue(null) });
            const svc = createAllocationService(allocationRepo, makeProjectRepo(), makeEmployeeRepo());
            await expect(svc.endAllocation(1, 999)).rejects.toThrow(/not found/i);
        });

        it('ends allocation and recomputes status', async () => {
            const endById = jest.fn().mockResolvedValue(undefined);
            const recomputeResourceStatus = jest.fn().mockResolvedValue(undefined);
            const allocationRepo = makeAllocationRepo({
                findById: jest.fn().mockResolvedValue({ id: 1, projectId: 10, resourceId: 5 }),
                endById,
                recomputeResourceStatus,
            });
            const projectRepo = makeProjectRepo({ findById: jest.fn().mockResolvedValue(activeProject) });
            const svc = createAllocationService(allocationRepo, projectRepo, makeEmployeeRepo());
            await svc.endAllocation(1, 1);
            expect(endById).toHaveBeenCalledWith(1);
            expect(recomputeResourceStatus).toHaveBeenCalledWith(5);
        });
    });

    describe('getMyAllocations', () => {
        it('returns allocations for a user', async () => {
            const allocationRepo = makeAllocationRepo({ findAllByUserId: jest.fn().mockResolvedValue([{ id: 1 }]) });
            const svc = createAllocationService(allocationRepo, makeProjectRepo(), makeEmployeeRepo());
            const result = await svc.getMyAllocations(5);
            expect(result).toHaveLength(1);
        });
    });
});
