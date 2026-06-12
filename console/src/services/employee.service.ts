import { apiClient } from './api.client';
import {
    EmployeeSummaryDto,
    EmployeeDetailDto,
    UpdateEmployeeRequestDto,
    EmployeeSkillDto,
    AddSkillRequestDto,
    UpdateSkillRequestDto,
    DeactivateWarningDto,
} from '../models/employee.dto';

export const employeeApiService = {
    async getAllEmployees(): Promise<EmployeeSummaryDto[]> {
        return apiClient.get<EmployeeSummaryDto[]>('/employees');
    },

    async getEmployee(userId: number): Promise<EmployeeDetailDto> {
        return apiClient.get<EmployeeDetailDto>(`/employees/${userId}`);
    },

    async updateEmployee(userId: number, dto: UpdateEmployeeRequestDto): Promise<void> {
        await apiClient.patch(`/employees/${userId}`, dto);
    },

    async getDeactivateWarning(userId: number): Promise<DeactivateWarningDto> {
        return apiClient.get<DeactivateWarningDto>(`/employees/${userId}/deactivate-warning`);
    },

    async deactivateEmployee(userId: number): Promise<void> {
        await apiClient.patch(`/employees/${userId}/deactivate`, {});
    },

    async assignManager(userId: number, managerId: number): Promise<void> {
        await apiClient.patch(`/employees/${userId}/manager`, { managerId });
    },

    async getSkills(userId: number): Promise<EmployeeSkillDto[]> {
        return apiClient.get<EmployeeSkillDto[]>(`/employees/${userId}/skills`);
    },

    async addSkill(userId: number, dto: AddSkillRequestDto): Promise<void> {
        await apiClient.post(`/employees/${userId}/skills`, dto);
    },

    async updateSkill(userId: number, skillId: number, dto: UpdateSkillRequestDto): Promise<void> {
        await apiClient.patch(`/employees/${userId}/skills/${skillId}`, dto);
    },

    async removeSkill(userId: number, skillId: number): Promise<void> {
        await apiClient.delete(`/employees/${userId}/skills/${skillId}`);
    },
};
