import { IAiRepository, SkillMatchCandidateRecord } from '../repositories/ai.repository';
import { ISystemConfigRepository } from '../repositories/system-config.repository';
import { IAiService, LlmProvider } from './ai.service';
import {
    SkillMatchResponseDto,
    SkillMatchResultDto,
    RiskSummaryResponseDto,
    TeamRoleDto,
    TeamStaffResponseDto,
    TeamRoleResultDto,
} from '../models/ai.dto';
import { AppConfig } from '../config/app.config';

const DEFAULT_MODEL = 'gemini-3.5-flash';
const DEFAULT_PROVIDER: LlmProvider = 'gemini';

export interface IAiFeaturesService {
    skillMatch(managerUserId: number, requirement: string, projectName?: string): Promise<SkillMatchResponseDto>;
    getRiskSummary(managerUserId: number, projectId: number): Promise<RiskSummaryResponseDto>;
    staffTeam(roles: TeamRoleDto[], projectName?: string): Promise<TeamStaffResponseDto>;
}

// â”€â”€ prompt builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const buildSkillMatchPrompt = (
    candidates: SkillMatchCandidateRecord[],
    requirement: string,
    projectName?: string,
): string => {
    const candidateBlock = candidates
        .map(
            (c, i) =>
                `${i + 1}. userId: ${c.userId}, Name: ${c.fullName}\n` +
                `   Free capacity: ${100 - c.utilisationPercent}%\n` +
                `   Skills: ${c.skills.length > 0 ? c.skills.join(', ') : '(none listed)'}\n` +
                `   Recent work tags: ${c.recentActivityTags.length > 0 ? c.recentActivityTags.join(', ') : '(none)'}`,
        )
        .join('\n\n');

    const projectContext = projectName ? `\nProject: ${projectName}` : '';

    return `You are a resource allocation advisor for a software company.
A manager needs to find the best team member(s) for the following requirement:${projectContext}
Requirement: "${requirement}"

Available team members (not fully allocated):
${candidateBlock}

Return a JSON array covering ALL of the candidates listed above, ranked from best to least suitable.
STRICT RULES:
- Only include a candidate if their Skills list directly contains technology relevant to the requirement.
- Do NOT include anyone who lacks the required skill, regardless of their availability.
- For the reason, write ONE short sentence describing what specific skill(s) they have that match.
- Do NOT mention ranking, suitability scores, or compare people to each other.

Use this exact format â€” no markdown, no code blocks, just the raw JSON array:
[
  {"userId": <number>, "reason": "<one sentence about their specific matching skill>"},
  ...
]
Only include userId values listed above. If none are suitable, return an empty array [].`;
};

const buildRiskSummaryPrompt = (data: {
    projectName: string;
    endDate: string;
    health: string;
    milestones: { title: string; dueDate: string; status: string; isOverdue: boolean }[];
    resourceEffort: {
        resourceName: string;
        utilisationPercent: number;
        expectedHoursPerWeek: number;
        avgHoursPerWeek: number;
        weeksSubmitted: number;
        allocationDate: string;
    }[];
}): string => {
    const milestoneBlock = data.milestones.length > 0
        ? data.milestones
            .map(
                (m) =>
                    `  - ${m.title}: due ${m.dueDate}, status ${m.status}${m.isOverdue ? ' âš  OVERDUE' : ''}`,
            )
            .join('\n')
        : '  (no milestones defined)';

    const effortBlock = data.resourceEffort.length > 0
        ? data.resourceEffort
            .map((e) => {
                const today = new Date().toISOString().slice(0, 10);
                const allocDays = Math.floor(
                    (new Date(today).getTime() - new Date(e.allocationDate).getTime()) / 86400000,
                );
                const newNote = allocDays < 7 ? ` [allocated ${allocDays} day(s) ago â€” no timesheets expected yet]` : '';
                return `  - ${e.resourceName}: ${e.utilisationPercent}% allocated since ${e.allocationDate}` +
                    ` (expected ~${e.expectedHoursPerWeek}h/week, avg logged: ${e.avgHoursPerWeek}h/week` +
                    ` over last 4 weeks, ${e.weeksSubmitted} timesheets submitted${newNote})`;
            })
            .join('\n')
        : '  (no active allocations)';

    return `You are a project risk analyst for a software company.
Analyze the following project data and write a concise risk summary.

Project: ${data.projectName}
End Date: ${data.endDate}
Current Health: ${data.health}

Milestones:
${milestoneBlock}

Resource Effort (last 4 weeks):
${effortBlock}

Write 2-3 sentences of plain English summarising the key risks and what the manager should focus on.
Do NOT use bullet points or markdown. Return only the plain-English paragraph.`;
};

// â”€â”€ resolve LLM settings from system config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LlmSettings {
    provider: LlmProvider;
    modelName: string;
    apiKey: string;
    host: string;
}

