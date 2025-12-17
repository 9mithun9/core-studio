import { Request, Response } from 'express';
import { InAppNotification } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';

// Get my notifications
export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const notifications = await InAppNotification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await InAppNotification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.json({
    notifications,
    unreadCount,
  });
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const notification = await InAppNotification.findOne({
    _id: id,
    userId: req.user._id,
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.isRead = true;
  await notification.save();

  res.json({ message: 'Notification marked as read', notification });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  await InAppNotification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({ message: 'All notifications marked as read' });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const notification = await InAppNotification.findOne({
    _id: id,
    userId: req.user._id,
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  await notification.deleteOne();

  res.json({ message: 'Notification deleted' });
});
