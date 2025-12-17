import { Router } from 'express';
import { getAuthUrl, handleCallback, getConnection, disconnect } from './calendars.controller';
import { authMiddleware, requireAdmin } from '@/middlewares';

const router = Router();

// Admin-only routes - only admin can connect the studio calendar
router.get('/auth-url', authMiddleware, requireAdmin, getAuthUrl);
router.get('/callback', handleCallback);
router.get('/connection', authMiddleware, getConnection); // Anyone can check connection status
router.delete('/disconnect', authMiddleware, requireAdmin, disconnect);

export default router;
