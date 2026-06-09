import { IProjectRepository } from '../repositories/project.repository';
import { IUserRepository } from '../repositories/user.repository';
import { ProjectStatus, MilestoneStatus } from '../models/project.model';
import {
    ProjectSummaryDto,
    ProjectDetailDto,
    CreateProjectRequestDto,
    UpdateProjectRequestDto,
    MilestoneSummaryDto,
    AddMilestoneRequestDto,
} from '../models/project.dto';
import { UserRole } from '../models/user.model';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoDate = (value: string): boolean => {
    if (!ISO_DATE_PATTERN.test(value)) return false;
    const time = new Date(`${value}T00:00:00Z`).getTime();
    return !Number.isNaN(time);
};

const assertManagerEligible = async (
    userRepository: IUserRepository,
    managerId: number,
): Promise<void> => {
    const manager = await userRepository.findById(managerId);
    if (!manager) {
        throw new Error(`User with ID ${managerId} not found`);
    }
    if (manager.role !== UserRole.MANAGER && manager.role !== UserRole.ADMIN) {
        throw new Error('Assigned manager must have MANAGER or ADMIN role');
    }
};

export interface IProjectService {
    getAllProjects(): Promise<ProjectSummaryDto[]>;
    getProjectById(id: number): Promise<ProjectDetailDto>;
    createProject(dto: CreateProjectRequestDto): Promise<number>;
    updateProject(id: number, dto: UpdateProjectRequestDto): Promise<void>;
    getMilestones(projectId: number): Promise<MilestoneSummaryDto>;
    addMilestone(projectId: number, dto: AddMilestoneRequestDto): Promise<void>;
    updateMilestoneStatus(projectId: number, milestoneId: number, status: MilestoneStatus): Promise<void>;
}

export const createProjectService = (
    projectRepository: IProjectRepository,
    userRepository: IUserRepository,
): IProjectService => ({
    async getAllProjects(): Promise<ProjectSummaryDto[]> {
        return projectRepository.findAllSummaries();
    },

    async getProjectById(id: number): Promise<ProjectDetailDto> {
        const project = await projectRepository.findById(id);
        if (!project) {
            throw new Error(`Project with ID ${id} not found`);
        }
        return project;
    },

    async createProject(dto: CreateProjectRequestDto): Promise<number> {
        if (!dto.name || !dto.name.trim()) {
            throw new Error('Project name is required');
        }
        if (!isValidIsoDate(dto.startDate) || !isValidIsoDate(dto.endDate)) {
            throw new Error('Start date and end date must be valid dates');
        }
        if (dto.startDate >= dto.endDate) {
            throw new Error('Start date must be before end date');
        }
        if (!Object.values(ProjectStatus).includes(dto.status)) {
            throw new Error('Invalid project status');
        }
        if (dto.totalStoryPoints < 0) {
            throw new Error('Total story points cannot be negative');
        }
        await assertManagerEligible(userRepository, dto.managerId);
        return projectRepository.create(dto);
    },

    async updateProject(id: number, dto: UpdateProjectRequestDto): Promise<void> {
        const project = await projectRepository.findById(id);
        if (!project) {
            throw new Error(`Project with ID ${id} not found`);
        }

        const startDate = dto.startDate ?? project.startDate;
        const endDate = dto.endDate ?? project.endDate;

        if (dto.name !== undefined && !dto.name.trim()) {
            throw new Error('Project name cannot be empty');
        }
        if (dto.startDate !== undefined && !isValidIsoDate(dto.startDate)) {
            throw new Error('Start date must be a valid date');
        }
        if (dto.endDate !== undefined && !isValidIsoDate(dto.endDate)) {
            throw new Error('End date must be a valid date');
        }
        if (startDate >= endDate) {
            throw new Error('Start date must be before end date');
        }
        if (dto.status !== undefined && !Object.values(ProjectStatus).includes(dto.status)) {
            throw new Error('Invalid project status');
        }
        if (dto.totalStoryPoints !== undefined && dto.totalStoryPoints < 0) {
            throw new Error('Total story points cannot be negative');
        }
        if (dto.managerId !== undefined) {
            await assertManagerEligible(userRepository, dto.managerId);
        }

        await projectRepository.update(id, dto);
    },

    async getMilestones(projectId: number): Promise<MilestoneSummaryDto> {
        const project = await projectRepository.findById(projectId);
        if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
        }
        const milestones = await projectRepository.getMilestones(projectId);
        const completedStoryPoints = milestones
            .filter((m) => m.status === MilestoneStatus.DONE)
            .reduce((sum, m) => sum + m.storyPoints, 0);
        const totalStoryPoints = milestones.reduce((sum, m) => sum + m.storyPoints, 0);
        return {
            milestones,
            totalStoryPoints,
            completedStoryPoints,
            remainingStoryPoints: totalStoryPoints - completedStoryPoints,
        };
    },

    async addMilestone(projectId: number, dto: AddMilestoneRequestDto): Promise<void> {
        const project = await projectRepository.findById(projectId);
        if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
        }
        if (!dto.title || !dto.title.trim()) {
            throw new Error('Milestone title is required');
        }
        if (!isValidIsoDate(dto.dueDate)) {
            throw new Error('Due date must be a valid date');
        }
        if (dto.storyPoints < 0) {
            throw new Error('Story points cannot be negative');
        }
        await projectRepository.addMilestone(projectId, dto.title.trim(), dto.dueDate, dto.storyPoints);
    },

    async updateMilestoneStatus(projectId: number, milestoneId: number, status: MilestoneStatus): Promise<void> {
        if (!Object.values(MilestoneStatus).includes(status)) {
            throw new Error('Invalid milestone status');
        }
        const milestone = await projectRepository.findMilestoneById(milestoneId);
        if (!milestone) {
            throw new Error(`Milestone with ID ${milestoneId} not found`);
        }
        await projectRepository.updateMilestoneStatus(milestoneId, status);
    },
});
