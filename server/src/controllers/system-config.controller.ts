import { Request, Response } from 'express';
import { ISystemConfigService } from '../services/system-config.service';
import { UpdateSystemConfigDto } from '../models/system-config.dto';

export const createSystemConfigController = (systemConfigService: ISystemConfigService) => ({
    async getAll(req: Request, res: Response): Promise<void> {
        const entries = await systemConfigService.getAll();
        res.status(200).json(entries);
    },

    async update(req: Request, res: Response): Promise<void> {
        const { key } = req.params;
        const body = req.body as UpdateSystemConfigDto;

        if (typeof body.value !== 'string') {
            res.status(400).json({ message: 'value must be a string' });
            return;
        }

        try {
            const entries = await systemConfigService.update(key, body.value);
            res.status(200).json(entries);
        } catch (error) {
            const msg = (error as Error).message;
            const status = msg.includes('not found') ? 404 : 400;
            res.status(status).json({ message: msg });
        }
    },
});
