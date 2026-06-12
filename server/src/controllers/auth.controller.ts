import { Request, Response } from 'express';
import { ChangePasswordRequestDto, LoginRequestDto } from '../models/auth.dto';
import { IAuthService } from '../services/auth.service';

export const createAuthController = (authService: IAuthService) => ({

    // POST /auth/login
    async login(req: Request, res: Response): Promise<void> {
        const { username, password }: LoginRequestDto = req.body;

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
    },

    // POST /auth/change-password  (requires valid JWT)
    async changePassword(req: Request, res: Response): Promise<void> {
        const { newPassword }: ChangePasswordRequestDto = req.body;
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
    },
});
