import { IManagerRepository, TeamMemberRecord } from '../repositories/manager.repository';
import { IEmployeeRepository } from '../repositories/employee.repository';
import { IAllocationRepository } from '../repositories/allocation.repository';
import { MilestoneStatus } from '../models/project.model';
import {
    ResourceDashboardDto,
    TeamMemberDto,
    EmployeeDrillDownDto,
    ManagerProjectDto,
    ManagerProjectDetailDto,
} from '../models/manager.dto';

const FULLY_ALLOCATED_PERCENT = 100;

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export interface IManagerService {
    getResourceDashboard(managerUserId: number): Promise<ResourceDashboardDto>;
    getEmployeeDrillDown(managerUserId: number, userId: number): Promise<EmployeeDrillDownDto>;
    getManagerProjects(managerUserId: number): Promise<ManagerProjectDto[]>;
    getProjectDetail(managerUserId: number, projectId: number): Promise<ManagerProjectDetailDto>;
}

export const createManagerService = (
    managerRepository: IManagerRepository,
    employeeRepository: IEmployeeRepository,
    allocationRepository: IAllocationRepository,
): IManagerService => {
    const toTeamMemberDto = async (member: TeamMemberRecord): Promise<TeamMemberDto> => {
        const skills = await employeeRepository.getSkills(member.userId);
        return {
            userId: member.userId,
            fullName: member.fullName,
            status: member.status,
            utilisationPercent: member.utilisationPercent,
            skills: skills.map((skill) => skill.skillName),
        };
    };

    return {
        async getResourceDashboard(managerUserId: number): Promise<ResourceDashboardDto> {
            const members = await managerRepository.findTeamMembers(managerUserId);
            const dtos = await Promise.all(members.map(toTeamMemberDto));
            return {
                bench: dtos.filter((member) => member.utilisationPercent === 0),
                active: dtos.filter((member) => member.utilisationPercent > 0),
            };
        },

        async getEmployeeDrillDown(managerUserId: number, userId: number): Promise<EmployeeDrillDownDto> {
            const member = await managerRepository.findTeamMemberByUserId(managerUserId, userId);
            if (!member) {
                throw new Error(`Resource ${userId} is not on your team`);
            }
            const [skills, activeAllocations, recentActivityTags] = await Promise.all([
                employeeRepository.getSkills(member.userId),
                allocationRepository.findActiveLinesByEmployee(member.userId),
                managerRepository.findRecentActivityTags(member.userId),
            ]);
            return {
                userId: member.userId,
                fullName: member.fullName,
                status: member.status,
                utilisationPercent: member.utilisationPercent,
                skills: skills.map((skill) => skill.skillName),
                activeAllocations,
                recentActivityTags,
            };
        },

        async getManagerProjects(managerUserId: number): Promise<ManagerProjectDto[]> {
            return managerRepository.findManagerProjects(managerUserId);
        },

        async getProjectDetail(managerUserId: number, projectId: number): Promise<ManagerProjectDetailDto> {
            const project = await managerRepository.findManagerProjectById(managerUserId, projectId);
            if (!project) {
                throw new Error(`Project ${projectId} not found among your projects`);
            }

            const today = todayIso();
            const [milestones, allocatedResources] = await Promise.all([
                managerRepository.findProjectMilestones(projectId),
                allocationRepository.findActiveByProject(projectId),
            ]);

            return {
                id: project.id,
                name: project.name,
                status: project.status,
                health: project.health,
                milestones: milestones.map((milestone) => ({
                    title: milestone.title,
                    dueDate: milestone.dueDate,
                    status: milestone.status,
                    isOverdue: milestone.status !== MilestoneStatus.DONE && milestone.dueDate < today,
                })),
                allocatedResources,
            };
        },
    };
};
