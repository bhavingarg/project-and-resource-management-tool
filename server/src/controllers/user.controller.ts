import { Request, Response } from 'express';
import { CreateUserRequestDto, ResetPasswordRequestDto } from '../models/user.dto';
import { IUserService } from '../services/user.service';

export const createUserController = (userService: IUserService) => ({
    async createUser(req: Request, res: Response): Promise<void> {
        const dto: CreateUserRequestDto = req.body;

        if (!dto.fullName || !dto.email || !dto.username || !dto.temporaryPassword || !dto.role) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        try {
            const user = await userService.createUser(dto);
            res.status(201).json(user);
        } catch (error) {
            res.status(409).json({ message: (error as Error).message });
        }
    },

    async getAllUsers(_req: Request, res: Response): Promise<void> {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    },

    async findUser(req: Request, res: Response): Promise<void> {
        try {
            const user = await userService.findByUsernameOrId(req.params.usernameOrId);
            res.status(200).json(user);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async resetPassword(req: Request, res: Response): Promise<void> {
        const dto: ResetPasswordRequestDto = req.body;
        const userId = Number(req.params.id);

        if (!dto.newTemporaryPassword) {
            res.status(400).json({ message: 'New temporary password is required' });
            return;
        }

        try {
            await userService.resetPassword(userId, dto);
            res.status(200).json({ message: 'Password reset. User will be prompted to change it on next login.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async deactivateUser(req: Request, res: Response): Promise<void> {
        const userId = Number(req.params.id);
        try {
            await userService.deactivateUser(userId);
            res.status(200).json({ message: 'User deactivated.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async reactivateUser(req: Request, res: Response): Promise<void> {
        const userId = Number(req.params.id);
        try {
            await userService.reactivateUser(userId);
            res.status(200).json({ message: 'Account reactivated.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },
});
