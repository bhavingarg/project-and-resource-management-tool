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

export interface RiskSummaryResponseDto {
    projectName: string;
    summary: string;
}
