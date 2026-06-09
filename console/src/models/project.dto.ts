export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export interface ProjectSummaryDto {
    id: number;
    name: string;
    managerId: number;
    managerName: string;
    endDate: string;
    status: ProjectStatus;
    storyPointsDone: number;
    totalStoryPoints: number;
}

export interface ProjectDetailDto {
    id: number;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    managerId: number;
    managerName: string;
    totalStoryPoints: number;
}

export interface CreateProjectRequestDto {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    managerId: number;
    totalStoryPoints: number;
}

export interface UpdateProjectRequestDto {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: ProjectStatus;
    managerId?: number;
    totalStoryPoints?: number;
}

export interface MilestoneDto {
    id: number;
    title: string;
    dueDate: string;
    storyPoints: number;
    status: MilestoneStatus;
}

export interface MilestoneSummaryDto {
    milestones: MilestoneDto[];
    totalStoryPoints: number;
    completedStoryPoints: number;
    remainingStoryPoints: number;
}

export interface AddMilestoneRequestDto {
    title: string;
    dueDate: string;
    storyPoints: number;
}

export interface UpdateMilestoneStatusRequestDto {
    status: MilestoneStatus;
}
