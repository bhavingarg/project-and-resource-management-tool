import { Router } from 'express';
import { createAiController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { AiRepository } from '../repositories/ai.repository';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import { createAiService } from '../services/ai.service';
import { createAiFeaturesService } from '../services/ai-features.service';
import { UserRole } from '../models/user.model';

const aiService = createAiService();
const aiFeaturesService = createAiFeaturesService(AiRepository, aiService, SystemConfigRepository);
const aiController = createAiController(aiFeaturesService);

const managerOnly = [requireAuth, requireRole(UserRole.MANAGER)];

export const aiRouter = Router();

aiRouter.post('/skill-match', ...managerOnly, (req, res) => aiController.skillMatch(req, res));
aiRouter.post('/risk-summary', ...managerOnly, (req, res) => aiController.getRiskSummary(req, res));
