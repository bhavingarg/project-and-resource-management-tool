import { apiClient } from './api.client';
import {
    ActiveAllocationForWeekDto,
    SubmitTimesheetRequestDto,
    TimesheetSummaryDto,
    TimesheetDetailDto,
    TimesheetReminderDto,
    TeamTimesheetRowDto,
} from '../models/timesheet.dto';

export const timesheetApiService = {
    async getActiveAllocationsForWeek(weekStartDate: string): Promise<ActiveAllocationForWeekDto[]> {
        return apiClient.get<ActiveAllocationForWeekDto[]>(`/timesheets/active-allocations?week=${weekStartDate}`);
    },

    async submitTimesheet(dto: SubmitTimesheetRequestDto): Promise<void> {
        await apiClient.post('/timesheets', dto);
    },

    async getMyTimesheets(): Promise<TimesheetSummaryDto[]> {
        return apiClient.get<TimesheetSummaryDto[]>('/timesheets/mine');
    },

    async getMyWeekDetail(weekStartDate: string): Promise<TimesheetDetailDto> {
        return apiClient.get<TimesheetDetailDto>(`/timesheets/mine/${weekStartDate}`);
    },

    async getReminder(): Promise<TimesheetReminderDto> {
        return apiClient.get<TimesheetReminderDto>('/timesheets/reminder');
    },

    async getTeamTimesheets(weekStartDate: string): Promise<TeamTimesheetRowDto[]> {
        return apiClient.get<TeamTimesheetRowDto[]>(`/timesheets/team?week=${weekStartDate}`);
    },

    async getTeamMemberWeekDetail(userId: number, weekStartDate: string): Promise<TimesheetDetailDto> {
        return apiClient.get<TimesheetDetailDto>(`/timesheets/team/${userId}/${weekStartDate}`);
    },
};
