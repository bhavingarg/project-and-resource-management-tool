import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { EmployeeStatus } from '../models/employee.model';
import {
    AllocationSummaryDto,
    ProjectAllocationDto,
    MyAllocationDto,
} from '../models/allocation.dto';
import { AllocationLineDto } from '../models/manager.dto';

const ISO_DATE_FORMAT = '%Y-%m-%d';

export interface AllocationRecord {
    id: number;
    resourceId: number;
    projectId: number;
}

export interface CreateAllocationParams {
    resourceId: number;
    projectId: number;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export interface IAllocationRepository {
    findAllActive(): Promise<AllocationSummaryDto[]>;
    findById(id: number): Promise<AllocationRecord | null>;
    findActiveByProject(projectId: number): Promise<ProjectAllocationDto[]>;
    findActiveLinesByEmployee(resourceId: number): Promise<AllocationLineDto[]>;
    getOverlappingUtilisation(resourceId: number, fromDate: string, toDate: string): Promise<number>;
    create(params: CreateAllocationParams): Promise<number>;
    endById(id: number): Promise<void>;
    endActiveAllocationsByManager(resourceId: number, managerUserId: number): Promise<void>;
    recomputeResourceStatus(userId: number): Promise<void>;
    findAllByUserId(userId: number): Promise<MyAllocationDto[]>;
}

interface AllocationSummaryRow extends RowDataPacket {
    id: number;
    resource_name: string;
    project_name: string;
    utilisation_percent: number;
    from_date: string;
    to_date: string;
}

interface ProjectAllocationRow extends RowDataPacket {
    id: number;
    resource_name: string;
    utilisation_percent: number;
    from_date: string;
    to_date: string;
}

interface AllocationLineRow extends RowDataPacket {
    project_name: string;
    utilisation_percent: number;
    from_date: string;
    to_date: string;
}

interface AllocationRecordRow extends RowDataPacket {
    id: number;
    resource_id: number;
    project_id: number;
}

interface SumRow extends RowDataPacket {
    total: number;
}

interface CountRow extends RowDataPacket {
    count: number;
}

interface MyAllocationRow extends RowDataPacket {
    allocation_id: number;
    project_name: string;
    utilisation_percent: number;
    from_date: string;
    to_date: string;
    is_current: number;
}

export const AllocationRepository: IAllocationRepository = {
    async findAllActive(): Promise<AllocationSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationSummaryRow[]>(
            `SELECT a.id, u.full_name AS resource_name, p.name AS project_name,
                    a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '${ISO_DATE_FORMAT}') AS from_date,
                    DATE_FORMAT(a.to_date, '${ISO_DATE_FORMAT}') AS to_date
             FROM allocations a
             JOIN users u ON a.resource_id = u.id
             JOIN projects p ON a.project_id = p.id
             WHERE a.is_active = 1 AND a.to_date >= CURDATE()
             ORDER BY u.full_name ASC, p.name ASC`,
        );
        return rows.map((row) => ({
            id: row.id,
            resourceName: row.resource_name,
            projectName: row.project_name,
            utilisationPercent: row.utilisation_percent,
            fromDate: row.from_date,
            toDate: row.to_date,
        }));
    },

