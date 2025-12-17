import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Teacher, Booking, Customer, User, Package, SessionReview } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';
import { toStudioTime } from '@/utils/time';
import { startOfDay, endOfDay, format } from 'date-fns';
import { BookingStatus, PackageStatus } from '@/types';
import { NotificationService } from '@/services/notificationService';
import { logger } from '@/config/logger';

export const getTodaySessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  const now = toStudioTime(new Date());
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const sessions = await Booking.find({
    teacherId: teacher._id,
    startTime: { $gte: todayStart, $lte: todayEnd },
    status: { $ne: 'cancelled' },
  })
    .populate({
      path: 'customerId',
      select: 'userId healthNotes medicalNotes dateOfBirth height weight gender profilePhoto',
      populate: {
        path: 'userId',
        select: 'name email phone'
      }
    })
    .populate('packageId', 'name type totalSessions remainingSessions')
    .sort({ startTime: 1 })
    .lean();

  // Fetch reviews for these sessions
  const sessionIds = sessions.map(s => s._id);
  const reviews = await SessionReview.find({ bookingId: { $in: sessionIds } }).lean();
  const reviewMap = new Map(reviews.map(r => [r.bookingId.toString(), r]));

  // Attach review info to sessions
  const sessionsWithReviews = sessions.map(session => ({
    ...session,
    hasReview: reviewMap.has(session._id.toString()),
    review: reviewMap.get(session._id.toString()) || null,
  }));

  res.json({
    sessions: sessionsWithReviews,
  });
});

export const getTeacherSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  const { from, to, customerId } = req.query;

  const query: any = {
    teacherId: teacher._id,
    status: { $ne: 'cancelled' }
  };

  // Filter by customer if provided
  if (customerId) {
    query.customerId = customerId;
  }

  if (from || to) {
    query.startTime = {};
    if (from) {
      query.startTime.$gte = new Date(from as string);
    }
    if (to) {
      query.startTime.$lte = new Date(to as string);
    }
  }

  const sessions = await Booking.find(query)
    .populate({
      path: 'customerId',
      select: 'userId healthNotes medicalNotes dateOfBirth height weight gender profilePhoto',
      populate: {
        path: 'userId',
        select: 'name email phone'
      }
    })
    .populate('packageId', 'name type totalSessions remainingSessions')
    .sort({ startTime: -1 })
    .lean();

  // Fetch reviews for these sessions
  const sessionIds = sessions.map(s => s._id);
  const reviews = await SessionReview.find({ bookingId: { $in: sessionIds } }).lean();
  const reviewMap = new Map(reviews.map(r => [r.bookingId.toString(), r]));

  // Attach review info to sessions
  const sessionsWithReviews = sessions.map(session => ({
    ...session,
    hasReview: reviewMap.has(session._id.toString()),
    review: reviewMap.get(session._id.toString()) || null,
  }));

  res.json({
    sessions: sessionsWithReviews,
  });
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id })
    .populate('userId', 'name email phone')
    .lean();

  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  res.json({
    teacher,
  });
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  const { phone, bio, specialties, yearsOfExperience } = req.body;

  // Update user phone if provided
  if (phone !== undefined) {
    await User.findByIdAndUpdate(req.user._id, { phone });
  }

  // Update teacher profile fields
  if (bio !== undefined) {
    teacher.bio = bio;
  }
  if (specialties !== undefined) {
    teacher.specialties = specialties;
  }
  if (yearsOfExperience !== undefined) {
    teacher.yearsOfExperience = yearsOfExperience;
  }

  await teacher.save();

  const updatedTeacher = await Teacher.findById(teacher._id)
    .populate('userId', 'name email phone')
    .lean();

  res.json({
    message: 'Profile updated successfully',
    teacher: updatedTeacher,
  });
});

export const uploadProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  // Delete old profile photo if exists
  if (teacher.imageUrl) {
    const oldPhotoPath = path.join(__dirname, '../../../', teacher.imageUrl);
    if (fs.existsSync(oldPhotoPath)) {
      fs.unlinkSync(oldPhotoPath);
    }
  }

  // Save new photo URL
  const photoUrl = `/uploads/profiles/${req.file.filename}`;
  teacher.imageUrl = photoUrl;
  await teacher.save();

  res.json({
    message: 'Profile photo uploaded successfully',
    photoUrl,
  });
});

export const getAllTeachers = asyncHandler(async (req: Request, res: Response) => {
  const teachers = await Teacher.find({ isActive: true })
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    teachers,
  });
});

// Get teacher's students (customers who have booked with this teacher)
export const getMyStudents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  // Find all unique customers who have bookings with this teacher
  const bookings = await Booking.find({ teacherId: teacher._id })
    .populate({
      path: 'customerId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .lean();

  // Get unique customers
  const customerMap = new Map();
  bookings.forEach((booking: any) => {
    if (booking.customerId && !customerMap.has(booking.customerId._id.toString())) {
      customerMap.set(booking.customerId._id.toString(), booking.customerId);
    }
  });

  const students = Array.from(customerMap.values());

  // Get packages and session counts for each student
  const studentsWithDetails = await Promise.all(
    students.map(async (student: any) => {
      const packages = await Package.find({ customerId: student._id })
        .sort({ createdAt: -1 })
        .lean();

      const sessions = await Booking.find({
        customerId: student._id,
        teacherId: teacher._id,
      }).lean();

      // Only count CONFIRMED and COMPLETED sessions (exclude CANCELLED)
      const usedSessions = sessions.filter(
        (s) => s.status === BookingStatus.CONFIRMED || s.status === BookingStatus.COMPLETED
      );

      const completedSessions = sessions.filter(
        (s) => s.status === BookingStatus.COMPLETED
      ).length;

      return {
        ...student,
        packages,
        totalSessions: usedSessions.length,
        completedSessions,
      };
    })
  );

  res.json({
    students: studentsWithDetails,
  });
});

