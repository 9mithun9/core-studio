import { Router } from 'express';
import { getDashboardAnalytics, getAllCustomersWithSessions, getTeacherPerformance, getMonthlyFinance, getFinanceTrends, getPackageDistribution, getTeacherSessionTrends, getCustomerDemographics } from './admin.controller';
import { createTeacher, getAllTeachersWithDetails, getTeacherDetails } from './teachers.controller';
import {
  getExecutiveOverview,
  getRevenueOperations,
  getCustomerIntelligence,
  getMarketingPerformance,
  getRetentionInsights,
} from './analytics.controller';
import registrationRequestsRoutes from './registration-requests.routes';
import { authMiddleware, requireAdmin } from '@/middlewares';

const router = Router();

// Existing analytics endpoints
router.get('/analytics', authMiddleware, requireAdmin, getDashboardAnalytics);
router.get('/customers-sessions', authMiddleware, requireAdmin, getAllCustomersWithSessions);
router.get('/teacher-performance/:teacherId?', authMiddleware, requireAdmin, getTeacherPerformance);
router.get('/finance', authMiddleware, requireAdmin, getMonthlyFinance);
router.get('/finance-trends', authMiddleware, requireAdmin, getFinanceTrends);
router.get('/package-distribution', authMiddleware, requireAdmin, getPackageDistribution);
router.get('/teacher-session-trends', authMiddleware, requireAdmin, getTeacherSessionTrends);
router.get('/customer-demographics', authMiddleware, requireAdmin, getCustomerDemographics);

// New comprehensive analytics endpoints
router.get('/analytics/executive-overview', authMiddleware, requireAdmin, getExecutiveOverview);
router.get('/analytics/revenue-operations', authMiddleware, requireAdmin, getRevenueOperations);
router.get('/analytics/customer-intelligence', authMiddleware, requireAdmin, getCustomerIntelligence);
router.get('/analytics/marketing-performance', authMiddleware, requireAdmin, getMarketingPerformance);
router.get('/analytics/retention-insights', authMiddleware, requireAdmin, getRetentionInsights);

// Teachers management
router.post('/teachers', authMiddleware, requireAdmin, createTeacher);
router.get('/teachers', authMiddleware, requireAdmin, getAllTeachersWithDetails);
router.get('/teachers/:id', authMiddleware, requireAdmin, getTeacherDetails);

// Registration requests
router.use('/registration-requests', registrationRequestsRoutes);

export default router;
