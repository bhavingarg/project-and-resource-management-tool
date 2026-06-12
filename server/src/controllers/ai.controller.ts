import { Request, Response } from 'express';
import { IAiFeaturesService } from '../services/ai-features.service';

export const createAiController = (aiFeaturesService: IAiFeaturesService) => ({
    async skillMatch(req: Request, res: Response): Promise<void> {
        const { requirement, projectName } = req.body as { requirement?: unknown; projectName?: unknown };

        if (typeof requirement !== 'string' || requirement.trim().length === 0) {
            res.status(400).json({ message: 'requirement must be a non-empty string' });
            return;
        }

        try {
            const result = await aiFeaturesService.skillMatch(
                req.user!.userId,
                requirement.trim(),
                typeof projectName === 'string' ? projectName.trim() : undefined,
            );
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: (error as Error).message });
        }
    },

    async getRiskSummary(req: Request, res: Response): Promise<void> {
        const { projectId } = req.body as { projectId?: unknown };

        if (!projectId || Number.isNaN(Number(projectId))) {
            res.status(400).json({ message: 'projectId must be a valid number' });
            return;
        }

        try {
            const result = await aiFeaturesService.getRiskSummary(
                req.user!.userId,
                Number(projectId),
            );
            res.status(200).json(result);
        } catch (error) {
            const status = (error as Error).message.includes('not found') ? 404 : 500;
            res.status(status).json({ message: (error as Error).message });
        }
    },
});
