import { Request, Response } from 'express';
import { Teacher, Booking } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';
import { toStudioTime } from '@/utils/time';
import { startOfDay, endOfDay } from 'date-fns';

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
  })
    .populate('customerId', 'userId healthNotes')
    .populate('packageId', 'name type')
    .sort({ startTime: 1 })
    .lean();

  res.json({
    sessions,
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

  const { from, to } = req.query;

  const query: any = { teacherId: teacher._id };

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
    .populate('customerId', 'userId healthNotes')
    .populate('packageId', 'name type')
    .sort({ startTime: 1 })
    .lean();

  res.json({
    sessions,
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
