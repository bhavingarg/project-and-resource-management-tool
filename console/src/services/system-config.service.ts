import { apiClient } from './api.client';
import { SystemConfigEntryDto } from '../models/system-config.dto';

export const systemConfigApiService = {
    async getAll(): Promise<SystemConfigEntryDto[]> {
        return apiClient.get<SystemConfigEntryDto[]>('/system-config');
    },

    async update(key: string, value: string): Promise<SystemConfigEntryDto[]> {
        return apiClient.patch<SystemConfigEntryDto[]>(`/system-config/${key}`, { value });
    },
};
