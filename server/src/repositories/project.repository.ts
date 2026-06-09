import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { ProjectStatus, MilestoneStatus } from '../models/project.model';
import {
    ProjectSummaryDto,
    ProjectDetailDto,
    CreateProjectRequestDto,
    UpdateProjectRequestDto,
    MilestoneDto,
} from '../models/project.dto';

const ISO_DATE_FORMAT = '%Y-%m-%d';

export interface IProjectRepository {
    findAllSummaries(): Promise<ProjectSummaryDto[]>;
    findById(id: number): Promise<ProjectDetailDto | null>;
    create(dto: CreateProjectRequestDto): Promise<number>;
    update(id: number, dto: UpdateProjectRequestDto): Promise<void>;
    getMilestones(projectId: number): Promise<MilestoneDto[]>;
    findMilestoneById(milestoneId: number): Promise<MilestoneDto | null>;
    addMilestone(projectId: number, title: string, dueDate: string, storyPoints: number): Promise<void>;
    updateMilestoneStatus(milestoneId: number, status: MilestoneStatus): Promise<void>;
}

interface ProjectSummaryRow extends RowDataPacket {
    id: number;
    name: string;
    manager_id: number;
    manager_name: string;
    end_date: string;
    status: ProjectStatus;
    story_points_done: number;
    total_story_points: number;
}

interface ProjectDetailRow extends RowDataPacket {
    id: number;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
    manager_id: number;
    manager_name: string;
    total_story_points: number;
}

interface MilestoneRow extends RowDataPacket {
    id: number;
    title: string;
    due_date: string;
    story_points: number;
    status: MilestoneStatus;
}

const mapSummary = (row: ProjectSummaryRow): ProjectSummaryDto => ({
    id: row.id,
    name: row.name,
    managerId: row.manager_id,
    managerName: row.manager_name,
    endDate: row.end_date,
    status: row.status,
    storyPointsDone: Number(row.story_points_done),
    totalStoryPoints: row.total_story_points,
});

const mapDetail = (row: ProjectDetailRow): ProjectDetailDto => ({
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    managerId: row.manager_id,
    managerName: row.manager_name,
    totalStoryPoints: row.total_story_points,
});

const mapMilestone = (row: MilestoneRow): MilestoneDto => ({
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    storyPoints: row.story_points,
    status: row.status,
});

export const ProjectRepository: IProjectRepository = {
    async findAllSummaries(): Promise<ProjectSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ProjectSummaryRow[]>(
            `SELECT p.id, p.name, p.manager_id, u.full_name AS manager_name,
                    DATE_FORMAT(p.end_date, '${ISO_DATE_FORMAT}') AS end_date,
                    p.status, p.total_story_points,
                    COALESCE((
                        SELECT SUM(m.story_points) FROM milestones m
                        WHERE m.project_id = p.id AND m.status = 'DONE'
                    ), 0) AS story_points_done
             FROM projects p
             JOIN users u ON p.manager_id = u.id
             ORDER BY p.id ASC`,
        );
        return rows.map(mapSummary);
    },

    async findById(id: number): Promise<ProjectDetailDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ProjectDetailRow[]>(
            `SELECT p.id, p.name, p.description,
                    DATE_FORMAT(p.start_date, '${ISO_DATE_FORMAT}') AS start_date,
                    DATE_FORMAT(p.end_date, '${ISO_DATE_FORMAT}') AS end_date,
                    p.status, p.manager_id, u.full_name AS manager_name, p.total_story_points
             FROM projects p
             JOIN users u ON p.manager_id = u.id
             WHERE p.id = ?`,
            [id],
        );
        return rows.length > 0 ? mapDetail(rows[0]) : null;
    },

    async create(dto: CreateProjectRequestDto): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [result] = await pool.execute(
            `INSERT INTO projects (name, description, start_date, end_date, status, manager_id, total_story_points)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                dto.name,
                dto.description ?? null,
                dto.startDate,
                dto.endDate,
                dto.status,
                dto.managerId,
                dto.totalStoryPoints,
            ],
        );
        return (result as { insertId: number }).insertId;
    },

    async update(id: number, dto: UpdateProjectRequestDto): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const fields: string[] = [];
        const values: unknown[] = [];

        if (dto.name !== undefined) { fields.push('name = ?'); values.push(dto.name); }
        if (dto.description !== undefined) { fields.push('description = ?'); values.push(dto.description); }
        if (dto.startDate !== undefined) { fields.push('start_date = ?'); values.push(dto.startDate); }
        if (dto.endDate !== undefined) { fields.push('end_date = ?'); values.push(dto.endDate); }
        if (dto.status !== undefined) { fields.push('status = ?'); values.push(dto.status); }
        if (dto.managerId !== undefined) { fields.push('manager_id = ?'); values.push(dto.managerId); }
        if (dto.totalStoryPoints !== undefined) { fields.push('total_story_points = ?'); values.push(dto.totalStoryPoints); }

        if (fields.length === 0) return;
        values.push(id);
        await pool.execute(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values as string[]);
    },

    async getMilestones(projectId: number): Promise<MilestoneDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<MilestoneRow[]>(
            `SELECT id, title, DATE_FORMAT(due_date, '${ISO_DATE_FORMAT}') AS due_date, story_points, status
             FROM milestones WHERE project_id = ? ORDER BY id ASC`,
            [projectId],
        );
        return rows.map(mapMilestone);
    },

    async findMilestoneById(milestoneId: number): Promise<MilestoneDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<MilestoneRow[]>(
            `SELECT id, title, DATE_FORMAT(due_date, '${ISO_DATE_FORMAT}') AS due_date, story_points, status
             FROM milestones WHERE id = ?`,
            [milestoneId],
        );
        return rows.length > 0 ? mapMilestone(rows[0]) : null;
    },

    async addMilestone(projectId: number, title: string, dueDate: string, storyPoints: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `INSERT INTO milestones (project_id, title, due_date, story_points)
             VALUES (?, ?, ?, ?)`,
            [projectId, title, dueDate, storyPoints],
        );
    },

    async updateMilestoneStatus(milestoneId: number, status: MilestoneStatus): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(`UPDATE milestones SET status = ? WHERE id = ?`, [status, milestoneId]);
    },
};
