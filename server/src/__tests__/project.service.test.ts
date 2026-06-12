import { createProjectService } from '../services/project.service';
import { IProjectRepository } from '../repositories/project.repository';
import { IUserRepository } from '../repositories/user.repository';
import { ISchedulerService } from '../services/scheduler.service';
import { ProjectStatus, ProjectHealth, MilestoneStatus } from '../models/project.model';
import { UserRole } from '../models/user.model';

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

const makeScheduler = (): ISchedulerService => ({
    runAllTasks: jest.fn(),
    recomputeProjectHealth: jest.fn(),
});

const existingProject = {
    id: 1, name: 'Alpha', managerId: 2,
    status: ProjectStatus.ACTIVE, health: ProjectHealth.ON_TRACK,
    startDate: '2026-01-01', endDate: '2026-12-31',
    totalStoryPoints: 10, completedStoryPoints: 0,
};

const managerUser = { id: 2, role: UserRole.MANAGER } as any;

describe('ProjectService', () => {
    describe('getProjectById', () => {
        it('throws when not found', async () => {
            const svc = createProjectService(makeProjectRepo({ findById: jest.fn().mockResolvedValue(null) }), makeUserRepo(), makeScheduler());
            await expect(svc.getProjectById(99)).rejects.toThrow(/not found/i);
        });

        it('returns project when found', async () => {
            const svc = createProjectService(makeProjectRepo({ findById: jest.fn().mockResolvedValue(existingProject) }), makeUserRepo(), makeScheduler());
            const result = await svc.getProjectById(1);
            expect(result.name).toBe('Alpha');
        });
    });

    describe('createProject', () => {
        it('throws when name is empty', async () => {
            const svc = createProjectService(makeProjectRepo(), makeUserRepo(), makeScheduler());
            await expect(svc.createProject({
                name: '  ', managerId: 2, status: ProjectStatus.ACTIVE,
                startDate: '2026-01-01', endDate: '2026-12-31', totalStoryPoints: 0,
            })).rejects.toThrow(/name is required/i);
        });

        it('throws when dates are invalid', async () => {
            const svc = createProjectService(makeProjectRepo(), makeUserRepo(), makeScheduler());
            await expect(svc.createProject({
                name: 'P', managerId: 2, status: ProjectStatus.ACTIVE,
                startDate: 'not-a-date', endDate: '2026-12-31', totalStoryPoints: 0,
            })).rejects.toThrow(/valid dates/i);
        });

        it('throws when start >= end', async () => {
            const svc = createProjectService(makeProjectRepo(), makeUserRepo(), makeScheduler());
            await expect(svc.createProject({
                name: 'P', managerId: 2, status: ProjectStatus.ACTIVE,
                startDate: '2026-12-31', endDate: '2026-01-01', totalStoryPoints: 0,
            })).rejects.toThrow(/before end/i);
        });

        it('throws when manager user not found', async () => {
            const svc = createProjectService(
                makeProjectRepo(),
                makeUserRepo({ findById: jest.fn().mockResolvedValue(null) }),
                makeScheduler(),
            );
            await expect(svc.createProject({
                name: 'P', managerId: 999, status: ProjectStatus.ACTIVE,
                startDate: '2026-01-01', endDate: '2026-12-31', totalStoryPoints: 0,
            })).rejects.toThrow(/not found/i);
        });

        it('throws when manager has wrong role', async () => {
            const svc = createProjectService(
                makeProjectRepo(),
                makeUserRepo({ findById: jest.fn().mockResolvedValue({ id: 2, role: UserRole.RESOURCE }) }),
                makeScheduler(),
            );
            await expect(svc.createProject({
                name: 'P', managerId: 2, status: ProjectStatus.ACTIVE,
                startDate: '2026-01-01', endDate: '2026-12-31', totalStoryPoints: 0,
            })).rejects.toThrow(/MANAGER or ADMIN/i);
        });

        it('creates project with valid input', async () => {
            const create = jest.fn().mockResolvedValue(5);
            const svc = createProjectService(
                makeProjectRepo({ create }),
                makeUserRepo({ findById: jest.fn().mockResolvedValue(managerUser) }),
                makeScheduler(),
            );
            const id = await svc.createProject({
                name: 'Alpha', managerId: 2, status: ProjectStatus.ACTIVE,
                startDate: '2026-01-01', endDate: '2026-12-31', totalStoryPoints: 10,
            });
            expect(id).toBe(5);
            expect(create).toHaveBeenCalled();
        });
    });

    describe('updateMilestoneStatus', () => {
        it('throws when milestone not found', async () => {
            const svc = createProjectService(
                makeProjectRepo({
                    findById: jest.fn().mockResolvedValue(existingProject),
                    findMilestoneById: jest.fn().mockResolvedValue(null),
                }),
                makeUserRepo(),
                makeScheduler(),
            );
            await expect(svc.updateMilestoneStatus(1, 3, MilestoneStatus.DONE))
                .rejects.toThrow(/not found/i);
        });

        it('updates status and triggers health recompute', async () => {
            const updateMilestoneStatus = jest.fn().mockResolvedValue(undefined);
            const recomputeProjectHealth = jest.fn().mockResolvedValue(undefined);
            const fakeMilestone = { id: 3, title: 'M1', dueDate: '2026-06-01', status: MilestoneStatus.IN_PROGRESS };
            const svc = createProjectService(
                makeProjectRepo({
                    findById: jest.fn().mockResolvedValue(existingProject),
                    findMilestoneById: jest.fn().mockResolvedValue(fakeMilestone),
                    updateMilestoneStatus,
                }),
                makeUserRepo(),
                { runAllTasks: jest.fn(), recomputeProjectHealth },
            );
            await svc.updateMilestoneStatus(1, 3, MilestoneStatus.DONE);
            expect(updateMilestoneStatus).toHaveBeenCalledWith(3, MilestoneStatus.DONE);
            expect(recomputeProjectHealth).toHaveBeenCalledWith(1);
        });
    });

    describe('getAllProjects', () => {
        it('returns all project summaries', async () => {
            const findAllSummaries = jest.fn().mockResolvedValue([existingProject]);
            const svc = createProjectService(makeProjectRepo({ findAllSummaries }), makeUserRepo(), makeScheduler());
            const result = await svc.getAllProjects();
            expect(result).toHaveLength(1);
        });
    });
});
