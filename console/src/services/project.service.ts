import { apiClient } from './api.client';
import {
    ProjectSummaryDto,
    ProjectDetailDto,
    CreateProjectRequestDto,
    UpdateProjectRequestDto,
    MilestoneSummaryDto,
    AddMilestoneRequestDto,
    UpdateMilestoneStatusRequestDto,
} from '../models/project.dto';

export const projectApiService = {
    async getAllProjects(): Promise<ProjectSummaryDto[]> {
        return apiClient.get<ProjectSummaryDto[]>('/projects');
    },

    async getProject(id: number): Promise<ProjectDetailDto> {
        return apiClient.get<ProjectDetailDto>(`/projects/${id}`);
    },

    async createProject(dto: CreateProjectRequestDto): Promise<void> {
        await apiClient.post('/projects', dto);
    },

    async updateProject(id: number, dto: UpdateProjectRequestDto): Promise<void> {
        await apiClient.patch(`/projects/${id}`, dto);
    },

    async getMilestones(projectId: number): Promise<MilestoneSummaryDto> {
        return apiClient.get<MilestoneSummaryDto>(`/projects/${projectId}/milestones`);
    },

    async addMilestone(projectId: number, dto: AddMilestoneRequestDto): Promise<void> {
        await apiClient.post(`/projects/${projectId}/milestones`, dto);
    },

    async updateMilestoneStatus(projectId: number, milestoneId: number, dto: UpdateMilestoneStatusRequestDto): Promise<void> {
        await apiClient.patch(`/projects/${projectId}/milestones/${milestoneId}`, dto);
    },
};
