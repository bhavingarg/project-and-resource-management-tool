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
    getEmployeeById(id: number): Promise<EmployeeDetailDto>;
    getEmployeeByUserId(userId: number): Promise<EmployeeDetailDto>;
    updateEmployee(id: number, dto: UpdateEmployeeRequestDto): Promise<void>;
    deactivateEmployee(id: number): Promise<void>;
    getDeactivateWarning(id: number): Promise<DeactivateResult>;
    assignManager(employeeId: number, managerId: number): Promise<void>;
    getSkills(employeeId: number): Promise<EmployeeSkillDto[]>;
    addSkill(employeeId: number, dto: AddSkillRequestDto): Promise<void>;
    updateSkill(employeeId: number, skillId: number, dto: UpdateSkillRequestDto): Promise<void>;
    removeSkill(employeeId: number, skillId: number): Promise<void>;
}

export const createEmployeeService = (
    employeeRepository: IEmployeeRepository,
    userRepository: IUserRepository,
): IEmployeeService => ({
    async getAllEmployees(): Promise<EmployeeSummaryDto[]> {
        return employeeRepository.findAll();
    },

    async getEmployeeById(id: number): Promise<EmployeeDetailDto> {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        return employee;
    },

    async getEmployeeByUserId(userId: number): Promise<EmployeeDetailDto> {
        const employee = await employeeRepository.findByUserId(userId);
        if (!employee) {
            throw new Error(`No employee profile found for user ID ${userId}`);
        }
        return employee;
    },

    async updateEmployee(id: number, dto: UpdateEmployeeRequestDto): Promise<void> {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        await employeeRepository.update(id, dto);
    },

    async getDeactivateWarning(id: number): Promise<DeactivateResult> {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        const allocationCount = await employeeRepository.getActiveAllocationCount(id);
        const allocationSummaries = allocationCount > 0
            ? await employeeRepository.getActiveAllocationSummaries(id)
            : [];
        return { allocationCount, allocationSummaries };
    },

    async deactivateEmployee(id: number): Promise<void> {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        if (!employee.isActive) {
            throw new Error('Employee is already inactive');
        }
        await employeeRepository.endActiveAllocations(id);
        await employeeRepository.deactivate(id);
        await employeeRepository.deactivateLinkedUser(id);
    },

    async assignManager(employeeId: number, managerId: number): Promise<void> {
        const employee = await employeeRepository.findById(employeeId);
        if (!employee) {
            throw new Error(`Employee with ID ${employeeId} not found`);
        }
        const manager = await userRepository.findById(managerId);
        if (!manager) {
            throw new Error(`User with ID ${managerId} not found`);
        }
        if (manager.role !== UserRole.MANAGER && manager.role !== UserRole.ADMIN) {
            throw new Error('Assigned manager must have MANAGER or ADMIN role');
        }
        await employeeRepository.assignManager(employeeId, managerId);
    },

    async getSkills(employeeId: number): Promise<EmployeeSkillDto[]> {
        const employee = await employeeRepository.findById(employeeId);
        if (!employee) {
            throw new Error(`Employee with ID ${employeeId} not found`);
        }
        return employeeRepository.getSkills(employeeId);
    },

    async addSkill(employeeId: number, dto: AddSkillRequestDto): Promise<void> {
        const employee = await employeeRepository.findById(employeeId);
        if (!employee) {
            throw new Error(`Employee with ID ${employeeId} not found`);
        }
        try {
            await employeeRepository.addSkill(employeeId, dto.skillName, dto.category, dto.proficiencyLevel);
        } catch (err: unknown) {
            const mysqlError = err as { code?: string };
            if (mysqlError.code === 'ER_DUP_ENTRY') {
                throw new Error(`Skill '${dto.skillName}' already exists for this employee`);
            }
            throw err;
        }
    },

    async updateSkill(employeeId: number, skillId: number, dto: UpdateSkillRequestDto): Promise<void> {
        const skill = await employeeRepository.findSkillById(skillId);
        if (!skill) {
            throw new Error(`Skill with ID ${skillId} not found`);
        }
        await employeeRepository.updateSkillProficiency(skillId, dto.proficiencyLevel);
    },

    async removeSkill(employeeId: number, skillId: number): Promise<void> {
        const skill = await employeeRepository.findSkillById(skillId);
        if (!skill) {
            throw new Error(`Skill with ID ${skillId} not found`);
        }
        await employeeRepository.removeSkill(skillId);
    },
});
