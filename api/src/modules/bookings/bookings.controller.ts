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
import { NotificationService } from '@/services/notificationService';

// Validation schemas
const bookingRequestSchema = z.object({
  teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  desiredTime: z.string().datetime(),
  durationMinutes: z.number().int().positive().optional(),
  type: z.enum([PackageType.PRIVATE, PackageType.GROUP, PackageType.DUO]),
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

    // Calculate package status dynamically before checking
    // Count completed sessions (COMPLETED, NO_SHOW, and past CONFIRMED sessions)
    const completedCount = await Booking.countDocuments({
      packageId: data.packageId,
      $or: [
        { status: { $in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW] } },
        { status: BookingStatus.CONFIRMED, endTime: { $lt: new Date() } }
      ],
    });

    // Calculate current package status
    const now = new Date();
    const validTo = new Date(packageData.validTo);
    let currentStatus = packageData.status;

    if (validTo <= now) {
      currentStatus = PackageStatus.EXPIRED;
    } else if (completedCount >= packageData.totalSessions) {
      currentStatus = PackageStatus.USED;
    } else if (validTo > now) {
      currentStatus = PackageStatus.ACTIVE;
    }

    if (currentStatus !== PackageStatus.ACTIVE) {
      throw new AppError('Package is not active', 400);
    }

    // Count upcoming sessions (PENDING or CONFIRMED sessions that haven't ended yet)
    const upcomingCount = await Booking.countDocuments({
      packageId: data.packageId,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      endTime: { $gte: new Date() },
    });

    // Calculate available sessions: Total - Completed - Upcoming
    const availableSessions = packageData.totalSessions - completedCount - upcomingCount;

    if (availableSessions <= 0) {
      throw new AppError(
        'No sessions remaining in this package. All sessions are either completed or already booked.',
        400
      );
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

  // Check for conflicting bookings using our complex availability logic
  // 1. Check if THIS customer already has a booking at this time
  const customerConflict = await Booking.findOne({
    customerId: customer._id,
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    $or: [
      { startTime: { $lt: endTime, $gte: desiredTime } },
      { endTime: { $gt: desiredTime, $lte: endTime } },
      { startTime: { $lte: desiredTime }, endTime: { $gte: endTime } },
    ],
  });

  if (customerConflict) {
    throw new AppError('You already have a booking at this time', 409);
  }

  // 2. Check if THIS teacher already has a booking at this time
  const teacherConflict = await Booking.findOne({
    teacherId,
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    $or: [
      { startTime: { $lt: endTime, $gte: desiredTime } },
      { endTime: { $gt: desiredTime, $lte: endTime } },
      { startTime: { $lte: desiredTime }, endTime: { $gte: endTime } },
    ],
  });

  if (teacherConflict) {
    throw new AppError('This teacher is already booked at this time', 409);
  }

  // 3. Check for OTHER teachers' bookings in this slot
  // IMPORTANT: Exclude BLOCKED bookings - they are teacher-specific and don't affect studio capacity
  const otherBookings = await Booking.find({
    teacherId: { $ne: teacherId }, // Exclude the selected teacher
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    type: { $ne: PackageType.BLOCKED }, // Exclude blocked bookings - they don't affect capacity
    $or: [
      { startTime: { $lt: endTime, $gte: desiredTime } },
      { endTime: { $gt: desiredTime, $lte: endTime } },
      { startTime: { $lte: desiredTime }, endTime: { $gte: endTime } },
    ],
  });

  // Check if any other booking is GROUP type - blocks everything
  const hasGroupSession = otherBookings.some((b) => b.type === PackageType.GROUP);
  if (hasGroupSession) {
    throw new AppError('This time slot is blocked by a group session', 409);
  }

  // Count unique OTHER teachers
  const uniqueOtherTeachers = new Set(otherBookings.map((b) => b.teacherId.toString()));
  if (uniqueOtherTeachers.size >= 2) {
    throw new AppError('This time slot is at maximum capacity (2 teachers)', 409);
  }

  // If there's 1 other teacher with PRIVATE/DUO, check if current booking is also PRIVATE/DUO
  if (uniqueOtherTeachers.size === 1) {
    if (data.type === PackageType.GROUP) {
      throw new AppError('Cannot book a group session when another teacher is already booked', 409);
    }
    // PRIVATE or DUO is allowed - continue
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

  // Notify teacher about the new booking request
  try {
    const teacherData = await Teacher.findById(teacherId).populate('userId');
    if (teacherData) {
      await NotificationService.notifyTeacherOfBookingRequest({
        teacherId: (teacherData as any).userId._id,
        customerName: req.user.name,
        bookingDate: desiredTime,
        bookingType: data.type,
        bookingId: booking._id,
      });
    }
  } catch (notificationError) {
    logger.error('Failed to send notification to teacher:', notificationError);
  }

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
    .populate({
      path: 'teacherId',
      select: 'userId bio specialties',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
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

  // Deduct session from package when booking is confirmed (reserve the session)
  if (booking.packageId) {
    const packageData = await Package.findById(booking.packageId);
    if (packageData) {
      packageData.remainingSessions -= 1;
      // Note: We don't update status here - it's calculated dynamically when fetching packages
      // based on completedCount, not remainingSessions
      await packageData.save();
    }
  }

  // Sync to Google Calendar
  try {
    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'customerId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate({
        path: 'teacherId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('packageId');

    if (populatedBooking) {
      const eventId = await GoogleCalendarService.createEvent(populatedBooking);

      if (eventId) {
        booking.googleCalendarEventId = eventId;
        await booking.save();
      }
    }
  } catch (calendarError: any) {
    // Log error but don't fail the booking
    logger.error('Failed to sync to Google Calendar:', calendarError);
  }

  // Create notification for customer (LINE notification)
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

    // Also send in-app notification about booking approval
    try {
      await NotificationService.notifyCustomerOfBookingApproval({
        customerId: (customer as any).userId._id,
        bookingDate: booking.startTime,
        bookingId: booking._id,
        teacherName: (teacher as any)?.userId?.name || 'Instructor',
      });
    } catch (notificationError) {
      logger.error('Failed to send in-app notification to customer:', notificationError);
    }
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

  // Create notification for customer (LINE notification)
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

    // Also send in-app notification about booking rejection
    try {
      await NotificationService.notifyCustomerOfBookingRejection({
        customerId: (customer as any).userId._id,
        bookingDate: booking.startTime,
        bookingId: booking._id,
        reason: reason,
      });
    } catch (notificationError) {
      logger.error('Failed to send in-app notification to customer:', notificationError);
    }
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

  // Convert NO_SHOW to CANCELLED and increment cancellation count
  if (data.status === BookingStatus.NO_SHOW) {
    booking.status = BookingStatus.CANCELLED;

    // Increment customer's cancellation count
    if (booking.customerId) {
      await Customer.findByIdAndUpdate(booking.customerId, {
        $inc: { totalCancellations: 1 }
      });
    }
  } else {
    booking.status = data.status;
  }

  booking.attendanceMarkedAt = new Date();

  if (data.notes) {
    booking.notes = data.notes;
  }

  // Handle package session refund for cancellation
  // Sessions are deducted when CONFIRMED, so we need to refund if cancelled
  const previousStatus = booking.status;

  if (data.status === BookingStatus.CANCELLED &&
      previousStatus === BookingStatus.CONFIRMED &&
      booking.packageId) {
    const packageData = await Package.findById(booking.packageId);
    if (packageData) {
      // Refund the session back to the package
      packageData.remainingSessions += 1;

      // Note: We don't update status here - it's calculated dynamically when fetching packages
      // When the cancelled booking is no longer counted in completedCount, status will update automatically

      await packageData.save();
    }
  }

  await booking.save();

  res.json({
    message: 'Attendance marked successfully',
    booking,
  });
});

// Convenience endpoint: Mark as complete
export const markComplete = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new AppError('Only confirmed bookings can be marked as complete', 400);
  }

  booking.status = BookingStatus.COMPLETED;
  booking.attendanceMarkedAt = new Date();
  await booking.save();

  res.json({
    message: 'Session marked as complete successfully',
    booking,
  });
});

