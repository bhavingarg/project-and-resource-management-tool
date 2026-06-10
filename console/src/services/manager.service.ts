import { apiClient } from './api.client';
import {
    ResourceDashboardDto,
    EmployeeDrillDownDto,
    ManagerProjectDto,
    ManagerProjectDetailDto,
} from '../models/manager.dto';

export const managerApiService = {
    async getResourceDashboard(): Promise<ResourceDashboardDto> {
        return apiClient.get<ResourceDashboardDto>('/manager/dashboard');
    },

    async getEmployeeDrillDown(userId: number): Promise<EmployeeDrillDownDto> {
        return apiClient.get<EmployeeDrillDownDto>(`/manager/employees/${userId}`);
    },

    async getProjects(): Promise<ManagerProjectDto[]> {
        return apiClient.get<ManagerProjectDto[]>('/manager/projects');
    },

    async getProjectDetail(projectId: number): Promise<ManagerProjectDetailDto> {
        return apiClient.get<ManagerProjectDetailDto>(`/manager/projects/${projectId}`);
    },
};
