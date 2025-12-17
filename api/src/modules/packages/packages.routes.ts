import { Router } from 'express';
import {
  createPackage,
  getCustomerPackages,
  getMyPackages,
  getPackageById,
  updatePackage,
  deletePackage,
} from './packages.controller';
import { authMiddleware, requireAdmin, requireCustomer, requireTeacher } from '@/middlewares';

const router = Router();

// Admin routes
router.post('/', authMiddleware, requireAdmin, createPackage);
router.get('/customer/:customerId', authMiddleware, requireAdmin, getCustomerPackages);
router.patch('/:id', authMiddleware, requireAdmin, updatePackage);
router.delete('/:id', authMiddleware, requireAdmin, deletePackage);

// Teacher routes - teachers can view customer packages
router.get('/customer/:customerId/view', authMiddleware, requireTeacher, getCustomerPackages);

// Customer routes
router.get('/me', authMiddleware, requireCustomer, getMyPackages);
router.get('/:id', authMiddleware, getPackageById);

export default router;
