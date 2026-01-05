import { Request, Response } from 'express';
import { SessionReview, Booking, Teacher, Customer } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';
import { BookingStatus, CreateReviewRequest } from '@/types';

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { bookingId, ratings, notes }: CreateReviewRequest = req.body;

  // Verify teacher
  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  // Verify booking exists and belongs to this teacher
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.teacherId.toString() !== teacher._id.toString()) {
    throw new AppError('Unauthorized to review this session', 403);
  }

  // Check if booking is completed
  if (booking.status !== BookingStatus.COMPLETED) {
    throw new AppError('Can only review completed sessions', 400);
  }

  // Check if review already exists
  const existingReview = await SessionReview.findOne({ bookingId });
  if (existingReview) {
    throw new AppError('Review already exists for this session', 400);
  }

  // Validate ratings
  const ratingValues = Object.values(ratings);
  if (ratingValues.some((rating) => rating < 1 || rating > 5)) {
    throw new AppError('All ratings must be between 1 and 5', 400);
  }

  // Create review
  const review = await SessionReview.create({
    bookingId,
    teacherId: teacher._id,
    customerId: booking.customerId,
    ratings,
    notes,
  });

  res.status(201).json({
    message: 'Review created successfully',
    review,
  });
});

export const getReviewByBookingId = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const review = await SessionReview.findOne({ bookingId })
    .populate({
      path: 'teacherId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'name',
      },
    })
    .lean();

  if (!review) {
    return res.status(404).json({
      message: 'Review not found',
      review: null,
    });
  }

  res.json({ review });
});

export const getCustomerReviews = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;

  const reviews = await SessionReview.find({ customerId })
    .populate({
      path: 'bookingId',
      select: 'startTime endTime type',
    })
    .populate({
      path: 'teacherId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'name',
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ reviews });
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { id } = req.params;
  const { ratings, notes } = req.body;

  // Verify teacher
  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  // Find review
  const review = await SessionReview.findById(id);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Verify ownership
  if (review.teacherId.toString() !== teacher._id.toString()) {
    throw new AppError('Unauthorized to update this review', 403);
  }

  // Validate ratings if provided
  if (ratings) {
    const ratingValues = Object.values(ratings);
    if (ratingValues.some((rating) => typeof rating === 'number' && (rating < 1 || rating > 5))) {
      throw new AppError('All ratings must be between 1 and 5', 400);
    }
    review.ratings = ratings;
  }

  if (notes !== undefined) {
    review.notes = notes;
  }

  await review.save();

  res.json({
    message: 'Review updated successfully',
    review,
  });
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { id } = req.params;

  // Verify teacher
  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  // Find review
  const review = await SessionReview.findById(id);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Verify ownership
  if (review.teacherId.toString() !== teacher._id.toString()) {
    throw new AppError('Unauthorized to delete this review', 403);
  }

  await SessionReview.findByIdAndDelete(id);

  res.json({
    message: 'Review deleted successfully',
  });
});
