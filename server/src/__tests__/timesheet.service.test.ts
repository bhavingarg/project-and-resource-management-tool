import { createTimesheetService } from '../services/timesheet.service';
import { ITimesheetRepository } from '../repositories/timesheet.repository';
import { ISchedulerService } from '../services/scheduler.service';

const makeRepo = (overrides: Partial<ITimesheetRepository> = {}): ITimesheetRepository => ({
    findActiveAllocationsForWeek: jest.fn().mockResolvedValue([]),
    submitWeek: jest.fn(),
    findMySummaries: jest.fn(),
    findMyWeekDetail: jest.fn(),
    findTeamTimesheets: jest.fn(),
    findTeamMemberWeekDetail: jest.fn(),
    getReminderInfo: jest.fn(),
    isFrozen: jest.fn().mockResolvedValue(false),
    isManagerOf: jest.fn().mockResolvedValue(true),
    unfreezeEmployee: jest.fn().mockResolvedValue(undefined),
    ...overrides,
});

const makeScheduler = (): ISchedulerService => ({
    runAllTasks: jest.fn(),
    recomputeProjectHealth: jest.fn().mockResolvedValue(undefined),
});

// A Monday in ISO format
const MONDAY = '2026-06-08';
// A non-Monday
const TUESDAY = '2026-06-09';
// A future Monday
const FUTURE_MONDAY = '2030-01-07';

describe('TimesheetService', () => {
    describe('getActiveAllocationsForWeek', () => {
        it('throws on non-Monday date', async () => {
            const svc = createTimesheetService(makeRepo(), makeScheduler());
            await expect(svc.getActiveAllocationsForWeek(1, TUESDAY))
                .rejects.toThrow(/Monday/i);
        });

        it('throws on invalid date format', async () => {
            const svc = createTimesheetService(makeRepo(), makeScheduler());
            await expect(svc.getActiveAllocationsForWeek(1, 'not-a-date'))
                .rejects.toThrow(/Monday/i);
        });

        it('returns allocations for a valid Monday', async () => {
            const allocs = [{ allocationId: 1, projectName: 'P', utilisationPercent: 50, projectId: 10 }];
            const repo = makeRepo({ findActiveAllocationsForWeek: jest.fn().mockResolvedValue(allocs) });
            const result = await createTimesheetService(repo, makeScheduler()).getActiveAllocationsForWeek(1, MONDAY);
            expect(result).toHaveLength(1);
        });
    });

    describe('submitTimesheet', () => {
        it('throws on non-Monday week start', async () => {
            const svc = createTimesheetService(makeRepo(), makeScheduler());
            await expect(svc.submitTimesheet(1, {
                weekStartDate: TUESDAY, entries: [{ allocationId: 1, hoursWorked: 8, tags: [] }],
            })).rejects.toThrow(/Monday/i);
        });

        it('throws on future week', async () => {
            const svc = createTimesheetService(makeRepo(), makeScheduler());
            await expect(svc.submitTimesheet(1, {
                weekStartDate: FUTURE_MONDAY, entries: [{ allocationId: 1, hoursWorked: 8, tags: [] }],
            })).rejects.toThrow(/future week/i);
        });

        it('throws when no entries provided', async () => {
            const svc = createTimesheetService(makeRepo(), makeScheduler());
            await expect(svc.submitTimesheet(1, { weekStartDate: MONDAY, entries: [] }))
                .rejects.toThrow(/at least one/i);
        });

        it('throws when allocation not active for week', async () => {
            const repo = makeRepo({ findActiveAllocationsForWeek: jest.fn().mockResolvedValue([]) });
            const svc = createTimesheetService(repo, makeScheduler());
            await expect(svc.submitTimesheet(1, {
                weekStartDate: MONDAY,
                entries: [{ allocationId: 99, hoursWorked: 8, tags: [] }],
            })).rejects.toThrow(/not active/i);
        });

        it('throws on negative hours', async () => {
            const alloc = { allocationId: 1, projectName: 'P', utilisationPercent: 100, projectId: 10 };
            const repo = makeRepo({ findActiveAllocationsForWeek: jest.fn().mockResolvedValue([alloc]) });
            const svc = createTimesheetService(repo, makeScheduler());
            await expect(svc.submitTimesheet(1, {
                weekStartDate: MONDAY,
                entries: [{ allocationId: 1, hoursWorked: -1, tags: [] }],
            })).rejects.toThrow(/negative/i);
        });

        it('throws when hours exceed cap', async () => {
            const alloc = { allocationId: 1, projectName: 'P', utilisationPercent: 50, projectId: 10 };
            const repo = makeRepo({ findActiveAllocationsForWeek: jest.fn().mockResolvedValue([alloc]) });
            const svc = createTimesheetService(repo, makeScheduler());
            // 50% of 40h = 20h cap; submitting 25 should throw
            await expect(svc.submitTimesheet(1, {
                weekStartDate: MONDAY,
                entries: [{ allocationId: 1, hoursWorked: 25, tags: [] }],
            })).rejects.toThrow(/exceed/i);
        });

        it('submits successfully and triggers recompute', async () => {
            const submitWeek = jest.fn().mockResolvedValue(undefined);
            const recomputeProjectHealth = jest.fn().mockResolvedValue(undefined);
            const alloc = { allocationId: 1, projectName: 'P', utilisationPercent: 100, projectId: 10 };
            const repo = makeRepo({
                findActiveAllocationsForWeek: jest.fn().mockResolvedValue([alloc]),
                submitWeek,
            });
            const scheduler = { runAllTasks: jest.fn(), recomputeProjectHealth };
            const svc = createTimesheetService(repo, scheduler);
            await svc.submitTimesheet(1, {
                weekStartDate: MONDAY,
                entries: [{ allocationId: 1, hoursWorked: 32, tags: ['React'] }],
            });
            expect(submitWeek).toHaveBeenCalled();
            expect(recomputeProjectHealth).toHaveBeenCalledWith(10);
        });
    });
});
