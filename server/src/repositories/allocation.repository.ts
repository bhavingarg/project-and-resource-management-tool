import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { AllocationSummaryDto } from '../models/allocation.dto';

const ISO_DATE_FORMAT = '%Y-%m-%d';

export interface IAllocationRepository {
    findAllActive(): Promise<AllocationSummaryDto[]>;
}

interface AllocationRow extends RowDataPacket {
    id: number;
    employee_name: string;
    project_name: string;
    utilisation_percent: number;
    from_date: string;
    to_date: string;
}

const mapSummary = (row: AllocationRow): AllocationSummaryDto => ({
    id: row.id,
    employeeName: row.employee_name,
    projectName: row.project_name,
    utilisationPercent: row.utilisation_percent,
    fromDate: row.from_date,
    toDate: row.to_date,
});

export const AllocationRepository: IAllocationRepository = {
    async findAllActive(): Promise<AllocationSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationRow[]>(
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
        return rows.map(mapSummary);
    },
};
