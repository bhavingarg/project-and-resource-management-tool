import { Router } from 'express';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { employeeRouter } from './employee.routes';
import { projectRouter } from './project.routes';
import { allocationRouter } from './allocation.routes';

export const router = Router();

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/employees', employeeRouter);
router.use('/projects', projectRouter);
router.use('/allocations', allocationRouter);
