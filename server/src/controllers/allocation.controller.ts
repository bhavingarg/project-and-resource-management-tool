import { Request, Response } from 'express';
import { IAllocationService } from '../services/allocation.service';

export const createAllocationController = (allocationService: IAllocationService) => ({
    async getAllAllocations(_req: Request, res: Response): Promise<void> {
        const allocations = await allocationService.getAllActiveAllocations();
        res.status(200).json(allocations);
    },
});
