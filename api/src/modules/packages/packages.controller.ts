import { Request, Response } from 'express';
import { z } from 'zod';
import { Package, Customer, Payment, Booking } from '@/models';
import { validateSchema } from '@/utils/validation';
import { AppError, asyncHandler } from '@/middlewares';
import { PackageType, PackageStatus, UserRole, BookingStatus } from '@/types';

// Validation schemas
const createPackageSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  name: z.string().min(1),
  type: z.enum([PackageType.PRIVATE, PackageType.GROUP]),
  totalSessions: z.number().int().min(1),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  price: z.number().min(0),
  currency: z.string().default('THB'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card']).optional(),
  paymentReference: z.string().optional(),
  note: z.string().optional(),
});

const updatePackageSchema = z.object({
  remainingSessions: z.number().int().min(0).optional(),
  status: z.enum(Object.values(PackageStatus) as [string, ...string[]]).optional(),
  note: z.string().optional(),
  reason: z.string().optional(), // Required if adjusting remainingSessions manually
});

export const createPackage = asyncHandler(async (req: Request, res: Response) => {
  const data = validateSchema(createPackageSchema, req.body);

  // Verify customer exists
  const customer = await Customer.findById(data.customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  // Create package
  const packageData = await Package.create({
    customerId: data.customerId,
    name: data.name,
    type: data.type,
    totalSessions: data.totalSessions,
    remainingSessions: data.totalSessions, // Initially, all sessions remain
    validFrom: new Date(data.validFrom),
    validTo: new Date(data.validTo),
    price: data.price,
    currency: data.currency,
    status: PackageStatus.ACTIVE,
    note: data.note,
  });

  // Create payment record if payment details provided
  if (data.paymentMethod) {
    await Payment.create({
      customerId: data.customerId,
      packageId: packageData._id,
      amount: data.price,
      currency: data.currency,
      method: data.paymentMethod,
      paidAt: new Date(),
      referenceCode: data.paymentReference,
    });
  }

  res.status(201).json({
    message: 'Package created successfully',
    package: packageData,
  });
});

export const getCustomerPackages = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;

  // If user is a customer, ensure they can only see their own packages
  if (req.user?.role === UserRole.CUSTOMER) {
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer || customer._id.toString() !== customerId) {
      throw new AppError('Access denied', 403);
    }
  }

  const packages = await Package.find({ customerId })
    .sort({ createdAt: -1 })
    .lean();

  // Add session counts for each package (same as getMyPackages)
  const packagesWithCounts = await Promise.all(
    packages.map(async (pkg) => {
      // Count completed sessions (already done)
      // Includes: COMPLETED, NO_SHOW, and past CONFIRMED sessions
      const completedCount = await Booking.countDocuments({
        packageId: pkg._id,
        $or: [
          { status: { $in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW] } },
          { status: BookingStatus.CONFIRMED, endTime: { $lt: new Date() } }
        ],
      });

      // Count upcoming sessions (PENDING or CONFIRMED future sessions)
      const upcomingCount = await Booking.countDocuments({
        packageId: pkg._id,
        status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startTime: { $gte: new Date() },
      });

      // Calculate remaining: Total - Completed - Upcoming
      // This represents sessions not yet booked (available to book)
      const remainingUnbooked = pkg.totalSessions - completedCount - upcomingCount;

      // Count cancelled bookings (for admin reference)
      const cancelledCount = await Booking.countDocuments({
        packageId: pkg._id,
        status: BookingStatus.CANCELLED,
      });

      // Count pending bookings (subset of upcoming)
      const pendingCount = await Booking.countDocuments({
        packageId: pkg._id,
        status: BookingStatus.PENDING,
      });

      return {
        ...pkg,
        completedCount,
        upcomingCount,
        remainingUnbooked,
        remainingSessions: remainingUnbooked, // Update this to match the calculated value
        cancelledCount,
        pendingCount,
        availableForBooking: remainingUnbooked,
      };
    })
  );

  res.json({
    packages: packagesWithCounts,
  });
});

export const getMyPackages = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  // Find customer profile for this user
  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  const packages = await Package.find({ customerId: customer._id })
    .sort({ createdAt: -1 })
    .lean();

  // Add session counts for each package
  const packagesWithCounts = await Promise.all(
    packages.map(async (pkg) => {
      // Count completed sessions (already done)
      // Includes: COMPLETED, NO_SHOW, and past CONFIRMED sessions
      const completedCount = await Booking.countDocuments({
        packageId: pkg._id,
        $or: [
          { status: { $in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW] } },
          { status: BookingStatus.CONFIRMED, endTime: { $lt: new Date() } }
        ],
      });

      // Count upcoming sessions (PENDING or CONFIRMED future sessions)
      const upcomingCount = await Booking.countDocuments({
        packageId: pkg._id,
        status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startTime: { $gte: new Date() },
      });

      // Calculate remaining: Total - Completed - Upcoming
      // This represents sessions not yet booked (available to book)
      const remainingUnbooked = pkg.totalSessions - completedCount - upcomingCount;

      // Count cancelled bookings (for admin reference, not shown to customer)
      const cancelledCount = await Booking.countDocuments({
        packageId: pkg._id,
        status: BookingStatus.CANCELLED,
      });

      // Count pending bookings (subset of upcoming, for UI reference)
      const pendingCount = await Booking.countDocuments({
        packageId: pkg._id,
        status: BookingStatus.PENDING,
      });

      return {
        ...pkg,
        completedCount,
        upcomingCount,
        remainingUnbooked,
        cancelledCount,
        pendingCount,
        availableForBooking: remainingUnbooked,
      };
    })
  );

  res.json({
    packages: packagesWithCounts,
  });
});

export const getPackageById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const packageData = await Package.findById(id)
    .populate('customerId', 'userId')
    .lean();

  if (!packageData) {
    throw new AppError('Package not found', 404);
  }

  // If user is a customer, ensure they own this package
  if (req.user?.role === UserRole.CUSTOMER) {
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer || packageData.customerId.toString() !== customer._id.toString()) {
      throw new AppError('Access denied', 403);
    }
  }

  res.json({
    package: packageData,
  });
});

export const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = validateSchema(updatePackageSchema, req.body);

  const packageData = await Package.findById(id);
  if (!packageData) {
    throw new AppError('Package not found', 404);
  }

  // If manually adjusting remainingSessions, require a reason
  if (
    data.remainingSessions !== undefined &&
    data.remainingSessions !== packageData.remainingSessions &&
    !data.reason
  ) {
    throw new AppError('Reason is required when manually adjusting sessions', 400);
  }

  // Update fields
  if (data.remainingSessions !== undefined) {
    packageData.remainingSessions = data.remainingSessions;
  }
  if (data.status) {
    packageData.status = data.status as PackageStatus;
  }
  if (data.note !== undefined) {
    packageData.note = data.note;
  }

  await packageData.save();

  res.json({
    message: 'Package updated successfully',
    package: packageData,
  });
});

export const deletePackage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const packageData = await Package.findByIdAndDelete(id);
  if (!packageData) {
    throw new AppError('Package not found', 404);
  }

  res.json({
    message: 'Package deleted successfully',
  });
});
