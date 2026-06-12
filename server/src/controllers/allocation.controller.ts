import { Request, Response } from 'express';
import { IAllocationService } from '../services/allocation.service';
import { CreateAllocationRequestDto } from '../models/allocation.dto';

export const createAllocationController = (allocationService: IAllocationService) => ({
    async getAllAllocations(_req: Request, res: Response): Promise<void> {
        const allocations = await allocationService.getAllActiveAllocations();
        res.status(200).json(allocations);
    },

    async getProjectAllocations(req: Request, res: Response): Promise<void> {
        try {
            const allocations = await allocationService.getProjectAllocations(
                req.user!.userId,
                Number(req.params.projectId),
            );
            res.status(200).json(allocations);
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async createAllocation(req: Request, res: Response): Promise<void> {
        const dto: CreateAllocationRequestDto = req.body;
        try {
            await allocationService.createAllocation(req.user!.userId, dto);
            res.status(201).json({ message: 'Allocation saved.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async endAllocation(req: Request, res: Response): Promise<void> {
        try {
            await allocationService.endAllocation(req.user!.userId, Number(req.params.id));
            res.status(200).json({ message: 'Allocation ended.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async getMyAllocations(req: Request, res: Response): Promise<void> {
        const allocations = await allocationService.getMyAllocations(req.user!.userId);
        res.status(200).json(allocations);
    },
});
