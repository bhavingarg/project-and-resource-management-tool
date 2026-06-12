import { AppConfig } from './config/app.config';
import { schedulerService } from './config/scheduler.singleton';

const HOURS_TO_MS = 60 * 60 * 1000;

const runAndLog = async (): Promise<void> => {
    console.log('[Scheduler] Running scheduled tasks...');
    try {
        await schedulerService.runAllTasks();
        console.log('[Scheduler] All tasks completed successfully.');
    } catch (error) {
        console.error('[Scheduler] A task failed:', error);
    }
};

export const startScheduler = (): void => {
    const intervalMs = AppConfig.schedulerIntervalHours * HOURS_TO_MS;

    runAndLog();
    setInterval(() => { runAndLog(); }, intervalMs);

    console.log(`[Scheduler] Started — interval: ${AppConfig.schedulerIntervalHours}h`);
};
