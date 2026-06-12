import { RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { User, UserRole } from '../models/user.model';

export interface IAuthRepository {
    findActiveUserByUsername(username: string): Promise<User | null>;
    updatePassword(userId: number, passwordHash: string): Promise<void>;
}

// Shape of a raw database row returned by the login query
interface UserRow extends RowDataPacket {
    id: number;
    full_name: string;
    username: string;
    email: string;
    password_hash: string;
    role: string;            // resolved from roles.name via JOIN
    is_active: number;
    force_password_change: number;
}

// Convert a raw database row into a clean User object
const toUser = (row: UserRow): User => ({
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    isActive: row.is_active === 1,
    forcePasswordChange: row.force_password_change === 1,
});

export const AuthRepository: IAuthRepository = {

    // Find a user by username — only returns active users
    async findActiveUserByUsername(username: string): Promise<User | null> {
        const pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<UserRow[]>(
            `SELECT u.id, u.full_name, u.username, u.email, u.password_hash,
                    r.name AS role, u.is_active, u.force_password_change
             FROM   users u
             JOIN   roles r ON r.id = u.role_id
             WHERE  u.username = ? AND u.is_active = 1`,
            [username],
        );
        return rows[0] ? toUser(rows[0]) : null;
    },

    // Save the new hashed password and clear the force-change flag
    async updatePassword(userId: number, passwordHash: string): Promise<void> {
        const pool = DatabaseConnection.getPool();
        await pool.execute(
            `UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?`,
            [passwordHash, userId],
        );
    },
};
