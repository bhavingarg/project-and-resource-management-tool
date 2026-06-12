import { Request, Response } from 'express';
import { ITimesheetService } from '../services/timesheet.service';
import { SubmitTimesheetRequestDto } from '../models/timesheet.dto';

export const createTimesheetController = (timesheetService: ITimesheetService) => ({
    async getActiveAllocationsForWeek(req: Request, res: Response): Promise<void> {
        const weekStartDate = req.query.week as string;
        if (!weekStartDate) {
            res.status(400).json({ message: 'Query param ?week=YYYY-MM-DD is required' });
            return;
        }
        try {
            const allocations = await timesheetService.getActiveAllocationsForWeek(req.user!.userId, weekStartDate);
            res.status(200).json(allocations);
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async submitTimesheet(req: Request, res: Response): Promise<void> {
        const dto: SubmitTimesheetRequestDto = req.body;
        try {
            await timesheetService.submitTimesheet(req.user!.userId, dto);
            res.status(201).json({ message: 'Timesheet submitted.' });
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async getMyTimesheets(req: Request, res: Response): Promise<void> {
        const summaries = await timesheetService.getMyTimesheets(req.user!.userId);
        res.status(200).json(summaries);
    },

    async getMyWeekDetail(req: Request, res: Response): Promise<void> {
        try {
            const detail = await timesheetService.getMyWeekDetail(req.user!.userId, req.params.weekStartDate);
            res.status(200).json(detail);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },

    async getReminder(req: Request, res: Response): Promise<void> {
        const reminder = await timesheetService.getReminder(req.user!.userId);
        res.status(200).json(reminder);
    },

    async getTeamTimesheets(req: Request, res: Response): Promise<void> {
        const weekStartDate = req.query.week as string;
        if (!weekStartDate) {
            res.status(400).json({ message: 'Query param ?week=YYYY-MM-DD is required' });
            return;
        }
        try {
            const rows = await timesheetService.getTeamTimesheets(req.user!.userId, weekStartDate);
            res.status(200).json(rows);
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    },

    async getTeamMemberWeekDetail(req: Request, res: Response): Promise<void> {
        try {
            const detail = await timesheetService.getTeamMemberWeekDetail(
                req.user!.userId,
                Number(req.params.userId),
                req.params.weekStartDate,
            );
            res.status(200).json(detail);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    },
});