// Convenience endpoint: Mark as no-show
export const markNoShow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new AppError('Only confirmed bookings can be marked as no-show', 400);
  }

  // Mark as no-show (customer didn't attend, session is consumed)
  booking.status = BookingStatus.NO_SHOW;
  booking.attendanceMarkedAt = new Date();
  await booking.save();

  res.json({
    message: 'Session marked as no-show successfully',
    booking,
  });
});

export const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const { status, teacherId, customerId, from, to, autoConfirmed } = req.query;

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

  if (autoConfirmed === 'true') {
    query.autoConfirmed = true;
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
    .populate({
      path: 'customerId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .populate({
      path: 'teacherId',
      select: 'userId bio specialties',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .populate('packageId', 'name type')
    .sort({ startTime: -1 })
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

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, from, to } = req.query;

  logger.info('getAvailability called', {
    teacherId,
    from,
    to,
  });

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (!from || !to) {
    throw new AppError('Date range (from and to) is required', 400);
  }

  const startTime = new Date(from as string);
  const endTime = new Date(to as string);

  // Get current customer (optional - teachers don't have customer profiles)
  const customer = await Customer.findOne({ userId: req.user._id });

  // If no teacherId provided, return studio-wide availability (for teachers booking for students)
  if (!teacherId) {
    logger.info('Fetching studio-wide availability (no teacherId provided)');

    const bookings = await Booking.find({
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    })
      .select('startTime endTime status type customerId teacherId')
      .populate({
        path: 'customerId',
        select: 'userId',
        populate: {
          path: 'userId',
          select: 'name',
        },
      })
      .populate({
        path: 'teacherId',
        select: 'userId',
        populate: {
          path: 'userId',
          select: 'name',
        },
      })
      .sort({ startTime: 1 })
      .lean();

    // Group by time slot
    const timeSlotMap = new Map<string, any[]>();
    bookings.forEach((booking) => {
      const slotKey = `${new Date(booking.startTime).toISOString()}_${new Date(booking.endTime).toISOString()}`;
      if (!timeSlotMap.has(slotKey)) {
        timeSlotMap.set(slotKey, []);
      }
      timeSlotMap.get(slotKey)!.push(booking);
    });

    // Calculate availability for studio-wide view
    const availabilitySlots = Array.from(timeSlotMap.entries()).map(([slotKey, slotBookings]) => {
      const [startTimeStr, endTimeStr] = slotKey.split('_');

      // For studio-wide, check capacity across all teachers
      const teacherBookings = slotBookings.filter((b) => b.type !== PackageType.BLOCKED);
      const uniqueTeachers = new Set(
        teacherBookings
          .filter((b) => b.teacherId && b.teacherId._id)
          .map((b) => b.teacherId._id.toString())
      );

      const hasGroupSession = slotBookings.some((b) => b.type === 'group');
      const teacherCount = uniqueTeachers.size;

      let status: 'available' | 'partial' | 'blocked';
      let allowedTypes: string[] = [];
      let blockReason: string | undefined;

      if (hasGroupSession) {
        status = 'blocked';
        allowedTypes = [];
        blockReason = 'Group session in progress';
      } else if (teacherCount >= 2) {
        status = 'blocked';
        allowedTypes = [];
        blockReason = 'Maximum capacity (2 teachers)';
      } else if (teacherCount === 1) {
        status = 'partial';
        allowedTypes = ['private', 'duo'];
      } else {
        status = 'available';
        allowedTypes = ['private', 'duo', 'group'];
      }

      return {
        startTime: startTimeStr,
        endTime: endTimeStr,
        status,
        bookings: slotBookings.map((b) => ({
          type: b.type,
          teacherName: b.teacherId?.userId?.name || 'Unknown',
          customerName: b.customerId?.userId?.name || 'Unknown',
        })),
        teacherCount,
        allowedTypes,
        blockReason,
      };
    });

    logger.info('Studio-wide availability calculated', {
      totalSlots: availabilitySlots.length,
    });

    return res.json({
      slots: availabilitySlots,
      bookings,
    });
  }

  // Verify teacher exists
  const teacher = await Teacher.findById(teacherId as string).populate('userId');
  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  logger.info('Fetching ALL confirmed and pending bookings for availability check', {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });

  // Fetch ALL CONFIRMED AND PENDING bookings that overlap with the date range (not just for selected teacher)
  // Pending bookings are included to reserve the slot until teacher approves/rejects
  // This is needed to check if 2 teachers are already booked or if there's a group session
  // A booking overlaps if: booking.startTime < endTime AND booking.endTime > startTime
  // INCLUDE BLOCKED bookings - customers should see blocked time as unavailable for that teacher
  const bookings = await Booking.find({
    status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  })
    .select('startTime endTime status type customerId teacherId')
    .populate({
      path: 'customerId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'name',
      },
    })
    .populate({
      path: 'teacherId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'name',
      },
    })
    .sort({ startTime: 1 })
    .lean();

  logger.info('Found confirmed and pending bookings', {
    count: bookings.length,
    bookings,
  });

  // Fetch Google Calendar busy times from the studio calendar (shared by all)
  logger.info('Fetching Google Calendar busy times');
  const googleBusyTimes = await GoogleCalendarService.getBusyTimes(
    startTime,
    endTime
  );

  logger.info('Received Google Calendar busy times', {
    count: googleBusyTimes.length,
    busyTimes: googleBusyTimes,
  });

  // Convert Google Calendar busy times to booking-like format
  const googleCalendarBlocks = googleBusyTimes.map((busySlot) => ({
    startTime: busySlot.start,
    endTime: busySlot.end,
    status: 'confirmed',
    type: busySlot.type || 'blocked',
    teacherId: busySlot.teacher ? { userId: { name: busySlot.teacher } } : undefined,
  }));

  logger.info('Converted Google Calendar blocks', {
    count: googleCalendarBlocks.length,
    blocks: googleCalendarBlocks,
  });

  // Combine database bookings with Google Calendar blocks
  // We need both: DB for confirmed bookings, Calendar for manually blocked times
  // BUT we need to deduplicate them by checking if they're the same booking
  const bookingIds = new Set(bookings.map((b) => b._id?.toString()).filter(Boolean));

  // Filter out Google Calendar blocks that are already in the database
  const uniqueGoogleBlocks = googleCalendarBlocks.filter((gcBlock) => {
    // Google Calendar blocks don't have _id, so they're unique
    // OR if they do have teacherId that matches a DB booking, skip them
    const matchesDbBooking = bookings.some((dbBooking) => {
      const sameTime =
        new Date(dbBooking.startTime).getTime() === new Date(gcBlock.startTime).getTime() &&
        new Date(dbBooking.endTime).getTime() === new Date(gcBlock.endTime).getTime();

      const sameTeacher =
        dbBooking.teacherId?.userId?.name === gcBlock.teacherId?.userId?.name;

      return sameTime && sameTeacher;
    });

    return !matchesDbBooking; // Keep only if it doesn't match a DB booking
  });

  const allBookings = [...bookings, ...uniqueGoogleBlocks];

  logger.info('Deduplication results', {
    dbBookings: bookings.length,
    googleBlocks: googleCalendarBlocks.length,
    uniqueGoogleBlocks: uniqueGoogleBlocks.length,
    totalBookings: allBookings.length,
  });

  // Group bookings by time slot and determine availability
  const timeSlotMap = new Map<string, any[]>();

  allBookings.forEach((booking) => {
    const slotKey = `${new Date(booking.startTime).toISOString()}_${new Date(booking.endTime).toISOString()}`;
    if (!timeSlotMap.has(slotKey)) {
      timeSlotMap.set(slotKey, []);
    }
    timeSlotMap.get(slotKey)!.push(booking);
  });

  // Calculate availability status for each time slot
  const availabilitySlots = Array.from(timeSlotMap.entries()).map(([slotKey, slotBookings]) => {
    const [startTimeStr, endTimeStr] = slotKey.split('_');

    // FIRST CHECK: Does the current customer already have a booking in this slot? (only if customer exists)
    if (customer) {
      const customerHasBooking = slotBookings.some(
        (b) => b.customerId && b.customerId._id && b.customerId._id.toString() === customer._id.toString()
      );

      // If customer already has a booking in this slot, they can't book again - show as blocked
      if (customerHasBooking) {
        return {
          startTime: startTimeStr,
          endTime: endTimeStr,
          status: 'blocked' as const,
          bookings: slotBookings.map((b) => ({
            type: b.type,
            teacherName: b.teacherId?.userId?.name || 'Unknown',
            customerName: b.customerId?.userId?.name || 'Unknown',
          })),
          teacherCount: slotBookings.length,
          allowedTypes: [],
          blockReason: 'You already have a booking at this time',
        };
      }
    }

    // SECOND CHECK: Does the selected teacher already have a booking in this slot?
    const selectedTeacherHasBooking = slotBookings.some(
      (b) => b.teacherId && b.teacherId._id && b.teacherId._id.toString() === teacherId
    );

    // If selected teacher already has a booking, they can't book again - show as blocked
    if (selectedTeacherHasBooking) {
      // Check if this is a blocked time slot for better messaging
      const teacherBooking = slotBookings.find(
        (b) => b.teacherId && b.teacherId._id && b.teacherId._id.toString() === teacherId
      );
      const isBlocked = teacherBooking?.type === PackageType.BLOCKED;
      const teacherName = teacherBooking?.teacherId?.userId?.name || 'Teacher';

      return {
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'blocked' as const,
        bookings: slotBookings.map((b) => ({
          type: b.type,
          teacherName: b.teacherId?.userId?.name || 'Unknown',
          customerName: b.customerId?.userId?.name || 'Unknown',
        })),
        teacherCount: 1,
        allowedTypes: [],
        blockReason: isBlocked ? `${teacherName} unavailable` : 'Teacher already booked for this time',
      };
    }

    // Count bookings from OTHER teachers (not the selected one)
    // IMPORTANT: Exclude BLOCKED bookings from other teachers - they only affect the teacher who blocked them
    const otherTeacherBookings = slotBookings.filter(
      (b) =>
        b.teacherId &&
        b.teacherId._id &&
        b.teacherId._id.toString() !== teacherId &&
        b.type !== PackageType.BLOCKED // Blocked bookings are teacher-specific
    );

    // Check for GROUP sessions - they block everything
    const hasGroupSession = otherTeacherBookings.some((b) => b.type === 'group');

    // Count unique OTHER teachers in this slot
    const uniqueTeachers = new Set(
      otherTeacherBookings
        .filter((b) => b.teacherId && b.teacherId._id)
        .map((b) => b.teacherId._id.toString())
    );
    const otherTeacherCount = uniqueTeachers.size;

    // Determine availability status and allowed types
    let status: 'available' | 'partial' | 'blocked';
    let allowedTypes: string[] = [];
    let blockReason: string | undefined;

    if (hasGroupSession) {
      // GROUP session blocks everything
      status = 'blocked';
      allowedTypes = [];
      blockReason = 'Group session in progress';
    } else if (otherTeacherCount >= 2) {
      // 2 OTHER teachers already booked - blocked for this teacher
      status = 'blocked';
      allowedTypes = [];
      blockReason = 'Maximum capacity (2 teachers)';
    } else if (otherTeacherCount === 1) {
      // 1 OTHER teacher booked with PRIVATE or DUO - this teacher can book PRIVATE/DUO only
      status = 'partial';
      allowedTypes = ['private', 'duo'];
      blockReason = undefined;
    } else {
      // No other teachers - fully available
      status = 'available';
      allowedTypes = ['private', 'duo', 'group'];
      blockReason = undefined;
    }

    // Include ALL bookings in the slot for display purposes (including blocked bookings from other teachers)
    // But use otherTeacherBookings (which excludes blocked bookings) for capacity calculations
    return {
      startTime: startTimeStr,
      endTime: endTimeStr,
      status,
      bookings: slotBookings
        .filter((b) => b.teacherId && b.teacherId._id && b.teacherId._id.toString() !== teacherId) // All other teachers' bookings
        .map((b) => ({
          type: b.type,
          teacherName: b.teacherId?.userId?.name || 'Unknown',
          customerName: b.customerId?.userId?.name || 'Unknown',
        })),
      teacherCount: otherTeacherCount,
      allowedTypes,
      blockReason,
    };
  });

  logger.info('Calculated availability slots', {
    totalSlots: availabilitySlots.length,
    availabilitySlots,
  });

  res.json({
    slots: availabilitySlots,
    bookings: allBookings, // Keep for backwards compatibility
  });
});

