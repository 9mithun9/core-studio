import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  getCustomerOverview,
  updateCustomer,
  updateOwnProfile,
  uploadProfilePhoto as uploadProfilePhotoController,
} from './customers.controller';
import { authMiddleware, requireAdmin, requireCustomer } from '@/middlewares';
import { uploadProfilePhoto } from '@/middlewares/upload';

const router = Router();

// Customer routes
router.get('/me/overview', authMiddleware, requireCustomer, getCustomerOverview);
router.patch('/me/profile', authMiddleware, requireCustomer, updateOwnProfile);
router.post(
  '/me/profile-photo',
  authMiddleware,
  requireCustomer,
  uploadProfilePhoto.single('photo'),
  uploadProfilePhotoController
);

// Admin routes
router.get('/', authMiddleware, requireAdmin, getAllCustomers);
router.get('/:id', authMiddleware, requireAdmin, getCustomerById);
router.patch('/:id', authMiddleware, requireAdmin, updateCustomer);

export default router;
