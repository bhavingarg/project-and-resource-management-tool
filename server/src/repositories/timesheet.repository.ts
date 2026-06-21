import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import {
    ActiveAllocationForWeekDto,
    TimesheetSummaryDto,
    TimesheetEntryDto,
    TimesheetDetailDto,
    TimesheetReminderDto,
    TeamTimesheetRowDto,
    SubmitTimesheetEntryDto,
} from '../models/timesheet.dto';

const ISO_DATE_FORMAT = '%Y-%m-%d';

export interface ITimesheetRepository {
    findActiveAllocationsForWeek(userId: number, weekStartDate: string): Promise<ActiveAllocationForWeekDto[]>;
    submitWeek(weekStartDate: string, entries: SubmitTimesheetEntryDto[]): Promise<void>;
    findMySummaries(userId: number): Promise<TimesheetSummaryDto[]>;
    findMyWeekDetail(userId: number, weekStartDate: string): Promise<TimesheetDetailDto | null>;
    findTeamTimesheets(managerUserId: number, weekStartDate: string): Promise<TeamTimesheetRowDto[]>;
    findTeamMemberWeekDetail(managerUserId: number, userId: number, weekStartDate: string): Promise<TimesheetDetailDto | null>;
    getReminderInfo(userId: number, lastWeekMonday: string): Promise<TimesheetReminderDto>;
    isFrozen(userId: number): Promise<boolean>;
    isManagerOf(managerUserId: number, targetUserId: number): Promise<boolean>;
    unfreezeEmployee(userId: number, restoredBy: number): Promise<void>;
}

interface ActiveAllocationRow extends RowDataPacket {
    allocation_id: number;
    project_id: number;
    project_name: string;
    utilisation_percent: number;
}

interface TimesheetSummaryRow extends RowDataPacket {
    week_start_date: string;
    total_hours: number;
    status: 'SUBMITTED' | 'MISSED';
}

interface TimesheetDetailRow extends RowDataPacket {
    allocation_id: number;
    project_name: string;
    hours_worked: number;
    week_start_date: string;
    tags: string | null;
}

interface TeamTimesheetRow extends RowDataPacket {
    user_id: number;
    resource_name: string;
    project_name: string;
    hours_worked: number;
    status: 'SUBMITTED' | 'MISSED';
    is_frozen: number;
}

interface CountRow extends RowDataPacket {
    count: number;
}

const mapDetailRows = (rows: TimesheetDetailRow[], weekStartDate: string): TimesheetDetailDto | null => {
    if (rows.length === 0) return null;
    const entries: TimesheetEntryDto[] = rows.map((row) => ({
        allocationId: row.allocation_id,
        projectName: row.project_name,
        hoursWorked: Number(row.hours_worked),
        tags: row.tags ? row.tags.split('|').filter(Boolean) : [],
    }));
    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
    return { weekStartDate, totalHours, status: 'SUBMITTED', entries };
};

