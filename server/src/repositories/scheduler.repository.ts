import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';

const AT_RISK_EFFORT_THRESHOLD = 0.5;
const ATTENTION_EFFORT_THRESHOLD = 0.8;
const ATTENTION_DAYS_AHEAD = 7;

export interface ReminderEmployeeRecord {
    userId: number;
    fullName: string;
    email: string;
    managerName: string;
    managerEmail: string;
    weekStartDate: string;
}

interface ReminderEmployeeRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    email: string;
    manager_name: string;
    manager_email: string;
    week_start_date: string;
}

export interface ISchedulerRepository {
    recomputeAllResourceStatuses(): Promise<number>;
    flagMissedTimesheets(weekStartDate: string): Promise<number>;
    updateAllProjectHealthStatuses(lastWeekMonday: string, maxWeeklyHours: number): Promise<number>;
    recomputeProjectHealth(projectId: number, lastWeekMonday: string, maxWeeklyHours: number): Promise<void>;
    // Timesheet reminder & freeze
    ensureReminderRecords(weekStartDate: string): Promise<void>;
    findEmployeesForReminder1(weekStartDate: string): Promise<ReminderEmployeeRecord[]>;
    findEmployeesForReminder2(weekStartDate: string): Promise<ReminderEmployeeRecord[]>;
    findEmployeesForFreeze(weekStartDate: string): Promise<ReminderEmployeeRecord[]>;
    markReminder1Sent(userId: number, weekStartDate: string): Promise<void>;
    markReminder2Sent(userId: number, weekStartDate: string): Promise<void>;
    freezeEmployee(userId: number, weekStartDate: string): Promise<void>;
}

