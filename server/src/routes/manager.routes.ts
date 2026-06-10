import { Router } from 'express';
import { createManagerController } from '../controllers/manager.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { ManagerRepository } from '../repositories/manager.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { AllocationRepository } from '../repositories/allocation.repository';
import { createManagerService } from '../services/manager.service';
import { UserRole } from '../models/user.model';

const managerService = createManagerService(ManagerRepository, EmployeeRepository, AllocationRepository);
const managerController = createManagerController(managerService);

const managerOnly = [requireAuth, requireRole(UserRole.MANAGER)];

export const managerRouter = Router();

managerRouter.get('/dashboard', ...managerOnly, (req, res) => managerController.getResourceDashboard(req, res));
managerRouter.get('/employees/:userId', ...managerOnly, (req, res) => managerController.getEmployeeDrillDown(req, res));
managerRouter.get('/projects', ...managerOnly, (req, res) => managerController.getProjects(req, res));
managerRouter.get('/projects/:id', ...managerOnly, (req, res) => managerController.getProjectDetail(req, res));
