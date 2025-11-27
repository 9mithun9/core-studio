import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  getCustomerOverview,
  updateCustomer,
} from './customers.controller';
import { authMiddleware, requireAdmin, requireCustomer } from '@/middlewares';

const router = Router();

// Customer routes
router.get('/me/overview', authMiddleware, requireCustomer, getCustomerOverview);

// Admin routes
router.get('/', authMiddleware, requireAdmin, getAllCustomers);
router.get('/:id', authMiddleware, requireAdmin, getCustomerById);
router.patch('/:id', authMiddleware, requireAdmin, updateCustomer);

export default router;
