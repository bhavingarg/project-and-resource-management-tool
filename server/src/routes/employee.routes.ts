import { Router } from 'express';
import { createEmployeeController } from '../controllers/employee.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { EmployeeRepository } from '../repositories/employee.repository';
import { UserRepository } from '../repositories/user.repository';
import { createEmployeeService } from '../services/employee.service';
import { UserRole } from '../models/user.model';

const employeeService = createEmployeeService(EmployeeRepository, UserRepository);
const employeeController = createEmployeeController(employeeService);

const adminOnly = [requireAuth, requireRole(UserRole.ADMIN)];

export const employeeRouter = Router();

employeeRouter.get('/', ...adminOnly, (req, res) => employeeController.getAllEmployees(req, res));
employeeRouter.get('/:userId', ...adminOnly, (req, res) => employeeController.getEmployee(req, res));
employeeRouter.patch('/:userId', ...adminOnly, (req, res) => employeeController.updateEmployee(req, res));
employeeRouter.get('/:userId/deactivate-warning', ...adminOnly, (req, res) => employeeController.getDeactivateWarning(req, res));
employeeRouter.patch('/:userId/deactivate', ...adminOnly, (req, res) => employeeController.deactivateEmployee(req, res));
employeeRouter.patch('/:userId/manager', ...adminOnly, (req, res) => employeeController.assignManager(req, res));
employeeRouter.get('/:userId/skills', ...adminOnly, (req, res) => employeeController.getSkills(req, res));
employeeRouter.post('/:userId/skills', ...adminOnly, (req, res) => employeeController.addSkill(req, res));
employeeRouter.patch('/:userId/skills/:skillId', ...adminOnly, (req, res) => employeeController.updateSkill(req, res));
employeeRouter.delete('/:userId/skills/:skillId', ...adminOnly, (req, res) => employeeController.removeSkill(req, res));
