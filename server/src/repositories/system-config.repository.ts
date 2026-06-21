import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { AppConfig } from '../config/app.config';
import { encrypt, decrypt } from '../utils/crypto.util';

// Keys whose values are encrypted at rest in the DB
const ENCRYPTED_KEYS = new Set(['llm_api_key']);

// ── Default configuration values seeded on first startup ──────────────────
const DEFAULT_CONFIG: { key: string; value: string; description: string }[] = [
    {
        key: 'llm_provider',
        value: 'custom',
        description: 'LLM provider for AI features. Allowed values: gemini, groq, custom (Ollama)',
    },
    {
        key: 'llm_api_key',
        value: '',
        description: 'API key for the selected LLM provider (not required for local Ollama)',
    },
    {
        key: 'llm_model',
        value: 'gemma3:12b-it-q8_0',
        description: 'Model name passed to the selected LLM provider (e.g. gemma3:12b-it-q8_0)',
    },
    {
        key: 'llm_host',
        value: 'http://164.52.211.238/api/generate',
        description: 'Host endpoint URL for custom LLM provider (Ollama-compatible)',
    },
    {
        key: 'scheduler_interval_hours',
        value: '4',
        description: 'How often the background health/status scheduler runs (in hours)',
    },
    {
        key: 'max_weekly_hours',
        value: '40',
        description: 'Standard working hours per week used for effort calculations',
    },
];

interface SystemConfigRow extends RowDataPacket {
    config_key: string;
    config_value: string;
    description: string;
    updated_at: string;
}

export interface SystemConfigRecord {
    key: string;
    value: string;
    description: string;
    updatedAt: string;
}

export interface ISystemConfigRepository {
    initialize(): Promise<void>;
    getAll(): Promise<SystemConfigRecord[]>;
    get(key: string, defaultValue?: string): Promise<string>;
    set(key: string, value: string): Promise<boolean>;
}

export const SystemConfigRepository: ISystemConfigRepository = {
    async initialize(): Promise<void> {
        const pool: Pool = DatabaseConnection.getPool();

        // Create table if it doesn't exist (uses actual column names already in DB)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS system_config (
                config_key   VARCHAR(100)  NOT NULL PRIMARY KEY,
                config_value VARCHAR(500)  NOT NULL,
                description  VARCHAR(500)  NOT NULL DEFAULT '',
                updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Add description column if it was created before this column existed
        const [cols] = await pool.execute<RowDataPacket[]>(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_config' AND COLUMN_NAME = 'description'`,
        );
        if ((cols as RowDataPacket[]).length === 0) {
            await pool.execute(
                "ALTER TABLE system_config ADD COLUMN description VARCHAR(500) NOT NULL DEFAULT ''",
            );
        }

        // Seed defaults — INSERT IGNORE so existing values are never overwritten
        for (const entry of DEFAULT_CONFIG) {
            await pool.execute(
                'INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)',
                [entry.key, entry.value, entry.description],
            );
        }

        console.log('[SystemConfig] Table ready.');
    },

    async getAll(): Promise<SystemConfigRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SystemConfigRow[]>(
            "SELECT config_key, config_value, description, DATE_FORMAT(updated_at, '%Y-%m-%dT%T') AS updated_at FROM system_config ORDER BY config_key",
        );
        return rows.map((r) => ({
            key: r.config_key,
            // Decrypt sensitive values before returning to the service layer
            value: ENCRYPTED_KEYS.has(r.config_key)
                ? decrypt(r.config_value, AppConfig.encryptionKey)
                : r.config_value,
            description: r.description,
            updatedAt: r.updated_at,
        }));
    },

    async get(key: string, defaultValue = ''): Promise<string> {
        const pool: Pool = DatabaseConnection.getPool();
        const [rows] = await pool.execute<SystemConfigRow[]>(
            'SELECT config_value FROM system_config WHERE config_key = ?',
            [key],
        );
        if (rows.length === 0) return defaultValue;
        const raw = rows[0].config_value;
        return ENCRYPTED_KEYS.has(key) ? decrypt(raw, AppConfig.encryptionKey) : raw;
    },

    async set(key: string, value: string): Promise<boolean> {
        const pool: Pool = DatabaseConnection.getPool();
        // Encrypt sensitive values before persisting
        const stored = ENCRYPTED_KEYS.has(key) && value.length > 0
            ? encrypt(value, AppConfig.encryptionKey)
            : value;
        const [result] = await pool.execute<ResultSetHeader>(
            'UPDATE system_config SET config_value = ? WHERE config_key = ?',
            [stored, key],
        );
        return result.affectedRows > 0;
    },
};