// Request cancellation (Customer)
export const requestCancellation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const booking = await Booking.findById(id)
    .populate({
      path: 'customerId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('packageId');

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  // Verify the booking belongs to the customer
  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer || booking.customerId._id.toString() !== customer._id.toString()) {
    throw new AppError('You can only cancel your own bookings', 403);
  }

  // Only confirmed bookings can have cancellation requested
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new AppError('Only confirmed bookings can be cancelled', 400);
  }

  // Check time remaining until booking
  const now = new Date();
  const hoursUntilBooking = (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilBooking < 0) {
    throw new AppError('Cannot cancel a booking that has already started', 400);
  }

  if (hoursUntilBooking < 6) {
    throw new AppError('Cannot cancel within 6 hours of the scheduled time', 400);
  }

  if (hoursUntilBooking >= 12) {
    // More than 12 hours - cancel directly without approval
    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = reason || 'Cancelled by customer';
    await booking.save();

    // Refund session to package
    if (booking.packageId) {
      const pkg = await Package.findById(booking.packageId._id);
      if (pkg) {
        pkg.remainingSessions += 1;
        await pkg.save();
      }
    }

    // Delete Google Calendar event
    try {
      if (booking.googleCalendarEventId) {
        await GoogleCalendarService.deleteEvent(booking);
      }
    } catch (calendarError) {
      logger.error('Failed to delete Google Calendar event:', calendarError);
    }

    // Notify teacher about the cancellation
    try {
      const teacher = booking.teacherId as any;
      const customerData = booking.customerId as any;
      await NotificationService.notifyTeacherOfCancellation({
        teacherId: teacher.userId._id,
        customerName: customerData.userId.name,
        bookingDate: booking.startTime,
        bookingId: booking._id,
        reason: reason,
      });
    } catch (notificationError) {
      logger.error('Failed to send notification to teacher:', notificationError);
    }

    res.json({
      message: 'Booking cancelled successfully. Session refunded to your package.',
      booking,
    });
  } else {
    // Between 6-12 hours - requires teacher approval
    booking.status = BookingStatus.CANCELLATION_REQUESTED;
    booking.cancellationReason = reason || 'Customer requested cancellation';
    await booking.save();

    // Notify teacher about the cancellation request
    try {
      const teacher = booking.teacherId as any;
      const customerData = booking.customerId as any;
      await NotificationService.notifyTeacherOfCancellationRequest({
        teacherId: teacher.userId._id,
        customerName: customerData.userId.name,
        bookingDate: booking.startTime,
        bookingId: booking._id,
        reason: reason,
      });
    } catch (notificationError) {
      logger.error('Failed to send notification to teacher:', notificationError);
    }

    res.json({
      message: 'Cancellation request submitted. Waiting for teacher approval.',
      booking,
    });
  }
});

