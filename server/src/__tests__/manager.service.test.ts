import { createManagerService } from '../services/manager.service';
import { IManagerRepository } from '../repositories/manager.repository';
import { IEmployeeRepository } from '../repositories/employee.repository';
import { IAllocationRepository } from '../repositories/allocation.repository';
import { MilestoneStatus } from '../models/project.model';
import { ProjectStatus, ProjectHealth } from '../models/project.model';
import { EmployeeStatus } from '../models/employee.model';

const makeMgrRepo = (overrides: Partial<IManagerRepository> = {}): IManagerRepository => ({
    findTeamMembers: jest.fn(),
    findTeamMemberByUserId: jest.fn(),
    findManagerProjects: jest.fn(),
    findManagerProjectById: jest.fn(),
    findProjectMilestones: jest.fn(),
    findRecentActivityTags: jest.fn(),
    ...overrides,
});

const makeEmpRepo = (overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository => ({
    findAll: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    assignManager: jest.fn(),
    getActiveAllocationCount: jest.fn(),
    getActiveAllocationSummaries: jest.fn(),
    endActiveAllocations: jest.fn(),
    getSkills: jest.fn().mockResolvedValue([]),
    addSkill: jest.fn(),
    updateSkillProficiency: jest.fn(),
    removeSkill: jest.fn(),
    findSkillById: jest.fn(),
    ...overrides,
});

const makeAllocRepo = (overrides: Partial<IAllocationRepository> = {}): IAllocationRepository => ({
    findAllActive: jest.fn(),
    findById: jest.fn(),
    findActiveByProject: jest.fn().mockResolvedValue([]),
    findActiveLinesByEmployee: jest.fn().mockResolvedValue([]),
    getOverlappingUtilisation: jest.fn(),
    create: jest.fn(),
    endById: jest.fn(),
    endActiveAllocationsByManager: jest.fn().mockResolvedValue(undefined),
    recomputeResourceStatus: jest.fn(),
    findAllByUserId: jest.fn(),
    ...overrides,
});

const fakeMember = {
    userId: 10, fullName: 'Bob', status: EmployeeStatus.BENCH, utilisationPercent: 50,
};

const fakeProject: any = {
    id: 1, name: 'Alpha', status: ProjectStatus.ACTIVE, health: ProjectHealth.ON_TRACK,
    endDate: '2030-12-31',
};

describe('ManagerService', () => {
    describe('getResourceDashboard', () => {
        it('splits members into bench and active', async () => {
            const benchMember = { ...fakeMember, utilisationPercent: 0, userId: 11 };
            const svc = createManagerService(
                makeMgrRepo({ findTeamMembers: jest.fn().mockResolvedValue([fakeMember, benchMember]) }),
                makeEmpRepo({ getSkills: jest.fn().mockResolvedValue([]) }),
                makeAllocRepo(),
            );
            const result = await svc.getResourceDashboard(1);
            expect(result.active).toHaveLength(1);
            expect(result.bench).toHaveLength(1);
        });
    });

    describe('getEmployeeDrillDown', () => {
        it('throws when member not on team', async () => {
            const svc = createManagerService(
                makeMgrRepo({ findTeamMemberByUserId: jest.fn().mockResolvedValue(null) }),
                makeEmpRepo(),
                makeAllocRepo(),
            );
            await expect(svc.getEmployeeDrillDown(1, 99)).rejects.toThrow(/not on your team/i);
        });

        it('returns drill-down with skills and allocations', async () => {
            const svc = createManagerService(
                makeMgrRepo({
                    findTeamMemberByUserId: jest.fn().mockResolvedValue(fakeMember),
                    findRecentActivityTags: jest.fn().mockResolvedValue(['Design']),
                }),
                makeEmpRepo({ getSkills: jest.fn().mockResolvedValue([{ skillName: 'TS' }]) }),
                makeAllocRepo({ findActiveLinesByEmployee: jest.fn().mockResolvedValue([]) }),
            );
            const result = await svc.getEmployeeDrillDown(1, 10);
            expect(result.skills).toContain('TS');
            expect(result.recentActivityTags).toContain('Design');
        });
    });

    describe('getManagerProjects', () => {
        it('returns projects from repository', async () => {
            const svc = createManagerService(
                makeMgrRepo({ findManagerProjects: jest.fn().mockResolvedValue([fakeProject]) }),
                makeEmpRepo(),
                makeAllocRepo(),
            );
            const result = await svc.getManagerProjects(1);
            expect(result).toHaveLength(1);
        });
    });

    describe('getProjectDetail', () => {
        it('throws when project not found', async () => {
            const svc = createManagerService(
                makeMgrRepo({ findManagerProjectById: jest.fn().mockResolvedValue(null) }),
                makeEmpRepo(),
                makeAllocRepo(),
            );
            await expect(svc.getProjectDetail(1, 99)).rejects.toThrow(/not found/i);
        });

        it('returns project detail with milestones', async () => {
            const milestone = {
                title: 'M1', dueDate: '2025-01-01', status: MilestoneStatus.DONE,
            };
            const svc = createManagerService(
                makeMgrRepo({
                    findManagerProjectById: jest.fn().mockResolvedValue(fakeProject),
                    findProjectMilestones: jest.fn().mockResolvedValue([milestone]),
                }),
                makeEmpRepo(),
                makeAllocRepo({ findActiveByProject: jest.fn().mockResolvedValue([]) }),
            );
            const result = await svc.getProjectDetail(1, 1);
            expect(result.milestones).toHaveLength(1);
            expect(result.milestones[0].isOverdue).toBe(false);
        });

        it('marks overdue milestones correctly', async () => {
            const overdueMilestone = {
                title: 'Overdue', dueDate: '2000-01-01', status: MilestoneStatus.IN_PROGRESS,
            };
            const svc = createManagerService(
                makeMgrRepo({
                    findManagerProjectById: jest.fn().mockResolvedValue(fakeProject),
                    findProjectMilestones: jest.fn().mockResolvedValue([overdueMilestone]),
                }),
                makeEmpRepo(),
                makeAllocRepo({ findActiveByProject: jest.fn().mockResolvedValue([]) }),
            );
            const result = await svc.getProjectDetail(1, 1);
            expect(result.milestones[0].isOverdue).toBe(true);
        });
    });
});
