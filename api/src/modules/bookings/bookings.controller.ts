import { Request, Response } from 'express';
import { z } from 'zod';
import { Booking, Customer, Package, Teacher, Notification } from '@/models';
import { validateSchema } from '@/utils/validation';
import { AppError, asyncHandler } from '@/middlewares';
import { BookingStatus, PackageType, UserRole, NotificationType, NotificationChannel, PackageStatus } from '@/types';
import { parseDate, isBookingTimeValid, addMinutesToDate, toStudioTime, formatStudioTime } from '@/utils/time';
import { config } from '@/config/env';
import { logger } from '@/config/logger';
import { GoogleCalendarService } from '@/modules/calendars/google.service';

// Validation schemas
const bookingRequestSchema = z.object({
  teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  desiredTime: z.string().datetime(),
  durationMinutes: z.number().int().positive().optional(),
  type: z.enum([PackageType.PRIVATE, PackageType.GROUP]),
  packageId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  notes: z.string().optional(),
});

const confirmBookingSchema = z.object({
  teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const markAttendanceSchema = z.object({
  status: z.enum([BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.CANCELLED]),
  notes: z.string().optional(),
});

export const requestBooking = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const data = validateSchema(bookingRequestSchema, req.body);

  // Find customer profile
  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  // Parse desired time
  const desiredTime = parseDate(data.desiredTime);

  // Check 24-hour rule
  if (!isBookingTimeValid(desiredTime, config.minBookingHoursAdvance)) {
    throw new AppError(
      `Bookings must be requested at least ${config.minBookingHoursAdvance} hours in advance. ` +
        `For urgent bookings, please contact the studio via LINE.`,
      400
    );
  }

  // Validate package if provided
  let packageData = null;
  if (data.packageId) {
    packageData = await Package.findById(data.packageId);
    if (!packageData) {
      throw new AppError('Package not found', 404);
    }

    if (packageData.customerId.toString() !== customer._id.toString()) {
      throw new AppError('This package does not belong to you', 403);
    }

    if (packageData.status !== PackageStatus.ACTIVE) {
      throw new AppError('Package is not active', 400);
    }

    if (packageData.remainingSessions <= 0) {
      throw new AppError('No sessions remaining in this package', 400);
    }

    if (packageData.type !== data.type) {
      throw new AppError('Package type does not match booking type', 400);
    }

    // Check validity period
    if (desiredTime < packageData.validFrom || desiredTime > packageData.validTo) {
      throw new AppError('Booking time is outside package validity period', 400);
    }
  }

  // Calculate end time
  const durationMinutes = data.durationMinutes || config.sessionDurationMinutes;
  const endTime = addMinutesToDate(desiredTime, durationMinutes);

  // Determine teacher (use provided or preferred)
  let teacherId = data.teacherId;
  if (!teacherId && customer.preferredTeacherId) {
    teacherId = customer.preferredTeacherId.toString();
  }
  if (!teacherId) {
    throw new AppError('Teacher ID is required', 400);
  }

  // Verify teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  // Check for conflicting bookings
  const conflict = await Booking.findOne({
    teacherId,
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    $or: [
      { startTime: { $lt: endTime, $gte: desiredTime } },
      { endTime: { $gt: desiredTime, $lte: endTime } },
      { startTime: { $lte: desiredTime }, endTime: { $gte: endTime } },
    ],
  });

  if (conflict) {
    throw new AppError('This time slot is not available', 409);
  }

  // Create booking request
  const booking = await Booking.create({
    customerId: customer._id,
    teacherId,
    packageId: data.packageId,
    type: data.type,
    startTime: desiredTime,
    endTime,
    status: BookingStatus.PENDING,
    isRequestedByCustomer: true,
    requestCreatedAt: new Date(),
    createdBy: req.user._id,
    notes: data.notes,
  });

  res.status(201).json({
    message: 'Booking request submitted successfully. You will receive confirmation via LINE.',
    booking,
  });
});

export const getMyBookings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  const { status, upcoming } = req.query;

  const query: any = { customerId: customer._id };

  if (status) {
    query.status = status;
  }

  if (upcoming === 'true') {
    query.startTime = { $gte: new Date() };
  }

  const bookings = await Booking.find(query)
    .populate('teacherId', 'userId bio specialties')
    .populate('packageId', 'name type remainingSessions')
    .sort({ startTime: -1 })
    .lean();

  res.json({
    bookings,
  });
});

