import { createAiFeaturesService } from '../services/ai-features.service';
import { IAiRepository } from '../repositories/ai.repository';
import { IAiService } from '../services/ai.service';
import { ISystemConfigRepository } from '../repositories/system-config.repository';

jest.mock('../config/app.config', () => ({
    AppConfig: { geminiApiKey: 'test-gemini-key', encryptionKey: 'a'.repeat(64) },
}));

const makeAiRepo = (overrides: Partial<IAiRepository> = {}): IAiRepository => ({
    findSkillMatchCandidates: jest.fn().mockResolvedValue([]),
    findProjectRiskData: jest.fn().mockResolvedValue(null),
    ...overrides,
});

const makeAiService = (text = ''): IAiService => ({
    generateText: jest.fn().mockResolvedValue(text),
});

const makeConfigRepo = (overrides: Partial<ISystemConfigRepository> = {}): ISystemConfigRepository => ({
    initialize: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, string> = {
            llm_provider: 'gemini',
            llm_model: 'gemini-1.5-flash',
            llm_api_key: '',
        };
        return Promise.resolve(map[key] ?? '');
    }),
    set: jest.fn(),
    ...overrides,
});

describe('AiFeaturesService', () => {
    describe('skillMatch', () => {
        it('returns empty matches when no candidates', async () => {
            const svc = createAiFeaturesService(makeAiRepo(), makeAiService(), makeConfigRepo());
            const result = await svc.skillMatch(1, 'React developer');
            expect(result.matches).toHaveLength(0);
            expect(result.requirement).toBe('React developer');
        });

        it('calls generateText with candidates in prompt', async () => {
            const candidates = [
                { userId: 5, fullName: 'Alice', utilisationPercent: 50, skills: ['React'], recentActivityTags: ['frontend'] },
            ];
            const aiService = makeAiService(JSON.stringify([{ userId: 5, reason: 'Strong React skills' }]));
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                aiService,
                makeConfigRepo(),
            );
            const result = await svc.skillMatch(1, 'React developer');
            expect(result.matches).toHaveLength(1);
            expect(result.matches[0].userId).toBe(5);
            expect(result.matches[0].freePercent).toBe(50);
            expect(aiService.generateText).toHaveBeenCalled();
        });

        it('falls back gracefully when AI returns non-JSON', async () => {
            const candidates = [
                { userId: 5, fullName: 'Bob', utilisationPercent: 30, skills: [], recentActivityTags: [] },
            ];
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                makeAiService('Not valid JSON at all'),
                makeConfigRepo(),
            );
            const result = await svc.skillMatch(1, 'dev');
            expect(result.matches).toHaveLength(1);
            expect(result.matches[0].reason).toMatch(/unavailable/i);
        });

        it('filters out userIds not in candidates', async () => {
            const candidates = [
                { userId: 5, fullName: 'Alice', utilisationPercent: 50, skills: [], recentActivityTags: [] },
            ];
            // AI hallucinates userId 99 which doesn't exist
            const aiService = makeAiService(JSON.stringify([{ userId: 99, reason: 'hallucinated' }]));
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                aiService,
                makeConfigRepo(),
            );
            const result = await svc.skillMatch(1, 'dev');
            expect(result.matches).toHaveLength(0);
        });
    });

    describe('getRiskSummary', () => {
        it('throws when project not found', async () => {
            const svc = createAiFeaturesService(makeAiRepo(), makeAiService(), makeConfigRepo());
            await expect(svc.getRiskSummary(1, 99)).rejects.toThrow(/not found/i);
        });

        it('returns summary from AI', async () => {
            const riskData = {
                projectName: 'Alpha', endDate: '2026-12-31', health: 'AT_RISK',
                milestones: [{ title: 'M1', dueDate: '2026-06-01', status: 'OVERDUE', isOverdue: true }],
                resourceEffort: [],
            };
            const aiService = makeAiService('Project is at risk due to overdue milestone.');
            const svc = createAiFeaturesService(
                makeAiRepo({ findProjectRiskData: jest.fn().mockResolvedValue(riskData) }),
                aiService,
                makeConfigRepo(),
            );
            const result = await svc.getRiskSummary(1, 1);
            expect(result.projectName).toBe('Alpha');
            expect(result.summary).toContain('at risk');
        });

        it('uses the configured model and provider', async () => {
            const riskData = { projectName: 'P', endDate: '2026-12-31', health: 'ON_TRACK', milestones: [], resourceEffort: [] };
            const aiService = makeAiService('All good.');
            const configRepo = makeConfigRepo({
                get: jest.fn().mockImplementation((key: string) => {
                    if (key === 'llm_provider') return Promise.resolve('groq');
                    if (key === 'llm_model') return Promise.resolve('llama3-8b-8192');
                    return Promise.resolve('');
                }),
            });
            const svc = createAiFeaturesService(
                makeAiRepo({ findProjectRiskData: jest.fn().mockResolvedValue(riskData) }),
                aiService,
                configRepo,
            );
            await svc.getRiskSummary(1, 1);
            expect(aiService.generateText).toHaveBeenCalledWith(
                expect.any(String), 'groq', 'llama3-8b-8192', expect.any(String),
            );
        });
    });
});
