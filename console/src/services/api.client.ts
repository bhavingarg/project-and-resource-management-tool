import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { sessionStore } from './session.store';

const BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3001/api';

const httpClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config) => {
    const token = sessionStore.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const apiClient = {
    async get<T>(path: string): Promise<T> {
        const response: AxiosResponse<T> = await httpClient.get(path);
        return response.data;
    },

    async post<T>(path: string, body: unknown): Promise<T> {
        const response: AxiosResponse<T> = await httpClient.post(path, body);
        return response.data;
    },

    async put<T>(path: string, body: unknown): Promise<T> {
        const response: AxiosResponse<T> = await httpClient.put(path, body);
        return response.data;
    },

    async patch<T>(path: string, body: unknown): Promise<T> {
        const response: AxiosResponse<T> = await httpClient.patch(path, body);
        return response.data;
    },

    async delete<T>(path: string): Promise<T> {
        const response: AxiosResponse<T> = await httpClient.delete(path);
        return response.data;
    },
};
