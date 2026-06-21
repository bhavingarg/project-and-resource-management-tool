import { ISchedulerRepository } from '../repositories/scheduler.repository';
import { IEmailService } from './email.service';
import { AppConfig } from '../config/app.config';
import { getLastWeekMonday, getDaysSinceDate } from '../utils/date.util';

// Reminder 1 is sent on the first working day after the submission deadline
// (day 7 = the Monday following the missed week).
// Reminder 2 is sent the next working day (day 8 = Tuesday).
// Freeze kicks in from day 9 onwards (Wednesday+) once both reminders are out.
const REMINDER1_DAYS_OFFSET = 7;
const REMINDER2_DAYS_OFFSET = 8;
const FREEZE_DAYS_OFFSET = 9;

export interface ISchedulerService {
    runAllTasks(): Promise<void>;
    recomputeProjectHealth(projectId: number): Promise<void>;
}

export const createSchedulerService = (
    schedulerRepository: ISchedulerRepository,
    emailService: IEmailService,
): ISchedulerService => ({
    async runAllTasks(): Promise<void> {
        const lastWeekMonday = getLastWeekMonday();

        const resourcesUpdated = await schedulerRepository.recomputeAllResourceStatuses();
        console.log(`[Scheduler] Recomputed ${resourcesUpdated} resource status(es).`);

        const missed = await schedulerRepository.flagMissedTimesheets(lastWeekMonday);
        console.log(`[Scheduler] Flagged ${missed} missed timesheet(s) for week ${lastWeekMonday}.`);

        const projectsUpdated = await schedulerRepository.updateAllProjectHealthStatuses(
            lastWeekMonday,
            AppConfig.maxWeeklyHours,
        );
        console.log(`[Scheduler] Updated health for ${projectsUpdated} active project(s).`);

        await this.processTimesheetNotifications(lastWeekMonday);
    },

    async recomputeProjectHealth(projectId: number): Promise<void> {
        await schedulerRepository.recomputeProjectHealth(
            projectId,
            getLastWeekMonday(),
            AppConfig.maxWeeklyHours,
        );
    },

    async processTimesheetNotifications(lastWeekMonday: string): Promise<void> {
        const daysSince = getDaysSinceDate(lastWeekMonday);

        if (daysSince < REMINDER1_DAYS_OFFSET) {
            // Deadline has not passed yet — nothing to do.
            return;
        }

        // Ensure there is a skeleton reminder record for every employee who missed
        // this week.  Safe to call multiple times (INSERT IGNORE).
        await schedulerRepository.ensureReminderRecords(lastWeekMonday);

        // ── Reminder 1 (Monday) ────────────────────────────────────────────────
        const r1Employees = await schedulerRepository.findEmployeesForReminder1(lastWeekMonday);
        for (const emp of r1Employees) {
            try {
                await emailService.sendTimesheetReminder1(emp.email, emp.fullName, emp.weekStartDate);
                await schedulerRepository.markReminder1Sent(emp.userId, emp.weekStartDate);
                console.log(`[Scheduler] Reminder 1 sent → ${emp.email} (week ${emp.weekStartDate})`);
            } catch (err) {
                console.error(`[Scheduler] Failed to send Reminder 1 to ${emp.email}:`, err);
            }
        }

        if (daysSince < REMINDER2_DAYS_OFFSET) return;

        // ── Reminder 2 (Tuesday) ──────────────────────────────────────────────
        const r2Employees = await schedulerRepository.findEmployeesForReminder2(lastWeekMonday);
        for (const emp of r2Employees) {
            try {
                await emailService.sendTimesheetReminder2(emp.email, emp.fullName, emp.weekStartDate);
                await schedulerRepository.markReminder2Sent(emp.userId, emp.weekStartDate);
                console.log(`[Scheduler] Reminder 2 sent → ${emp.email} (week ${emp.weekStartDate})`);
            } catch (err) {
                console.error(`[Scheduler] Failed to send Reminder 2 to ${emp.email}:`, err);
            }
        }

        if (daysSince < FREEZE_DAYS_OFFSET) return;

        // ── Freeze (Wednesday+) ───────────────────────────────────────────────
        const freezeEmployees = await schedulerRepository.findEmployeesForFreeze(lastWeekMonday);
        for (const emp of freezeEmployees) {
            try {
                await schedulerRepository.freezeEmployee(emp.userId, emp.weekStartDate);
                await emailService.sendFreezeNotification(
                    emp.email,
                    emp.fullName,
                    emp.managerEmail,
                    emp.managerName,
                    emp.weekStartDate,
                );
                console.log(`[Scheduler] Timesheet access frozen → ${emp.email} (week ${emp.weekStartDate})`);
            } catch (err) {
                console.error(`[Scheduler] Failed to freeze ${emp.email}:`, err);
            }
        }
    },
} as ISchedulerService & { processTimesheetNotifications(week: string): Promise<void> });
