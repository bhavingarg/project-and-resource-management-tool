import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { EmployeeStatus, SkillCategory, ProficiencyLevel } from '../models/employee.model';
import {
    EmployeeSummaryDto,
    EmployeeDetailDto,
    UpdateEmployeeRequestDto,
    EmployeeSkillDto,
} from '../models/employee.dto';

// V2: employees are RESOURCE-role users; profiles live in resource_profiles, skills in resource_skills

export interface IEmployeeRepository {
    findAll(): Promise<EmployeeSummaryDto[]>;
    findByUserId(userId: number): Promise<EmployeeDetailDto | null>;
    update(userId: number, dto: UpdateEmployeeRequestDto): Promise<void>;
    assignManager(userId: number, managerId: number): Promise<void>;
    getActiveAllocationCount(userId: number): Promise<number>;
    getActiveAllocationSummaries(userId: number): Promise<string[]>;
    endActiveAllocations(userId: number): Promise<void>;
    getSkills(userId: number): Promise<EmployeeSkillDto[]>;
    addSkill(userId: number, skillName: string, category: SkillCategory, proficiencyLevel: ProficiencyLevel): Promise<void>;
    updateSkillProficiency(skillId: number, proficiencyLevel: ProficiencyLevel): Promise<void>;
    removeSkill(skillId: number): Promise<void>;
    findSkillById(skillId: number): Promise<EmployeeSkillDto | null>;
}

interface ResourceSummaryRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    status: EmployeeStatus | null;
    reporting_to: number | null;
    is_active: number;
}

interface ResourceDetailRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    email: string;
    status: EmployeeStatus | null;
    reporting_to: number | null;
    department: string | null;
    designation: string | null;
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

const mapSummary = (row: ResourceSummaryRow): EmployeeSummaryDto => ({
    userId: row.user_id,
    fullName: row.full_name,
    status: row.status,
    reportingToId: row.reporting_to,
    isActive: row.is_active === 1,
});

const mapDetail = (row: ResourceDetailRow): EmployeeDetailDto => ({
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    status: row.status,
    reportingToId: row.reporting_to,
    department: row.department,
    designation: row.designation,
    isActive: row.is_active === 1,
});

const mapSkill = (row: SkillRow): EmployeeSkillDto => ({
    id: row.id,
    skillName: row.skill_name,
    category: row.category,
    proficiencyLevel: row.proficiency_level,
});

export const EmployeeRepository: IEmployeeRepository = {
    async findAll(): Promise<EmployeeSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ResourceSummaryRow[]>(
            `SELECT u.id AS user_id, u.full_name, u.is_active,
                    rp.status, rp.reporting_to
             FROM users u
             JOIN roles r ON r.id = u.role_id AND r.name = 'RESOURCE'
             LEFT JOIN resource_profiles rp ON rp.user_id = u.id
             ORDER BY u.full_name ASC`,
        );
        return rows.map(mapSummary);
    },

    async findByUserId(userId: number): Promise<EmployeeDetailDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<ResourceDetailRow[]>(
            `SELECT u.id AS user_id, u.full_name, u.email, u.is_active,
                    rp.status, rp.reporting_to, rp.department, rp.designation
             FROM users u
             JOIN roles r ON r.id = u.role_id AND r.name = 'RESOURCE'
             LEFT JOIN resource_profiles rp ON rp.user_id = u.id
             WHERE u.id = ?`,
            [userId],
        );
        return rows.length > 0 ? mapDetail(rows[0]) : null;
    },

    async update(userId: number, dto: UpdateEmployeeRequestDto): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        const userFields: string[] = [];
        const userValues: unknown[] = [];

        if (dto.fullName !== undefined) { userFields.push('full_name = ?'); userValues.push(dto.fullName); }
        if (dto.email !== undefined) { userFields.push('email = ?'); userValues.push(dto.email); }

        if (userFields.length > 0) {
            userValues.push(userId);
            await pool.execute(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userValues as string[]);
        }

        const profileFields: string[] = [];
        const profileValues: unknown[] = [];

        if (dto.department !== undefined) { profileFields.push('department = ?'); profileValues.push(dto.department); }
        if (dto.designation !== undefined) { profileFields.push('designation = ?'); profileValues.push(dto.designation); }

        if (profileFields.length > 0) {
            profileValues.push(userId);
            await pool.execute(`UPDATE resource_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`, profileValues as string[]);
        }
    },

    // Creates or updates the resource_profiles row (reporting_to is NOT NULL in V2 schema)
    async assignManager(userId: number, managerId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `INSERT INTO resource_profiles (user_id, reporting_to, status)
             VALUES (?, ?, 'BENCH')
             ON DUPLICATE KEY UPDATE reporting_to = ?`,
            [userId, managerId, managerId],
        );
    },

    async getActiveAllocationCount(userId: number): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<CountRow[]>(
            `SELECT COUNT(*) AS count FROM allocations
             WHERE resource_id = ? AND is_active = 1 AND to_date >= CURDATE()`,
            [userId],
        );
        return rows[0].count;
    },

    async getActiveAllocationSummaries(userId: number): Promise<string[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<AllocationSummaryRow[]>(
            `SELECT p.name AS project_name, a.utilisation_percent, a.to_date
             FROM allocations a
             JOIN projects p ON a.project_id = p.id
             WHERE a.resource_id = ? AND a.is_active = 1 AND a.to_date >= CURDATE()`,
            [userId],
        );
        return rows.map((r) => {
            const date = new Date(r.to_date);
            const formatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            return `${r.project_name} (${r.utilisation_percent}%, ends ${formatted})`;
        });
    },

    async endActiveAllocations(userId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE allocations SET is_active = 0, to_date = CURDATE()
             WHERE resource_id = ? AND is_active = 1 AND to_date >= CURDATE()`,
            [userId],
        );
    },

    async getSkills(userId: number): Promise<EmployeeSkillDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SkillRow[]>(
            `SELECT id, skill_name, category, proficiency_level
             FROM resource_skills WHERE user_id = ? ORDER BY id ASC`,
            [userId],
        );
        return rows.map(mapSkill);
    },

    async addSkill(userId: number, skillName: string, category: SkillCategory, proficiencyLevel: ProficiencyLevel): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level)
             VALUES (?, ?, ?, ?)`,
            [userId, skillName, category, proficiencyLevel],
        );
    },

    async updateSkillProficiency(skillId: number, proficiencyLevel: ProficiencyLevel): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE resource_skills SET proficiency_level = ? WHERE id = ?`,
            [proficiencyLevel, skillId],
        );
    },

    async removeSkill(skillId: number): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(`DELETE FROM resource_skills WHERE id = ?`, [skillId]);
    },

    async findSkillById(skillId: number): Promise<EmployeeSkillDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SkillRow[]>(
            `SELECT id, skill_name, category, proficiency_level FROM resource_skills WHERE id = ?`,
            [skillId],
        );
        return rows.length > 0 ? mapSkill(rows[0]) : null;
    },
};
