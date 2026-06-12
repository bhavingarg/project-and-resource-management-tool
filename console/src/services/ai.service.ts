import { apiClient } from './api.client';
import { SkillMatchResponseDto, RiskSummaryResponseDto } from '../models/ai.dto';

export const aiApiService = {
    async skillMatch(requirement: string, projectName?: string): Promise<SkillMatchResponseDto> {
        return apiClient.post<SkillMatchResponseDto>('/ai/skill-match', { requirement, projectName });
    },

    async riskSummary(projectId: number): Promise<RiskSummaryResponseDto> {
        return apiClient.post<RiskSummaryResponseDto>('/ai/risk-summary', { projectId });
    },
};
