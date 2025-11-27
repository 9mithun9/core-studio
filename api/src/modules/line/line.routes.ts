import { Router } from 'express';
import { webhook, linkUserManually, unlinkUser, getConnectionStatus } from './line.controller';
import { authMiddleware, requireAdmin } from '@/middlewares';

const router = Router();

// LINE webhook (public endpoint)
router.post('/webhook', webhook);

// Admin routes
router.post('/link', authMiddleware, requireAdmin, linkUserManually);
router.delete('/unlink/:userId', authMiddleware, requireAdmin, unlinkUser);

// User routes
router.get('/status', authMiddleware, getConnectionStatus);

export default router;