// Approve cancellation (Teacher)
export const approveCancellation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate({
      path: 'customerId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('packageId');

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== BookingStatus.CANCELLATION_REQUESTED) {
    throw new AppError('No cancellation request found for this booking', 400);
  }

  // Cancel the booking
  booking.status = BookingStatus.CANCELLED;
  await booking.save();

  // Return session back to package (only if booking was confirmed)
  if (booking.packageId) {
    const packageData = await Package.findById(booking.packageId);
    if (packageData) {
      // Only add back if we don't exceed total sessions (safety check)
      if (packageData.remainingSessions < packageData.totalSessions) {
        packageData.remainingSessions += 1;
        // Note: We don't update status here - it's calculated dynamically when fetching packages
        await packageData.save();
      }
    }
  }

  // Delete from Google Calendar
  try {
    await GoogleCalendarService.deleteEvent(booking);
  } catch (calendarError: any) {
    logger.error('Failed to delete from Google Calendar:', calendarError);
  }

  // Increment customer's cancellation count
  if (booking.customerId) {
    await Customer.findByIdAndUpdate(booking.customerId, {
      $inc: { totalCancellations: 1 }
    });
  }

  // Notify customer that their cancellation request was approved
  try {
    const customerData = booking.customerId as any;
    await NotificationService.notifyCustomerOfCancellationApproval({
      customerId: customerData.userId._id,
      bookingDate: booking.startTime,
      bookingId: booking._id,
    });
  } catch (notificationError) {
    logger.error('Failed to send notification to customer:', notificationError);
  }

  res.json({
    message: 'Cancellation approved and booking cancelled',
    booking,
  });
});

