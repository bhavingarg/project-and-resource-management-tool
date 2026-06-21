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

// ── Team Staffing ──────────────────────────────────────────────────────────

export interface TeamRoleDto {
    roleName: string;
    requiredSkill: string;
    proficiencyLevel?: string;
}

export interface TeamRoleResultDto {
    roleName: string;
    requiredSkill: string;
    matched: boolean;
    // when matched: ranked list of all available candidates for this role
    candidates?: SkillMatchResultDto[];
    // when not matched
    gapType?: 'no_skill' | 'all_allocated';
    gapMessage?: string;
    availableFrom?: string | null;
}

export interface TeamStaffResponseDto {
    projectName?: string;
    results: TeamRoleResultDto[];
}
