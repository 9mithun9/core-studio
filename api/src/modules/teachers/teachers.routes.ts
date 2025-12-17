import { Router } from 'express';
import { getTodaySessions, getTeacherSessions, getAllTeachers, getMyProfile, updateMyProfile, uploadProfilePhoto as uploadPhoto, getMyStudents, addManualSession, addNewStudent } from './teachers.controller';
import { authMiddleware, requireTeacher, uploadProfilePhoto as uploadMiddleware } from '@/middlewares';

const router = Router();

// Public routes (for listing teachers on website)
router.get('/', getAllTeachers);

// Teacher routes
router.get('/me', authMiddleware, requireTeacher, getMyProfile);
router.patch('/me', authMiddleware, requireTeacher, updateMyProfile);
router.post('/me/profile-photo', authMiddleware, requireTeacher, uploadMiddleware.single('photo'), uploadPhoto);
router.get('/sessions/today', authMiddleware, requireTeacher, getTodaySessions);
router.get('/sessions', authMiddleware, requireTeacher, getTeacherSessions);
router.get('/students', authMiddleware, requireTeacher, getMyStudents);
router.post('/students', authMiddleware, requireTeacher, addNewStudent);
router.post('/sessions/manual', authMiddleware, requireTeacher, addManualSession);

export default router;
