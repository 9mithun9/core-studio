import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import customersRoutes from '@/modules/customers/customers.routes';
import teachersRoutes from '@/modules/teachers/teachers.routes';
import packagesRoutes from '@/modules/packages/packages.routes';
import bookingsRoutes from '@/modules/bookings/bookings.routes';
import calendarsRoutes from '@/modules/calendars/calendars.routes';
import lineRoutes from '@/modules/line/line.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customersRoutes);
router.use('/teachers', teachersRoutes);
router.use('/packages', packagesRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/calendars', calendarsRoutes);
router.use('/line', lineRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
