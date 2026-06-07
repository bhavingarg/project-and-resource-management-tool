let currentToken = '';

export const sessionStore = {
    getToken: (): string => currentToken,
    setToken: (token: string): void => { currentToken = token; },
    clearToken: (): void => { currentToken = ''; },
};
