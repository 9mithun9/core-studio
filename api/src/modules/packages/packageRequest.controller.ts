import { Request, Response } from 'express';
import { z } from 'zod';
import { PackageRequest, Customer, Package, User } from '@/models';
import { validateSchema } from '@/utils/validation';
import { AppError, asyncHandler } from '@/middlewares';
import { logger } from '@/config/logger';
import { NotificationService } from '@/services/notificationService';
import { UserRole } from '@/types';

// Validation schema
const createPackageRequestSchema = z.object({
  packageType: z.enum(['private', 'duo', 'group']),
  sessions: z.number().int().positive(),
  notes: z.string().optional(),
});

// Create package request (Customer)
export const createPackageRequest = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const data = validateSchema(createPackageRequestSchema, req.body);

  // Find customer
  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  // Create package request
  const packageRequest = await PackageRequest.create({
    customerId: customer._id,
    packageType: data.packageType,
    sessions: data.sessions,
    notes: data.notes,
    status: 'pending',
  });

  logger.info(`Package request created by customer ${customer._id}`);

  // Notify all admins about the new package request
  try {
    const admins = await User.find({ role: UserRole.ADMIN });
    for (const admin of admins) {
      await NotificationService.notifyAdminOfPackageRequest({
        adminId: admin._id,
        customerName: req.user.name,
        packageType: data.packageType,
        sessions: data.sessions,
        requestId: packageRequest._id,
      });
    }
  } catch (notificationError) {
    logger.error('Failed to send notifications to admins:', notificationError);
  }

  res.status(201).json({
    message: 'Package request submitted successfully. Waiting for admin approval.',
    request: packageRequest,
  });
});

// Get my package requests (Customer)
export const getMyPackageRequests = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  const requests = await PackageRequest.find({ customerId: customer._id })
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ requests });
});

// Get all pending package requests (Admin)
export const getPendingPackageRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await PackageRequest.find({ status: 'pending' })
    .populate({
      path: 'customerId',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .sort({ createdAt: -1 });

  res.json({ requests });
});

// Get all package requests (Admin)
export const getAllPackageRequests = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;

  const query: any = {};
  if (status && (status === 'pending' || status === 'approved' || status === 'rejected')) {
    query.status = status;
  }

  const requests = await PackageRequest.find(query)
    .populate({
      path: 'customerId',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ requests });
});

// Approve package request (Admin)
export const approvePackageRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { packageType, sessions, price, activationDate } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  // Validate approval data
  if (!packageType || !sessions || !price) {
    throw new AppError('Package type, sessions, and price are required', 400);
  }

  const packageRequest = await PackageRequest.findById(id).populate({
    path: 'customerId',
    populate: { path: 'userId', select: 'name email' }
  });

  if (!packageRequest) {
    throw new AppError('Package request not found', 404);
  }

  if (packageRequest.status !== 'pending') {
    throw new AppError('This request has already been reviewed', 400);
  }

  // Create the package with admin-specified details
  const validFrom = activationDate ? new Date(activationDate) : new Date();
  const validTo = new Date(validFrom);
  validTo.setMonth(validTo.getMonth() + 12); // Valid for 1 year

  const packageData = await Package.create({
    customerId: packageRequest.customerId._id,
    name: `${sessions} Session Package`,
    type: packageType,
    totalSessions: sessions,
    remainingSessions: sessions,
    validFrom,
    validTo,
    price,
    currency: 'THB',
    status: 'active',
  });

  // Update request status
  packageRequest.status = 'approved';
  packageRequest.reviewedBy = req.user._id;
  packageRequest.reviewedAt = new Date();
  await packageRequest.save();

  logger.info(`Package request ${id} approved by admin ${req.user._id} - Created ${sessions} ${packageType} sessions for ${price} THB, active from ${validFrom.toISOString()}`);

  // Notify customer about approval
  try {
    const customer = packageRequest.customerId as any;
    await NotificationService.notifyCustomerOfApproval({
      customerId: customer.userId._id,
      packageType: packageType,
      sessions: sessions,
      packageId: packageData._id,
    });
  } catch (notificationError) {
    logger.error('Failed to send notification to customer:', notificationError);
  }

  res.json({
    message: 'Package request approved and package created successfully',
    request: packageRequest,
    package: packageData,
  });
});

// Reject package request (Admin)
export const rejectPackageRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const packageRequest = await PackageRequest.findById(id);
  if (!packageRequest) {
    throw new AppError('Package request not found', 404);
  }

  if (packageRequest.status !== 'pending') {
    throw new AppError('This request has already been reviewed', 400);
  }

  packageRequest.status = 'rejected';
  packageRequest.reviewedBy = req.user._id;
  packageRequest.reviewedAt = new Date();
  packageRequest.rejectionReason = reason || 'Request rejected by admin';
  await packageRequest.save();

  logger.info(`Package request ${id} rejected by admin ${req.user._id}`);

  // Notify customer about rejection
  try {
    const fullPackageRequest = await PackageRequest.findById(id).populate({
      path: 'customerId',
      populate: { path: 'userId' }
    });
    if (fullPackageRequest) {
      const customer = fullPackageRequest.customerId as any;
      await NotificationService.notifyCustomerOfRejection({
        customerId: customer.userId._id,
        reason: reason,
        requestId: fullPackageRequest._id,
      });
    }
  } catch (notificationError) {
    logger.error('Failed to send notification to customer:', notificationError);
  }

  res.json({
    message: 'Package request rejected',
    request: packageRequest,
  });
});
