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

export interface AtRiskProjectRecord {
    projectId: number;
    projectName: string;
    managerId: number;
    managerName: string;
    managerEmail: string;
    health: string;
}

export interface SuggestedHelpRecord {
    fullName: string;
    freePercent: number;
    skills: string[];
}

interface ReminderEmployeeRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    email: string;
    manager_name: string;
    manager_email: string;
    week_start_date: string;
}

interface AtRiskProjectRow extends RowDataPacket {
    project_id: number;
    project_name: string;
    manager_id: number;
    manager_name: string;
    manager_email: string;
    health: string;
}

interface SuggestedHelpRow extends RowDataPacket {
    full_name: string;
    utilisation_percent: number;
    skills: string | null;
}

interface MilestoneRow extends RowDataPacket {
    title: string;
    due_date: string;
    status: string;
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
    // Project at-risk notification
    resetAtRiskNotifiedForHealthyProjects(): Promise<void>;
    findNewlyAtRiskProjects(): Promise<AtRiskProjectRecord[]>;
    markAtRiskNotified(projectId: number): Promise<void>;
    findSuggestedHelpForProject(projectId: number): Promise<SuggestedHelpRecord[]>;
    findProjectMilestones(projectId: number): Promise<{ title: string; dueDate: string; status: string; isOverdue: boolean }[]>;
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

    // ── Project at-risk notification ─────────────────────────────────────────

    /**
     * Resets `at_risk_notified_at` for projects that are no longer AT_RISK, so
     * that when they become AT_RISK again, a fresh notification is sent.
     */
    async resetAtRiskNotifiedForHealthyProjects(): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE projects
             SET at_risk_notified_at = NULL
             WHERE health != 'AT_RISK' AND at_risk_notified_at IS NOT NULL`,
        );
    },

    /**
     * Returns active projects that are AT_RISK but have not yet been notified
     * in the current AT_RISK cycle (at_risk_notified_at IS NULL).
     */
    async findNewlyAtRiskProjects(): Promise<AtRiskProjectRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AtRiskProjectRow[]>(
            `SELECT p.id AS project_id, p.name AS project_name, p.health,
                    u.id AS manager_id, u.full_name AS manager_name, u.email AS manager_email
             FROM projects p
             JOIN users u ON u.id = p.manager_id
             WHERE p.health = 'AT_RISK'
               AND p.status = 'ACTIVE'
               AND p.at_risk_notified_at IS NULL`,
        );
        return rows.map((r) => ({
            projectId: r.project_id,
            projectName: r.project_name,
            managerId: r.manager_id,
            managerName: r.manager_name,
            managerEmail: r.manager_email,
            health: r.health,
        }));
    },

    async markAtRiskNotified(projectId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE projects SET at_risk_notified_at = NOW() WHERE id = ?`,
            [projectId],
        );
    },

    /**
     * Returns employees not on `projectId` who:
     *   1. Have at least one skill that matches (case-insensitive) the project team's skills, AND
     *   2. Have free capacity (utilisation < 100%)
     * Falls back to any available employee if no skill match is found.
     * Ordered by most available first, limited to 5.
     */
    async findSuggestedHelpForProject(projectId: number): Promise<SuggestedHelpRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();

        // Step 1 — collect distinct skill names from the project's current team (lowercased)
        const [skillRows] = await pool.execute<RowDataPacket[]>(
            `SELECT DISTINCT LOWER(rs.skill_name) AS skill
             FROM allocations a
             JOIN resource_skills rs ON rs.user_id = a.resource_id
             WHERE a.project_id = ? AND a.is_active = 1`,
            [projectId],
        );
        const projectSkills: string[] = skillRows.map((r) => r.skill as string);

        // Step 2 — build query; if project team has no recorded skills, fall back to all available
        let whereSkillClause = '';
        const params: (string | number)[] = [];

        if (projectSkills.length > 0) {
            // Normalize each project skill: strip non-alphanumeric, lowercase.
            // Also add the base form without trailing 'js' (e.g. 'reactjs' → 'react')
            // so that 'React' and 'Reactjs' both match, and 'Next.js' matches 'nextjs'.
            const patterns = new Set<string>();
            for (const skill of projectSkills) {
                const norm = skill.replace(/[^a-z0-9]/gi, '').toLowerCase();
                patterns.add(norm);
                if (norm.endsWith('js')) patterns.add(norm.slice(0, -2)); // 'reactjs' → 'react'
                if (norm.endsWith('.js')) patterns.add(norm.slice(0, -3)); // shouldn't happen post-norm but safe
            }

            // SQL: normalize candidate skill the same way, then check bidirectional substring
            // REGEXP_REPLACE strips non-alphanumeric on the DB side
            const likeConditions = [...patterns]
                .map(() => `REGEXP_REPLACE(LOWER(ri.skill_name), '[^a-z0-9]', '') LIKE ?`)
                .join(' OR ');
            whereSkillClause = `AND EXISTS (
                SELECT 1 FROM resource_skills ri
                WHERE ri.user_id = u.id AND (${likeConditions})
            )`;
            params.push(...[...patterns].map((p) => `%${p}%`));
        }

        const sql = `SELECT u.full_name,
                    COALESCE((
                        SELECT SUM(a2.utilisation_percent)
                        FROM allocations a2
                        WHERE a2.resource_id = u.id AND a2.is_active = 1
                          AND CURDATE() BETWEEN a2.from_date AND a2.to_date
                    ), 0) AS utilisation_percent,
                    GROUP_CONCAT(DISTINCT rs.skill_name ORDER BY rs.skill_name SEPARATOR '|') AS skills
             FROM users u
             JOIN roles r ON r.id = u.role_id AND r.name = 'RESOURCE'
             LEFT JOIN resource_skills rs ON rs.user_id = u.id
             WHERE u.is_active = 1
               ${whereSkillClause}
               AND NOT EXISTS (
                   SELECT 1 FROM allocations a
                   WHERE a.resource_id = u.id
                     AND a.project_id = ?
                     AND a.is_active = 1
               )
               AND COALESCE((
                   SELECT SUM(a2.utilisation_percent)
                   FROM allocations a2
                   WHERE a2.resource_id = u.id AND a2.is_active = 1
                     AND CURDATE() BETWEEN a2.from_date AND a2.to_date
               ), 0) < 100
             GROUP BY u.id, u.full_name
             ORDER BY utilisation_percent ASC
             LIMIT 5`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [rows] = await (pool as any).execute(sql, [...params, projectId]) as [SuggestedHelpRow[], unknown];
        return rows.map((r) => ({
            fullName: r.full_name,
            freePercent: 100 - Number(r.utilisation_percent),
            skills: r.skills ? r.skills.split('|').filter(Boolean) : [],
        }));
    },

    async findProjectMilestones(projectId: number): Promise<{ title: string; dueDate: string; status: string; isOverdue: boolean }[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const today = new Date().toISOString().slice(0, 10);
        const [rows] = await pool.execute<MilestoneRow[]>(
            `SELECT title, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, status
             FROM milestones
             WHERE project_id = ?
             ORDER BY due_date ASC`,
            [projectId],
        );
        return rows.map((r) => ({
            title: r.title,
            dueDate: r.due_date,
            status: r.status,
            isOverdue: r.status !== 'DONE' && r.due_date < today,
        }));
    },
};
