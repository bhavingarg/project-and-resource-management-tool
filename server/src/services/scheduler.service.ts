import { ISchedulerRepository } from '../repositories/scheduler.repository';
import { AppConfig } from '../config/app.config';
import { getLastWeekMonday } from '../utils/date.util';

export interface ISchedulerService {
    runAllTasks(): Promise<void>;
    recomputeProjectHealth(projectId: number): Promise<void>;
}

export const createSchedulerService = (schedulerRepository: ISchedulerRepository): ISchedulerService => ({
    async runAllTasks(): Promise<void> {
        const lastWeekMonday = getLastWeekMonday();

        const resourcesUpdated = await schedulerRepository.recomputeAllResourceStatuses();
        console.log(`[Scheduler] Recomputed ${resourcesUpdated} resource status(es).`);

        const missed = await schedulerRepository.flagMissedTimesheets(lastWeekMonday);
        console.log(`[Scheduler] Flagged ${missed} missed timesheet(s) for week ${lastWeekMonday}.`);

        const projectsUpdated = await schedulerRepository.updateAllProjectHealthStatuses(
            lastWeekMonday,
            AppConfig.maxWeeklyHours,
        );
        console.log(`[Scheduler] Updated health for ${projectsUpdated} active project(s).`);
    },

    async recomputeProjectHealth(projectId: number): Promise<void> {
        await schedulerRepository.recomputeProjectHealth(
            projectId,
            getLastWeekMonday(),
            AppConfig.maxWeeklyHours,
        );
    },
});
