import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppConfig } from '../config/app.config';
import { AuthenticatedUser } from '../models/user.model';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const token = authHeader.slice(7);

    try {
        const payload = jwt.verify(token, AppConfig.jwtSecret) as AuthenticatedUser;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
