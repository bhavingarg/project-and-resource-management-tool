import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthRepository } from '../repositories/auth.repository';
import { createAuthService } from '../services/auth.service';

// Auth service is created once and reused across all requests
const authService = createAuthService(AuthRepository);

export const authRouter = Router();

// POST /auth/login
// Anyone can call this. Returns a JWT on success.
authRouter.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ message: 'Username and password are required' });
        return;
    }

    try {
        const result = await authService.login({ username, password });
        res.status(200).json(result);
    } catch (error) {
        res.status(401).json({ message: (error as Error).message });
    }
});

// POST /auth/change-password
// Requires a valid JWT. Used on first login (forced) and voluntarily.
authRouter.post('/change-password', requireAuth, async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.user!.userId;

    if (!newPassword) {
        res.status(400).json({ message: 'New password is required' });
        return;
    }

    try {
        await authService.changePassword(userId, newPassword);
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
});