// Add a manual session for a student
export const addManualSession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  const { customerId, packageId, sessionDate, notes } = req.body;

  if (!customerId || !packageId || !sessionDate) {
    throw new AppError('Customer ID, Package ID, and session date are required', 400);
  }

  // Always use the logged-in teacher for the booking
  const bookingTeacherId = teacher._id;

  // Verify the package belongs to the customer
  const packageDoc = await Package.findOne({
    _id: packageId,
    customerId,
  });

  if (!packageDoc) {
    throw new AppError('Package not found or does not belong to customer', 404);
  }

  if (packageDoc.remainingSessions <= 0) {
    throw new AppError('No remaining sessions in this package', 400);
  }

  // Validate session date/time
  const startTime = new Date(sessionDate);
  const now = new Date();

  // Check time is between 7 AM and 10 PM
  const hours = startTime.getHours();
  if (hours < 7 || hours >= 22) {
    throw new AppError('Session time must be between 7:00 AM and 10:00 PM', 400);
  }

  // Determine booking status based on whether it's past or future
  const isFutureBooking = startTime > now;
  const bookingStatus = isFutureBooking ? BookingStatus.CONFIRMED : BookingStatus.COMPLETED;

  // Check if session date is within package validity period
  if (startTime < packageDoc.validFrom) {
    throw new AppError('Session date is before package start date', 400);
  }

  if (startTime > packageDoc.validTo) {
    throw new AppError('Session date is after package expiry date', 400);
  }

  // Create the booking
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

  const booking = await Booking.create({
    customerId,
    teacherId: bookingTeacherId,
    packageId,
    startTime,
    endTime,
    type: packageDoc.type,
    status: bookingStatus,
    notes,
  });

  // Update package remaining sessions for both CONFIRMED and COMPLETED
  // Both statuses mean the session is reserved/used
  packageDoc.remainingSessions -= 1;
  if (packageDoc.remainingSessions === 0 && packageDoc.status === PackageStatus.ACTIVE) {
    packageDoc.status = PackageStatus.USED;
  }
  await packageDoc.save();

  await booking.populate([
    {
      path: 'customerId',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    },
    {
      path: 'packageId',
      select: 'name type',
    },
  ]);

  // Send notification to customer
  try {
    const customer = await Customer.findById(customerId).populate('userId', 'name');
    const teacherUser = await User.findById(req.user._id);

    if (customer && teacherUser) {
      const notificationMessage = isFutureBooking
        ? `Your session with ${teacherUser.name} has been booked for ${format(startTime, 'PPP p')}`
        : `Your completed session with ${teacherUser.name} on ${format(startTime, 'PPP p')} has been recorded`;

      const notificationTitle = isFutureBooking ? 'Session Booked' : 'Session Recorded';
      const notificationType = isFutureBooking ? 'booking_approved' : 'booking_approved';

      await NotificationService.createNotification({
        userId: customer.userId._id,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        relatedId: booking._id,
        relatedModel: 'Booking',
      });
    }
  } catch (error) {
    // Log error but don't fail the request
    logger.error('Error sending notification:', error);
  }

  const message = isFutureBooking
    ? 'Future session booked successfully. Customer has been notified.'
    : 'Past session recorded successfully. Customer has been notified.';

  res.status(201).json({
    message,
    booking,
  });
});

// Add a new customer/student
export const addNewStudent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  const { name, email, phone, healthNotes, emergencyContact, packageType, packageSessions } = req.body;

  if (!name || !email || !phone) {
    throw new AppError('Name, email, and phone are required', 400);
  }

  if (!packageType || !packageSessions) {
    throw new AppError('Package type and sessions are required', 400);
  }

  // Check if user already exists
  let user = await User.findOne({ email });

  if (user) {
    // Check if customer profile exists
    const existingCustomer = await Customer.findOne({ userId: user._id });
    if (existingCustomer) {
      throw new AppError('Customer already exists with this email', 400);
    }
  } else {
    // Create new user
    const tempPassword = Math.random().toString(36).slice(-8);
    user = await User.create({
      name,
      email,
      phone,
      password: tempPassword, // In production, you'd want to hash this and send it via email
      role: 'customer',
    });
  }

  // Create customer profile
  const customer = await Customer.create({
    userId: user._id,
    healthNotes,
    emergencyContact,
    preferredTeacherId: teacher._id,
  });

  // Create initial package
  const packageName = `${packageSessions} Session Package`;
  const totalSessions = parseInt(packageSessions);

  await Package.create({
    customerId: customer._id,
    name: packageName,
    type: packageType,
    totalSessions,
    remainingSessions: totalSessions,
    status: PackageStatus.ACTIVE,
  });

  await customer.populate('userId', 'name email phone');

  res.status(201).json({
    message: 'Student added successfully with package',
    customer,
  });
});
