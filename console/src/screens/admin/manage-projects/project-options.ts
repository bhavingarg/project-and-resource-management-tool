import { ProjectStatus, MilestoneStatus } from '../../../models/project.dto';

export const PROJECT_STATUS_MAP: Record<string, ProjectStatus> = {
    '1': 'PLANNED',
    '2': 'ACTIVE',
    '3': 'ON_HOLD',
    '4': 'COMPLETED',
};

export const CREATE_STATUS_PROMPT = '(1) PLANNED   (2) ACTIVE   (3) ON_HOLD';
export const UPDATE_STATUS_PROMPT = '(1) PLANNED   (2) ACTIVE   (3) ON_HOLD   (4) COMPLETED';

export const MILESTONE_STATUS_MAP: Record<string, MilestoneStatus> = {
    '1': 'NOT_STARTED',
    '2': 'IN_PROGRESS',
    '3': 'DONE',
};

export const MILESTONE_STATUS_PROMPT = '(1) NOT_STARTED   (2) IN_PROGRESS   (3) DONE';
