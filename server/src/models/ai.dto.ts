export interface SkillMatchRequestDto {
    requirement: string;
}

export interface SkillMatchResultDto {
    userId: number;
    fullName: string;
    freePercent: number;
    reason: string;
    currentManager: string | null;
    skills: string[];
}

export interface SkillMatchResponseDto {
    requirement: string;
    matches: SkillMatchResultDto[];
}

export interface RiskSummaryRequestDto {
    projectId: number;
}

export interface RiskSummaryResponseDto {
    projectName: string;
    summary: string;
}
