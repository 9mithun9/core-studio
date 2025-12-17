import { Router } from 'express';
import {
  createReview,
  getReviewByBookingId,
  getCustomerReviews,
  updateReview,
  deleteReview,
} from './reviews.controller';
import { authMiddleware, requireTeacher } from '@/middlewares';

const router = Router();

// Teacher routes
router.post('/', authMiddleware, requireTeacher, createReview);
router.get('/booking/:bookingId', authMiddleware, getReviewByBookingId);
router.get('/customer/:customerId', authMiddleware, getCustomerReviews);
router.patch('/:id', authMiddleware, requireTeacher, updateReview);
router.delete('/:id', authMiddleware, requireTeacher, deleteReview);

export default router;
