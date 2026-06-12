import { IAllocationRepository } from '../repositories/allocation.repository';
import { IProjectRepository } from '../repositories/project.repository';
import { IEmployeeRepository } from '../repositories/employee.repository';
import { AllocationSummaryDto, ProjectAllocationDto, CreateAllocationRequestDto, MyAllocationDto } from '../models/allocation.dto';
import { ProjectStatus } from '../models/project.model';

const MAX_UTILISATION_PERCENT = 100;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoDate = (value: string): boolean => {
    if (!ISO_DATE_PATTERN.test(value)) return false;
    return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
};

const ALLOCATABLE_PROJECT_STATUSES: ProjectStatus[] = [ProjectStatus.ACTIVE, ProjectStatus.PLANNED];

export interface IAllocationService {
    getAllActiveAllocations(): Promise<AllocationSummaryDto[]>;
    getProjectAllocations(managerUserId: number, projectId: number): Promise<ProjectAllocationDto[]>;
    createAllocation(managerUserId: number, dto: CreateAllocationRequestDto): Promise<void>;
    endAllocation(managerUserId: number, allocationId: number): Promise<void>;
    getMyAllocations(resourceUserId: number): Promise<MyAllocationDto[]>;
}

export const createAllocationService = (
    allocationRepository: IAllocationRepository,
    projectRepository: IProjectRepository,
    employeeRepository: IEmployeeRepository,
): IAllocationService => {
    const getOwnedProject = async (managerUserId: number, projectId: number) => {
        const project = await projectRepository.findById(projectId);
        if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
        }
        if (project.managerId !== managerUserId) {
            throw new Error('You can only manage allocations on your own projects');
        }
        return project;
    };

    return {
        async getAllActiveAllocations(): Promise<AllocationSummaryDto[]> {
            return allocationRepository.findAllActive();
        },

        async getProjectAllocations(managerUserId: number, projectId: number): Promise<ProjectAllocationDto[]> {
            await getOwnedProject(managerUserId, projectId);
            return allocationRepository.findActiveByProject(projectId);
        },

        async createAllocation(managerUserId: number, dto: CreateAllocationRequestDto): Promise<void> {
            if (!isValidIsoDate(dto.fromDate) || !isValidIsoDate(dto.toDate)) {
                throw new Error('From date and to date must be valid dates');
            }
            if (dto.fromDate >= dto.toDate) {
                throw new Error('From date must be before to date');
            }
            if (dto.utilisationPercent < 1 || dto.utilisationPercent > MAX_UTILISATION_PERCENT) {
                throw new Error('Utilisation must be between 1 and 100');
            }

            const project = await getOwnedProject(managerUserId, dto.projectId);
            if (!ALLOCATABLE_PROJECT_STATUSES.includes(project.status)) {
                throw new Error('Project must be ACTIVE or PLANNED to allocate resources');
            }

            const resource = await employeeRepository.findByUserId(dto.resourceUserId);
            if (!resource) {
                throw new Error(`No resource found for user ID ${dto.resourceUserId}`);
            }
            if (!resource.isActive) {
                throw new Error('Resource is inactive');
            }
            if (!resource.reportingToId || resource.reportingToId !== managerUserId) {
                throw new Error('You can only allocate resources from your own team');
            }

            const existingUtilisation = await allocationRepository.getOverlappingUtilisation(
                dto.resourceUserId,
                dto.fromDate,
                dto.toDate,
            );
            if (existingUtilisation + dto.utilisationPercent > MAX_UTILISATION_PERCENT) {
                throw new Error(
                    `Over-allocation: ${existingUtilisation}% already allocated in this period, ` +
                    `cannot add ${dto.utilisationPercent}% (max ${MAX_UTILISATION_PERCENT}%)`,
                );
            }

            await allocationRepository.create({
                resourceId: dto.resourceUserId,
                projectId: dto.projectId,
                utilisationPercent: dto.utilisationPercent,
                fromDate: dto.fromDate,
                toDate: dto.toDate,
            });
            await allocationRepository.recomputeResourceStatus(dto.resourceUserId);
        },

        async endAllocation(managerUserId: number, allocationId: number): Promise<void> {
            const allocation = await allocationRepository.findById(allocationId);
            if (!allocation) {
                throw new Error(`Allocation with ID ${allocationId} not found`);
            }
            await getOwnedProject(managerUserId, allocation.projectId);
            await allocationRepository.endById(allocationId);
            await allocationRepository.recomputeResourceStatus(allocation.resourceId);
        },

        async getMyAllocations(resourceUserId: number): Promise<MyAllocationDto[]> {
            return allocationRepository.findAllByUserId(resourceUserId);
        },
    };
};
