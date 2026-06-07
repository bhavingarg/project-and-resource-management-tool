import axios from 'axios';

export const extractErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
        return error.response.data.message as string;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
};
