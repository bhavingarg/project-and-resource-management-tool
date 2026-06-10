import { apiClient } from './api.client';
import {
    AllocationSummaryDto,
    ProjectAllocationDto,
    CreateAllocationRequestDto,
} from '../models/allocation.dto';

export const allocationApiService = {
    async getAllAllocations(): Promise<AllocationSummaryDto[]> {
        return apiClient.get<AllocationSummaryDto[]>('/allocations');
    },

    async getProjectAllocations(projectId: number): Promise<ProjectAllocationDto[]> {
        return apiClient.get<ProjectAllocationDto[]>(`/allocations/project/${projectId}`);
    },

    async createAllocation(dto: CreateAllocationRequestDto): Promise<void> {
        await apiClient.post('/allocations', dto);
    },

    async endAllocation(allocationId: number): Promise<void> {
        await apiClient.patch(`/allocations/${allocationId}/end`, {});
    },
};
