import { Router } from 'express';
import {
  requestBooking,
  getMyBookings,
  confirmBooking,
  rejectBooking,
  markAttendance,
  markComplete,
  markNoShow,
  getAllBookings,
  getPendingBookings,
  getAvailability,
  requestCancellation,
  approveCancellation,
  rejectCancellation,
  blockTime,
  unblockTime,
  getBlockedTimes,
  cancelBooking,
} from './bookings.controller';
import { authMiddleware, requireAdmin, requireCustomer, requireTeacher } from '@/middlewares';

const router = Router();

// Customer routes
router.post('/request', authMiddleware, requireCustomer, requestBooking);
router.get('/me', authMiddleware, requireCustomer, getMyBookings);
router.post('/:id/request-cancellation', authMiddleware, requireCustomer, requestCancellation);

// Shared routes - Both customers and teachers need to check availability
router.get('/availability', authMiddleware, getAvailability);

// Admin routes
router.get('/pending', authMiddleware, requireAdmin, getPendingBookings);

// Teacher routes
router.patch('/:id/confirm', authMiddleware, requireTeacher, confirmBooking);
router.patch('/:id/reject', authMiddleware, requireTeacher, rejectBooking);
router.patch('/:id/attendance', authMiddleware, requireTeacher, markAttendance);
router.patch('/:id/complete', authMiddleware, requireTeacher, markComplete);
router.patch('/:id/no-show', authMiddleware, requireTeacher, markNoShow);
router.patch('/:id/approve-cancellation', authMiddleware, requireTeacher, approveCancellation);
router.patch('/:id/reject-cancellation', authMiddleware, requireTeacher, rejectCancellation);
router.patch('/:id', authMiddleware, requireTeacher, cancelBooking);

// Shared routes (Admin and Teacher can both access)
router.get('/', authMiddleware, requireTeacher, getAllBookings);

// Block time routes (Teacher and Admin)
router.post('/block', authMiddleware, requireTeacher, blockTime);
router.delete('/block/:id', authMiddleware, requireTeacher, unblockTime);
router.get('/blocks', authMiddleware, requireTeacher, getBlockedTimes);

export default router;
