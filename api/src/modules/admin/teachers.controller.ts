import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Teacher, Booking, User } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';
import { validateSchema } from '@/utils/validation';
import { BookingStatus, UserRole, UserStatus } from '@/types';
import { NotificationService } from '@/services/notificationService';
import { logger } from '@/config/logger';

// Validation schema for creating teacher
const createTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  yearsOfExperience: z.number().min(0).optional(),
});

// Create new teacher account (Admin only)
export const createTeacher = asyncHandler(async (req: Request, res: Response) => {
  const data = validateSchema(createTeacherSchema, req.body);

  // Check if user with this email already exists
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw new AppError('Email already in use', 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user account
  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    passwordHash,
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
    lineUserId: null,
  });

  // Create teacher profile
  const teacher = await Teacher.create({
    userId: user._id,
    bio: data.bio || '',
    specialties: data.specialties || [],
    yearsOfExperience: data.yearsOfExperience || 0,
    isActive: true,
  });

  res.status(201).json({
    message: 'Teacher account created successfully',
    teacher: {
      _id: teacher._id,
      userId: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      bio: teacher.bio,
      specialties: teacher.specialties,
      isActive: teacher.isActive,
    },
  });
});

// Get all teachers with detailed information for admin
export const getAllTeachersWithDetails = asyncHandler(async (req: Request, res: Response) => {
  const teachers = await Teacher.find()
    .populate('userId', 'name email phone createdAt status')
    .sort({ createdAt: -1 })
    .lean();

  // Get session and student details for each teacher
  const teachersWithDetails = await Promise.all(
    teachers.map(async (teacher: any) => {
      // Get all bookings for this teacher
      const allBookings = await Booking.find({ teacherId: teacher._id }).lean();

      // Get unique students (customers)
      const uniqueCustomerIds = new Set(
        allBookings.map((booking: any) => booking.customerId.toString())
      );

      // Get completed sessions
      const completedSessions = allBookings.filter(
        (b) => b.status === BookingStatus.COMPLETED
      ).length;

      // Get upcoming sessions
      const upcomingSessions = allBookings.filter(
        (b) =>
          b.status === BookingStatus.CONFIRMED &&
          new Date(b.startTime) > new Date()
      ).length;

      // Get sessions this week (from Sunday to now)
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const thisWeekSessions = allBookings.filter(
        (b) =>
          (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) &&
          new Date(b.startTime) >= startOfWeek &&
          new Date(b.startTime) <= now
      ).length;

      // Get sessions today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySessions = allBookings.filter(
        (b) =>
          (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) &&
          new Date(b.startTime) >= today &&
          new Date(b.startTime) < tomorrow
      ).length;

      // Get last session date
      const completedBookings = allBookings
        .filter((b) => b.status === BookingStatus.COMPLETED)
        .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

      const lastSessionDate = completedBookings.length > 0
        ? completedBookings[0].endTime
        : null;

      return {
        ...teacher,
        totalSessions: allBookings.length,
        completedSessions,
        upcomingSessions,
        thisWeekSessions,
        todaySessions,
        totalStudents: uniqueCustomerIds.size,
        lastSessionDate,
      };
    })
  );

  res.json({
    teachers: teachersWithDetails,
  });
});

