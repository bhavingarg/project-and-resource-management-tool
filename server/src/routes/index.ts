import { Router } from 'express';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';

export const router = Router();

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);
router.use('/users', userRouter);
