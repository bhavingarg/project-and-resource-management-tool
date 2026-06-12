import { Router } from 'express';
import { createAllocationController } from '../controllers/allocation.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { AllocationRepository } from '../repositories/allocation.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { createAllocationService } from '../services/allocation.service';
import { UserRole } from '../models/user.model';

const allocationService = createAllocationService(AllocationRepository, ProjectRepository, EmployeeRepository);
const allocationController = createAllocationController(allocationService);

const adminOnly = [requireAuth, requireRole(UserRole.ADMIN)];
const managerOnly = [requireAuth, requireRole(UserRole.MANAGER)];
const resourceOnly = [requireAuth, requireRole(UserRole.RESOURCE)];

export const allocationRouter = Router();

allocationRouter.get('/mine', ...resourceOnly, (req, res) => allocationController.getMyAllocations(req, res));
allocationRouter.get('/', ...adminOnly, (req, res) => allocationController.getAllAllocations(req, res));
allocationRouter.post('/', ...managerOnly, (req, res) => allocationController.createAllocation(req, res));
allocationRouter.get('/project/:projectId', ...managerOnly, (req, res) => allocationController.getProjectAllocations(req, res));
allocationRouter.patch('/:id/end', ...managerOnly, (req, res) => allocationController.endAllocation(req, res));
