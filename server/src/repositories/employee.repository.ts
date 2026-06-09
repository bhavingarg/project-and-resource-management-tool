import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { EmployeeStatus, SkillCategory, ProficiencyLevel } from '../models/employee.model';
import {
    EmployeeSummaryDto,
    EmployeeDetailDto,
    UpdateEmployeeRequestDto,
    EmployeeSkillDto,
} from '../models/employee.dto';

const UNASSIGNED_PROFILE_FIELD = 'Unassigned';

export interface IEmployeeRepository {
    createForUser(userId: number, fullName: string, email: string): Promise<void>;
    findAll(): Promise<EmployeeSummaryDto[]>;
    findById(id: number): Promise<EmployeeDetailDto | null>;
    findByUserId(userId: number): Promise<EmployeeDetailDto | null>;
    update(id: number, dto: UpdateEmployeeRequestDto): Promise<void>;
    deactivate(id: number): Promise<void>;
    reactivate(id: number): Promise<void>;
    assignManager(id: number, managerId: number): Promise<void>;
    getActiveAllocationCount(id: number): Promise<number>;
    getActiveAllocationSummaries(id: number): Promise<string[]>;
    endActiveAllocations(id: number): Promise<void>;
    deactivateLinkedUser(id: number): Promise<void>;
    getSkills(employeeId: number): Promise<EmployeeSkillDto[]>;
    addSkill(employeeId: number, skillName: string, category: SkillCategory, proficiencyLevel: ProficiencyLevel): Promise<void>;
    updateSkillProficiency(skillId: number, proficiencyLevel: ProficiencyLevel): Promise<void>;
    removeSkill(skillId: number): Promise<void>;
    findSkillById(skillId: number): Promise<EmployeeSkillDto | null>;
}

interface EmployeeSummaryRow extends RowDataPacket {
    id: number;
    user_id: number;
    full_name: string;
    department: string;
    status: EmployeeStatus;
    is_active: number;
}

interface EmployeeDetailRow extends RowDataPacket {
    id: number;
    user_id: number;
    full_name: string;
    email: string;
    department: string;
    designation: string;
    status: EmployeeStatus;
    manager_id: number | null;
    is_active: number;
}

interface SkillRow extends RowDataPacket {
    id: number;
    skill_name: string;
    category: SkillCategory;
    proficiency_level: ProficiencyLevel;
}

interface AllocationSummaryRow extends RowDataPacket {
    project_name: string;
    utilisation_percent: number;
    to_date: string;
}

interface CountRow extends RowDataPacket {
    count: number;
}

const mapSummary = (row: EmployeeSummaryRow): EmployeeSummaryDto => ({
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    department: row.department,
    status: row.status,
    isActive: row.is_active === 1,
});

const mapDetail = (row: EmployeeDetailRow): EmployeeDetailDto => ({
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    department: row.department,
    designation: row.designation,
    status: row.status,
    managerId: row.manager_id,
    isActive: row.is_active === 1,
});

const mapSkill = (row: SkillRow): EmployeeSkillDto => ({
    id: row.id,
    skillName: row.skill_name,
    category: row.category,
    proficiencyLevel: row.proficiency_level,
});

