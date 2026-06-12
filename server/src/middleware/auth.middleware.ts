import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppConfig } from '../config/app.config';
import { AuthenticatedUser } from '../models/user.model';

// Protects any route that requires the user to be logged in.
// Reads the Bearer token from the Authorization header,
// verifies it, and attaches the decoded user to req.user.
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const token = authHeader.slice(7);

    try {
        req.user = jwt.verify(token, AppConfig.jwtSecret) as AuthenticatedUser;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
