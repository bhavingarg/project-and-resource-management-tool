import { Router } from 'express';
import { createAllocationController } from '../controllers/allocation.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { AllocationRepository } from '../repositories/allocation.repository';
import { createAllocationService } from '../services/allocation.service';
import { UserRole } from '../models/user.model';

const allocationService = createAllocationService(AllocationRepository);
const allocationController = createAllocationController(allocationService);

const adminOnly = [requireAuth, requireRole(UserRole.ADMIN)];

export const allocationRouter = Router();

allocationRouter.get('/', ...adminOnly, (req, res) => allocationController.getAllAllocations(req, res));
