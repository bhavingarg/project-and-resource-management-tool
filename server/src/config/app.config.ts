const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const AppConfig = {
    port: Number(process.env.PORT) || 3001,
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    maxWeeklyHours: Number(process.env.MAX_WEEKLY_HOURS) || 40,
    schedulerIntervalHours: Number(process.env.SCHEDULER_INTERVAL_HOURS) || 4,
};
