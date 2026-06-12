import { IEmployeeRepository } from '../repositories/employee.repository';
import { IUserRepository } from '../repositories/user.repository';
import {
    EmployeeSummaryDto,
    EmployeeDetailDto,
    UpdateEmployeeRequestDto,
    EmployeeSkillDto,
    AddSkillRequestDto,
    UpdateSkillRequestDto,
} from '../models/employee.dto';
import { UserRole } from '../models/user.model';

export interface DeactivateResult {
    allocationCount: number;
    allocationSummaries: string[];
}

export interface IEmployeeService {
    getAllEmployees(): Promise<EmployeeSummaryDto[]>;
    getEmployee(userId: number): Promise<EmployeeDetailDto>;
    updateEmployee(userId: number, dto: UpdateEmployeeRequestDto): Promise<void>;
    deactivateEmployee(userId: number): Promise<void>;
    getDeactivateWarning(userId: number): Promise<DeactivateResult>;
    assignManager(userId: number, managerId: number): Promise<void>;
    getSkills(userId: number): Promise<EmployeeSkillDto[]>;
    addSkill(userId: number, dto: AddSkillRequestDto): Promise<void>;
    updateSkill(userId: number, skillId: number, dto: UpdateSkillRequestDto): Promise<void>;
    removeSkill(userId: number, skillId: number): Promise<void>;
}

export const createEmployeeService = (
    employeeRepository: IEmployeeRepository,
    userRepository: IUserRepository,
): IEmployeeService => ({
    async getAllEmployees(): Promise<EmployeeSummaryDto[]> {
        return employeeRepository.findAll();
    },

    async getEmployee(userId: number): Promise<EmployeeDetailDto> {
        const employee = await employeeRepository.findByUserId(userId);
        if (!employee) {
            throw new Error(`Resource with user ID ${userId} not found`);
        }
        return employee;
    },

    async updateEmployee(userId: number, dto: UpdateEmployeeRequestDto): Promise<void> {
        const employee = await employeeRepository.findByUserId(userId);
        if (!employee) {
            throw new Error(`Resource with user ID ${userId} not found`);
        }
        await employeeRepository.update(userId, dto);
    },

    async getDeactivateWarning(userId: number): Promise<DeactivateResult> {
        const employee = await employeeRepository.findByUserId(userId);
        if (!employee) {
            throw new Error(`Resource with user ID ${userId} not found`);
        }
        const allocationCount = await employeeRepository.getActiveAllocationCount(userId);
        const allocationSummaries = allocationCount > 0
            ? await employeeRepository.getActiveAllocationSummaries(userId)
            : [];
        return { allocationCount, allocationSummaries };
    },

    async deactivateEmployee(userId: number): Promise<void> {
        const employee = await employeeRepository.findByUserId(userId);
        if (!employee) {
            throw new Error(`Resource with user ID ${userId} not found`);
        }
        if (!employee.isActive) {
            throw new Error('Resource is already inactive');
        }
        await employeeRepository.endActiveAllocations(userId);
        await userRepository.setActiveStatus(userId, false);
    },

    async assignManager(userId: number, managerId: number): Promise<void> {
        const employee = await employeeRepository.findByUserId(userId);
        if (!employee) {
            throw new Error(`Resource with user ID ${userId} not found`);
        }
        const manager = await userRepository.findById(managerId);
        if (!manager) {
            throw new Error(`User with ID ${managerId} not found`);
        }
        if (manager.role !== UserRole.MANAGER && manager.role !== UserRole.ADMIN) {
            throw new Error('Assigned manager must have MANAGER or ADMIN role');
        }
        await employeeRepository.assignManager(userId, managerId);
    },

    async getSkills(userId: number): Promise<EmployeeSkillDto[]> {
        return employeeRepository.getSkills(userId);
    },

    async addSkill(userId: number, dto: AddSkillRequestDto): Promise<void> {
        const employee = await employeeRepository.findByUserId(userId);
        if (!employee) {
            throw new Error(`Resource with user ID ${userId} not found`);
        }
        await employeeRepository.addSkill(userId, dto.skillName, dto.category, dto.proficiencyLevel);
    },

    async updateSkill(userId: number, skillId: number, dto: UpdateSkillRequestDto): Promise<void> {
        const skill = await employeeRepository.findSkillById(skillId);
        if (!skill) {
            throw new Error(`Skill with ID ${skillId} not found`);
        }
        await employeeRepository.updateSkillProficiency(skillId, dto.proficiencyLevel);
    },

    async removeSkill(userId: number, skillId: number): Promise<void> {
        const skill = await employeeRepository.findSkillById(skillId);
        if (!skill) {
            throw new Error(`Skill with ID ${skillId} not found`);
        }
        await employeeRepository.removeSkill(skillId);
    },
});

