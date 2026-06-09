export enum EmployeeStatus {
    BENCH = 'BENCH',
    ALLOCATED = 'ALLOCATED',
}

export enum SkillCategory {
    BACKEND = 'BACKEND',
    FRONTEND = 'FRONTEND',
    DEVOPS = 'DEVOPS',
    QA = 'QA',
    OTHER = 'OTHER',
}

export enum ProficiencyLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED',
}

export interface Employee {
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

export interface EmployeeSkill {
    id: number;
    employeeId: number;
    skillName: string;
    category: SkillCategory;
    proficiencyLevel: ProficiencyLevel;
}
