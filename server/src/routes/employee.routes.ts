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
employeeRouter.get('/by-user/:userId', ...adminOnly, (req, res) => employeeController.getEmployeeByUserId(req, res));
employeeRouter.get('/:id', ...adminOnly, (req, res) => employeeController.getEmployee(req, res));
employeeRouter.patch('/:id', ...adminOnly, (req, res) => employeeController.updateEmployee(req, res));
employeeRouter.get('/:id/deactivate-warning', ...adminOnly, (req, res) => employeeController.getDeactivateWarning(req, res));
employeeRouter.patch('/:id/deactivate', ...adminOnly, (req, res) => employeeController.deactivateEmployee(req, res));
employeeRouter.patch('/:id/manager', ...adminOnly, (req, res) => employeeController.assignManager(req, res));
employeeRouter.get('/:id/skills', ...adminOnly, (req, res) => employeeController.getSkills(req, res));
employeeRouter.post('/:id/skills', ...adminOnly, (req, res) => employeeController.addSkill(req, res));
employeeRouter.patch('/:id/skills/:skillId', ...adminOnly, (req, res) => employeeController.updateSkill(req, res));
employeeRouter.delete('/:id/skills/:skillId', ...adminOnly, (req, res) => employeeController.removeSkill(req, res));
