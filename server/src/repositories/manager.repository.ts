import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { EmployeeStatus } from '../models/employee.model';
import { ProjectStatus, ProjectHealth, MilestoneStatus } from '../models/project.model';

const ISO_DATE_FORMAT = '%Y-%m-%d';
const RECENT_ACTIVITY_WEEKS = 4;

export interface TeamMemberRecord {
    employeeId: number;
    userId: number;
    fullName: string;
    department: string;
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
    findRecentActivityTags(employeeId: number): Promise<string[]>;
}

interface TeamMemberRow extends RowDataPacket {
    employee_id: number;
    user_id: number;
    full_name: string;
    department: string;
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

const TEAM_MEMBER_COLUMNS = `
    e.id AS employee_id, e.user_id, e.full_name, e.department, e.status,
    COALESCE((
        SELECT SUM(a.utilisation_percent) FROM allocations a
        WHERE a.employee_id = e.id AND a.is_active = 1
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
    employeeId: row.employee_id,
    userId: row.user_id,
    fullName: row.full_name,
    department: row.department,
    status: row.status,
    utilisationPercent: Number(row.utilisation_percent),
});

export const ManagerRepository: IManagerRepository = {
    async findTeamMembers(managerUserId: number): Promise<TeamMemberRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TeamMemberRow[]>(
            `SELECT ${TEAM_MEMBER_COLUMNS}
             FROM employees e
             WHERE e.manager_id = ? AND e.is_active = 1
             ORDER BY e.full_name ASC`,
            [managerUserId],
        );
        return rows.map(mapTeamMember);
    },

    async findTeamMemberByUserId(managerUserId: number, userId: number): Promise<TeamMemberRecord | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TeamMemberRow[]>(
            `SELECT ${TEAM_MEMBER_COLUMNS}
             FROM employees e
             WHERE e.manager_id = ? AND e.user_id = ?`,
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

    async findRecentActivityTags(employeeId: number): Promise<string[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<TagRow[]>(
            `SELECT DISTINCT tt.tag_name
             FROM timesheet_tags tt
             JOIN timesheets ts ON tt.timesheet_id = ts.id
             WHERE ts.employee_id = ?
               AND ts.week_start_date >= DATE_SUB(CURDATE(), INTERVAL ${RECENT_ACTIVITY_WEEKS} WEEK)
             ORDER BY tt.tag_name ASC`,
            [employeeId],
        );
        return rows.map((row) => row.tag_name);
    },
};
