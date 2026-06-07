/**
 * Seed script — creates the bootstrap admin account.
 * Run from the server/ directory: npx ts-node -P scripts/tsconfig.json scripts/seed.ts
 *
 * Reads DB credentials from server/.env
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'Admin@1234';
const BCRYPT_ROUNDS = 12;

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'prm_db',
    multipleStatements: true,
};

const SYSTEM_CONFIG_DEFAULTS = [
    ['llm_provider', 'gemini'],
    ['llm_api_key', ''],
    ['scheduler_interval_hours', '4'],
    ['max_weekly_hours', '40'],
];

async function seed(): Promise<void> {
    const connection = await mysql.createConnection(DB_CONFIG);

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

    await connection.execute(
        `INSERT IGNORE INTO users
       (username, email, password_hash, role, is_active, force_password_change)
     VALUES (?, ?, ?, 'ADMIN', 1, 1)`,
        ['admin', 'admin@techserve.local', passwordHash],
    );

    for (const [key, value] of SYSTEM_CONFIG_DEFAULTS) {
        await connection.execute(
            `INSERT IGNORE INTO system_config (config_key, config_value) VALUES (?, ?)`,
            [key, value],
        );
    }

    console.log('Seed complete.');
    console.log('Admin credentials — username: admin  |  password: Admin@1234');
    console.log('You will be prompted to change the password on first login.');

    await connection.end();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
