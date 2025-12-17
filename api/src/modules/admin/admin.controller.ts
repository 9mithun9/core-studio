import { Request, Response } from 'express';
import { asyncHandler, AppError } from '@/middlewares';
import { Booking, Customer, Teacher, Package, User, RegistrationRequest } from '@/models';
import { BookingStatus, PackageStatus } from '@/types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { logger } from '@/config/logger';

export const getDashboardAnalytics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    // Total counts
    const totalCustomers = await Customer.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // This month stats
    const packagesThisMonth = await Package.find({
      createdAt: {
        $gte: startOfCurrentMonth,
        $lte: endOfCurrentMonth,
      },
    }).lean();

    const packagesSoldThisMonth = packagesThisMonth.length;
    const totalSessionsSoldThisMonth = packagesThisMonth.reduce(
      (sum, pkg) => sum + (pkg.totalSessions || 0),
      0
    );

    // Revenue this month (sum of package prices)
    const revenueThisMonth = packagesThisMonth.reduce(
      (sum, pkg) => sum + (pkg.price || 0),
      0
    );

    // Sessions completed this month
    const sessionsCompletedThisMonth = await Booking.countDocuments({
      status: BookingStatus.CONFIRMED,
      startTime: {
        $gte: startOfCurrentMonth,
        $lte: endOfCurrentMonth,
      },
      endTime: {
        $lte: now, // Only count past sessions
      },
    });

    // Pending bookings
    const pendingBookings = await Booking.countDocuments({
      status: BookingStatus.PENDING,
    });

    // Upcoming sessions (next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const upcomingSessions = await Booking.countDocuments({
      status: BookingStatus.CONFIRMED,
      startTime: {
        $gte: now,
        $lte: next7Days,
      },
    });

    // Active packages
    const activePackages = await Package.countDocuments({
      status: PackageStatus.ACTIVE,
      remainingSessions: { $gt: 0 },
    });

    // Teacher performance this month
    const teacherSessions = await Booking.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          startTime: {
            $gte: startOfCurrentMonth,
            $lte: endOfCurrentMonth,
          },
          endTime: {
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: '$teacherId',
          sessionsCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          teacherName: '$user.name',
          sessionsCount: 1,
        },
      },
      {
        $sort: { sessionsCount: -1 },
      },
    ]);

    // Top customers this month
    const topCustomers = await Booking.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          startTime: {
            $gte: startOfCurrentMonth,
            $lte: endOfCurrentMonth,
          },
        },
      },
      {
        $group: {
          _id: '$customerId',
          sessionsCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: '$customer',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'customer.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          customerName: '$user.name',
          customerEmail: '$user.email',
          sessionsCount: 1,
        },
      },
      {
        $sort: { sessionsCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      overview: {
        totalCustomers,
        totalTeachers,
        totalBookings,
        pendingBookings,
        upcomingSessions,
        activePackages,
      },
      thisMonth: {
        packagesSold: packagesSoldThisMonth,
        totalSessionsSold: totalSessionsSoldThisMonth,
        sessionsCompleted: sessionsCompletedThisMonth,
        revenue: revenueThisMonth,
        remainingSessions: totalSessionsSoldThisMonth - sessionsCompletedThisMonth,
      },
      teachers: teacherSessions,
      topCustomers,
    });
  } catch (error) {
    logger.error('Error fetching dashboard analytics:', error);
    throw new AppError('Failed to fetch analytics', 500);
  }
});

