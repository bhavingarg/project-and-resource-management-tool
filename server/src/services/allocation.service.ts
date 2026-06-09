import { IAllocationRepository } from '../repositories/allocation.repository';
import { AllocationSummaryDto } from '../models/allocation.dto';

export interface IAllocationService {
    getAllActiveAllocations(): Promise<AllocationSummaryDto[]>;
}

export const createAllocationService = (
    allocationRepository: IAllocationRepository,
): IAllocationService => ({
    async getAllActiveAllocations(): Promise<AllocationSummaryDto[]> {
        return allocationRepository.findAllActive();
    },
});
