import { ISystemConfigRepository, SystemConfigRecord } from '../repositories/system-config.repository';
import { SystemConfigEntryDto } from '../models/system-config.dto';

const MASKED_KEYS = new Set(['llm_api_key']);
const MASK = '****************************';

const maskValue = (key: string, value: string): string =>
    MASKED_KEYS.has(key) && value.length > 0 ? MASK : value;

const toDto = (e: SystemConfigRecord): SystemConfigEntryDto => ({
    key: e.key,
    value: maskValue(e.key, e.value),
    description: e.description,
    updatedAt: e.updatedAt,
});

// Keys that are allowed to be set to an empty string
const CLEARABLE_KEYS = new Set(['llm_api_key']);

export interface ISystemConfigService {
    getAll(): Promise<SystemConfigEntryDto[]>;
    update(key: string, value: string): Promise<SystemConfigEntryDto[]>;
}

export const createSystemConfigService = (
    systemConfigRepository: ISystemConfigRepository,
): ISystemConfigService => ({
    async getAll(): Promise<SystemConfigEntryDto[]> {
        const entries = await systemConfigRepository.getAll();
        return entries.map(toDto);
    },

    async update(key: string, value: string): Promise<SystemConfigEntryDto[]> {
        const trimmed = value.trim();
        if (trimmed.length === 0 && !CLEARABLE_KEYS.has(key)) {
            throw new Error('Value cannot be empty');
        }
        const updated = await systemConfigRepository.set(key, trimmed);
        if (!updated) {
            throw new Error(`Configuration key "${key}" not found`);
        }
        const entries = await systemConfigRepository.getAll();
        return entries.map(toDto);
    },
});
