import { Router } from 'express';
import { createProjectController } from '../controllers/project.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { ProjectRepository } from '../repositories/project.repository';
import { UserRepository } from '../repositories/user.repository';
import { createProjectService } from '../services/project.service';
import { UserRole } from '../models/user.model';

const projectService = createProjectService(ProjectRepository, UserRepository);
const projectController = createProjectController(projectService);

const adminOnly = [requireAuth, requireRole(UserRole.ADMIN)];

export const projectRouter = Router();

projectRouter.get('/', ...adminOnly, (req, res) => projectController.getAllProjects(req, res));
projectRouter.post('/', ...adminOnly, (req, res) => projectController.createProject(req, res));
projectRouter.get('/:id', ...adminOnly, (req, res) => projectController.getProject(req, res));
projectRouter.patch('/:id', ...adminOnly, (req, res) => projectController.updateProject(req, res));
projectRouter.get('/:id/milestones', ...adminOnly, (req, res) => projectController.getMilestones(req, res));
projectRouter.post('/:id/milestones', ...adminOnly, (req, res) => projectController.addMilestone(req, res));
projectRouter.patch('/:id/milestones/:milestoneId', ...adminOnly, (req, res) => projectController.updateMilestoneStatus(req, res));
