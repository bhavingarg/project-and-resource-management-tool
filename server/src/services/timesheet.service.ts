import { ITimesheetRepository } from '../repositories/timesheet.repository';
import { ISchedulerService } from './scheduler.service';
import {
    SubmitTimesheetRequestDto,
    ActiveAllocationForWeekDto,
    TimesheetSummaryDto,
    TimesheetDetailDto,
    TimesheetReminderDto,
    TeamTimesheetRowDto,
} from '../models/timesheet.dto';
import { getLastWeekMonday } from '../utils/date.util';

const MAX_WEEKLY_HOURS = 40;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isMonday = (isoDate: string): boolean => new Date(`${isoDate}T00:00:00Z`).getUTCDay() === 1;

const getCurrentWeekMonday = (): Date => {
    const now = new Date();
    const daysSinceMonday = (now.getUTCDay() + 6) % DAYS_PER_WEEK;
    return new Date(now.getTime() - daysSinceMonday * MS_PER_DAY);
};

export interface ITimesheetService {
    getActiveAllocationsForWeek(userId: number, weekStartDate: string): Promise<ActiveAllocationForWeekDto[]>;
    submitTimesheet(userId: number, dto: SubmitTimesheetRequestDto): Promise<void>;
    getMyTimesheets(userId: number): Promise<TimesheetSummaryDto[]>;
    getMyWeekDetail(userId: number, weekStartDate: string): Promise<TimesheetDetailDto>;
    getTeamTimesheets(managerUserId: number, weekStartDate: string): Promise<TeamTimesheetRowDto[]>;
    getTeamMemberWeekDetail(managerUserId: number, userId: number, weekStartDate: string): Promise<TimesheetDetailDto>;
    getReminder(userId: number): Promise<TimesheetReminderDto>;
    unfreezeEmployee(managerUserId: number, targetUserId: number): Promise<void>;
}

export const createTimesheetService = (
    timesheetRepository: ITimesheetRepository,
    schedulerService: ISchedulerService,
): ITimesheetService => ({
    async getActiveAllocationsForWeek(userId: number, weekStartDate: string): Promise<ActiveAllocationForWeekDto[]> {
        if (!ISO_DATE_PATTERN.test(weekStartDate) || !isMonday(weekStartDate)) {
            throw new Error('weekStartDate must be a valid Monday in YYYY-MM-DD format');
        }
        return timesheetRepository.findActiveAllocationsForWeek(userId, weekStartDate);
    },

    async submitTimesheet(userId: number, dto: SubmitTimesheetRequestDto): Promise<void> {
        const frozen = await timesheetRepository.isFrozen(userId);
        if (frozen) {
            throw new Error('Your timesheet access is frozen. Please contact your manager to restore access.');
        }

        if (!ISO_DATE_PATTERN.test(dto.weekStartDate) || !isMonday(dto.weekStartDate)) {
            throw new Error('weekStartDate must be a valid Monday in YYYY-MM-DD format');
        }
        const submittedMonday = new Date(`${dto.weekStartDate}T00:00:00Z`);
        const currentMonday = getCurrentWeekMonday();
        currentMonday.setUTCHours(0, 0, 0, 0);
        if (submittedMonday > currentMonday) {
            throw new Error('Cannot submit a timesheet for a future week');
        }
        if (dto.entries.length === 0) {
            throw new Error('At least one timesheet entry is required');
        }

        const activeAllocations = await timesheetRepository.findActiveAllocationsForWeek(userId, dto.weekStartDate);
        const activeMap = new Map(activeAllocations.map((a) => [a.allocationId, a]));

        let totalHours = 0;
        for (const entry of dto.entries) {
            const allocation = activeMap.get(entry.allocationId);
            if (!allocation) {
                throw new Error(`Allocation ${entry.allocationId} is not active for week ${dto.weekStartDate}`);
            }
            if (entry.hoursWorked < 0) {
                throw new Error('Hours worked cannot be negative');
            }
            const maxForProject = (allocation.utilisationPercent / 100) * MAX_WEEKLY_HOURS;
            if (entry.hoursWorked > maxForProject) {
                throw new Error(
                    `Hours for ${allocation.projectName} (${entry.hoursWorked}) exceed the cap of ${maxForProject} hrs (${allocation.utilisationPercent}% of ${MAX_WEEKLY_HOURS}h)`,
                );
            }
            totalHours += entry.hoursWorked;
        }
        if (totalHours > MAX_WEEKLY_HOURS) {
            throw new Error(`Total hours (${totalHours}) exceed the maximum of ${MAX_WEEKLY_HOURS} hrs per week`);
        }

        try {
            await timesheetRepository.submitWeek(dto.weekStartDate, dto.entries);
        } catch (error) {
            const mysqlError = error as { code?: string };
            if (mysqlError.code === 'ER_DUP_ENTRY') {
                throw new Error('A timesheet for one or more of these allocations has already been submitted for this week');
            }
            throw error;
        }

        // Fire-and-forget: recompute health for every project affected by this submission.
        const affectedProjectIds = [...new Set(dto.entries.map((e) => activeMap.get(e.allocationId)!.projectId))];
        for (const projectId of affectedProjectIds) {
            schedulerService.recomputeProjectHealth(projectId).catch(() => { /* non-critical */ });
        }
    },

    async getMyTimesheets(userId: number): Promise<TimesheetSummaryDto[]> {
        return timesheetRepository.findMySummaries(userId);
    },

    async getMyWeekDetail(userId: number, weekStartDate: string): Promise<TimesheetDetailDto> {
        const detail = await timesheetRepository.findMyWeekDetail(userId, weekStartDate);
        if (!detail) throw new Error(`No timesheet found for week ${weekStartDate}`);
        return detail;
    },

    async getTeamTimesheets(managerUserId: number, weekStartDate: string): Promise<TeamTimesheetRowDto[]> {
        if (!ISO_DATE_PATTERN.test(weekStartDate) || !isMonday(weekStartDate)) {
            throw new Error('weekStartDate must be a valid Monday in YYYY-MM-DD format');
        }
        return timesheetRepository.findTeamTimesheets(managerUserId, weekStartDate);
    },

    async getTeamMemberWeekDetail(managerUserId: number, userId: number, weekStartDate: string): Promise<TimesheetDetailDto> {
        const detail = await timesheetRepository.findTeamMemberWeekDetail(managerUserId, userId, weekStartDate);
        if (!detail) throw new Error(`No timesheet found for user ${userId} for week ${weekStartDate}`);
        return detail;
    },

    async getReminder(userId: number): Promise<TimesheetReminderDto> {
        return timesheetRepository.getReminderInfo(userId, getLastWeekMonday());
    },

    async unfreezeEmployee(managerUserId: number, targetUserId: number): Promise<void> {
        const isTeamMember = await timesheetRepository.isManagerOf(managerUserId, targetUserId);
        if (!isTeamMember) {
            throw new Error('Employee is not on your team');
        }
        await timesheetRepository.unfreezeEmployee(targetUserId, managerUserId);
    },
});
