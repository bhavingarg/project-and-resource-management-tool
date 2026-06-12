import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { EmployeeStatus } from '../models/employee.model';
import { ProjectStatus, ProjectHealth, MilestoneStatus } from '../models/project.model';

const ISO_DATE_FORMAT = '%Y-%m-%d';
const RECENT_ACTIVITY_WEEKS = 4;

export interface TeamMemberRecord {
    userId: number;
    fullName: string;
    status: EmployeeStatus;
    utilisationPercent: number;
}

export interface ManagerProjectRecord {
    id: number;
    name: string;
    endDate: string;
    status: ProjectStatus;
    health: ProjectHealth;
}

export interface ManagerMilestoneRecord {
    title: string;
    dueDate: string;
    status: MilestoneStatus;
}

export interface IManagerRepository {
    findTeamMembers(managerUserId: number): Promise<TeamMemberRecord[]>;
    findTeamMemberByUserId(managerUserId: number, userId: number): Promise<TeamMemberRecord | null>;
    findManagerProjects(managerUserId: number): Promise<ManagerProjectRecord[]>;
    findManagerProjectById(managerUserId: number, projectId: number): Promise<ManagerProjectRecord | null>;
    findProjectMilestones(projectId: number): Promise<ManagerMilestoneRecord[]>;
    findRecentActivityTags(userId: number): Promise<string[]>;
}

interface TeamMemberRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    status: EmployeeStatus;
    utilisation_percent: number;
}

interface ManagerProjectRow extends RowDataPacket {
    id: number;
    name: string;
    end_date: string;
    status: ProjectStatus;
    health: ProjectHealth;
}

interface ManagerMilestoneRow extends RowDataPacket {
    title: string;
    due_date: string;
    status: MilestoneStatus;
}

interface TagRow extends RowDataPacket {
    tag_name: string;
}

// Current utilisation = sum of active allocation percentages for this resource
const TEAM_MEMBER_COLUMNS = `
    u.id AS user_id, u.full_name, rp.status,
    COALESCE((
        SELECT SUM(a.utilisation_percent) FROM allocations a
        WHERE a.resource_id = u.id AND a.is_active = 1
          AND CURDATE() BETWEEN a.from_date AND a.to_date
    ), 0) AS utilisation_percent
`;

const mapManagerProject = (row: ManagerProjectRow): ManagerProjectRecord => ({
    id: row.id,
    name: row.name,
    endDate: row.end_date,
    status: row.status,
    health: row.health,
});

const mapTeamMember = (row: TeamMemberRow): TeamMemberRecord => ({
    userId: row.user_id,
    fullName: row.full_name,
    status: row.status,
    utilisationPercent: Number(row.utilisation_percent),
});

export const ManagerRepository: IManagerRepository = {
    async findTeamMembers(managerUserId: number): Promise<TeamMemberRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TeamMemberRow[]>(
            `SELECT ${TEAM_MEMBER_COLUMNS}
             FROM resource_profiles rp
             JOIN users u ON u.id = rp.user_id
             WHERE rp.reporting_to = ? AND u.is_active = 1
             ORDER BY u.full_name ASC`,
            [managerUserId],
        );
        return rows.map(mapTeamMember);
    },

    async findTeamMemberByUserId(managerUserId: number, userId: number): Promise<TeamMemberRecord | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TeamMemberRow[]>(
            `SELECT ${TEAM_MEMBER_COLUMNS}
             FROM resource_profiles rp
             JOIN users u ON u.id = rp.user_id
             WHERE rp.reporting_to = ? AND rp.user_id = ?`,
            [managerUserId, userId],
        );
        return rows.length > 0 ? mapTeamMember(rows[0]) : null;
    },

    async findManagerProjects(managerUserId: number): Promise<ManagerProjectRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ManagerProjectRow[]>(
            `SELECT id, name, DATE_FORMAT(end_date, '${ISO_DATE_FORMAT}') AS end_date, status, health
             FROM projects WHERE manager_id = ? ORDER BY id ASC`,
            [managerUserId],
        );
        return rows.map(mapManagerProject);
    },

    async findManagerProjectById(managerUserId: number, projectId: number): Promise<ManagerProjectRecord | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ManagerProjectRow[]>(
            `SELECT id, name, DATE_FORMAT(end_date, '${ISO_DATE_FORMAT}') AS end_date, status, health
             FROM projects WHERE manager_id = ? AND id = ?`,
            [managerUserId, projectId],
        );
        return rows.length > 0 ? mapManagerProject(rows[0]) : null;
    },

    async findProjectMilestones(projectId: number): Promise<ManagerMilestoneRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ManagerMilestoneRow[]>(
            `SELECT title, DATE_FORMAT(due_date, '${ISO_DATE_FORMAT}') AS due_date, status
             FROM milestones WHERE project_id = ? ORDER BY id ASC`,
            [projectId],
        );
        return rows.map((row) => ({
            title: row.title,
            dueDate: row.due_date,
            status: row.status,
        }));
    },

    // In V2, timesheets are linked via allocation_id â†’ allocations.resource_id
    async findRecentActivityTags(userId: number): Promise<string[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TagRow[]>(
            `SELECT DISTINCT tt.tag_name
             FROM timesheet_tags tt
             JOIN timesheets ts ON tt.timesheet_id = ts.id
             JOIN allocations a ON ts.allocation_id = a.id
             WHERE a.resource_id = ?
               AND ts.week_start_date >= DATE_SUB(CURDATE(), INTERVAL ${RECENT_ACTIVITY_WEEKS} WEEK)
             ORDER BY tt.tag_name ASC`,
            [userId],
        );
        return rows.map((row) => row.tag_name);
    },
};