export const EmployeeRepository: IEmployeeRepository = {
    async createForUser(userId: number, fullName: string, email: string): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `INSERT INTO employees (user_id, full_name, email, department, designation, status, is_active)
             VALUES (?, ?, ?, ?, ?, 'BENCH', 1)`,
            [userId, fullName, email, UNASSIGNED_PROFILE_FIELD, UNASSIGNED_PROFILE_FIELD],
        );
    },

    async findAll(): Promise<EmployeeSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<EmployeeSummaryRow[]>(
            `SELECT id, user_id, full_name, department, status, is_active
             FROM employees ORDER BY id ASC`,
        );
        return rows.map(mapSummary);
    },

    async findById(id: number): Promise<EmployeeDetailDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<EmployeeDetailRow[]>(
            `SELECT id, user_id, full_name, email, department, designation, status, manager_id, is_active
             FROM employees WHERE id = ?`,
            [id],
        );
        return rows.length > 0 ? mapDetail(rows[0]) : null;
    },

    async findByUserId(userId: number): Promise<EmployeeDetailDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<EmployeeDetailRow[]>(
            `SELECT id, user_id, full_name, email, department, designation, status, manager_id, is_active
             FROM employees WHERE user_id = ?`,
            [userId],
        );
        return rows.length > 0 ? mapDetail(rows[0]) : null;
    },

    async update(id: number, dto: UpdateEmployeeRequestDto): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const fields: string[] = [];
        const values: unknown[] = [];

        if (dto.fullName !== undefined) { fields.push('full_name = ?'); values.push(dto.fullName); }
        if (dto.email !== undefined) { fields.push('email = ?'); values.push(dto.email); }
        if (dto.department !== undefined) { fields.push('department = ?'); values.push(dto.department); }
        if (dto.designation !== undefined) { fields.push('designation = ?'); values.push(dto.designation); }

        if (fields.length === 0) return;
        values.push(id);
        await pool.execute(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values as string[]);
    },

    async deactivate(id: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(`UPDATE employees SET is_active = 0 WHERE id = ?`, [id]);
    },

    async reactivate(id: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(`UPDATE employees SET is_active = 1 WHERE id = ?`, [id]);
    },

    async assignManager(id: number, managerId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(`UPDATE employees SET manager_id = ? WHERE id = ?`, [managerId, id]);
    },

    async getActiveAllocationCount(id: number): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<CountRow[]>(
            `SELECT COUNT(*) AS count FROM allocations
             WHERE employee_id = ? AND is_active = 1 AND to_date >= CURDATE()`,
            [id],
        );
        return rows[0].count;
    },

    async getActiveAllocationSummaries(id: number): Promise<string[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationSummaryRow[]>(
            `SELECT p.name AS project_name, a.utilisation_percent, a.to_date
             FROM allocations a
             JOIN projects p ON a.project_id = p.id
             WHERE a.employee_id = ? AND a.is_active = 1 AND a.to_date >= CURDATE()`,
            [id],
        );
        return rows.map((r) => {
            const date = new Date(r.to_date);
            const formatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            return `${r.project_name} (${r.utilisation_percent}%, ends ${formatted})`;
        });
    },

    async endActiveAllocations(id: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE allocations SET is_active = 0, to_date = CURDATE()
             WHERE employee_id = ? AND is_active = 1 AND to_date >= CURDATE()`,
            [id],
        );
    },

    async deactivateLinkedUser(id: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE users u
             JOIN employees e ON e.user_id = u.id
             SET u.is_active = 0
             WHERE e.id = ?`,
            [id],
        );
    },

    async getSkills(employeeId: number): Promise<EmployeeSkillDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SkillRow[]>(
            `SELECT id, skill_name, category, proficiency_level
             FROM employee_skills WHERE employee_id = ? ORDER BY id ASC`,
            [employeeId],
        );
        return rows.map(mapSkill);
    },

    async addSkill(employeeId: number, skillName: string, category: SkillCategory, proficiencyLevel: ProficiencyLevel): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `INSERT INTO employee_skills (employee_id, skill_name, category, proficiency_level)
             VALUES (?, ?, ?, ?)`,
            [employeeId, skillName, category, proficiencyLevel],
        );
    },

    async updateSkillProficiency(skillId: number, proficiencyLevel: ProficiencyLevel): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE employee_skills SET proficiency_level = ? WHERE id = ?`,
            [proficiencyLevel, skillId],
        );
    },

    async removeSkill(skillId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(`DELETE FROM employee_skills WHERE id = ?`, [skillId]);
    },

    async findSkillById(skillId: number): Promise<EmployeeSkillDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SkillRow[]>(
            `SELECT id, skill_name, category, proficiency_level FROM employee_skills WHERE id = ?`,
            [skillId],
        );
        return rows.length > 0 ? mapSkill(rows[0]) : null;
    },
};
