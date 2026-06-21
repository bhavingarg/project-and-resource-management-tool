import { Router } from 'express';
import { createTimesheetController } from '../controllers/timesheet.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { TimesheetRepository } from '../repositories/timesheet.repository';
import { createTimesheetService } from '../services/timesheet.service';
import { schedulerService } from '../config/scheduler.singleton';
import { UserRole } from '../models/user.model';

const timesheetService = createTimesheetService(TimesheetRepository, schedulerService);
const timesheetController = createTimesheetController(timesheetService);

const resourceOnly = [requireAuth, requireRole(UserRole.RESOURCE)];
const managerOnly = [requireAuth, requireRole(UserRole.MANAGER)];

export const timesheetRouter = Router();

timesheetRouter.get('/reminder', ...resourceOnly, (req, res) => timesheetController.getReminder(req, res));
timesheetRouter.get('/active-allocations', ...resourceOnly, (req, res) => timesheetController.getActiveAllocationsForWeek(req, res));
timesheetRouter.post('/', ...resourceOnly, (req, res) => timesheetController.submitTimesheet(req, res));
timesheetRouter.get('/mine', ...resourceOnly, (req, res) => timesheetController.getMyTimesheets(req, res));
timesheetRouter.get('/mine/:weekStartDate', ...resourceOnly, (req, res) => timesheetController.getMyWeekDetail(req, res));
timesheetRouter.get('/team', ...managerOnly, (req, res) => timesheetController.getTeamTimesheets(req, res));
timesheetRouter.get('/team/:userId/:weekStartDate', ...managerOnly, (req, res) => timesheetController.getTeamMemberWeekDetail(req, res));
timesheetRouter.post('/team/:userId/unfreeze', ...managerOnly, (req, res) => timesheetController.unfreezeEmployee(req, res));
