import { EmployeeStatus, SkillCategory, ProficiencyLevel } from './employee.model';

// In V2, "employees" are RESOURCE-role users. Their profile lives in resource_profiles.
export interface EmployeeSummaryDto {
    userId: number;           // users.id
    fullName: string;
    status: EmployeeStatus | null;    // null = no profile assigned yet
    reportingToId: number | null;     // resource_profiles.reporting_to
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

export interface AssignManagerRequestDto {
    managerId: number;
}
