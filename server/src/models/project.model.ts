export enum ProjectStatus {
    PLANNED = 'PLANNED',
    ACTIVE = 'ACTIVE',
    ON_HOLD = 'ON_HOLD',
    COMPLETED = 'COMPLETED',
}

export enum ProjectHealth {
    ON_TRACK = 'ON_TRACK',
    ATTENTION = 'ATTENTION',
    AT_RISK = 'AT_RISK',
}

export enum MilestoneStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE',
}

export interface Project {
    id: number;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    managerId: number;
    health: ProjectHealth;
    totalStoryPoints: number;
}

export interface Milestone {
    id: number;
    projectId: number;
    title: string;
    dueDate: string;
    storyPoints: number;
    status: MilestoneStatus;
}
