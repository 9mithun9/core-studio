import { Router } from 'express';
import { getDashboardAnalytics, getAllCustomersWithSessions, getTeacherPerformance, getMonthlyFinance, getFinanceTrends, getPackageDistribution, getTeacherSessionTrends, getCustomerDemographics, triggerInactiveCustomerCheck } from './admin.controller';
import { createTeacher, getAllTeachersWithDetails, getTeacherDetails, toggleTeacherActiveStatus, updateTeacherType } from './teachers.controller';
import {
  getExecutiveOverview,
  getRevenueOperations,
  getCustomerIntelligence,
  getMarketingPerformance,
  getRetentionInsights,
} from './analytics.controller';
import { generatePaymentReport, getPaymentReports, getPaymentReportById, deletePaymentReport, exportReportAsPDF, exportReportAsExcel, addExpense, updateExpense, deleteExpense, getReportExpenses } from './reports.controller';
import { createBonus, getBonuses, getBonusById, updateBonus, deleteBonus, getTeacherBonuses, getTeacherBonusTotal } from './bonus.controller';
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
router.patch('/teachers/:id/toggle-active', authMiddleware, requireAdmin, toggleTeacherActiveStatus);
router.patch('/teachers/:id/type', authMiddleware, requireAdmin, updateTeacherType);

// Payment Reports
router.post('/reports/generate', authMiddleware, requireAdmin, generatePaymentReport);
router.get('/reports', authMiddleware, requireAdmin, getPaymentReports);
router.get('/reports/:id', authMiddleware, requireAdmin, getPaymentReportById);
router.get('/reports/:id/export/pdf', authMiddleware, requireAdmin, exportReportAsPDF);
router.get('/reports/:id/export/excel', authMiddleware, requireAdmin, exportReportAsExcel);
router.delete('/reports/:id', authMiddleware, requireAdmin, deletePaymentReport);

// Expenses
router.post('/reports/:reportId/expenses', authMiddleware, requireAdmin, addExpense);
router.get('/reports/:reportId/expenses', authMiddleware, requireAdmin, getReportExpenses);
router.patch('/expenses/:id', authMiddleware, requireAdmin, updateExpense);
router.delete('/expenses/:id', authMiddleware, requireAdmin, deleteExpense);

// Bonuses
router.post('/bonuses', authMiddleware, requireAdmin, createBonus);
router.get('/bonuses', authMiddleware, requireAdmin, getBonuses);
router.get('/bonuses/teacher/:teacherId', authMiddleware, requireAdmin, getTeacherBonuses);
router.get('/bonuses/teacher/:teacherId/total', authMiddleware, requireAdmin, getTeacherBonusTotal);
router.get('/bonuses/:id', authMiddleware, requireAdmin, getBonusById);
router.patch('/bonuses/:id', authMiddleware, requireAdmin, updateBonus);
router.delete('/bonuses/:id', authMiddleware, requireAdmin, deleteBonus);

// Registration requests
router.use('/registration-requests', registrationRequestsRoutes);

// Manual trigger for inactive customer check (for testing)
router.post('/trigger-inactive-check', authMiddleware, requireAdmin, triggerInactiveCustomerCheck);

export default router;
