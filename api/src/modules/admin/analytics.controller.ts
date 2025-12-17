import { Request, Response } from 'express';
import { asyncHandler, AppError } from '@/middlewares';
import { Customer, Package, Booking, User } from '@/models';
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns';

// SECTION 1: Executive Overview
export const getExecutiveOverview = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Total Revenue This Month
  const thisMonthPackages = await Package.find({
    createdAt: { $gte: thisMonthStart, $lte: thisMonthEnd },
  });
  const thisMonthRevenue = thisMonthPackages.reduce((sum, pkg) => sum + (pkg.price || 0), 0);

  // Last Month Revenue for comparison
  const lastMonthPackages = await Package.find({
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
  });
  const lastMonthRevenue = lastMonthPackages.reduce((sum, pkg) => sum + (pkg.price || 0), 0);

  // Revenue Growth %
  const revenueGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // Active Customers (customers with active packages)
  const activeCustomers = await Package.distinct('customerId', { status: 'active' });

  // ARPU (Average Revenue Per Customer)
  const totalCustomers = await Customer.countDocuments();
  const totalRevenue = await Package.aggregate([
    { $group: { _id: null, total: { $sum: '$price' } } },
  ]);
  const arpu = totalCustomers > 0 ? (totalRevenue[0]?.total || 0) / totalCustomers : 0;

  // Session Completion Rate
  const totalSessions = await Booking.countDocuments();
  const completedSessions = await Booking.countDocuments({ status: 'completed' });
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  res.json({
    totalRevenue: thisMonthRevenue,
    revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
    activeCustomers: activeCustomers.length,
    arpu: parseFloat(arpu.toFixed(2)),
    sessionCompletionRate: parseFloat(completionRate.toFixed(2)),
    lastMonthRevenue,
  });
});

// SECTION 2: Revenue & Operations Performance
export const getRevenueOperations = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();

  // Monthly Revenue (last 12 months)
  const monthlyRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const packages = await Package.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const revenue = packages.reduce((sum, pkg) => sum + (pkg.price || 0), 0);

    monthlyRevenue.push({
      month: format(monthStart, 'MMM yyyy'),
      revenue,
    });
  }

  // Revenue by Package Type
  const revenueByType = await Package.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        revenue: { $sum: '$price' },
      },
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        revenue: 1,
        _id: 0,
      },
    },
  ]);

  // Sessions Sold vs Completed (last 6 months)
  const sessionsSoldVsCompleted = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const packagesCreated = await Package.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });
    const sessionsSold = packagesCreated.reduce((sum, pkg) => sum + pkg.totalSessions, 0);

    const sessionsCompleted = await Booking.countDocuments({
      status: 'completed',
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    sessionsSoldVsCompleted.push({
      month: format(monthStart, 'MMM'),
      sold: sessionsSold,
      completed: sessionsCompleted,
    });
  }

  res.json({
    monthlyRevenue,
    revenueByType,
    sessionsSoldVsCompleted,
  });
});

