// Crash immediately if a required environment variable is missing.
// Better to fail on startup than to fail silently at runtime.
const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
};

export const AppConfig = {
    port: Number(process.env.PORT) || 3001,
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 28800, // 8 hours
    maxWeeklyHours: Number(process.env.MAX_WEEKLY_HOURS) || 40,
    schedulerIntervalHours: Number(process.env.SCHEDULER_INTERVAL_HOURS) || 4,
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    customLlmHost: process.env.CUSTOM_LLM_HOST ?? '',
    customLlmApiKey: process.env.CUSTOM_LLM_API_KEY ?? '',
    encryptionKey: requireEnv('ENCRYPTION_KEY'),
    // SMTP — all optional; when SMTP_HOST is absent, emails are printed to console.
    smtpHost: process.env.SMTP_HOST ?? '',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    smtpFrom: process.env.SMTP_FROM ?? 'noreply@prm.local',
};
