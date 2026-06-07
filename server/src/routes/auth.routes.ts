import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthRepository } from '../repositories/auth.repository';
import { createAuthService } from '../services/auth.service';

const authService = createAuthService(AuthRepository);
const authController = createAuthController(authService);

export const authRouter = Router();

authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.post('/change-password', requireAuth, (req, res) => authController.changePassword(req, res));
