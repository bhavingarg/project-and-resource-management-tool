import { Request, Response } from 'express';
import { IManagerService } from '../services/manager.service';

export const createManagerController = (managerService: IManagerService) => ({
    async getResourceDashboard(req: Request, res: Response): Promise<void> {
        const dashboard = await managerService.getResourceDashboard(req.user!.userId);
        res.status(200).json(dashboard);
    },

    async getEmployeeDrillDown(req: Request, res: Response): Promise<void> {
        try {
            const detail = await managerService.getEmployeeDrillDown(
                req.user!.userId,
                Number(req.params.userId),
            );
            res.status(200).json(detail);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async getProjects(req: Request, res: Response): Promise<void> {
        const projects = await managerService.getManagerProjects(req.user!.userId);
        res.status(200).json(projects);
    },

    async getProjectDetail(req: Request, res: Response): Promise<void> {
        try {
            const detail = await managerService.getProjectDetail(
                req.user!.userId,
                Number(req.params.id),
            );
            res.status(200).json(detail);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },
});
