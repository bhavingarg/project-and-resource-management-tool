import { SchedulerRepository } from '../repositories/scheduler.repository';
import { createSchedulerService, ISchedulerService } from '../services/scheduler.service';
import { EmailService } from '../services/email.service';
import { AiRepository } from '../repositories/ai.repository';
import { createAiService } from '../services/ai.service';
import { createAiFeaturesService } from '../services/ai-features.service';
import { SystemConfigRepository } from '../repositories/system-config.repository';

const aiService = createAiService();
const aiFeaturesService = createAiFeaturesService(AiRepository, aiService, SystemConfigRepository);

export const schedulerService: ISchedulerService = createSchedulerService(SchedulerRepository, EmailService, aiFeaturesService);
