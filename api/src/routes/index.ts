import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import customersRoutes from '@/modules/customers/customers.routes';
import teachersRoutes from '@/modules/teachers/teachers.routes';
import packagesRoutes from '@/modules/packages/packages.routes';
import packageRequestRoutes from '@/modules/packages/packageRequest.routes';
import bookingsRoutes from '@/modules/bookings/bookings.routes';
import calendarsRoutes from '@/modules/calendars/calendars.routes';
import lineRoutes from '@/modules/line/line.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';
import reviewsRoutes from '@/modules/reviews/reviews.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customersRoutes);
router.use('/teachers', teachersRoutes);
router.use('/packages', packagesRoutes);
router.use('/package-requests', packageRequestRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/calendars', calendarsRoutes);
router.use('/line', lineRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reviews', reviewsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
