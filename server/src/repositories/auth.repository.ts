import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { User, UserRole } from '../models/user.model';

export interface IAuthRepository {
    findActiveUserByUsername(username: string): Promise<User | null>;
    updatePassword(userId: number, passwordHash: string): Promise<void>;
}

interface UserRow extends RowDataPacket {
    id: number;
    full_name: string;
    username: string;
    email: string;
    password_hash: string;
    role: UserRole;
    is_active: number;
    force_password_change: number;
}

const mapRowToUser = (row: UserRow): User => ({
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active === 1,
    forcePasswordChange: row.force_password_change === 1,
});

export const AuthRepository: IAuthRepository = {
    async findActiveUserByUsername(username: string): Promise<User | null> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<UserRow[]>(
            `SELECT id, full_name, username, email, password_hash, role, is_active, force_password_change
             FROM users
             WHERE username = ? AND is_active = 1`,
            [username],
        );
        return rows.length > 0 ? mapRowToUser(rows[0]) : null;
    },

    async updatePassword(userId: number, passwordHash: string): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE users
             SET password_hash = ?, force_password_change = 0
             WHERE id = ?`,
            [passwordHash, userId],
        );
    },
};
