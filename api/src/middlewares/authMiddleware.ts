import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { User, Teacher } from '@/models';
import { logger } from '@/config/logger';
import { UserRole } from '@/types';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header or cookies
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Alternative: Check for token in cookies (if using HTTP-only cookies)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Verify token
    const payload = verifyToken(token);

    // Load user from database
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({ error: 'User account is inactive' });
      return;
    }

    // If user is a teacher, check if teacher profile is active
    if (user.role === UserRole.TEACHER) {
      const teacher = await Teacher.findOne({ userId: user._id });
      if (!teacher || !teacher.isActive) {
        res.status(401).json({ error: 'Teacher account is inactive. Please contact administrator.' });
        return;
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
