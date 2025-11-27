import { Router } from 'express';
import { getAuthUrl, handleCallback, getConnection, disconnect } from './calendars.controller';
import { authMiddleware, requireTeacher } from '@/middlewares';

const router = Router();

router.get('/auth-url', authMiddleware, requireTeacher, getAuthUrl);
router.get('/callback', handleCallback);
router.get('/connection', authMiddleware, requireTeacher, getConnection);
router.delete('/disconnect', authMiddleware, requireTeacher, disconnect);

export default router;
