import { createSystemConfigService } from '../services/system-config.service';
import { ISystemConfigRepository, SystemConfigRecord } from '../repositories/system-config.repository';
import { SystemConfigEntryDto } from '../models/system-config.dto';

const makeRecord = (key: string, value: string): SystemConfigRecord => ({
    key, value, description: `desc for ${key}`, updatedAt: '2026-06-01T10:00:00',
});

const makeRepo = (overrides: Partial<ISystemConfigRepository> = {}): ISystemConfigRepository => ({
    initialize: jest.fn(),
    getAll: jest.fn().mockResolvedValue([
        makeRecord('llm_provider', 'gemini'),
        makeRecord('llm_api_key', 'secret-key'),
        makeRecord('llm_model', 'gemini-1.5-flash'),
    ]),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(true),
    ...overrides,
});

describe('SystemConfigService', () => {
    describe('getAll', () => {
        it('returns all entries', async () => {
            const svc = createSystemConfigService(makeRepo());
            const result = await svc.getAll();
            expect(result).toHaveLength(3);
        });

        it('masks llm_api_key value', async () => {
            const svc = createSystemConfigService(makeRepo());
            const result = await svc.getAll();
            const keyEntry = result.find((e: SystemConfigEntryDto) => e.key === 'llm_api_key');
            expect(keyEntry?.value).toBe('****************************');
        });

        it('does not mask llm_provider', async () => {
            const svc = createSystemConfigService(makeRepo());
            const result = await svc.getAll();
            const entry = result.find((e: SystemConfigEntryDto) => e.key === 'llm_provider');
            expect(entry?.value).toBe('gemini');
        });

        it('shows empty string (not mask) when api key is blank', async () => {
            const repo = makeRepo({
                getAll: jest.fn().mockResolvedValue([makeRecord('llm_api_key', '')]),
            });
            const svc = createSystemConfigService(repo);
            const result = await svc.getAll();
            expect(result[0].value).toBe('');
        });
    });

    describe('update', () => {
        it('throws when value is empty for non-clearable key', async () => {
            const svc = createSystemConfigService(makeRepo());
            await expect(svc.update('llm_model', '   ')).rejects.toThrow(/cannot be empty/i);
        });

        it('allows empty value for llm_api_key (clearable)', async () => {
            const set = jest.fn().mockResolvedValue(true);
            const repo = makeRepo({ set, getAll: jest.fn().mockResolvedValue([makeRecord('llm_api_key', '')]) });
            const svc = createSystemConfigService(repo);
            await svc.update('llm_api_key', '');
            expect(set).toHaveBeenCalledWith('llm_api_key', '');
        });

        it('throws when key does not exist', async () => {
            const repo = makeRepo({ set: jest.fn().mockResolvedValue(false) });
            const svc = createSystemConfigService(repo);
            await expect(svc.update('non_existent_key', 'value')).rejects.toThrow(/not found/i);
        });

        it('trims value before saving', async () => {
            const set = jest.fn().mockResolvedValue(true);
            const svc = createSystemConfigService(makeRepo({ set }));
            await svc.update('llm_model', '  gemini-1.5-pro  ');
            expect(set).toHaveBeenCalledWith('llm_model', 'gemini-1.5-pro');
        });

        it('returns full config after update', async () => {
            const svc = createSystemConfigService(makeRepo());
            const result = await svc.update('llm_model', 'gemini-1.5-pro');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });
    });
});
