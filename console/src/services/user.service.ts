import { apiClient } from './api.client';
import { CreateUserRequestDto, UserSummaryDto, ResetPasswordRequestDto } from '../models/user.dto';


export const userApiService = {
    async createUser(dto: CreateUserRequestDto): Promise<UserSummaryDto> {
        return apiClient.post<UserSummaryDto>('/users', dto);
    },

    async getAllUsers(): Promise<UserSummaryDto[]> {
        return apiClient.get<UserSummaryDto[]>('/users');
    },

    async findByUsernameOrId(usernameOrId: string): Promise<UserSummaryDto> {
        return apiClient.get<UserSummaryDto>(`/users/${encodeURIComponent(usernameOrId)}`);
    },

    async resetPassword(userId: number, dto: ResetPasswordRequestDto): Promise<void> {
        await apiClient.patch(`/users/${userId}/password`, dto);
    },

    async deactivateUser(userId: number): Promise<void> {
        await apiClient.patch(`/users/${userId}/deactivate`, {});
    },

    async reactivateUser(userId: number): Promise<void> {
        await apiClient.patch(`/users/${userId}/reactivate`, {});
    },
};
