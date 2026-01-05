import { Request, Response } from 'express';
import { Bonus, Teacher, User } from '@/models';
import { asyncHandler } from '@/middlewares';
import { logger } from '@/config/logger';
import { UserRole } from '@/types';

/**
 * Create a new bonus
 * POST /api/admin/bonuses
 */
export const createBonus = asyncHandler(async (req: Request, res: Response) => {
  const {
    teacherId,
    amount,
    reason,
    type,
    month,
    year,
    status,
    notes,
  } = req.body;

  // Validate required fields
  if (!teacherId || !amount || !reason || !month || !year) {
    res.status(400).json({
      error: 'Missing required fields: teacherId, amount, reason, month, year',
    });
    return;
  }

  // Validate teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    res.status(404).json({ error: 'Teacher not found' });
    return;
  }

  // Validate month and year
  if (month < 1 || month > 12) {
    res.status(400).json({ error: 'Month must be between 1 and 12' });
    return;
  }

  if (year < 2020 || year > 2100) {
    res.status(400).json({ error: 'Invalid year' });
    return;
  }

  // Validate amount
  if (amount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0' });
    return;
  }

  const bonus = await Bonus.create({
    teacherId,
    amount,
    reason,
    type: type || 'one-time',
    month,
    year,
    status: status || 'approved',
    approvedBy: req.user!._id,
    notes,
  });

  logger.info(`Bonus created: ${bonus._id} for teacher ${teacherId}`);

  res.status(201).json(bonus);
});

/**
 * Get all bonuses with optional filters
 * GET /api/admin/bonuses
 * Query params: teacherId, month, year, type, status
 */
export const getBonuses = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, month, year, type, status } = req.query;

  const filter: any = {};

  if (teacherId) {
    filter.teacherId = teacherId;
  }

  if (month) {
    filter.month = parseInt(month as string);
  }

  if (year) {
    filter.year = parseInt(year as string);
  }

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  const bonuses = await Bonus.find(filter)
    .populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    })
    .populate('approvedBy', 'name email')
    .sort({ year: -1, month: -1, createdAt: -1 });

  res.json(bonuses);
});

/**
 * Get bonus by ID
 * GET /api/admin/bonuses/:id
 */
export const getBonusById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const bonus = await Bonus.findById(id)
    .populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .populate('approvedBy', 'name email');

  if (!bonus) {
    res.status(404).json({ error: 'Bonus not found' });
    return;
  }

  res.json(bonus);
});

/**
 * Update bonus
 * PATCH /api/admin/bonuses/:id
 */
export const updateBonus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    amount,
    reason,
    type,
    month,
    year,
    status,
    notes,
  } = req.body;

  const bonus = await Bonus.findById(id);

  if (!bonus) {
    res.status(404).json({ error: 'Bonus not found' });
    return;
  }

  // Validate month if provided
  if (month !== undefined && (month < 1 || month > 12)) {
    res.status(400).json({ error: 'Month must be between 1 and 12' });
    return;
  }

  // Validate year if provided
  if (year !== undefined && (year < 2020 || year > 2100)) {
    res.status(400).json({ error: 'Invalid year' });
    return;
  }

  // Validate amount if provided
  if (amount !== undefined && amount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0' });
    return;
  }

  // Update fields
  if (amount !== undefined) bonus.amount = amount;
  if (reason !== undefined) bonus.reason = reason;
  if (type !== undefined) bonus.type = type;
  if (month !== undefined) bonus.month = month;
  if (year !== undefined) bonus.year = year;
  if (status !== undefined) bonus.status = status;
  if (notes !== undefined) bonus.notes = notes;

  await bonus.save();

  logger.info(`Bonus updated: ${bonus._id}`);

  const updatedBonus = await Bonus.findById(id)
    .populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    })
    .populate('approvedBy', 'name email');

  res.json(updatedBonus);
});

/**
 * Delete bonus
 * DELETE /api/admin/bonuses/:id
 */
export const deleteBonus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const bonus = await Bonus.findById(id);

  if (!bonus) {
    res.status(404).json({ error: 'Bonus not found' });
    return;
  }

  await Bonus.findByIdAndDelete(id);

  logger.info(`Bonus deleted: ${id}`);

  res.json({ message: 'Bonus deleted successfully' });
});

/**
 * Get bonuses for a specific teacher and optional period
 * GET /api/admin/bonuses/teacher/:teacherId
 * Query params: month, year
 */
export const getTeacherBonuses = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = req.params;
  const { month, year } = req.query;

  // Validate teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    res.status(404).json({ error: 'Teacher not found' });
    return;
  }

  const filter: any = { teacherId };

  if (month) {
    filter.month = parseInt(month as string);
  }

  if (year) {
    filter.year = parseInt(year as string);
  }

  const bonuses = await Bonus.find(filter)
    .populate('approvedBy', 'name email')
    .sort({ year: -1, month: -1, createdAt: -1 });

  res.json(bonuses);
});

/**
 * Get total bonuses for a teacher in a specific period
 * GET /api/admin/bonuses/teacher/:teacherId/total
 * Query params: month (required), year (required)
 */
export const getTeacherBonusTotal = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = req.params;
  const { month, year } = req.query;

  if (!month || !year) {
    res.status(400).json({ error: 'Month and year are required' });
    return;
  }

  // Validate teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    res.status(404).json({ error: 'Teacher not found' });
    return;
  }

  const bonuses = await Bonus.find({
    teacherId,
    month: parseInt(month as string),
    year: parseInt(year as string),
    status: { $in: ['approved', 'paid'] }, // Only count approved or paid bonuses
  });

  const total = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

  res.json({
    teacherId,
    month: parseInt(month as string),
    year: parseInt(year as string),
    total,
    bonuses,
  });
});
