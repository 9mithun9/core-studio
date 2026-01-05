import cron from 'node-cron';
import { Teacher, Booking, Package, PaymentReport } from '@/models';
import { BookingStatus } from '@/types';
import { logger } from '@/config/logger';
import { startOfMonth, endOfMonth } from 'date-fns';

// Payment rates configuration
const PAYMENT_RATES = {
  freelance: {
    private: { base: 1000, rate: 0.40 },
    duo: { base: 1500, rate: 0.40 },
    group: { base: 2100, rate: 0.40 },
    baseSalary: 0,
  },
  studio: {
    private: { base: 1000, rate: 0.35 },
    duo: { base: 1500, rate: 0.35 },
    group: { base: 2100, rate: 0.35 },
    baseSalary: 15000,
  },
};

// Helper function to determine session type based on package name
function getSessionType(packageName: string): 'private' | 'duo' | 'group' {
  const lowerName = packageName.toLowerCase();
  if (lowerName.includes('duo') || lowerName.includes('2')) {
    return 'duo';
  } else if (lowerName.includes('group') || lowerName.includes('trio') || lowerName.includes('3')) {
    return 'group';
  }
  return 'private';
}

// Auto-generate monthly payment report
async function generateMonthlyReport() {
  try {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = previousMonth.getMonth() + 1;
    const year = previousMonth.getFullYear();

    const startDate = startOfMonth(previousMonth);
    const endDate = endOfMonth(previousMonth);

    logger.info(`Starting automatic monthly report generation for ${year}/${month}`);

    // Check if report already exists
    const existingReport = await PaymentReport.findOne({
      year,
      month,
      reportType: 'monthly',
    });

    if (existingReport) {
      logger.info(`Monthly report for ${year}/${month} already exists. Skipping...`);
      return;
    }

    // Get all teachers
    const teachers = await Teacher.find()
      .populate('userId', 'name email')
      .lean();

    // Get all completed bookings in the date range
    const completedBookings = await Booking.find({
      status: BookingStatus.COMPLETED,
      startTime: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('packageId', 'name price')
      .populate('teacherId')
      .lean();

    // Calculate total revenue from packages sold
    const packagesSold = await Package.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    const totalRevenue = packagesSold.reduce((sum, pkg) => sum + (pkg.price || 0), 0);

    // Calculate payment for each teacher
    const teacherPayments = await Promise.all(
      teachers.map(async (teacher: any) => {
        const teacherType = (teacher.teacherType || 'freelance') as 'freelance' | 'studio';
        const rates = PAYMENT_RATES[teacherType];

        // Get teacher's completed sessions
        const teacherSessions = completedBookings.filter(
          (booking: any) => booking.teacherId?._id.toString() === teacher._id.toString()
        );

        // Count sessions by type
        const sessionCounts = {
          private: 0,
          duo: 0,
          group: 0,
        };

        teacherSessions.forEach((session: any) => {
          const packageName = session.packageId?.name || '';
          const sessionType = getSessionType(packageName);
          sessionCounts[sessionType]++;
        });

        // Calculate commissions
        const privateCommission = sessionCounts.private * (rates.private.base * rates.private.rate);
        const duoCommission = sessionCounts.duo * (rates.duo.base * rates.duo.rate);
        const groupCommission = sessionCounts.group * (rates.group.base * rates.group.rate);

        const totalCommission = privateCommission + duoCommission + groupCommission;
        const baseSalary = rates.baseSalary;
        const totalPayment = totalCommission + baseSalary;
        const totalSessions = sessionCounts.private + sessionCounts.duo + sessionCounts.group;

        return {
          teacherId: teacher._id,
          teacherName: teacher.userId?.name || 'Unknown',
          teacherType,
          sessions: {
            private: {
              count: sessionCounts.private,
              commission: privateCommission,
            },
            duo: {
              count: sessionCounts.duo,
              commission: duoCommission,
            },
            group: {
              count: sessionCounts.group,
              commission: groupCommission,
            },
          },
          totalSessions,
          totalCommission,
          baseSalary,
          totalPayment,
        };
      })
    );

    // Create payment report
    await PaymentReport.create({
      month,
      year,
      reportType: 'monthly',
      startDate,
      endDate,
      totalRevenue,
      teacherPayments,
      generatedBy: 'auto',
    });

    logger.info(`Monthly report for ${year}/${month} generated successfully. Total revenue: ${totalRevenue}`);
  } catch (error) {
    logger.error('Error generating automatic monthly report:', error);
  }
}

// Initialize cron jobs
export function initializeReportScheduler() {
  // Run at 11 PM (23:00) on the last day of every month
  // Cron format: minute hour day month day-of-week
  // 0 23 L * * means: At 23:00 on the last day of every month

  // Note: node-cron doesn't support 'L' for last day, so we'll check manually
  cron.schedule('0 23 * * *', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    // Check if tomorrow is the first day of next month (meaning today is the last day)
    if (tomorrow.getDate() === 1) {
      logger.info('Last day of the month detected. Triggering monthly report generation...');
      await generateMonthlyReport();
    }
  });

  logger.info('Report scheduler initialized. Monthly reports will be auto-generated at 11 PM on the last day of each month.');
}

// Export function for manual trigger (useful for testing)
export { generateMonthlyReport };
