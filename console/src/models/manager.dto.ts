import { ProjectStatus, MilestoneStatus } from './project.dto';
import { ProjectAllocationDto } from './allocation.dto';

export type EmployeeStatus = 'BENCH' | 'ALLOCATED';
export type ProjectHealth = 'ON_TRACK' | 'ATTENTION' | 'AT_RISK';

export interface TeamMemberDto {
    userId: number;
    fullName: string;
    status: EmployeeStatus;
    utilisationPercent: number;
    skills: string[];
}

export interface ResourceDashboardDto {
    bench: TeamMemberDto[];
    active: TeamMemberDto[];
}

export interface AllocationLineDto {
    projectName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
}

export interface EmployeeDrillDownDto {
    userId: number;
    fullName: string;
    status: EmployeeStatus;
    utilisationPercent: number;
    skills: string[];
    activeAllocations: AllocationLineDto[];
    recentActivityTags: string[];
}

export interface ManagerProjectDto {
    id: number;
    name: string;
    endDate: string;
    status: ProjectStatus;
    health: ProjectHealth;
}

export interface ManagerMilestoneDto {
    title: string;
    dueDate: string;
    status: MilestoneStatus;
    isOverdue: boolean;
}

export interface ManagerProjectDetailDto {
    id: number;
    name: string;
    status: ProjectStatus;
    health: ProjectHealth;
    milestones: ManagerMilestoneDto[];
    allocatedResources: ProjectAllocationDto[];
}
