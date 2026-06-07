import { apiClient } from './api.client';
import { sessionStore } from './session.store';
import { LoginSession } from '../models/session.model';
import { extractErrorMessage } from '../utils/error.util';

interface LoginResponse {
    token: string;
    role: LoginSession['role'];
    username: string;
    forcePasswordChange: boolean;
}

export const authService = {
    async login(username: string, password: string): Promise<LoginSession> {
        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
            sessionStore.setToken(response.token);
            return {
                role: response.role,
                username: response.username,
                forcePasswordChange: response.forcePasswordChange,
            };
        } catch (error) {
            throw new Error(extractErrorMessage(error));
        }
    },

    async changePassword(newPassword: string): Promise<void> {
        try {
            await apiClient.post('/auth/change-password', { newPassword });
        } catch (error) {
            throw new Error(extractErrorMessage(error));
        }
    },
};
