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

  // Active Customers (customers with active packages this month)
  const activeCustomersThisMonth = await Package.distinct('customerId', {
    status: 'active',
    createdAt: { $lte: thisMonthEnd }
  });

  // Active Customers Last Month
  const activeCustomersLastMonth = await Package.distinct('customerId', {
    status: 'active',
    createdAt: { $lte: lastMonthEnd }
  });

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
    activeCustomers: activeCustomersThisMonth.length,
    activeCustomersLastMonth: activeCustomersLastMonth.length,
    averageRevenuePerUser: parseFloat(arpu.toFixed(2)),
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

  // Revenue by Session Count (10, 20, 30)
  const revenueBySessionCount = await Package.aggregate([
    {
      $group: {
        _id: '$totalSessions',
        count: { $sum: 1 },
        revenue: { $sum: '$price' },
      },
    },
    {
      $project: {
        sessionCount: '$_id',
        count: 1,
        revenue: 1,
        _id: 0,
      },
    },
    {
      $sort: { sessionCount: 1 },
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
    revenueBySessionCount,
    sessionsSoldVsCompleted,
  });
});

// SECTION 3: Customer Intelligence & Demographics
export const getCustomerIntelligence = asyncHandler(async (req: Request, res: Response) => {
  // Get filter parameters
  const { newVsReturningPeriod = 'last6months', newVsReturningYear, demographicFilter = 'all' } = req.query;

  // Determine the number of months to show based on filter
  let monthsToShow = 6; // default: last 6 months
  let yearFilter: number | null = null;

  if (newVsReturningPeriod === 'last12months') {
    monthsToShow = 12;
  } else if (newVsReturningYear) {
    yearFilter = parseInt(newVsReturningYear as string);
    monthsToShow = 12; // show all 12 months of that year
  }

  // New vs Returning Customers - Based on Package Purchases
  const newVsReturning = [];

  if (yearFilter) {
    // Show specific year
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(yearFilter, month, 1);
      const monthEnd = endOfMonth(monthStart);

      // Don't show future months
      if (monthStart > new Date()) break;

      // Get all packages purchased in this month
      const packagesThisMonth = await Package.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      // Track unique customers
      const newCustomerIds = new Set();
      const returningCustomerIds = new Set();

      for (const pkg of packagesThisMonth) {
        const customerId = pkg.customerId.toString();

        // Check if customer had any packages before this month
        const previousPackages = await Package.countDocuments({
          customerId: pkg.customerId,
          createdAt: { $lt: monthStart },
        });

        if (previousPackages > 0) {
          returningCustomerIds.add(customerId);
        } else {
          newCustomerIds.add(customerId);
        }
      }

      newVsReturning.push({
        month: format(monthStart, 'MMM yyyy'),
        new: newCustomerIds.size,
        returning: returningCustomerIds.size,
      });
    }
  } else {
    // Show last N months
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));

      // Get all packages purchased in this month
      const packagesThisMonth = await Package.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      // Track unique customers
      const newCustomerIds = new Set();
      const returningCustomerIds = new Set();

      for (const pkg of packagesThisMonth) {
        const customerId = pkg.customerId.toString();

        // Check if customer had any packages before this month
        const previousPackages = await Package.countDocuments({
          customerId: pkg.customerId,
          createdAt: { $lt: monthStart },
        });

        if (previousPackages > 0) {
          // Customer bought packages before = Returning/Renewal
          returningCustomerIds.add(customerId);
        } else {
          // This is their first package ever = New Customer
          newCustomerIds.add(customerId);
        }
      }

      newVsReturning.push({
        month: format(monthStart, 'MMM'),
        new: newCustomerIds.size,
        returning: returningCustomerIds.size,
      });
    }
  }

  // Determine which customers to include based on demographic filter
  let customerIds: any[] = [];

  if (demographicFilter === 'active') {
    // Active customers: packages not finished yet AND last session within 2 months
    const twoMonthsAgo = subMonths(new Date(), 2);

    // Get customers with packages that have remaining sessions
    const activePackages = await Package.find({
      remainingSessions: { $gt: 0 },
    }).distinct('customerId');

    // Get customers who had sessions in the last 2 months
    const recentlyActiveCustomers = await Booking.distinct('customerId', {
      startTime: { $gte: twoMonthsAgo },
    });

    // Intersection: customers who meet both criteria
    customerIds = activePackages.filter((id: any) =>
      recentlyActiveCustomers.some((recentId: any) => recentId.toString() === id.toString())
    );
  }

  // Gender Distribution
  let genderDistribution;
  if (demographicFilter === 'active') {
    genderDistribution = await Customer.aggregate([
      {
        $match: { _id: { $in: customerIds } },
      },
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
  } else {
    genderDistribution = await Customer.aggregate([
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
  }

  // Age Distribution
  let customerQuery: any = { dateOfBirth: { $exists: true, $ne: null } };
  if (demographicFilter === 'active') {
    customerQuery._id = { $in: customerIds };
  }

  const customers = await Customer.find(customerQuery);
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

  // Churn Rate (customers who haven't had a session in last 3 months)
  const threeMonthsAgo = subMonths(new Date(), 3);
  const totalCustomers = await Customer.countDocuments();
  const activeCustomersRecent = await Booking.distinct('customerId', {
    startTime: { $gte: threeMonthsAgo },
  });
  const churnRate = totalCustomers > 0
    ? ((totalCustomers - activeCustomersRecent.length) / totalCustomers) * 100
    : 0;

  res.json({
    newVsReturning,
    genderDistribution,
    ageDistribution: Object.entries(ageDistribution).map(([range, count]) => ({
      ageRange: range,
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
  // Get filter parameters
  const { ltvPeriod = 'last12months', ltvYear, cohortPeriod = 'last6months', cohortYear } = req.query;

  // Determine cohort months to show based on filter
  let cohortMonthsToShow = 6; // default: last 6 months
  let cohortYearFilter: number | null = null;

  if (cohortPeriod === 'last12months') {
    cohortMonthsToShow = 12;
  } else if (cohortYear) {
    cohortYearFilter = parseInt(cohortYear as string);
    cohortMonthsToShow = 12; // Show all 12 months of the selected year
  }

  // Cohort Analysis - track retention across months for each cohort
  const cohorts = [];
  for (let i = cohortMonthsToShow - 1; i >= 0; i--) {
    const cohortMonthStart = cohortYearFilter
      ? startOfMonth(new Date(cohortYearFilter, i, 1))
      : startOfMonth(subMonths(new Date(), i));
    const cohortMonthEnd = cohortYearFilter
      ? endOfMonth(new Date(cohortYearFilter, i, 1))
      : endOfMonth(subMonths(new Date(), i));

    const customersInCohort = await Customer.find({
      createdAt: { $gte: cohortMonthStart, $lte: cohortMonthEnd },
    });

    if (customersInCohort.length > 0) {
      const cohortSize = customersInCohort.length;
      const customerIds = customersInCohort.map(c => c._id);
      const retentionRates: any = {
        cohort: format(cohortMonthStart, 'MMM yyyy'),
        month0: 100, // All customers are active in their signup month
      };

      // Calculate retention for months 1-5 after signup
      for (let monthOffset = 1; monthOffset <= 5; monthOffset++) {
        const checkMonthStart = startOfMonth(subMonths(cohortMonthStart, -monthOffset));
        const checkMonthEnd = endOfMonth(subMonths(cohortMonthStart, -monthOffset));

        // Skip if check month is in the future (don't add to response)
        if (checkMonthStart > new Date()) {
          continue;
        }

        // Count customers who had a session in this month
        const activeInMonth = await Booking.distinct('customerId', {
          customerId: { $in: customerIds },
          startTime: { $gte: checkMonthStart, $lte: checkMonthEnd },
        });

        const retentionRate = (activeInMonth.length / cohortSize) * 100;
        retentionRates[`month${monthOffset}`] = parseFloat(retentionRate.toFixed(1));
      }

      cohorts.push(retentionRates);
    }
  }

  // Average Customer Lifetime Value Over Time
  const ltvOverTime = [];

  // Determine the number of months to show based on filter
  let monthsToShow = 12; // default: last 12 months
  let yearFilter: number | null = null;

  if (ltvPeriod === 'last6months') {
    monthsToShow = 6;
  } else if (ltvYear) {
    yearFilter = parseInt(ltvYear as string);
    monthsToShow = 12; // show all 12 months of that year
  }

  if (yearFilter) {
    // Show specific year
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(yearFilter, month, 1);
      const monthEnd = endOfMonth(monthStart);

      // Don't show future months
      if (monthStart > new Date()) break;

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
  } else {
    // Show last N months
    for (let i = monthsToShow - 1; i >= 0; i--) {
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
  }

  // Peak Usage Time - Heatmap data (7 AM - 10 PM)
  const peakUsage = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hoursRange = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM (22)

  // Get actual booking distribution by day/hour
  const bookings = await Booking.find({ status: { $in: ['completed', 'confirmed'] } });
  const usageMap: Record<string, Record<number, number>> = {};

  // Initialize the map
  days.forEach(day => {
    usageMap[day] = {};
    hoursRange.forEach(hour => {
      usageMap[day][hour] = 0;
    });
  });

  // Count bookings by day and hour
  bookings.forEach(booking => {
    const date = new Date(booking.startTime);
    const dayIndex = date.getDay();
    const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1]; // Adjust for Monday start
    const hour = date.getHours();

    // Only count if within business hours (7 AM - 10 PM)
    if (hour >= 7 && hour <= 22 && usageMap[dayName]) {
      usageMap[dayName][hour] = (usageMap[dayName][hour] || 0) + 1;
    }
  });

  // Convert to array format for frontend
  Object.entries(usageMap).forEach(([day, hours]) => {
    Object.entries(hours).forEach(([hour, sessions]) => {
      peakUsage.push({ day, hour: parseInt(hour), sessions });
    });
  });

  // Package Renewal Frequency (time between last session of previous package and purchase of new package)
  const allCustomers = await Customer.find({}).lean();
  const renewalTimes: number[] = [];

  for (const customer of allCustomers) {
    // Get all packages for this customer, sorted by purchase date
    const packages = await Package.find({ customerId: customer._id })
      .sort({ createdAt: 1 })
      .lean();

    // Need at least 2 packages to calculate renewal time
    if (packages.length >= 2) {
      // For each renewal (2nd package onwards)
      for (let i = 1; i < packages.length; i++) {
        const previousPackage = packages[i - 1];
        const currentPackage = packages[i];

        // Find the last completed session of the previous package
        const lastSessionOfPreviousPackage = await Booking.findOne({
          customerId: customer._id,
          packageId: previousPackage._id,
          status: 'completed',
        })
          .sort({ startTime: -1 })
          .lean();

        if (lastSessionOfPreviousPackage) {
          // Calculate days between last session and new package purchase
          const daysBetween = Math.floor(
            (new Date(currentPackage.createdAt).getTime() - new Date(lastSessionOfPreviousPackage.startTime).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          renewalTimes.push(daysBetween);
        }
      }
    }
  }

  // Group into buckets (showing number of renewed packages in each time range)
  const purchaseTimeDistribution = {
    '0-30 Days': renewalTimes.filter(d => d >= 0 && d <= 30).length,
    '31-60 Days': renewalTimes.filter(d => d >= 31 && d <= 60).length,
    '61-90 Days': renewalTimes.filter(d => d >= 61 && d <= 90).length,
    '91-120 Days': renewalTimes.filter(d => d >= 91 && d <= 120).length,
    '120+ Days': renewalTimes.filter(d => d > 120).length,
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
