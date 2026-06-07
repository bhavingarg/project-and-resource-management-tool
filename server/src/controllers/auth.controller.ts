import { Request, Response } from 'express';
import { ChangePasswordRequestDto, LoginRequestDto } from '../models/auth.dto';
import { IAuthService } from '../services/auth.service';

export const createAuthController = (authService: IAuthService) => ({
    async login(req: Request, res: Response): Promise<void> {
        const dto: LoginRequestDto = req.body;

        if (!dto.username || !dto.password) {
            res.status(400).json({ message: 'Username and password are required' });
            return;
        }

        try {
            const result = await authService.login(dto);
            res.status(200).json(result);
        } catch (error) {
            res.status(401).json({ message: (error as Error).message });
        }
    },

    async changePassword(req: Request, res: Response): Promise<void> {
        const dto: ChangePasswordRequestDto = req.body;
        const userId = req.user!.userId;

        if (!dto.newPassword) {
            res.status(400).json({ message: 'New password is required' });
            return;
        }

        try {
            await authService.changePassword(userId, dto.newPassword);
            res.status(200).json({ message: 'Password updated successfully' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },
});