// SECTION 3: Customer Intelligence & Demographics
export const getCustomerIntelligence = asyncHandler(async (req: Request, res: Response) => {
  // New vs Returning Customers (last 6 months)
  const newVsReturning = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = endOfMonth(subMonths(new Date(), i));

    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    // Returning = customers who made a booking this month but were created before this month
    const returningCustomers = await Booking.distinct('customerId', {
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const returningCount = await Customer.countDocuments({
      _id: { $in: returningCustomers },
      createdAt: { $lt: monthStart },
    });

    newVsReturning.push({
      month: format(monthStart, 'MMM'),
      new: newCustomers,
      returning: returningCount,
    });
  }

  // Gender Distribution
  const genderDistribution = await Customer.aggregate([
    {
      $group: {
        _id: '$gender',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        gender: { $ifNull: ['$_id', 'Not specified'] },
        count: 1,
        _id: 0,
      },
    },
  ]);

  // Age Distribution
  const customers = await Customer.find({ dateOfBirth: { $exists: true, $ne: null } });
  const ageDistribution: Record<string, number> = {
    '18-25': 0,
    '26-35': 0,
    '36-45': 0,
    '46-55': 0,
    '56+': 0,
  };

  customers.forEach((customer) => {
    if (customer.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(customer.dateOfBirth).getFullYear();
      if (age >= 18 && age <= 25) ageDistribution['18-25']++;
      else if (age >= 26 && age <= 35) ageDistribution['26-35']++;
      else if (age >= 36 && age <= 45) ageDistribution['36-45']++;
      else if (age >= 46 && age <= 55) ageDistribution['46-55']++;
      else if (age >= 56) ageDistribution['56+']++;
    }
  });

  // Churn Rate (customers who haven't booked in last 3 months)
  const threeMonthsAgo = subMonths(new Date(), 3);
  const totalCustomers = await Customer.countDocuments();
  const activeCustomersRecent = await Booking.distinct('customerId', {
    createdAt: { $gte: threeMonthsAgo },
  });
  const churnRate = totalCustomers > 0
    ? ((totalCustomers - activeCustomersRecent.length) / totalCustomers) * 100
    : 0;

  res.json({
    newVsReturning,
    genderDistribution,
    ageDistribution: Object.entries(ageDistribution).map(([range, count]) => ({
      range,
      count,
    })),
    churnRate: parseFloat(churnRate.toFixed(2)),
  });
});

// SECTION 4: Marketing & Acquisition Performance
export const getMarketingPerformance = asyncHandler(async (req: Request, res: Response) => {
  // For now, we'll use mock data since we don't have acquisition tracking yet
  // In production, you'd track this via UTM parameters, referral codes, etc.

  // Customer Acquisition by Channel (mock data - to be replaced with real tracking)
  const acquisitionByChannel = [
    { channel: 'Instagram', customers: 45, percentage: 30 },
    { channel: 'Facebook', customers: 30, percentage: 20 },
    { channel: 'Google', customers: 25, percentage: 17 },
    { channel: 'Referral', customers: 35, percentage: 23 },
    { channel: 'Walk-in', customers: 15, percentage: 10 },
  ];

  // Funnel Data (based on actual data)
  const totalUsers = await User.countDocuments({ role: 'customer' });
  const customersWithPackages = await Package.distinct('customerId');
  const customersWithBookings = await Booking.distinct('customerId');
  const payingCustomers = customersWithPackages.length;

  const funnelData = [
    { stage: 'Visitors', count: totalUsers, percentage: 100 },
    { stage: 'Sign-ups', count: totalUsers, percentage: 100 },
    { stage: 'With Packages', count: payingCustomers, percentage: (payingCustomers / totalUsers) * 100 },
    { stage: 'Active Booking', count: customersWithBookings.length, percentage: (customersWithBookings.length / totalUsers) * 100 },
  ];

  // Mock CPA and LTV (to be replaced with real calculation)
  const cpa = 50; // Cost per acquisition
  const totalRevenue = await Package.aggregate([
    { $group: { _id: null, total: { $sum: '$price' } } },
  ]);
  const ltv = payingCustomers > 0 ? (totalRevenue[0]?.total || 0) / payingCustomers : 0;

  res.json({
    acquisitionByChannel,
    funnelData,
    cpa,
    ltv: parseFloat(ltv.toFixed(2)),
    roi: cpa > 0 ? parseFloat(((ltv - cpa) / cpa * 100).toFixed(2)) : 0,
  });
});

// SECTION 5: Retention, Engagement & Growth Insights
export const getRetentionInsights = asyncHandler(async (req: Request, res: Response) => {
  // Cohort Analysis (simplified - customers by signup month and their retention)
  const cohorts = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = endOfMonth(subMonths(new Date(), i));

    const customersInCohort = await Customer.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    if (customersInCohort.length > 0) {
      // Check how many are still active (booked in last 30 days)
      const activeIds = await Booking.distinct('customerId', {
        customerId: { $in: customersInCohort.map(c => c._id) },
        createdAt: { $gte: subMonths(new Date(), 1) },
      });

      cohorts.push({
        month: format(monthStart, 'MMM yyyy'),
        signups: customersInCohort.length,
        active: activeIds.length,
        retentionRate: parseFloat(((activeIds.length / customersInCohort.length) * 100).toFixed(1)),
      });
    }
  }

  // Average Customer Lifetime Value Over Time
  const ltvOverTime = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = endOfMonth(subMonths(new Date(), i));

    const packages = await Package.find({
      createdAt: { $lte: monthEnd },
    });

    const customersUpToThisMonth = await Customer.countDocuments({
      createdAt: { $lte: monthEnd },
    });

    const totalRevenue = packages.reduce((sum, pkg) => sum + (pkg.price || 0), 0);
    const avgLTV = customersUpToThisMonth > 0 ? totalRevenue / customersUpToThisMonth : 0;

    ltvOverTime.push({
      month: format(monthStart, 'MMM yyyy'),
      ltv: parseFloat(avgLTV.toFixed(2)),
    });
  }

  // Peak Usage Time (mock data - would need booking time tracking)
  const peakUsage = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];

  // Get actual booking distribution by day/hour
  const bookings = await Booking.find({ status: { $in: ['completed', 'confirmed'] } });
  const usageMap: Record<string, Record<string, number>> = {};

  days.forEach(day => {
    usageMap[day] = {};
    hours.forEach(hour => {
      usageMap[day][hour] = 0;
    });
  });

  bookings.forEach(booking => {
    const date = new Date(booking.startTime);
    const dayIndex = date.getDay();
    const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1]; // Adjust for Monday start
    const hour = date.getHours();

    let hourBucket = '6AM';
    if (hour >= 6 && hour < 9) hourBucket = '6AM';
    else if (hour >= 9 && hour < 12) hourBucket = '9AM';
    else if (hour >= 12 && hour < 15) hourBucket = '12PM';
    else if (hour >= 15 && hour < 18) hourBucket = '3PM';
    else if (hour >= 18 && hour < 21) hourBucket = '6PM';
    else if (hour >= 21) hourBucket = '9PM';

    if (usageMap[dayName]) {
      usageMap[dayName][hourBucket]++;
    }
  });

  Object.entries(usageMap).forEach(([day, hours]) => {
    Object.entries(hours).forEach(([hour, count]) => {
      peakUsage.push({ day, hour, count });
    });
  });

  // Time to First Purchase
  const customersWithPurchases = await Customer.find({}).lean();
  const timeToPurchase: number[] = [];

  for (const customer of customersWithPurchases) {
    const firstPackage = await Package.findOne({ customerId: customer._id }).sort({ createdAt: 1 });
    if (firstPackage) {
      const daysDiff = Math.floor(
        (new Date(firstPackage.createdAt).getTime() - new Date(customer.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      timeToPurchase.push(daysDiff);
    }
  }

  // Group into buckets
  const purchaseTimeDistribution = {
    'Same Day': timeToPurchase.filter(d => d === 0).length,
    '1-3 Days': timeToPurchase.filter(d => d >= 1 && d <= 3).length,
    '4-7 Days': timeToPurchase.filter(d => d >= 4 && d <= 7).length,
    '1-2 Weeks': timeToPurchase.filter(d => d >= 8 && d <= 14).length,
    '2+ Weeks': timeToPurchase.filter(d => d > 14).length,
  };

  res.json({
    cohorts,
    ltvOverTime,
    peakUsage,
    purchaseTimeDistribution: Object.entries(purchaseTimeDistribution).map(([range, count]) => ({
      range,
      count,
    })),
  });
});
