import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/services/**/*.ts',
        'src/utils/crypto.util.ts',
    ],
    coverageThreshold: {
        global: {
            lines: 60,
            functions: 60,
            branches: 60,
            statements: 60,
        },
    },
    coverageReporters: ['text', 'lcov'],
};

export default config;