const resolveLlmSettings = async (
    systemConfigRepository: ISystemConfigRepository,
): Promise<LlmSettings> => {
    const [provider, model, storedKey, storedHost] = await Promise.all([
        systemConfigRepository.get('llm_provider', DEFAULT_PROVIDER),
        systemConfigRepository.get('llm_model', DEFAULT_MODEL),
        systemConfigRepository.get('llm_api_key', ''),
        systemConfigRepository.get('llm_host', AppConfig.customLlmHost),
    ]);
    const resolvedProvider = provider as LlmProvider;
    // API key: use DB value, or fall back to provider-specific env var
    const apiKey = storedKey.trim() ||
        (resolvedProvider === 'custom' ? AppConfig.customLlmApiKey : AppConfig.geminiApiKey);
    const host = storedHost.trim() || AppConfig.customLlmHost;
    return { provider: resolvedProvider, modelName: model, apiKey, host };
};

// â”€â”€ JSON parsing helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GeminiMatchItem {
    userId: number;
    reason: string;
}

const parseMatchJson = (raw: string): GeminiMatchItem[] => {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/```[a-z]*\n?/gi, '').trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
    return parsed as GeminiMatchItem[];
};

// â”€â”€ factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createAiFeaturesService = (
    aiRepository: IAiRepository,
    aiService: IAiService,
    systemConfigRepository: ISystemConfigRepository,
): IAiFeaturesService => ({
    async skillMatch(
        managerUserId: number,
        requirement: string,
        projectName?: string,
    ): Promise<SkillMatchResponseDto> {
        const allCandidates = await aiRepository.findSkillMatchCandidates();

        if (allCandidates.length === 0) {
            return { requirement, matches: [] };
        }

        // Pre-filter: only pass candidates whose skills contain at least one technology
        // keyword from the requirement. Generic job-role words are excluded so that e.g.
        // "Next.js developer" does not match a "Salesforce Developer" via "developer".
        // Also does reverse-inclusion check to tolerate minor skill name variations.
        const STOPWORDS = new Set([
            'developer', 'engineer', 'expert', 'specialist', 'senior', 'junior',
            'lead', 'architect', 'consultant', 'analyst', 'with', 'and', 'for', 'the',
            'want', 'need', 'looking', 'months', 'weeks', 'project', 'resource',
        ]);
        const keywords = requirement
            .toLowerCase()
            .split(/[\s,./\-]+/)
            .filter((w) => w.length > 2 && !STOPWORDS.has(w));

        // If no meaningful technology keywords found, return empty â€” don't guess
        if (keywords.length === 0) {
            return { requirement, matches: [] };
        }

        const candidates = allCandidates.filter((c) =>
            c.skills.some((skill) => {
                const s = skill.toLowerCase();
                // Check both directions to handle minor typos/abbreviations
                return keywords.some((kw) => s.includes(kw) || kw.includes(s.replace(/\s+/g, '')));
            }),
        );

        // No fallback â€” if no one has the skill, tell the user clearly
        if (candidates.length === 0) {
            return { requirement, matches: [] };
        }

        const { provider, modelName, apiKey, host } = await resolveLlmSettings(systemConfigRepository);
        const prompt = buildSkillMatchPrompt(candidates, requirement, projectName);
        const raw = await aiService.generateText(prompt, provider, modelName, apiKey, host);

        let geminiMatches: GeminiMatchItem[];
        try {
            geminiMatches = parseMatchJson(raw);
        } catch {
            // If Gemini returns non-JSON, fall back to returning candidates sorted by free capacity
            const fallback: SkillMatchResultDto[] = candidates.map((c) => ({
                userId: c.userId,
                fullName: c.fullName,
                freePercent: 100 - c.utilisationPercent,
                reason: 'Showing most available resources.',
                currentManager: c.currentManagerName,
                skills: c.skills,
            }));
            return { requirement, matches: fallback };
        }

        // Build lookup by userId
        const candidateMap = new Map(candidates.map((c) => [c.userId, c]));

        const matches: SkillMatchResultDto[] = geminiMatches
            .filter((m) => candidateMap.has(m.userId))
            .map((m) => {
                const candidate = candidateMap.get(m.userId)!;
                return {
                    userId: candidate.userId,
                    fullName: candidate.fullName,
                    freePercent: 100 - candidate.utilisationPercent,
                    reason: m.reason,
                    currentManager: candidate.currentManagerName,
                    skills: candidate.skills,
                };
            });

        return { requirement, matches };
    },

    async getRiskSummary(
        managerUserId: number,
        projectId: number,
    ): Promise<RiskSummaryResponseDto> {
        const data = await aiRepository.findProjectRiskData(managerUserId, projectId);
        if (!data) {
            throw new Error(`Project ${projectId} not found among your projects`);
        }

        const prompt = buildRiskSummaryPrompt(data);
        const { provider, modelName, apiKey, host } = await resolveLlmSettings(systemConfigRepository);
        const summary = await aiService.generateText(prompt, provider, modelName, apiKey, host);

        return { projectName: data.projectName, summary };
    },

    async staffTeam(
        roles: TeamRoleDto[],
        projectName?: string,
    ): Promise<TeamStaffResponseDto> {
        const allAvailable = await aiRepository.findSkillMatchCandidates();

        const STOPWORDS = new Set([
            'developer', 'engineer', 'expert', 'specialist', 'senior', 'junior',
            'lead', 'architect', 'consultant', 'analyst', 'with', 'and', 'for', 'the',
            'want', 'need', 'looking', 'months', 'weeks', 'project', 'resource',
        ]);

        const extractKeywords = (skill: string): string[] =>
            skill.toLowerCase().split(/[\s,./\-]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));

        const matchesCandidateSkill = (candidate: SkillMatchCandidateRecord, keywords: string[]): boolean =>
            candidate.skills.some((s) => {
                const sl = s.toLowerCase();
                return keywords.some((kw) => sl.includes(kw) || kw.includes(sl.replace(/\s+/g, '')));
            });

        const { provider, modelName, apiKey, host } = await resolveLlmSettings(systemConfigRepository);

        const results: TeamRoleResultDto[] = [];

        for (const role of roles) {
            const keywords = extractKeywords(role.requiredSkill);

            // All available candidates who have the required skill
            const eligible = keywords.length > 0
                ? allAvailable.filter((c) => matchesCandidateSkill(c, keywords))
                : allAvailable.slice();

            if (eligible.length === 0) {
                // Gap analysis: does the skill exist at all in the org (even if fully allocated)?
                const anyWithSkill = keywords.length > 0
                    ? await aiRepository.findAllocatedCandidatesWithSkill(keywords[0] ?? role.requiredSkill)
                    : [];

                if (anyWithSkill.length === 0) {
                    results.push({
                        roleName: role.roleName,
                        requiredSkill: role.requiredSkill,
                        matched: false,
                        gapType: 'no_skill',
                        gapMessage: `No employee in the organisation has ${role.requiredSkill} skills. Consider hiring or training.`,
                    });
                } else {
                    const earliest = anyWithSkill[0].availableFrom;
                    results.push({
                        roleName: role.roleName,
                        requiredSkill: role.requiredSkill,
                        matched: false,
                        gapType: 'all_allocated',
                        gapMessage: `All employees with ${role.requiredSkill} skills are currently fully allocated.`,
                        availableFrom: earliest,
                    });
                }
                continue;
            }

            // Reuse the same prompt + JSON parser as skillMatch to get a ranked list with reasons
            const profLine = role.proficiencyLevel ? ` (${role.proficiencyLevel} level preferred)` : '';
            const requirement = `${role.roleName}${profLine} — required skill: ${role.requiredSkill}`;
            const prompt = buildSkillMatchPrompt(eligible, requirement, projectName);
            const raw = await aiService.generateText(prompt, provider, modelName, apiKey, host);

            let geminiMatches: GeminiMatchItem[];
            try {
                geminiMatches = parseMatchJson(raw);
            } catch {
                // Fallback: return all eligible candidates sorted by free capacity, no AI reason
                const candidates: SkillMatchResultDto[] = eligible.map((c) => ({
                    userId: c.userId,
                    fullName: c.fullName,
                    freePercent: 100 - c.utilisationPercent,
                    reason: `Has ${role.requiredSkill} skills and is ${100 - c.utilisationPercent}% available.`,
                    currentManager: c.currentManagerName,
                    skills: c.skills,
                }));
                results.push({ roleName: role.roleName, requiredSkill: role.requiredSkill, matched: true, candidates });
                continue;
            }

            const candidateMap = new Map(eligible.map((c) => [c.userId, c]));
            const candidates: SkillMatchResultDto[] = geminiMatches
                .filter((m) => candidateMap.has(m.userId))
                .map((m) => {
                    const c = candidateMap.get(m.userId)!;
                    return {
                        userId: c.userId,
                        fullName: c.fullName,
                        freePercent: 100 - c.utilisationPercent,
                        reason: m.reason,
                        currentManager: c.currentManagerName,
                        skills: c.skills,
                    };
                });

            // If AI returned nothing useful, fall back to all eligible sorted by availability
            if (candidates.length === 0) {
                eligible.forEach((c) => candidates.push({
                    userId: c.userId,
                    fullName: c.fullName,
                    freePercent: 100 - c.utilisationPercent,
                    reason: `Has ${role.requiredSkill} skills and is ${100 - c.utilisationPercent}% available.`,
                    currentManager: c.currentManagerName,
                    skills: c.skills,
                }));
            }

            results.push({ roleName: role.roleName, requiredSkill: role.requiredSkill, matched: true, candidates });
        }

        return { projectName, results };
    },
});
