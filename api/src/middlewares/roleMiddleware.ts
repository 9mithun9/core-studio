import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Convenience middleware for common role checks
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireTeacher = requireRole(UserRole.TEACHER, UserRole.ADMIN);
export const requireCustomer = requireRole(UserRole.CUSTOMER, UserRole.ADMIN);
