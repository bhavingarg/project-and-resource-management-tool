import { apiClient } from './api.client';
import { SkillMatchResponseDto, RiskSummaryResponseDto, TeamRoleDto, TeamStaffResponseDto } from '../models/ai.dto';

// AI endpoints invoke a remote LLM and can take 15-30 s per call.
// staffTeam chains one call per role, so allow up to 3 minutes total.
const AI_TIMEOUT_MS = 180_000;

export const aiApiService = {
    async skillMatch(requirement: string, projectName?: string): Promise<SkillMatchResponseDto> {
        return apiClient.post<SkillMatchResponseDto>('/ai/skill-match', { requirement, projectName }, AI_TIMEOUT_MS);
    },

    async riskSummary(projectId: number): Promise<RiskSummaryResponseDto> {
        return apiClient.post<RiskSummaryResponseDto>('/ai/risk-summary', { projectId }, AI_TIMEOUT_MS);
    },

    async staffTeam(roles: TeamRoleDto[], projectName?: string): Promise<TeamStaffResponseDto> {
        return apiClient.post<TeamStaffResponseDto>('/ai/staff-team', { roles, projectName }, AI_TIMEOUT_MS);
    },
};
