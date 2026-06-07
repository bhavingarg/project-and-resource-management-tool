import mysql from 'mysql2/promise';

const DB_POOL_CONNECTION_LIMIT = 10;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'prm_db',
    waitForConnections: true,
    connectionLimit: DB_POOL_CONNECTION_LIMIT,
    queueLimit: 0, // 0 = unlimited queue
});

export const DatabaseConnection = {
    async connect(): Promise<void> {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();
    },

    getPool() {
        return pool;
    },
};
