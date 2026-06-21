import { createAiFeaturesService } from '../services/ai-features.service';
import { IAiRepository } from '../repositories/ai.repository';
import { IAiService } from '../services/ai.service';
import { ISystemConfigRepository } from '../repositories/system-config.repository';

jest.mock('../config/app.config', () => ({
    AppConfig: {
        geminiApiKey: 'test-gemini-key',
        customLlmHost: '',
        customLlmApiKey: '',
        encryptionKey: 'a'.repeat(64),
    },
}));

const makeAiRepo = (overrides: Partial<IAiRepository> = {}): IAiRepository => ({
    findSkillMatchCandidates: jest.fn().mockResolvedValue([]),
    findProjectRiskData: jest.fn().mockResolvedValue(null),
    findAllocatedCandidatesWithSkill: jest.fn().mockResolvedValue([]),
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
            llm_host: '',
        };
        return Promise.resolve(map[key] ?? '');
    }),
    set: jest.fn(),
    ...overrides,
});

const makeCandidate = (userId: number, fullName: string, utilisationPercent: number, skills: string[]) => ({
    userId, fullName, utilisationPercent, skills, recentActivityTags: [], currentManagerName: null,
});

describe('AiFeaturesService', () => {
    describe('skillMatch', () => {
        it('returns empty matches when no candidates', async () => {
            const svc = createAiFeaturesService(makeAiRepo(), makeAiService(), makeConfigRepo());
            const result = await svc.skillMatch(1, 'React developer');
            expect(result.matches).toHaveLength(0);
            expect(result.requirement).toBe('React developer');
        });

        it('returns empty when keywords are all stopwords', async () => {
            const candidates = [makeCandidate(5, 'Alice', 50, ['React'])];
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                makeAiService(),
                makeConfigRepo(),
            );
            const result = await svc.skillMatch(1, 'senior developer');
            expect(result.matches).toHaveLength(0);
        });

        it('calls generateText with candidates in prompt', async () => {
            const candidates = [makeCandidate(5, 'Alice', 50, ['React'])];
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
            expect(result.matches[0].skills).toEqual(['React']);
            expect(aiService.generateText).toHaveBeenCalled();
        });

        it('falls back gracefully when AI returns non-JSON', async () => {
            const candidates = [makeCandidate(5, 'Bob', 30, ['React'])];
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                makeAiService('Not valid JSON at all'),
                makeConfigRepo(),
            );
            const result = await svc.skillMatch(1, 'React dev');
            expect(result.matches).toHaveLength(1);
            expect(result.matches[0].reason).toMatch(/most available|unavailable/i);
        });

        it('filters out userIds not in candidates', async () => {
            const candidates = [makeCandidate(5, 'Alice', 50, ['React'])];
            const aiService = makeAiService(JSON.stringify([{ userId: 99, reason: 'hallucinated' }]));
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                aiService,
                makeConfigRepo(),
            );
            const result = await svc.skillMatch(1, 'React dev');
            expect(result.matches).toHaveLength(0);
        });

        it('only returns candidates whose skills match the keyword', async () => {
            const candidates = [
                makeCandidate(1, 'Alice', 20, ['React', 'TypeScript']),
                makeCandidate(2, 'Bob', 30, ['Salesforce Developer']),
            ];
            const aiService = makeAiService(JSON.stringify([{ userId: 1, reason: 'Has React' }]));
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                aiService,
                makeConfigRepo(),
            );
            const result = await svc.skillMatch(1, 'React developer');
            expect(result.matches).toHaveLength(1);
            expect(result.matches[0].userId).toBe(1);
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
                expect.any(String), 'groq', 'llama3-8b-8192', expect.any(String), expect.any(String),
            );
        });
    });

    describe('staffTeam', () => {
        it('returns all matching candidates for a role', async () => {
            const candidates = [
                makeCandidate(10, 'Alice', 20, ['Java', 'Spring Boot']),
                makeCandidate(11, 'Bob', 50, ['Java', 'Kafka']),
            ];
            const aiService = makeAiService(JSON.stringify([
                { userId: 10, reason: 'Has Spring Boot expertise' },
                { userId: 11, reason: 'Has Java and Kafka skills' },
            ]));
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                aiService,
                makeConfigRepo(),
            );
            const result = await svc.staffTeam([{ roleName: 'Java Developer', requiredSkill: 'Java' }]);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].matched).toBe(true);
            expect(result.results[0].candidates).toHaveLength(2);
            expect(result.results[0].candidates![0].userId).toBe(10);
            expect(result.results[0].candidates![0].skills).toEqual(['Java', 'Spring Boot']);
            expect(result.results[0].candidates![1].userId).toBe(11);
        });

        it('same person appears in multiple roles since there is no exclusion', async () => {
            const candidates = [makeCandidate(10, 'Alice', 20, ['Java', 'Docker'])];
            const aiService = makeAiService(JSON.stringify([{ userId: 10, reason: 'Match' }]));
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                aiService,
                makeConfigRepo(),
            );
            const result = await svc.staffTeam([
                { roleName: 'Java Dev', requiredSkill: 'Java' },
                { roleName: 'DevOps', requiredSkill: 'Docker' },
            ]);
            // Both roles match and Alice appears in both
            expect(result.results.every((r) => r.matched)).toBe(true);
            expect(result.results[0].candidates![0].userId).toBe(10);
            expect(result.results[1].candidates![0].userId).toBe(10);
        });

        it('returns no_skill gap when no one in org has the skill', async () => {
            const svc = createAiFeaturesService(
                makeAiRepo({
                    findSkillMatchCandidates: jest.fn().mockResolvedValue([]),
                    findAllocatedCandidatesWithSkill: jest.fn().mockResolvedValue([]),
                }),
                makeAiService(),
                makeConfigRepo(),
            );
            const result = await svc.staffTeam([{ roleName: 'Salesforce Dev', requiredSkill: 'Salesforce' }]);
            expect(result.results[0].matched).toBe(false);
            expect(result.results[0].gapType).toBe('no_skill');
            expect(result.results[0].gapMessage).toMatch(/no employee/i);
        });

        it('returns all_allocated gap with availableFrom when skill exists but no one is free', async () => {
            const svc = createAiFeaturesService(
                makeAiRepo({
                    findSkillMatchCandidates: jest.fn().mockResolvedValue([]),
                    findAllocatedCandidatesWithSkill: jest.fn().mockResolvedValue([
                        { fullName: 'Bob', availableFrom: '2026-08-01' },
                    ]),
                }),
                makeAiService(),
                makeConfigRepo(),
            );
            const result = await svc.staffTeam([{ roleName: 'Java Dev', requiredSkill: 'Java' }]);
            expect(result.results[0].matched).toBe(false);
            expect(result.results[0].gapType).toBe('all_allocated');
            expect(result.results[0].availableFrom).toBe('2026-08-01');
        });

        it('falls back to all eligible when AI returns invalid JSON', async () => {
            const candidates = [makeCandidate(7, 'Carol', 10, ['Python'])];
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue(candidates) }),
                makeAiService('not json'),
                makeConfigRepo(),
            );
            const result = await svc.staffTeam([{ roleName: 'Python Dev', requiredSkill: 'Python' }]);
            expect(result.results[0].matched).toBe(true);
            expect(result.results[0].candidates).toHaveLength(1);
            expect(result.results[0].candidates![0].userId).toBe(7);
            expect(result.results[0].candidates![0].reason).toMatch(/90%/);
        });

        it('passes projectName through to the response', async () => {
            const svc = createAiFeaturesService(
                makeAiRepo({ findSkillMatchCandidates: jest.fn().mockResolvedValue([]) }),
                makeAiService(),
                makeConfigRepo(),
            );
            const result = await svc.staffTeam(
                [{ roleName: 'QA', requiredSkill: 'Selenium' }],
                'Banking Portal',
            );
            expect(result.projectName).toBe('Banking Portal');
        });
    });
});