export const TimesheetRepository: ITimesheetRepository = {
    async findActiveAllocationsForWeek(userId: number, weekStartDate: string): Promise<ActiveAllocationForWeekDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ActiveAllocationRow[]>(
            `SELECT a.id AS allocation_id, a.project_id, p.name AS project_name, a.utilisation_percent
             FROM allocations a
             JOIN projects p ON a.project_id = p.id
             WHERE a.resource_id = ?
               AND a.is_active = 1
               AND a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
               AND a.to_date >= ?
             ORDER BY p.name ASC`,
            [userId, weekStartDate, weekStartDate],
        );
        return rows.map((row) => ({
            allocationId: row.allocation_id,
            projectId: row.project_id,
            projectName: row.project_name,
            utilisationPercent: row.utilisation_percent,
        }));
    },

    async submitWeek(weekStartDate: string, entries: SubmitTimesheetEntryDto[]): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            for (const entry of entries) {
                // Remove any scheduler-inserted MISSED row so we can INSERT a SUBMITTED row.
                // If a SUBMITTED row already exists, the INSERT below will throw ER_DUP_ENTRY.
                await connection.execute(
                    `DELETE FROM timesheets WHERE allocation_id = ? AND week_start_date = ? AND status = 'MISSED'`,
                    [entry.allocationId, weekStartDate],
                );
                const [result] = await connection.execute<ResultSetHeader>(
                    `INSERT INTO timesheets (allocation_id, week_start_date, hours_worked, status, submitted_at)
                     VALUES (?, ?, ?, 'SUBMITTED', NOW())`,
                    [entry.allocationId, weekStartDate, entry.hoursWorked],
                );
                const timesheetId = result.insertId;
                for (const tag of entry.tags) {
                    await connection.execute(
                        `INSERT INTO timesheet_tags (timesheet_id, tag_name) VALUES (?, ?)`,
                        [timesheetId, tag],
                    );
                }
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async findMySummaries(userId: number): Promise<TimesheetSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TimesheetSummaryRow[]>(
            `WITH RECURSIVE week_range AS (
                 SELECT DATE_SUB(CURDATE(), INTERVAL ((DAYOFWEEK(CURDATE()) + 5) % 7) DAY) AS wk
                 UNION ALL
                 SELECT DATE_SUB(wk, INTERVAL 7 DAY) FROM week_range
                 WHERE wk > DATE_SUB(CURDATE(), INTERVAL 84 DAY)
             )
             SELECT DATE_FORMAT(wr.wk, '${ISO_DATE_FORMAT}') AS week_start_date,
                    COALESCE(SUM(CASE WHEN t.status = 'SUBMITTED' THEN t.hours_worked ELSE 0 END), 0) AS total_hours,
                    CASE WHEN SUM(CASE WHEN t.status = 'SUBMITTED' THEN 1 ELSE 0 END) > 0 THEN 'SUBMITTED' ELSE 'MISSED' END AS status
             FROM week_range wr
             INNER JOIN allocations a
                 ON a.resource_id = ?
                 AND a.from_date <= DATE_ADD(wr.wk, INTERVAL 6 DAY)
                 AND a.to_date >= wr.wk
             LEFT JOIN timesheets t ON t.allocation_id = a.id AND t.week_start_date = wr.wk
             GROUP BY wr.wk
             HAVING wr.wk < DATE_SUB(CURDATE(), INTERVAL ((DAYOFWEEK(CURDATE()) + 5) % 7) DAY)
                 OR SUM(CASE WHEN t.status = 'SUBMITTED' THEN 1 ELSE 0 END) > 0
             ORDER BY wr.wk DESC`,
            [userId],
        );
        return rows.map((row) => ({
            weekStartDate: row.week_start_date,
            totalHours: Number(row.total_hours),
            status: row.status,
        }));
    },

    async findMyWeekDetail(userId: number, weekStartDate: string): Promise<TimesheetDetailDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TimesheetDetailRow[]>(
            `SELECT t.allocation_id,
                    p.name AS project_name,
                    t.hours_worked,
                    DATE_FORMAT(t.week_start_date, '${ISO_DATE_FORMAT}') AS week_start_date,
                    GROUP_CONCAT(tt.tag_name ORDER BY tt.tag_name SEPARATOR '|') AS tags
             FROM timesheets t
             JOIN allocations a ON t.allocation_id = a.id
             JOIN projects p ON a.project_id = p.id
             LEFT JOIN timesheet_tags tt ON tt.timesheet_id = t.id
             WHERE a.resource_id = ? AND t.week_start_date = ? AND t.status = 'SUBMITTED'
             GROUP BY t.id, t.allocation_id, p.name, t.hours_worked, t.week_start_date
             ORDER BY p.name ASC`,
            [userId, weekStartDate],
        );
        return mapDetailRows(rows, weekStartDate);
    },

    async findTeamTimesheets(managerUserId: number, weekStartDate: string): Promise<TeamTimesheetRowDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TeamTimesheetRow[]>(
            `SELECT u.id AS user_id, u.full_name AS resource_name,
                    p.name AS project_name,
                    COALESCE(t.hours_worked, 0) AS hours_worked,
                    CASE WHEN t.id IS NULL OR t.status = 'MISSED' THEN 'MISSED' ELSE 'SUBMITTED' END AS status,
                    COALESCE(rp.timesheet_frozen, 0) AS is_frozen
             FROM allocations a
             JOIN users u ON a.resource_id = u.id
             JOIN resource_profiles rp ON rp.user_id = u.id
             JOIN projects p ON a.project_id = p.id
             LEFT JOIN timesheets t ON t.allocation_id = a.id AND t.week_start_date = ? AND t.status = 'SUBMITTED'
             WHERE rp.reporting_to = ?
               AND a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
               AND a.to_date >= ?
             ORDER BY u.full_name ASC, p.name ASC`,
            [weekStartDate, managerUserId, weekStartDate, weekStartDate],
        );
        return rows.map((row) => ({
            userId: row.user_id,
            resourceName: row.resource_name,
            projectName: row.project_name,
            hoursWorked: Number(row.hours_worked),
            status: row.status,
            isFrozen: row.is_frozen === 1,
        }));
    },

    async findTeamMemberWeekDetail(managerUserId: number, userId: number, weekStartDate: string): Promise<TimesheetDetailDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TimesheetDetailRow[]>(
            `SELECT t.allocation_id,
                    p.name AS project_name,
                    t.hours_worked,
                    DATE_FORMAT(t.week_start_date, '${ISO_DATE_FORMAT}') AS week_start_date,
                    GROUP_CONCAT(tt.tag_name ORDER BY tt.tag_name SEPARATOR '|') AS tags
             FROM timesheets t
             JOIN allocations a ON t.allocation_id = a.id
             JOIN resource_profiles rp ON rp.user_id = a.resource_id
             JOIN projects p ON a.project_id = p.id
             LEFT JOIN timesheet_tags tt ON tt.timesheet_id = t.id
             WHERE a.resource_id = ? AND t.week_start_date = ? AND rp.reporting_to = ? AND t.status = 'SUBMITTED'
             GROUP BY t.id, t.allocation_id, p.name, t.hours_worked, t.week_start_date
             ORDER BY p.name ASC`,
            [userId, weekStartDate, managerUserId],
        );
        return mapDetailRows(rows, weekStartDate);
    },

    async getReminderInfo(userId: number, lastWeekMonday: string): Promise<TimesheetReminderDto> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<CountRow[]>(
            `SELECT COUNT(*) AS count
             FROM allocations a
             WHERE a.resource_id = ?
               AND a.from_date <= DATE_ADD(?, INTERVAL 6 DAY)
               AND a.to_date >= ?
               AND NOT EXISTS (
                   SELECT 1 FROM timesheets t
                   WHERE t.allocation_id = a.id AND t.week_start_date = ? AND t.status = 'SUBMITTED'
               )`,
            [userId, lastWeekMonday, lastWeekMonday, lastWeekMonday],
        );
        return { isMissing: rows[0].count > 0, weekStartDate: lastWeekMonday };
    },

    async isFrozen(userId: number): Promise<boolean> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT timesheet_frozen FROM resource_profiles WHERE user_id = ?`,
            [userId],
        );
        return rows.length > 0 && rows[0].timesheet_frozen === 1;
    },

    async isManagerOf(managerUserId: number, targetUserId: number): Promise<boolean> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT 1 FROM resource_profiles WHERE user_id = ? AND reporting_to = ?`,
            [targetUserId, managerUserId],
        );
        return rows.length > 0;
    },

    /**
     * Clears the freeze flag on resource_profiles and records the restore event
     * on the most recent unfulfilled timesheet_reminders row for this user.
     */
    async unfreezeEmployee(userId: number, restoredBy: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(
                `UPDATE resource_profiles SET timesheet_frozen = 0 WHERE user_id = ?`,
                [userId],
            );
            await connection.execute(
                `UPDATE timesheet_reminders
                 SET restored_at = NOW(), restored_by = ?
                 WHERE user_id = ?
                   AND frozen_at IS NOT NULL
                   AND restored_at IS NULL
                 ORDER BY frozen_at DESC
                 LIMIT 1`,
                [restoredBy, userId],
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