// Get all customers with their session history
export const getAllCustomersWithSessions = asyncHandler(async (req: Request, res: Response) => {
  const customers = await Customer.find()
    .populate('userId', 'name email phone createdAt')
    .populate('preferredTeacherId')
    .lean();

  const customersWithSessions = await Promise.all(
    customers.map(async (customer) => {
      const sessions = await Booking.find({ customerId: customer._id })
        .populate({
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'name',
          },
        })
        .populate('packageId', 'name type')
        .sort({ startTime: -1 })
        .lean();

      const packages = await Package.find({ customerId: customer._id })
        .sort({ createdAt: -1 })
        .lean();

      // DEEP ANALYTICS
      // Count completed sessions (includes NO_SHOW and past CONFIRMED sessions)
      // Any session that has passed is automatically considered completed
      const now = new Date();
      const completedSessions = sessions.filter((s) =>
        s.status === BookingStatus.COMPLETED ||
        s.status === BookingStatus.NO_SHOW ||
        (s.status === BookingStatus.CONFIRMED && new Date(s.endTime) < now)
      );

      // 1. Total packages purchased
      const totalPackagesPurchased = packages.length;

      // 2. Total amount of money spent
      const totalMoneySpent = packages.reduce((sum, pkg) => sum + (pkg.price || 0), 0);

      // 3. Average gap between two sessions
      let avgDaysBetweenSessions = 0;
      if (completedSessions.length >= 2) {
        const sortedSessions = [...completedSessions].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        let totalGapDays = 0;
        for (let i = 1; i < sortedSessions.length; i++) {
          const gap = (new Date(sortedSessions[i].startTime).getTime() -
                      new Date(sortedSessions[i-1].startTime).getTime()) / (1000 * 60 * 60 * 24);
          totalGapDays += gap;
        }
        avgDaysBetweenSessions = Number((totalGapDays / (sortedSessions.length - 1)).toFixed(1));
      }

      // 4. Average gap between package purchases
      let avgDaysBetweenPackages = 0;
      if (packages.length >= 2) {
        const sortedPackages = [...packages].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        let totalGapDays = 0;

        for (let i = 0; i < sortedPackages.length - 1; i++) {
          const currentPackageDate = new Date(sortedPackages[i].createdAt);
          const nextPackageDate = new Date(sortedPackages[i + 1].createdAt);

          const gap = (nextPackageDate.getTime() - currentPackageDate.getTime()) / (1000 * 60 * 60 * 24);
          totalGapDays += gap;
        }

        avgDaysBetweenPackages = Number((totalGapDays / (sortedPackages.length - 1)).toFixed(1));
      }

      // 5. Popular package types
      const packageTypeMap = new Map<string, number>();
      packages.forEach((pkg) => {
        if (pkg.type) {
          packageTypeMap.set(pkg.type, (packageTypeMap.get(pkg.type) || 0) + 1);
        }
      });
      const popularPackages = Array.from(packageTypeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Count upcoming sessions (PENDING or CONFIRMED future sessions)
      const upcomingSessions = sessions.filter((s) =>
        (s.status === BookingStatus.PENDING || s.status === BookingStatus.CONFIRMED) &&
        new Date(s.startTime) >= now
      ).length;

      const result = {
        ...customer,
        sessions,
        packages,
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        upcomingSessions,
        analytics: {
          totalPackagesPurchased,
          totalMoneySpent,
          avgDaysBetweenSessions,
          avgDaysBetweenPackages,
          popularPackages,
        },
      };

      // Debug: Log customer creation date
      if ((customer as any).userId?.name === 'John Doe') {
        logger.info(`Customer ${(customer as any).userId.name} - createdAt: ${(customer as any).createdAt}`);
      }

      return result;
    })
  );

  res.json({
    customers: customersWithSessions,
  });
});

// Get teacher performance details
export const getTeacherPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = req.params;
  const { from, to } = req.query;

  const startDate = from ? new Date(from as string) : startOfMonth(new Date());
  const endDate = to ? new Date(to as string) : endOfMonth(new Date());

  const query: any = {
    status: BookingStatus.CONFIRMED,
    startTime: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (teacherId) {
    query.teacherId = teacherId;
  }

  const sessions = await Booking.find(query)
    .populate({
      path: 'customerId',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    })
    .populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'name',
      },
    })
    .sort({ startTime: -1 })
    .lean();

  const completedSessions = sessions.filter((s) => s.status === BookingStatus.COMPLETED);
  const upcomingSessions = sessions.filter((s) => s.status === BookingStatus.CONFIRMED && new Date(s.startTime) > new Date());

  res.json({
    sessions,
    stats: {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      upcomingSessions: upcomingSessions.length,
    },
  });
});

