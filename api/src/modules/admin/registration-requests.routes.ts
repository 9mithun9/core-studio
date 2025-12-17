import { Router } from 'express';
import {
  getPendingRegistrations,
  getAllRegistrations,
  approveRegistration,
  rejectRegistration,
} from './registration-requests.controller';
import { authMiddleware, requireAdmin } from '@/middlewares';

const router = Router();

router.get('/pending', authMiddleware, requireAdmin, getPendingRegistrations);
router.get('/', authMiddleware, requireAdmin, getAllRegistrations);
router.patch('/:id/approve', authMiddleware, requireAdmin, approveRegistration);
router.patch('/:id/reject', authMiddleware, requireAdmin, rejectRegistration);

export default router;