// Reject cancellation (Teacher)
export const rejectCancellation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status !== BookingStatus.CANCELLATION_REQUESTED) {
    throw new AppError('No cancellation request found for this booking', 400);
  }

  // Revert status back to confirmed
  booking.status = BookingStatus.CONFIRMED;
  booking.cancellationReason = undefined;
  if (reason) {
    booking.notes = `Cancellation rejected: ${reason}`;
  }
  await booking.save();

  // Notify customer that their cancellation request was rejected
  try {
    const fullBooking = await Booking.findById(id)
      .populate({
        path: 'customerId',
        populate: { path: 'userId' }
      });

    if (fullBooking) {
      const customerData = fullBooking.customerId as any;
      await NotificationService.notifyCustomerOfCancellationRejection({
        customerId: customerData.userId._id,
        bookingDate: fullBooking.startTime,
        bookingId: fullBooking._id,
        reason: reason,
      });
    }
  } catch (notificationError) {
    logger.error('Failed to send notification to customer:', notificationError);
  }

  res.json({
    message: 'Cancellation request rejected, booking remains confirmed',
    booking,
  });
});

// Block time validation schema
const blockTimeSchema = z.object({
  teacherId: z.string().optional(), // Optional because teachers use their own ID
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  blockReason: z.string().optional(),
  recurring: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly']).optional(),
    until: z.string().datetime().optional(),
  }).optional(),
});

