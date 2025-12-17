import { Router } from 'express';
import { authMiddleware, requireCustomer, requireAdmin } from '@/middlewares';
import {
  createPackageRequest,
  getMyPackageRequests,
  getPendingPackageRequests,
  getAllPackageRequests,
  approvePackageRequest,
  rejectPackageRequest,
} from './packageRequest.controller';

const router = Router();

// Customer routes
router.post('/request', authMiddleware, requireCustomer, createPackageRequest);
router.get('/my-requests', authMiddleware, requireCustomer, getMyPackageRequests);

// Admin routes
router.get('/requests/pending', authMiddleware, requireAdmin, getPendingPackageRequests);
router.get('/requests', authMiddleware, requireAdmin, getAllPackageRequests);
router.post('/requests/:id/approve', authMiddleware, requireAdmin, approvePackageRequest);
router.post('/requests/:id/reject', authMiddleware, requireAdmin, rejectPackageRequest);

export default router;
