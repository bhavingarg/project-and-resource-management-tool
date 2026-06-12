import { Router } from 'express';
import { createSystemConfigController } from '../controllers/system-config.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import { createSystemConfigService } from '../services/system-config.service';
import { UserRole } from '../models/user.model';

const systemConfigService = createSystemConfigService(SystemConfigRepository);
const systemConfigController = createSystemConfigController(systemConfigService);

const adminOnly = [requireAuth, requireRole(UserRole.ADMIN)];

export const systemConfigRouter = Router();

systemConfigRouter.get('/', ...adminOnly, (req, res) => systemConfigController.getAll(req, res));
systemConfigRouter.patch('/:key', ...adminOnly, (req, res) => systemConfigController.update(req, res));
