import { SchedulerRepository } from '../repositories/scheduler.repository';
import { createSchedulerService, ISchedulerService } from '../services/scheduler.service';
import { EmailService } from '../services/email.service';

export const schedulerService: ISchedulerService = createSchedulerService(SchedulerRepository, EmailService);