// Get detailed information about a specific teacher
export const getTeacherDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { month, year } = req.query;

  const teacher = await Teacher.findById(id)
    .populate('userId', 'name email phone createdAt status')
    .lean();

  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  // Build date filter for sessions if month/year provided
  const bookingQuery: any = { teacherId: teacher._id };

  if (month && year) {
    const selectedDate = new Date(Number(year), Number(month) - 1, 1);
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);

    bookingQuery.startTime = {
      $gte: startOfMonth,
      $lte: endOfMonth,
    };
  }

  // Get all bookings for this teacher with customer details
  const bookings = await Booking.find(bookingQuery)
    .populate({
      path: 'customerId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .populate('packageId', 'name type')
    .sort({ startTime: -1 })
    .lean();

  // Get unique students with their booking counts
  const studentMap = new Map();
  bookings.forEach((booking: any) => {
    const customerId = booking.customerId._id.toString();
    if (!studentMap.has(customerId)) {
      studentMap.set(customerId, {
        customer: booking.customerId,
        totalBookings: 0,
        completedBookings: 0,
      });
    }
    const student = studentMap.get(customerId);
    student.totalBookings += 1;
    if (booking.status === BookingStatus.COMPLETED) {
      student.completedBookings += 1;
    }
  });

  const students = Array.from(studentMap.values());

  // Calculate statistics
  const completedBookings = bookings.filter(
    (b) => b.status === BookingStatus.COMPLETED
  );
  const completedSessions = completedBookings.length;

  const upcomingSessions = bookings.filter(
    (b) =>
      b.status === BookingStatus.CONFIRMED &&
      new Date(b.startTime) > new Date()
  ).length;

  const cancelledSessions = bookings.filter(
    (b) => b.status === BookingStatus.CANCELLED
  ).length;

  // DEEP ANALYSIS
  // 1. Top clients (by completed sessions)
  const topClients = Array.from(studentMap.values())
    .sort((a, b) => b.completedBookings - a.completedBookings)
    .slice(0, 5)
    .map((student: any) => ({
      name: student.customer.userId.name,
      email: student.customer.userId.email,
      completedSessions: student.completedBookings,
      totalSessions: student.totalBookings,
    }));

  // 2. Average sessions per day and per month
  let avgSessionsPerDay = 0;
  let avgSessionsPerMonth = 0;

  if (completedBookings.length > 0) {
    // Get date range of completed sessions
    const sortedCompleted = [...completedBookings].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const firstSessionDate = new Date(sortedCompleted[0].startTime);
    const lastSessionDate = new Date(sortedCompleted[sortedCompleted.length - 1].startTime);

    const daysDiff = Math.max(
      1,
      Math.ceil((lastSessionDate.getTime() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const monthsDiff = Math.max(
      1,
      (lastSessionDate.getFullYear() - firstSessionDate.getFullYear()) * 12 +
        (lastSessionDate.getMonth() - firstSessionDate.getMonth()) + 1
    );

    avgSessionsPerDay = Number((completedSessions / daysDiff).toFixed(2));
    avgSessionsPerMonth = Number((completedSessions / monthsDiff).toFixed(2));
  }

  // 3. Popular package types and session types
  const packageTypeMap = new Map<string, number>();
  const sessionTypeMap = new Map<string, number>();

  completedBookings.forEach((booking: any) => {
    // Count package types
    if (booking.packageId?.type) {
      const packageType = booking.packageId.type;
      packageTypeMap.set(packageType, (packageTypeMap.get(packageType) || 0) + 1);
    }

    // Count session types
    if (booking.type) {
      sessionTypeMap.set(booking.type, (sessionTypeMap.get(booking.type) || 0) + 1);
    }
  });

  const popularPackageTypes = Array.from(packageTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const popularSessionTypes = Array.from(sessionTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    teacher: {
      ...teacher,
      totalSessions: bookings.length,
      completedSessions,
      upcomingSessions,
      cancelledSessions,
      totalStudents: students.length,
    },
    students,
    sessions: bookings.slice(0, 50), // Return latest 50 sessions
    deepAnalysis: {
      topClients,
      avgSessionsPerDay,
      avgSessionsPerMonth,
      popularPackageTypes,
      popularSessionTypes,
    },
  });
});

// Toggle teacher active status
export const toggleTeacherActiveStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const teacher = await Teacher.findById(id).populate('userId', 'name');

  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  const wasActive = teacher.isActive;

  // Toggle the isActive status
  teacher.isActive = !teacher.isActive;
  await teacher.save();

  let cancelledSessionsCount = 0;

  // If deactivating teacher, cancel all future sessions
  if (wasActive && !teacher.isActive) {
    const now = new Date();

    // Find all future sessions (pending or confirmed) that haven't ended yet
    const futureSessions = await Booking.find({
      teacherId: teacher._id,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      startTime: { $gt: now },
    })
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .populate('packageId', 'name type');

    cancelledSessionsCount = futureSessions.length;

    // Cancel each session and notify the customer
    for (const session of futureSessions) {
      // Update session status to cancelled
      session.status = BookingStatus.CANCELLED;
      await session.save();

      // Send notification to customer
      if (session.customerId && (session.customerId as any).userId) {
        try {
          const customerUserId = (session.customerId as any).userId._id;
          const customerName = (session.customerId as any).userId.name;
          const teacherName = (teacher as any).userId?.name || 'Teacher';

          await NotificationService.notifyBookingCancellation({
            customerId: customerUserId,
            customerName,
            teacherName,
            sessionDate: session.startTime,
            reason: `The teacher is no longer available. Please contact the studio to reschedule.`,
          });
        } catch (notificationError) {
          logger.error('Failed to send cancellation notification:', notificationError);
        }
      }
    }

    logger.info(`Deactivated teacher ${teacher._id} and cancelled ${cancelledSessionsCount} future sessions`);
  }

  res.json({
    message: `Teacher ${teacher.isActive ? 'activated' : 'deactivated'} successfully`,
    teacher: {
      _id: teacher._id,
      isActive: teacher.isActive,
    },
    cancelledSessions: cancelledSessionsCount,
  });
});

// Update teacher type (freelance/studio)
export const updateTeacherType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { teacherType } = req.body;

  if (!teacherType || !['freelance', 'studio'].includes(teacherType)) {
    throw new AppError('Invalid teacher type. Must be either "freelance" or "studio"', 400);
  }

  const teacher = await Teacher.findById(id);

  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  teacher.teacherType = teacherType;
  await teacher.save();

  logger.info(`Updated teacher ${teacher._id} type to ${teacherType}`);

  res.json({
    message: 'Teacher type updated successfully',
    teacher: {
      _id: teacher._id,
      teacherType: teacher.teacherType,
    },
  });
});
