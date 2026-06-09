import { EmployeeStatus, SkillCategory, ProficiencyLevel } from './employee.model';

export interface EmployeeSummaryDto {
    id: number;
    userId: number;
    fullName: string;
    department: string;
    status: EmployeeStatus;
    isActive: boolean;
}

export interface EmployeeDetailDto {
    id: number;
    userId: number;
    fullName: string;
    email: string;
    department: string;
    designation: string;
    status: EmployeeStatus;
    managerId: number | null;
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
