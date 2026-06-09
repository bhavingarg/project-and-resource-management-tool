import { Request, Response } from 'express';
import { IProjectService } from '../services/project.service';
import {
    CreateProjectRequestDto,
    UpdateProjectRequestDto,
    AddMilestoneRequestDto,
    UpdateMilestoneStatusRequestDto,
} from '../models/project.dto';

export const createProjectController = (projectService: IProjectService) => ({
    async getAllProjects(_req: Request, res: Response): Promise<void> {
        const projects = await projectService.getAllProjects();
        res.status(200).json(projects);
    },

    async getProject(req: Request, res: Response): Promise<void> {
        try {
            const project = await projectService.getProjectById(Number(req.params.id));
            res.status(200).json(project);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async createProject(req: Request, res: Response): Promise<void> {
        const dto: CreateProjectRequestDto = req.body;
        try {
            const id = await projectService.createProject(dto);
            res.status(201).json({ id, message: 'Project created.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async updateProject(req: Request, res: Response): Promise<void> {
        const dto: UpdateProjectRequestDto = req.body;
        try {
            await projectService.updateProject(Number(req.params.id), dto);
            res.status(200).json({ message: 'Project updated.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async getMilestones(req: Request, res: Response): Promise<void> {
        try {
            const summary = await projectService.getMilestones(Number(req.params.id));
            res.status(200).json(summary);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async addMilestone(req: Request, res: Response): Promise<void> {
        const dto: AddMilestoneRequestDto = req.body;
        try {
            await projectService.addMilestone(Number(req.params.id), dto);
            res.status(201).json({ message: 'Milestone added.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async updateMilestoneStatus(req: Request, res: Response): Promise<void> {
        const dto: UpdateMilestoneStatusRequestDto = req.body;
        try {
            await projectService.updateMilestoneStatus(
                Number(req.params.id),
                Number(req.params.milestoneId),
                dto.status,
            );
            res.status(200).json({ message: 'Milestone updated.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },
});
