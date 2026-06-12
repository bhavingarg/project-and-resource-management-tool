export interface AllocationSummaryDto {
    id: number;
    resourceName: string;
    projectName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export interface ProjectAllocationDto {
    id: number;
    resourceName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export interface CreateAllocationRequestDto {
    resourceUserId: number;
    projectId: number;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export type AllocationLifecycleStatus = 'ACTIVE' | 'ENDED';

export interface MyAllocationDto {
    allocationId: number;
    projectName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
    status: AllocationLifecycleStatus;
}
