import { apiClient } from './api.client';
import { AllocationSummaryDto } from '../models/allocation.dto';

export const allocationApiService = {
    async getAllAllocations(): Promise<AllocationSummaryDto[]> {
        return apiClient.get<AllocationSummaryDto[]>('/allocations');
    },
};
