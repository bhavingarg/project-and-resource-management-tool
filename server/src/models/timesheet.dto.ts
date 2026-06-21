export interface SubmitTimesheetEntryDto {
    allocationId: number;
    hoursWorked: number;
    tags: string[];
}

export interface SubmitTimesheetRequestDto {
    weekStartDate: string; // YYYY-MM-DD, must be a Monday
    entries: SubmitTimesheetEntryDto[];
}

export interface ActiveAllocationForWeekDto {
    allocationId: number;
    projectId: number;
    projectName: string;
    utilisationPercent: number;
}

export interface TimesheetSummaryDto {
    weekStartDate: string;
    totalHours: number;
    status: 'SUBMITTED' | 'MISSED';
}

export interface TimesheetEntryDto {
    allocationId: number;
    projectName: string;
    hoursWorked: number;
    tags: string[];
}

export interface TimesheetDetailDto {
    weekStartDate: string;
    totalHours: number;
    status: 'SUBMITTED' | 'MISSED';
    entries: TimesheetEntryDto[];
}

export interface TimesheetReminderDto {
    isMissing: boolean;
    weekStartDate: string;
}

export interface TeamTimesheetRowDto {
    userId: number;
    resourceName: string;
    projectName: string;
    hoursWorked: number;
    status: 'SUBMITTED' | 'MISSED';
    isFrozen: boolean;
}
