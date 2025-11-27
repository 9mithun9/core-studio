import { Router } from 'express';
import { getTodaySessions, getTeacherSessions, getAllTeachers } from './teachers.controller';
import { authMiddleware, requireTeacher } from '@/middlewares';

const router = Router();

// Public routes (for listing teachers on website)
router.get('/', getAllTeachers);

// Teacher routes
router.get('/sessions/today', authMiddleware, requireTeacher, getTodaySessions);
router.get('/sessions', authMiddleware, requireTeacher, getTeacherSessions);

export default router;