// Get detailed monthly finance analytics
export const getMonthlyFinance = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;

    // Handle "All Time" option
    const isAllTime = month === 'all' || year === 'all';

    let startOfSelectedMonth: Date;
    let endOfSelectedMonth: Date;
    const now = new Date();

    if (isAllTime) {
      // Get earliest booking date from database to include all sessions
      const earliestBooking = await Booking.findOne().sort({ startTime: 1 }).lean();
      startOfSelectedMonth = earliestBooking ? new Date(earliestBooking.startTime) : new Date(2020, 0, 1);
      endOfSelectedMonth = now;
    } else {
      if (!month || !year) {
        throw new AppError('Month and year are required', 400);
      }
      const selectedDate = new Date(Number(year), Number(month) - 1, 1);
      startOfSelectedMonth = startOfMonth(selectedDate);
      endOfSelectedMonth = endOfMonth(selectedDate);
    }

    // Packages sold in the selected month with customer details
    const packagesInMonth = await Package.find({
      createdAt: {
        $gte: startOfSelectedMonth,
        $lte: endOfSelectedMonth,
      },
    })
    .populate({
      path: 'customerId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .lean();

    // Get teacher info for each package from their first booking
    const packagesWithTeacher = await Promise.all(
      packagesInMonth.map(async (pkg: any) => {
        const firstBooking = await Booking.findOne({ packageId: pkg._id })
          .populate({
            path: 'teacherId',
            populate: {
              path: 'userId',
              select: 'name',
            },
          })
          .sort({ createdAt: 1 })
          .lean();

        return {
          ...pkg,
          teacher: firstBooking?.teacherId || null,
        };
      })
    );

    // Group packages by type
    const packagesByType = packagesInMonth.reduce((acc: any, pkg) => {
      const key = pkg.name;
      if (!acc[key]) {
        acc[key] = {
          name: pkg.name,
          count: 0,
          revenue: 0,
        };
      }
      acc[key].count += 1;
      acc[key].revenue += pkg.price || 0;
      return acc;
    }, {});

    // Sessions completed in the selected month
    const completedSessions = await Booking.countDocuments({
      status: BookingStatus.COMPLETED,
      startTime: {
        $gte: startOfSelectedMonth,
        $lte: endOfSelectedMonth,
      },
    });

    // Teacher performance for the selected month
    const teacherSessions = await Booking.aggregate([
      {
        $match: {
          status: BookingStatus.COMPLETED,
          startTime: {
            $gte: startOfSelectedMonth,
            $lte: endOfSelectedMonth,
          },
        },
      },
      {
        $group: {
          _id: '$teacherId',
          sessionsCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          teacherName: '$user.name',
          sessionsCount: 1,
        },
      },
      {
        $sort: { sessionsCount: -1 },
      },
    ]);

    // Calculate total revenue
    const totalRevenue = packagesInMonth.reduce(
      (sum, pkg) => sum + (pkg.price || 0),
      0
    );

    // Total sessions (from all bookings in the month, not just completed)
    const totalSessions = await Booking.countDocuments({
      status: BookingStatus.CONFIRMED,
      startTime: {
        $gte: startOfSelectedMonth,
        $lte: endOfSelectedMonth,
      },
    });

    res.json({
      month: isAllTime ? 'all' : Number(month),
      year: isAllTime ? 'all' : Number(year),
      isAllTime,
      packages: {
        total: packagesInMonth.length,
        byType: Object.values(packagesByType),
        details: packagesWithTeacher, // Include detailed package info
      },
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        byTeacher: teacherSessions,
      },
      revenue: {
        total: totalRevenue,
        byPackageType: Object.values(packagesByType),
      },
    });
  } catch (error) {
    logger.error('Error fetching monthly finance:', error);
    throw new AppError('Failed to fetch finance data', 500);
  }
});