export const SchedulerRepository: ISchedulerRepository = {
    async recomputeAllResourceStatuses(): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE resource_profiles rp
             SET rp.status = CASE
                 WHEN EXISTS (
                     SELECT 1 FROM allocations a
                     WHERE a.resource_id = rp.user_id
                       AND a.is_active = 1
                       AND a.to_date >= CURDATE()
                 ) THEN 'ALLOCATED'
                 ELSE 'BENCH'
             END`,
        );
        return result.affectedRows;
    },

    async flagMissedTimesheets(weekStartDate: string): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO timesheets (allocation_id, week_start_date, hours_worked, status, submitted_at)
             SELECT a.id, ?, 0, 'MISSED', NULL
             FROM allocations a
             WHERE a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
               AND a.to_date >= ?
               AND NOT EXISTS (
                   SELECT 1 FROM timesheets t
                   WHERE t.allocation_id = a.id AND t.week_start_date = ?
               )`,
            [weekStartDate, weekStartDate, weekStartDate, weekStartDate],
        );
        return result.affectedRows;
    },

    async updateAllProjectHealthStatuses(lastWeekMonday: string, maxWeeklyHours: number): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE projects p
             SET p.health = CASE
                 -- AT_RISK: overdue milestone OR < 50% of expected hours logged last week
                 WHEN EXISTS (
                     SELECT 1 FROM milestones m
                     WHERE m.project_id = p.id
                       AND m.status <> 'DONE'
                       AND m.due_date < CURDATE()
                 ) OR EXISTS (
                     SELECT 1 FROM allocations a
                     LEFT JOIN timesheets t
                         ON t.allocation_id = a.id
                         AND t.week_start_date = ?
                         AND t.status = 'SUBMITTED'
                     WHERE a.project_id = p.id
                       AND a.is_active = 1
                       AND a.from_date <= ?
                       AND a.to_date >= ?
                       AND COALESCE(t.hours_worked, 0) < (a.utilisation_percent / 100.0 * ? * ?)
                 )
                 THEN 'AT_RISK'

                 -- ATTENTION: milestone due within 7 days (not done) OR < 80% expected hours
                 WHEN EXISTS (
                     SELECT 1 FROM milestones m
                     WHERE m.project_id = p.id
                       AND m.status <> 'DONE'
                       AND m.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                 ) OR EXISTS (
                     SELECT 1 FROM allocations a
                     LEFT JOIN timesheets t
                         ON t.allocation_id = a.id
                         AND t.week_start_date = ?
                         AND t.status = 'SUBMITTED'
                     WHERE a.project_id = p.id
                       AND a.is_active = 1
                       AND a.from_date <= ?
                       AND a.to_date >= ?
                       AND COALESCE(t.hours_worked, 0) < (a.utilisation_percent / 100.0 * ? * ?)
                 )
                 THEN 'ATTENTION'

                 ELSE 'ON_TRACK'
             END
             WHERE p.status = 'ACTIVE'`,
            [
                // AT_RISK effort: week=lastWeekMonday, from_date<=lastWeekMonday, to_date>=lastWeekMonday, maxH, threshold
                lastWeekMonday, lastWeekMonday, lastWeekMonday, maxWeeklyHours, AT_RISK_EFFORT_THRESHOLD,
                // ATTENTION milestone days ahead
                ATTENTION_DAYS_AHEAD,
                // ATTENTION effort: week=lastWeekMonday, from_date<=lastWeekMonday, to_date>=lastWeekMonday, maxH, threshold
                lastWeekMonday, lastWeekMonday, lastWeekMonday, maxWeeklyHours, ATTENTION_EFFORT_THRESHOLD,
            ],
        );
        return result.affectedRows;
    },

    async recomputeProjectHealth(projectId: number, lastWeekMonday: string, maxWeeklyHours: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE projects p
             SET p.health = CASE
                 WHEN EXISTS (
                     SELECT 1 FROM milestones m
                     WHERE m.project_id = p.id
                       AND m.status <> 'DONE'
                       AND m.due_date < CURDATE()
                 ) OR EXISTS (
                     SELECT 1 FROM allocations a
                     LEFT JOIN timesheets t
                         ON t.allocation_id = a.id
                         AND t.week_start_date = ?
                         AND t.status = 'SUBMITTED'
                     WHERE a.project_id = p.id
                       AND a.is_active = 1
                       AND a.from_date <= ?
                       AND a.to_date >= ?
                       AND COALESCE(t.hours_worked, 0) < (a.utilisation_percent / 100.0 * ? * ?)
                 )
                 THEN 'AT_RISK'

                 WHEN EXISTS (
                     SELECT 1 FROM milestones m
                     WHERE m.project_id = p.id
                       AND m.status <> 'DONE'
                       AND m.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                 ) OR EXISTS (
                     SELECT 1 FROM allocations a
                     LEFT JOIN timesheets t
                         ON t.allocation_id = a.id
                         AND t.week_start_date = ?
                         AND t.status = 'SUBMITTED'
                     WHERE a.project_id = p.id
                       AND a.is_active = 1
                       AND a.from_date <= ?
                       AND a.to_date >= ?
                       AND COALESCE(t.hours_worked, 0) < (a.utilisation_percent / 100.0 * ? * ?)
                 )
                 THEN 'ATTENTION'

                 ELSE 'ON_TRACK'
             END
             WHERE p.id = ? AND p.status = 'ACTIVE'`,
            [
                lastWeekMonday, lastWeekMonday, lastWeekMonday, maxWeeklyHours, AT_RISK_EFFORT_THRESHOLD,
                ATTENTION_DAYS_AHEAD,
                lastWeekMonday, lastWeekMonday, lastWeekMonday, maxWeeklyHours, ATTENTION_EFFORT_THRESHOLD,
                projectId,
            ],
        );
    },

    // ── Timesheet reminder & freeze helpers ───────────────────────────────────

    /**
     * Inserts a skeleton timesheet_reminders row for every employee who has an
     * active allocation that week but has not yet submitted a timesheet.
     * Uses INSERT IGNORE so re-running is safe (idempotent).
     */
    async ensureReminderRecords(weekStartDate: string): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `INSERT IGNORE INTO timesheet_reminders (user_id, week_start_date)
             SELECT DISTINCT a.resource_id, ?
             FROM allocations a
             WHERE a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
               AND a.to_date >= ?
               AND EXISTS (
                   SELECT 1 FROM resource_profiles rp WHERE rp.user_id = a.resource_id
               )
               AND NOT EXISTS (
                   SELECT 1 FROM timesheets t
                   WHERE t.allocation_id = a.id
                     AND t.week_start_date = ?
                     AND t.status = 'SUBMITTED'
               )`,
            [weekStartDate, weekStartDate, weekStartDate, weekStartDate],
        );
    },

    /**
     * Returns employees who still haven't submitted and have NOT yet received
     * Reminder 1.  Called from day 7 onwards (Monday after the missed week).
     */
    async findEmployeesForReminder1(weekStartDate: string): Promise<ReminderEmployeeRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ReminderEmployeeRow[]>(
            `SELECT tr.user_id, u.full_name, u.email,
                    mu.full_name AS manager_name, mu.email AS manager_email,
                    DATE_FORMAT(tr.week_start_date, '%Y-%m-%d') AS week_start_date
             FROM timesheet_reminders tr
             JOIN users u ON u.id = tr.user_id
             JOIN resource_profiles rp ON rp.user_id = tr.user_id
             JOIN users mu ON mu.id = rp.reporting_to
             WHERE tr.week_start_date = ?
               AND tr.reminder1_sent_at IS NULL
               AND EXISTS (
                   SELECT 1 FROM allocations a
                   WHERE a.resource_id = tr.user_id
                     AND a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
                     AND a.to_date >= ?
                     AND NOT EXISTS (
                         SELECT 1 FROM timesheets t
                         WHERE t.allocation_id = a.id
                           AND t.week_start_date = ?
                           AND t.status = 'SUBMITTED'
                     )
               )`,
            [weekStartDate, weekStartDate, weekStartDate, weekStartDate],
        );
        return rows.map((r) => ({
            userId: r.user_id,
            fullName: r.full_name,
            email: r.email,
            managerName: r.manager_name,
            managerEmail: r.manager_email,
            weekStartDate: r.week_start_date,
        }));
    },

    /**
     * Returns employees who received Reminder 1, still haven't submitted, and
     * have NOT yet received Reminder 2.  Called from day 8 onwards (Tuesday).
     */
    async findEmployeesForReminder2(weekStartDate: string): Promise<ReminderEmployeeRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ReminderEmployeeRow[]>(
            `SELECT tr.user_id, u.full_name, u.email,
                    mu.full_name AS manager_name, mu.email AS manager_email,
                    DATE_FORMAT(tr.week_start_date, '%Y-%m-%d') AS week_start_date
             FROM timesheet_reminders tr
             JOIN users u ON u.id = tr.user_id
             JOIN resource_profiles rp ON rp.user_id = tr.user_id
             JOIN users mu ON mu.id = rp.reporting_to
             WHERE tr.week_start_date = ?
               AND tr.reminder1_sent_at IS NOT NULL
               AND tr.reminder2_sent_at IS NULL
               AND EXISTS (
                   SELECT 1 FROM allocations a
                   WHERE a.resource_id = tr.user_id
                     AND a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
                     AND a.to_date >= ?
                     AND NOT EXISTS (
                         SELECT 1 FROM timesheets t
                         WHERE t.allocation_id = a.id
                           AND t.week_start_date = ?
                           AND t.status = 'SUBMITTED'
                     )
               )`,
            [weekStartDate, weekStartDate, weekStartDate, weekStartDate],
        );
        return rows.map((r) => ({
            userId: r.user_id,
            fullName: r.full_name,
            email: r.email,
            managerName: r.manager_name,
            managerEmail: r.manager_email,
            weekStartDate: r.week_start_date,
        }));
    },

    /**
     * Returns employees who received both reminders, still haven't submitted,
     * and have NOT yet been frozen.  Called from day 9 onwards (Wednesday+).
     */
    async findEmployeesForFreeze(weekStartDate: string): Promise<ReminderEmployeeRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ReminderEmployeeRow[]>(
            `SELECT tr.user_id, u.full_name, u.email,
                    mu.full_name AS manager_name, mu.email AS manager_email,
                    DATE_FORMAT(tr.week_start_date, '%Y-%m-%d') AS week_start_date
             FROM timesheet_reminders tr
             JOIN users u ON u.id = tr.user_id
             JOIN resource_profiles rp ON rp.user_id = tr.user_id
             JOIN users mu ON mu.id = rp.reporting_to
             WHERE tr.week_start_date = ?
               AND tr.reminder2_sent_at IS NOT NULL
               AND tr.frozen_at IS NULL
               AND EXISTS (
                   SELECT 1 FROM allocations a
                   WHERE a.resource_id = tr.user_id
                     AND a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
                     AND a.to_date >= ?
                     AND NOT EXISTS (
                         SELECT 1 FROM timesheets t
                         WHERE t.allocation_id = a.id
                           AND t.week_start_date = ?
                           AND t.status = 'SUBMITTED'
                     )
               )`,
            [weekStartDate, weekStartDate, weekStartDate, weekStartDate],
        );
        return rows.map((r) => ({
            userId: r.user_id,
            fullName: r.full_name,
            email: r.email,
            managerName: r.manager_name,
            managerEmail: r.manager_email,
            weekStartDate: r.week_start_date,
        }));
    },

    async markReminder1Sent(userId: number, weekStartDate: string): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE timesheet_reminders
             SET reminder1_sent_at = NOW()
             WHERE user_id = ? AND week_start_date = ? AND reminder1_sent_at IS NULL`,
            [userId, weekStartDate],
        );
    },

    async markReminder2Sent(userId: number, weekStartDate: string): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE timesheet_reminders
             SET reminder2_sent_at = NOW()
             WHERE user_id = ? AND week_start_date = ? AND reminder2_sent_at IS NULL`,
            [userId, weekStartDate],
        );
    },

    /**
     * Marks the reminder record as frozen and sets timesheet_frozen = 1 on the
     * employee's resource_profile.  Both updates run in the same transaction.
     */
    async freezeEmployee(userId: number, weekStartDate: string): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(
                `UPDATE timesheet_reminders
                 SET frozen_at = NOW()
                 WHERE user_id = ? AND week_start_date = ? AND frozen_at IS NULL`,
                [userId, weekStartDate],
            );
            await connection.execute(
                `UPDATE resource_profiles SET timesheet_frozen = 1 WHERE user_id = ?`,
                [userId],
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },
};
