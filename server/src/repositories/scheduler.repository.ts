import { Pool, ResultSetHeader } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';

const AT_RISK_EFFORT_THRESHOLD = 0.5;
const ATTENTION_EFFORT_THRESHOLD = 0.8;
const ATTENTION_DAYS_AHEAD = 7;

export interface ISchedulerRepository {
    recomputeAllResourceStatuses(): Promise<number>;
    flagMissedTimesheets(weekStartDate: string): Promise<number>;
    updateAllProjectHealthStatuses(lastWeekMonday: string, maxWeeklyHours: number): Promise<number>;
    recomputeProjectHealth(projectId: number, lastWeekMonday: string, maxWeeklyHours: number): Promise<void>;
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
};
