import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { UserRole } from '../models/user.model';
import { UserSummaryDto } from '../models/user.dto';

export interface IUserRepository {
    findById(id: number): Promise<UserSummaryDto | null>;
    findByUsernameOrId(usernameOrId: string): Promise<UserSummaryDto | null>;
    findAll(): Promise<UserSummaryDto[]>;
    existsByUsername(username: string): Promise<boolean>;
    existsByEmail(email: string): Promise<boolean>;
    create(fullName: string, email: string, username: string, passwordHash: string, role: UserRole): Promise<number>;
    updatePassword(userId: number, passwordHash: string): Promise<void>;
    setActiveStatus(userId: number, isActive: boolean): Promise<void>;
}

interface UserRow extends RowDataPacket {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: UserRole;
    is_active: number;
}

const mapRowToSummary = (row: UserRow): UserSummaryDto => ({
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active === 1,
});

export const UserRepository: IUserRepository = {
    async findById(id: number): Promise<UserSummaryDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<UserRow[]>(
            `SELECT id, username, full_name, email, role, is_active FROM users WHERE id = ?`,
            [id],
        );
        return rows.length > 0 ? mapRowToSummary(rows[0]) : null;
    },

    async findByUsernameOrId(usernameOrId: string): Promise<UserSummaryDto | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const isNumeric = /^\d+$/.test(usernameOrId);
        const query = isNumeric
            ? `SELECT id, username, full_name, email, role, is_active FROM users WHERE id = ?`
            : `SELECT id, username, full_name, email, role, is_active FROM users WHERE username = ?`;
        const [rows] = await pool.execute<UserRow[]>(query, [usernameOrId]);
        return rows.length > 0 ? mapRowToSummary(rows[0]) : null;
    },

    async findAll(): Promise<UserSummaryDto[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<UserRow[]>(
            `SELECT id, username, full_name, email, role, is_active FROM users ORDER BY id ASC`,
        );
        return rows.map(mapRowToSummary);
    },

    async existsByUsername(username: string): Promise<boolean> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT 1 FROM users WHERE username = ? LIMIT 1`,
            [username],
        );
        return rows.length > 0;
    },

    async existsByEmail(email: string): Promise<boolean> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT 1 FROM users WHERE email = ? LIMIT 1`,
            [email],
        );
        return rows.length > 0;
    },

    async create(fullName: string, email: string, username: string, passwordHash: string, role: UserRole): Promise<number> {
        const pool: Pool = DatabaseConnection.getPool();
        const [result] = await pool.execute(
            `INSERT INTO users (full_name, email, username, password_hash, role, is_active, force_password_change)
             VALUES (?, ?, ?, ?, ?, 1, 1)`,
            [fullName, email, username, passwordHash, role],
        );
        return (result as { insertId: number }).insertId;
    },

    async updatePassword(userId: number, passwordHash: string): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE users SET password_hash = ?, force_password_change = 1 WHERE id = ?`,
            [passwordHash, userId],
        );
    },

    async setActiveStatus(userId: number, isActive: boolean): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE users SET is_active = ? WHERE id = ?`,
            [isActive ? 1 : 0, userId],
        );
    },
};
