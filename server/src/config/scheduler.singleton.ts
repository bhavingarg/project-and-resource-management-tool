import { SchedulerRepository } from '../repositories/scheduler.repository';
import { createSchedulerService, ISchedulerService } from '../services/scheduler.service';

export const schedulerService: ISchedulerService = createSchedulerService(SchedulerRepository);
