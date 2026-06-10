import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { EmployeeStatus } from '../models/employee.model';
import {
    AllocationSummaryDto,
    ProjectAllocationDto,
} from '../models/allocation.dto';
import { AllocationLineDto } from '../models/manager.dto';

const ISO_DATE_FORMAT = '%Y-%m-%d';

export interface AllocationRecord {
    id: number;
    employeeId: number;
    projectId: number;
}

export interface CreateAllocationParams {
    employeeId: number;
    projectId: number;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export interface IAllocationRepository {
    findAllActive(): Promise<AllocationSummaryDto[]>;
    findById(id: number): Promise<AllocationRecord | null>;
    findActiveByProject(projectId: number): Promise<ProjectAllocationDto[]>;
    findActiveLinesByEmployee(employeeId: number): Promise<AllocationLineDto[]>;
    getOverlappingUtilisation(employeeId: number, fromDate: string, toDate: string): Promise<number>;
    create(params: CreateAllocationParams): Promise<number>;
    endById(id: number): Promise<void>;
    recomputeEmployeeStatus(employeeId: number): Promise<void>;
}

interface AllocationSummaryRow extends RowDataPacket {
    id: number;
    employee_name: string;
    project_name: string;
    utilisation_percent: number;
    from_date: string;
    to_date: string;
}

interface ProjectAllocationRow extends RowDataPacket {
    id: number;
    employee_name: string;
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
    employee_id: number;
    project_id: number;
}

interface SumRow extends RowDataPacket {
    total: number;
}

interface CountRow extends RowDataPacket {
    count: number;
}

export const AllocationRepository: IAllocationRepository = {
    async findAllActive(): Promise<AllocationSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationSummaryRow[]>(
            `SELECT a.id, e.full_name AS employee_name, p.name AS project_name,
                    a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '${ISO_DATE_FORMAT}') AS from_date,
                    DATE_FORMAT(a.to_date, '${ISO_DATE_FORMAT}') AS to_date
             FROM allocations a
             JOIN employees e ON a.employee_id = e.id
             JOIN projects p ON a.project_id = p.id
             WHERE a.is_active = 1 AND a.to_date >= CURDATE()
             ORDER BY e.full_name ASC, p.name ASC`,
        );
        return rows.map((row) => ({
            id: row.id,
            employeeName: row.employee_name,
            projectName: row.project_name,
            utilisationPercent: row.utilisation_percent,
            fromDate: row.from_date,
            toDate: row.to_date,
        }));
    },

    async findById(id: number): Promise<AllocationRecord | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationRecordRow[]>(
            `SELECT id, employee_id, project_id FROM allocations WHERE id = ?`,
            [id],
        );
        if (rows.length === 0) return null;
        return { id: rows[0].id, employeeId: rows[0].employee_id, projectId: rows[0].project_id };
    },

    async findActiveByProject(projectId: number): Promise<ProjectAllocationDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ProjectAllocationRow[]>(
            `SELECT a.id, e.full_name AS employee_name, a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '${ISO_DATE_FORMAT}') AS from_date,
                    DATE_FORMAT(a.to_date, '${ISO_DATE_FORMAT}') AS to_date
             FROM allocations a
             JOIN employees e ON a.employee_id = e.id
             WHERE a.project_id = ? AND a.is_active = 1 AND a.to_date >= CURDATE()
             ORDER BY e.full_name ASC`,
            [projectId],
        );
        return rows.map((row) => ({
            id: row.id,
            employeeName: row.employee_name,
            utilisationPercent: row.utilisation_percent,
            fromDate: row.from_date,
            toDate: row.to_date,
        }));
    },

    async findActiveLinesByEmployee(employeeId: number): Promise<AllocationLineDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationLineRow[]>(
            `SELECT p.name AS project_name, a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '${ISO_DATE_FORMAT}') AS from_date,
                    DATE_FORMAT(a.to_date, '${ISO_DATE_FORMAT}') AS to_date
             FROM allocations a
             JOIN projects p ON a.project_id = p.id
             WHERE a.employee_id = ? AND a.is_active = 1 AND a.to_date >= CURDATE()
             ORDER BY p.name ASC`,
            [employeeId],
        );
        return rows.map((row) => ({
            projectName: row.project_name,
            utilisationPercent: row.utilisation_percent,
            fromDate: row.from_date,
            toDate: row.to_date,
        }));
    },

    async getOverlappingUtilisation(employeeId: number, fromDate: string, toDate: string): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SumRow[]>(
            `SELECT COALESCE(SUM(utilisation_percent), 0) AS total
             FROM allocations
             WHERE employee_id = ? AND is_active = 1
               AND from_date <= ? AND to_date >= ?`,
            [employeeId, toDate, fromDate],
        );
        return Number(rows[0].total);
    },

    async create(params: CreateAllocationParams): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [result] = await pool.execute(
            `INSERT INTO allocations (employee_id, project_id, utilisation_percent, from_date, to_date, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [params.employeeId, params.projectId, params.utilisationPercent, params.fromDate, params.toDate],
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

    async recomputeEmployeeStatus(employeeId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<CountRow[]>(
            `SELECT COUNT(*) AS count FROM allocations
             WHERE employee_id = ? AND is_active = 1 AND to_date >= CURDATE()`,
            [employeeId],
        );
        const status: EmployeeStatus = rows[0].count > 0 ? EmployeeStatus.ALLOCATED : EmployeeStatus.BENCH;
        await pool.execute(`UPDATE employees SET status = ? WHERE id = ?`, [status, employeeId]);
    },
};