// Get finance trends for graphs (last 6 or 12 months)
export const getFinanceTrends = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { months = '6' } = req.query;
    const monthsCount = Number(months);
    const now = new Date();

    const trends = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfTargetMonth = startOfMonth(targetDate);
      const endOfTargetMonth = endOfMonth(targetDate);

      // Packages sold in this month
      const packagesInMonth = await Package.find({
        createdAt: {
          $gte: startOfTargetMonth,
          $lte: endOfTargetMonth,
        },
      }).lean();

      const packagesSold = packagesInMonth.length;
      const totalSessionsSold = packagesInMonth.reduce(
        (sum, pkg) => sum + (pkg.totalSessions || 0),
        0
      );
      const revenue = packagesInMonth.reduce(
        (sum, pkg) => sum + (pkg.price || 0),
        0
      );

      // Sessions completed in this month
      const sessionsCompleted = await Booking.countDocuments({
        status: BookingStatus.COMPLETED,
        startTime: {
          $gte: startOfTargetMonth,
          $lte: endOfTargetMonth,
        },
      });

      trends.push({
        month: targetDate.toLocaleString('default', { month: 'short' }),
        year: targetDate.getFullYear(),
        monthYear: `${targetDate.toLocaleString('default', { month: 'short' })} ${targetDate.getFullYear()}`,
        packagesSold,
        sessionsSold: totalSessionsSold,
        sessionsTaken: sessionsCompleted,
        revenue,
      });
    }

    res.json({
      trends,
      period: `${monthsCount} months`,
    });
  } catch (error) {
    logger.error('Error fetching finance trends:', error);
    throw new AppError('Failed to fetch finance trends', 500);
  }
});

// Get teacher session trends for graphs (last 6 or 12 months)
export const getTeacherSessionTrends = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { months = '6' } = req.query;
    const monthsCount = Number(months);
    const now = new Date();

    // Get all active teachers
    const teachers = await Teacher.find()
      .populate('userId', 'name')
      .lean();

    const trends = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfTargetMonth = startOfMonth(targetDate);
      const endOfTargetMonth = endOfMonth(targetDate);

      const monthData: any = {
        month: targetDate.toLocaleString('default', { month: 'short' }),
        year: targetDate.getFullYear(),
        monthYear: `${targetDate.toLocaleString('default', { month: 'short' })} ${targetDate.getFullYear()}`,
      };

      // Get sessions for each teacher in this month
      for (const teacher of teachers) {
        const teacherName = (teacher as any).userId.name;
        const sessionsCount = await Booking.countDocuments({
          teacherId: teacher._id,
          status: BookingStatus.COMPLETED,
          startTime: {
            $gte: startOfTargetMonth,
            $lte: endOfTargetMonth,
          },
        });

        monthData[teacherName] = sessionsCount;
      }

      trends.push(monthData);
    }

    // Get teacher names for the graph
    const teacherNames = teachers.map((t: any) => t.userId.name);

    res.json({
      trends,
      teachers: teacherNames,
      period: `${monthsCount} months`,
    });
  } catch (error) {
    logger.error('Error fetching teacher session trends:', error);
    throw new AppError('Failed to fetch teacher session trends', 500);
  }
});