    async findById(id: number): Promise<AllocationRecord | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationRecordRow[]>(
            `SELECT id, resource_id, project_id FROM allocations WHERE id = ?`,
            [id],
        );
        if (rows.length === 0) return null;
        return { id: rows[0].id, resourceId: rows[0].resource_id, projectId: rows[0].project_id };
    },

    async findActiveByProject(projectId: number): Promise<ProjectAllocationDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ProjectAllocationRow[]>(
            `SELECT a.id, u.full_name AS resource_name, a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '${ISO_DATE_FORMAT}') AS from_date,
                    DATE_FORMAT(a.to_date, '${ISO_DATE_FORMAT}') AS to_date
             FROM allocations a
             JOIN users u ON a.resource_id = u.id
             WHERE a.project_id = ? AND a.is_active = 1 AND a.to_date >= CURDATE()
             ORDER BY u.full_name ASC`,
            [projectId],
        );
        return rows.map((row) => ({
            id: row.id,
            resourceName: row.resource_name,
            utilisationPercent: row.utilisation_percent,
            fromDate: row.from_date,
            toDate: row.to_date,
        }));
    },

    async findActiveLinesByEmployee(resourceId: number): Promise<AllocationLineDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationLineRow[]>(
            `SELECT p.name AS project_name, a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '${ISO_DATE_FORMAT}') AS from_date,
                    DATE_FORMAT(a.to_date, '${ISO_DATE_FORMAT}') AS to_date
             FROM allocations a
             JOIN projects p ON a.project_id = p.id
             WHERE a.resource_id = ? AND a.is_active = 1 AND a.to_date >= CURDATE()
             ORDER BY p.name ASC`,
            [resourceId],
        );
        return rows.map((row) => ({
            projectName: row.project_name,
            utilisationPercent: row.utilisation_percent,
            fromDate: row.from_date,
            toDate: row.to_date,
        }));
    },

    async getOverlappingUtilisation(resourceId: number, fromDate: string, toDate: string): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SumRow[]>(
            `SELECT COALESCE(SUM(utilisation_percent), 0) AS total
             FROM allocations
             WHERE resource_id = ? AND is_active = 1
               AND from_date <= ? AND to_date >= ?`,
            [resourceId, toDate, fromDate],
        );
        return Number(rows[0].total);
    },

    async create(params: CreateAllocationParams): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [result] = await pool.execute(
            `INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [params.resourceId, params.projectId, params.utilisationPercent, params.fromDate, params.toDate],
        );
        return (result as { insertId: number }).insertId;
    },

    async endById(id: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE allocations SET is_active = 0, to_date = CURDATE() WHERE id = ?`,
            [id],
        );
    },

    async endActiveAllocationsByManager(resourceId: number, managerUserId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        // End all active allocations for this resource on projects owned by the given manager
        await pool.execute(
            `UPDATE allocations a
             JOIN projects p ON p.id = a.project_id
             SET a.is_active = 0, a.to_date = CURDATE()
             WHERE a.resource_id = ? AND p.manager_id = ?
               AND a.is_active = 1 AND a.to_date >= CURDATE()`,
            [resourceId, managerUserId],
        );
    },

    // Recomputes BENCH/ALLOCATED status in resource_profiles based on active allocations
    async recomputeResourceStatus(userId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<CountRow[]>(
            `SELECT COUNT(*) AS count FROM allocations
             WHERE resource_id = ? AND is_active = 1 AND to_date >= CURDATE()`,
            [userId],
        );
        const status: EmployeeStatus = rows[0].count > 0 ? EmployeeStatus.ALLOCATED : EmployeeStatus.BENCH;
        await pool.execute(
            `UPDATE resource_profiles SET status = ? WHERE user_id = ?`,
            [status, userId],
        );
    },

    async findAllByUserId(userId: number): Promise<MyAllocationDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<MyAllocationRow[]>(
            `SELECT a.id AS allocation_id, p.name AS project_name, a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '%Y-%m-%d') AS from_date,
                    DATE_FORMAT(a.to_date, '%Y-%m-%d') AS to_date,
                    (a.is_active = 1 AND a.to_date >= CURDATE()) AS is_current
             FROM allocations a
             JOIN projects p ON a.project_id = p.id
             WHERE a.resource_id = ?
             ORDER BY a.from_date DESC`,
            [userId],
        );
        return rows.map((row) => ({
            allocationId: row.allocation_id,
            projectName: row.project_name,
            utilisationPercent: row.utilisation_percent,
            fromDate: row.from_date,
            toDate: row.to_date,
            status: row.is_current === 1 ? 'ACTIVE' : 'ENDED',
        }));
    },
};
