export interface AllocationSummaryDto {
    id: number;
    employeeName: string;
    projectName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export interface ProjectAllocationDto {
    id: number;
    employeeName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export interface CreateAllocationRequestDto {
    employeeUserId: number;
    projectId: number;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}