// Get package distribution analytics
export const getPackageDistribution = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get all packages
    const allPackages = await Package.find().lean();

    // Group by session count (10/20/30)
    const bySessionCount = allPackages.reduce((acc: any, pkg) => {
      const key = `${pkg.totalSessions} Sessions`;
      if (!acc[key]) {
        acc[key] = {
          sessions: pkg.totalSessions,
          count: 0,
          revenue: 0,
        };
      }
      acc[key].count += 1;
      acc[key].revenue += pkg.price || 0;
      return acc;
    }, {});

    // Group by package type (private/duo/group)
    const byType = allPackages.reduce((acc: any, pkg) => {
      const key = pkg.type;
      if (!acc[key]) {
        acc[key] = {
          type: key,
          count: 0,
          revenue: 0,
        };
      }
      acc[key].count += 1;
      acc[key].revenue += pkg.price || 0;
      return acc;
    }, {});

    // Group by BOTH session count AND type (for grouped bar chart)
    const bySessionAndType: Record<number, Record<string, { count: number; revenue: number }>> = {
      10: { private: { count: 0, revenue: 0 }, duo: { count: 0, revenue: 0 }, group: { count: 0, revenue: 0 } },
      20: { private: { count: 0, revenue: 0 }, duo: { count: 0, revenue: 0 }, group: { count: 0, revenue: 0 } },
      30: { private: { count: 0, revenue: 0 }, duo: { count: 0, revenue: 0 }, group: { count: 0, revenue: 0 } },
    };

    allPackages.forEach(pkg => {
      const sessions = pkg.totalSessions;
      const type = pkg.type;
      if (bySessionAndType[sessions] && bySessionAndType[sessions][type]) {
        bySessionAndType[sessions][type].count += 1;
        bySessionAndType[sessions][type].revenue += pkg.price || 0;
      }
    });

    // Find most popular package (by session count)
    const sessionCountArray = Object.values(bySessionCount) as any[];
    const mostPopularBySessionCount = sessionCountArray.sort((a, b) => b.count - a.count)[0] || null;

    // Find most popular package type
    const typeArray = Object.values(byType) as any[];
    const mostPopularType = typeArray.sort((a, b) => b.count - a.count)[0] || null;

    res.json({
      bySessionCount: Object.values(bySessionCount),
      byType: Object.values(byType),
      bySessionAndType,
      mostPopular: {
        sessionCount: mostPopularBySessionCount,
        type: mostPopularType,
      },
      total: allPackages.length,
    });
  } catch (error) {
    logger.error('Error fetching package distribution:', error);
    throw new AppError('Failed to fetch package distribution', 500);
  }
});

// Get customer demographics analytics
export const getCustomerDemographics = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get all customers with their user data
    const customers = await Customer.find().populate('userId').lean();

    // Age distribution (calculate from dateOfBirth)
    const ageGroups: Record<string, number> = {
      '0-17': 0,
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55-64': 0,
      '65+': 0,
      'Unknown': 0,
    };

    customers.forEach(customer => {
      if (customer.dateOfBirth) {
        const age = Math.floor((new Date().getTime() - new Date(customer.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        if (age < 18) ageGroups['0-17']++;
        else if (age >= 18 && age <= 24) ageGroups['18-24']++;
        else if (age >= 25 && age <= 34) ageGroups['25-34']++;
        else if (age >= 35 && age <= 44) ageGroups['35-44']++;
        else if (age >= 45 && age <= 54) ageGroups['45-54']++;
        else if (age >= 55 && age <= 64) ageGroups['55-64']++;
        else if (age >= 65) ageGroups['65+']++;
      } else {
        ageGroups['Unknown']++;
      }
    });

    // Gender distribution
    const genderDistribution: Record<string, number> = {
      male: 0,
      female: 0,
      other: 0,
      unknown: 0,
    };

    customers.forEach(customer => {
      if (customer.gender) {
        genderDistribution[customer.gender]++;
      } else {
        genderDistribution.unknown++;
      }
    });

    // Profession distribution - categorized into 4 main groups
    const professionCounts: Record<string, number> = {
      'Student': 0,
      'Employed': 0,
      'Retired': 0,
      'Homemaker': 0,
      'Not specified': 0,
    };

    customers.forEach(customer => {
      const profession = customer.profession?.toLowerCase().trim();
      if (!profession) {
        professionCounts['Not specified']++;
      } else if (profession === 'student') {
        professionCounts['Student']++;
      } else if (profession === 'employed') {
        professionCounts['Employed']++;
      } else if (profession === 'retired') {
        professionCounts['Retired']++;
      } else if (profession === 'homemaker') {
        professionCounts['Homemaker']++;
      } else {
        // Legacy data - categorize based on common profession types
        professionCounts['Not specified']++;
      }
    });

    const professionDistribution = Object.entries(professionCounts)
      .map(([profession, count]) => ({ profession, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    res.json({
      totalCustomers: customers.length,
      ageDistribution: Object.entries(ageGroups).map(([ageRange, count]) => ({
        ageRange,
        count,
      })),
      genderDistribution: Object.entries(genderDistribution).map(([gender, count]) => ({
        gender,
        count,
      })),
      professionDistribution,
    });
  } catch (error) {
    logger.error('Error fetching customer demographics:', error);
    throw new AppError('Failed to fetch customer demographics', 500);
  }
});
