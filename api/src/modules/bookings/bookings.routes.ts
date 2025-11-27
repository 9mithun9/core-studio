import { Router } from 'express';
import {
  requestBooking,
  getMyBookings,
  confirmBooking,
  rejectBooking,
  markAttendance,
  getAllBookings,
  getPendingBookings,
} from './bookings.controller';
import { authMiddleware, requireAdmin, requireCustomer, requireTeacher } from '@/middlewares';

const router = Router();

// Customer routes
router.post('/request', authMiddleware, requireCustomer, requestBooking);
router.get('/me', authMiddleware, requireCustomer, getMyBookings);

// Admin routes
router.get('/pending', authMiddleware, requireAdmin, getPendingBookings);
router.get('/', authMiddleware, requireAdmin, getAllBookings);
router.patch('/:id/confirm', authMiddleware, requireAdmin, confirmBooking);
router.patch('/:id/reject', authMiddleware, requireAdmin, rejectBooking);

// Teacher routes
router.patch('/:id/attendance', authMiddleware, requireTeacher, markAttendance);

export default router;
