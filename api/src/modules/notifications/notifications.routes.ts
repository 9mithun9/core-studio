import { Router } from 'express';
import { authMiddleware } from '@/middlewares';
import * as notificationsController from './notifications.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get my notifications
router.get('/', notificationsController.getMyNotifications);

// Mark notification as read
router.patch('/:id/read', notificationsController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationsController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationsController.deleteNotification);

export default router;