// Block time (Teacher/Admin)
export const blockTime = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const data = validateSchema(blockTimeSchema, req.body);

  // Get teacher info
  let teacherId;
  if (req.user.role === UserRole.TEACHER) {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      throw new AppError('Teacher profile not found', 404);
    }
    teacherId = teacher._id;
  } else if (req.user.role === UserRole.ADMIN) {
    // Admin can block for any teacher
    teacherId = req.body.teacherId;
    if (!teacherId) {
      throw new AppError('Teacher ID is required for admin', 400);
    }
  } else {
    throw new AppError('Only teachers and admins can block time', 403);
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  // Validate times
  if (endTime <= startTime) {
    throw new AppError('End time must be after start time', 400);
  }

  // Check for overlapping bookings
  const overlappingBookings = await Booking.find({
    teacherId,
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

  if (overlappingBookings.length > 0) {
    throw new AppError(`Cannot block time: ${overlappingBookings.length} existing booking(s) in this time range`, 400);
  }

  // Create blocked bookings
  const blockedBookings = [];

  // Calculate hours in the time range
  const hoursDiff = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));

  if (data.recurring?.enabled) {
    // Create recurring blocks
    const frequency = data.recurring.frequency;
    const until = data.recurring.until ? new Date(data.recurring.until) : addMinutesToDate(startTime, 90 * 24 * 60); // 90 days default

    let currentStart = new Date(startTime);
    let currentEnd = new Date(endTime);

    while (currentStart <= until) {
      // Create separate 1-hour blocks for each hour in the range
      for (let i = 0; i < hoursDiff; i++) {
        const blockStart = addMinutesToDate(currentStart, i * 60);
        const blockEnd = addMinutesToDate(currentStart, (i + 1) * 60);

        const block = await Booking.create({
          teacherId,
          startTime: blockStart,
          endTime: blockEnd,
          type: PackageType.BLOCKED,
          status: BookingStatus.CONFIRMED,
          notes: data.blockReason || 'Time blocked',
          customerId: null,
          packageId: null,
        });
        blockedBookings.push(block);
      }

      // Move to next occurrence
      if (frequency === 'daily') {
        currentStart = addMinutesToDate(currentStart, 24 * 60);
        currentEnd = addMinutesToDate(currentEnd, 24 * 60);
      } else if (frequency === 'weekly') {
        currentStart = addMinutesToDate(currentStart, 7 * 24 * 60);
        currentEnd = addMinutesToDate(currentEnd, 7 * 24 * 60);
      }
    }
  } else {
    // Single block - create separate 1-hour blocks for each hour
    for (let i = 0; i < hoursDiff; i++) {
      const blockStart = addMinutesToDate(startTime, i * 60);
      const blockEnd = addMinutesToDate(startTime, (i + 1) * 60);

      const block = await Booking.create({
        teacherId,
        startTime: blockStart,
        endTime: blockEnd,
        type: PackageType.BLOCKED,
        status: BookingStatus.CONFIRMED,
        notes: data.blockReason || 'Time blocked',
        customerId: null,
        packageId: null,
      });
      blockedBookings.push(block);
    }
  }

  res.json({
    message: `Successfully blocked ${blockedBookings.length} time slot(s)`,
    blocks: blockedBookings,
  });
});

