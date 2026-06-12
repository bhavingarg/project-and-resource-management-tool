import { Router } from 'express';
import { createUserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { createAuthService } from '../services/auth.service';
import { createUserService } from '../services/user.service';
import { UserRole } from '../models/user.model';

const authService = createAuthService(AuthRepository);
const userService = createUserService(UserRepository, authService);
const userController = createUserController(userService);

const adminOnly = [requireAuth, requireRole(UserRole.ADMIN)];

export const userRouter = Router();

userRouter.post('/', ...adminOnly, (req, res) => userController.createUser(req, res));
userRouter.get('/', ...adminOnly, (req, res) => userController.getAllUsers(req, res));
userRouter.get('/:usernameOrId', ...adminOnly, (req, res) => userController.findUser(req, res));
userRouter.patch('/:id/password', ...adminOnly, (req, res) => userController.resetPassword(req, res));
userRouter.patch('/:id/deactivate', ...adminOnly, (req, res) => userController.deactivateUser(req, res));
userRouter.patch('/:id/reactivate', ...adminOnly, (req, res) => userController.reactivateUser(req, res));