export const confirmBooking = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = validateSchema(confirmBookingSchema, req.body);

  const booking = await Booking.findById(id).populate('customerId packageId');
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new AppError('Only pending bookings can be confirmed', 400);
  }

  // Update booking details if provided
  if (data.teacherId) {
    const teacher = await Teacher.findById(data.teacherId);
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }
    booking.teacherId = teacher._id;
  }

  if (data.startTime) {
    booking.startTime = parseDate(data.startTime);
  }

  if (data.endTime) {
    booking.endTime = parseDate(data.endTime);
  } else if (data.startTime) {
    // Recalculate end time if start time changed
    booking.endTime = addMinutesToDate(booking.startTime, config.sessionDurationMinutes);
  }

  if (data.notes !== undefined) {
    booking.notes = data.notes;
  }

  // Validate package again
  if (booking.packageId) {
    const packageData = await Package.findById(booking.packageId);
    if (!packageData) {
      throw new AppError('Package not found', 404);
    }

    if (packageData.remainingSessions <= 0) {
      throw new AppError('No sessions remaining in package', 400);
    }

    if (booking.startTime < packageData.validFrom || booking.startTime > packageData.validTo) {
      throw new AppError('Booking time is outside package validity period', 400);
    }
  }

  // Check for conflicts again
  const conflict = await Booking.findOne({
    _id: { $ne: booking._id },
    teacherId: booking.teacherId,
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    $or: [
      { startTime: { $lt: booking.endTime, $gte: booking.startTime } },
      { endTime: { $gt: booking.startTime, $lte: booking.endTime } },
      { startTime: { $lte: booking.startTime }, endTime: { $gte: booking.endTime } },
    ],
  });

  if (conflict) {
    throw new AppError('This time slot is not available', 409);
  }

  // Confirm booking
  booking.status = BookingStatus.CONFIRMED;
  booking.confirmedAt = new Date();
  booking.confirmedBy = req.user!._id;

  await booking.save();

  // Sync to Google Calendar
  try {
    const populatedBooking = await Booking.findById(booking._id)
      .populate('customerId')
      .populate('teacherId')
      .populate('packageId');

    if (populatedBooking) {
      const eventId = await GoogleCalendarService.createEvent(populatedBooking);
      booking.googleCalendarEventId = eventId;
      await booking.save();
    }
  } catch (calendarError: any) {
    // Log error but don't fail the booking
    logger.error('Failed to sync to Google Calendar:', calendarError);
  }

  // Create notification for customer
  const customer = await Customer.findById(booking.customerId).populate('userId');
  if (customer) {
    const teacher = await Teacher.findById(booking.teacherId).populate('userId');

    await Notification.create({
      userId: (customer as any).userId._id,
      channel: NotificationChannel.LINE,
      type: NotificationType.BOOKING_CONFIRMED,
      bookingId: booking._id,
      payload: {
        name: (customer as any).userId.name,
        date: formatStudioTime(booking.startTime, 'PPP'),
        time: formatStudioTime(booking.startTime, 'p'),
        teacher: (teacher as any)?.userId?.name || 'Instructor',
      },
      scheduledFor: new Date(), // Send immediately
    });
  }

  res.json({
    message: 'Booking confirmed successfully',
    booking,
  });
});

export const rejectBooking = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = await Booking.findById(id).populate('customerId');
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new AppError('Only pending bookings can be rejected', 400);
  }

  booking.status = BookingStatus.CANCELLED;
  booking.cancellationReason = reason;
  await booking.save();

  // Create notification for customer
  const customer = await Customer.findById(booking.customerId).populate('userId');
  if (customer) {
    await Notification.create({
      userId: (customer as any).userId._id,
      channel: NotificationChannel.LINE,
      type: NotificationType.BOOKING_REJECTED,
      bookingId: booking._id,
      payload: {
        bookingId: booking._id.toString(),
        reason: reason || 'Not specified',
      },
      scheduledFor: new Date(),
    });
  }

  res.json({
    message: 'Booking rejected',
    booking,
  });
});

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = validateSchema(markAttendanceSchema, req.body);

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new AppError('Only confirmed bookings can have attendance marked', 400);
  }

  booking.status = data.status;
  booking.attendanceMarkedAt = new Date();

  if (data.notes) {
    booking.notes = data.notes;
  }

  // Decrement package sessions if completed or no-show
  if ((data.status === BookingStatus.COMPLETED || data.status === BookingStatus.NO_SHOW) && booking.packageId) {
    const packageData = await Package.findById(booking.packageId);
    if (packageData) {
      packageData.remainingSessions = Math.max(0, packageData.remainingSessions - 1);

      if (packageData.remainingSessions === 0) {
        packageData.status = PackageStatus.USED;
      }

      await packageData.save();
    }
  }

  await booking.save();

  res.json({
    message: 'Attendance marked successfully',
    booking,
  });
});

export const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const { status, teacherId, customerId, from, to } = req.query;

  const query: any = {};

  if (status) {
    query.status = status;
  }

  if (teacherId) {
    query.teacherId = teacherId;
  }

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

  const bookings = await Booking.find(query)
    .populate('customerId', 'userId')
    .populate('teacherId', 'userId bio specialties')
    .populate('packageId', 'name type')
    .sort({ startTime: 1 })
    .lean();

  res.json({
    bookings,
  });
});

export const getPendingBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await Booking.find({ status: BookingStatus.PENDING })
    .populate('customerId', 'userId')
    .populate('teacherId', 'userId bio specialties')
    .populate('packageId', 'name type')
    .sort({ requestCreatedAt: 1 })
    .lean();

  res.json({
    bookings,
  });
});
