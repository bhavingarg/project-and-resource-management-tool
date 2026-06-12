export type EmployeeStatus = 'BENCH' | 'ALLOCATED';
export type SkillCategory = 'BACKEND' | 'FRONTEND' | 'DEVOPS' | 'QA' | 'OTHER';
export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface EmployeeSummaryDto {
    userId: number;
    fullName: string;
    status: EmployeeStatus | null;
    reportingToId: number | null;
    isActive: boolean;
}

export interface EmployeeDetailDto {
    userId: number;
    fullName: string;
    email: string;
    status: EmployeeStatus | null;
    reportingToId: number | null;
    department: string | null;
    designation: string | null;
    isActive: boolean;
}

export interface UpdateEmployeeRequestDto {
    fullName?: string;
    email?: string;
    department?: string;
    designation?: string;
}

export interface EmployeeSkillDto {
    id: number;
    skillName: string;
    category: SkillCategory;
    proficiencyLevel: ProficiencyLevel;
}

export interface AddSkillRequestDto {
    skillName: string;
    category: SkillCategory;
    proficiencyLevel: ProficiencyLevel;
}

export interface UpdateSkillRequestDto {
    proficiencyLevel: ProficiencyLevel;
}

export interface DeactivateWarningDto {
    allocationCount: number;
    allocationSummaries: string[];
}
