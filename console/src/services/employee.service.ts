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

    async getEmployee(id: number): Promise<EmployeeDetailDto> {
        return apiClient.get<EmployeeDetailDto>(`/employees/${id}`);
    },

    async getEmployeeByUserId(userId: number): Promise<EmployeeDetailDto> {
        return apiClient.get<EmployeeDetailDto>(`/employees/by-user/${userId}`);
    },

    async updateEmployee(id: number, dto: UpdateEmployeeRequestDto): Promise<void> {
        await apiClient.patch(`/employees/${id}`, dto);
    },

    async getDeactivateWarning(id: number): Promise<DeactivateWarningDto> {
        return apiClient.get<DeactivateWarningDto>(`/employees/${id}/deactivate-warning`);
    },

    async deactivateEmployee(id: number): Promise<void> {
        await apiClient.patch(`/employees/${id}/deactivate`, {});
    },

    async assignManager(employeeId: number, managerId: number): Promise<void> {
        await apiClient.patch(`/employees/${employeeId}/manager`, { managerId });
    },

    async getSkills(employeeId: number): Promise<EmployeeSkillDto[]> {
        return apiClient.get<EmployeeSkillDto[]>(`/employees/${employeeId}/skills`);
    },

    async addSkill(employeeId: number, dto: AddSkillRequestDto): Promise<void> {
        await apiClient.post(`/employees/${employeeId}/skills`, dto);
    },

    async updateSkill(employeeId: number, skillId: number, dto: UpdateSkillRequestDto): Promise<void> {
        await apiClient.patch(`/employees/${employeeId}/skills/${skillId}`, dto);
    },

    async removeSkill(employeeId: number, skillId: number): Promise<void> {
        await apiClient.delete(`/employees/${employeeId}/skills/${skillId}`);
    },
};
