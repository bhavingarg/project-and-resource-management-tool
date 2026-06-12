import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../models/user.model';

// Restricts a route to only specific roles.
// Usage: requireRole(UserRole.ADMIN)  or  requireRole(UserRole.MANAGER, UserRole.ADMIN)
export const requireRole = (...allowedRoles: UserRole[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        next();
    };