// Unblock time (Teacher/Admin)
export const unblockTime = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError('Block not found', 404);
  }

  if (booking.type !== PackageType.BLOCKED) {
    throw new AppError('This is not a blocked time slot', 400);
  }

  // Verify permissions
  if (req.user.role === UserRole.TEACHER) {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher || booking.teacherId.toString() !== teacher._id.toString()) {
      throw new AppError('You can only unblock your own time', 403);
    }
  }

  await Booking.findByIdAndDelete(id);

  res.json({
    message: 'Time slot unblocked successfully',
  });
});

// Get all blocked times for a teacher
export const getBlockedTimes = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, from, to } = req.query;

  if (!teacherId) {
    throw new AppError('Teacher ID is required', 400);
  }

  const query: any = {
    teacherId,
    type: PackageType.BLOCKED,
    status: BookingStatus.CONFIRMED,
  };

  if (from || to) {
    query.startTime = {};
    if (from) {
      query.startTime.$gte = new Date(from as string);
    }
    if (to) {
      query.startTime.$lte = new Date(to as string);
    }
  }

  const blocks = await Booking.find(query)
    .populate({
      path: 'teacherId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    })
    .sort({ startTime: 1 });

  res.json({
    blocks,
  });
});

// Cancel booking (teacher-initiated cancellation)
export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  const booking = await Booking.findById(id).populate('customerId');
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  // Check authorization: customers can only cancel their own bookings
  if (req.user?.role === UserRole.CUSTOMER) {
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer || booking.customerId._id.toString() !== customer._id.toString()) {
      throw new AppError('You can only cancel your own bookings', 403);
    }
    // Customers can only cancel PENDING bookings directly (not CONFIRMED ones)
    if (booking.status !== BookingStatus.PENDING) {
      throw new AppError('You can only cancel pending booking requests. For confirmed bookings, please use the cancellation request feature.', 400);
    }
  }

  // Only allow cancelling confirmed or pending bookings
  if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
    throw new AppError('Only confirmed or pending bookings can be cancelled', 400);
  }

  const previousStatus = booking.status;

  // Update booking status
  booking.status = BookingStatus.CANCELLED;
  booking.cancellationReason = cancellationReason || (req.user?.role === UserRole.CUSTOMER ? 'Cancelled by customer' : 'Cancelled by teacher');
  await booking.save();

  // Refund session if it was confirmed (session was already deducted)
  if (previousStatus === BookingStatus.CONFIRMED && booking.packageId) {
    const packageData = await Package.findById(booking.packageId);
    if (packageData) {
      packageData.remainingSessions += 1;

      // Note: We don't update status here - it's calculated dynamically when fetching packages

      await packageData.save();
    }
  }

  // Send notification to customer
  try {
    await NotificationService.sendNotification({
      userId: (await Customer.findById(booking.customerId))!.userId,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Session Cancelled',
      message: `Your session has been cancelled. Reason: ${booking.cancellationReason}`,
      channel: NotificationChannel.LINE,
      metadata: {
        bookingId: booking._id.toString(),
        reason: booking.cancellationReason,
      },
    });
  } catch (error) {
    logger.error('Failed to send cancellation notification:', error);
  }

  res.json({
    message: 'Booking cancelled successfully',
    booking,
  });
});
