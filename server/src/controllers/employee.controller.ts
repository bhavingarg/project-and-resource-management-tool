import { Request, Response } from 'express';
import { IEmployeeService } from '../services/employee.service';
import { UpdateEmployeeRequestDto, AddSkillRequestDto, UpdateSkillRequestDto, AssignManagerRequestDto } from '../models/employee.dto';

export const createEmployeeController = (employeeService: IEmployeeService) => ({
    async getAllEmployees(_req: Request, res: Response): Promise<void> {
        const employees = await employeeService.getAllEmployees();
        res.status(200).json(employees);
    },

    async getEmployee(req: Request, res: Response): Promise<void> {
        try {
            const employee = await employeeService.getEmployee(Number(req.params.userId));
            res.status(200).json(employee);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async updateEmployee(req: Request, res: Response): Promise<void> {
        const dto: UpdateEmployeeRequestDto = req.body;
        try {
            await employeeService.updateEmployee(Number(req.params.userId), dto);
            res.status(200).json({ message: 'Resource updated.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async getDeactivateWarning(req: Request, res: Response): Promise<void> {
        try {
            const result = await employeeService.getDeactivateWarning(Number(req.params.userId));
            res.status(200).json(result);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async deactivateEmployee(req: Request, res: Response): Promise<void> {
        try {
            await employeeService.deactivateEmployee(Number(req.params.userId));
            res.status(200).json({ message: 'Resource deactivated.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async assignManager(req: Request, res: Response): Promise<void> {
        const dto: AssignManagerRequestDto = req.body;
        if (!dto.managerId) {
            res.status(400).json({ message: 'managerId is required' });
            return;
        }
        try {
            await employeeService.assignManager(Number(req.params.userId), dto.managerId);
            res.status(200).json({ message: 'Manager assigned.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async getSkills(req: Request, res: Response): Promise<void> {
        try {
            const skills = await employeeService.getSkills(Number(req.params.userId));
            res.status(200).json(skills);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async addSkill(req: Request, res: Response): Promise<void> {
        const dto: AddSkillRequestDto = req.body;
        try {
            await employeeService.addSkill(Number(req.params.userId), dto);
            res.status(201).json({ message: 'Skill added.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async updateSkill(req: Request, res: Response): Promise<void> {
        const dto: UpdateSkillRequestDto = req.body;
        try {
            await employeeService.updateSkill(Number(req.params.userId), Number(req.params.skillId), dto);
            res.status(200).json({ message: 'Skill updated.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async removeSkill(req: Request, res: Response): Promise<void> {
        try {
            await employeeService.removeSkill(Number(req.params.userId), Number(req.params.skillId));
            res.status(200).json({ message: 'Skill removed.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },
});
