import { Request, Response } from 'express';
import { z } from 'zod';
import { RegistrationRequest, User, Customer, Package } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';
import { UserRole, PackageType, PackageStatus } from '@/types';
import { validateSchema } from '@/utils/validation';
import { NotificationService } from '@/services/notificationService';
import { logger } from '@/config/logger';

export const getPendingRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const requests = await RegistrationRequest.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .select('-passwordHash');

  res.json({
    requests,
  });
});

export const getAllRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;

  const query: any = {};
  if (status) {
    query.status = status;
  }

  const requests = await RegistrationRequest.find(query)
    .sort({ createdAt: -1 })
    .select('-passwordHash')
    .populate('reviewedBy', 'name email');

  res.json({
    requests,
  });
});

const approveRegistrationSchema = z.object({
  packageName: z.string().min(1),
  packageType: z.enum([PackageType.PRIVATE, PackageType.DUO, PackageType.GROUP]),
  totalSessions: z.number().int().positive(),
  validityMonths: z.number().int().positive().default(12), // Default to 12 months (1 year)
  price: z.number().positive(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card']).optional(),
});

export const approveRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const packageData = validateSchema(approveRegistrationSchema, req.body);

  const registrationRequest = await RegistrationRequest.findById(id);
  if (!registrationRequest) {
    throw new AppError('Registration request not found', 404);
  }

  if (registrationRequest.status !== 'pending') {
    throw new AppError('Registration request has already been processed', 400);
  }

  // Check if user with this email or phone already exists (double-check)
  const existingUser = await User.findOne({
    $or: [
      { email: registrationRequest.email },
      { phone: registrationRequest.phone },
    ],
  });

  if (existingUser) {
    throw new AppError('User with this email or phone already exists', 409);
  }

  // Create user
  const user = await User.create({
    role: UserRole.CUSTOMER,
    name: registrationRequest.name,
    email: registrationRequest.email,
    phone: registrationRequest.phone,
    passwordHash: registrationRequest.passwordHash,
    status: 'active',
  });

  // Create customer profile
  const customer = await Customer.create({
    userId: user._id,
    tags: [],
    totalCancellations: 0,
  });

  // Create package for the customer
  const validFrom = new Date();
  const validTo = new Date();
  validTo.setMonth(validTo.getMonth() + (packageData.validityMonths || 1));

  await Package.create({
    customerId: customer._id,
    name: packageData.packageName,
    type: packageData.packageType,
    totalSessions: packageData.totalSessions,
    remainingSessions: packageData.totalSessions,
    validFrom,
    validTo,
    price: packageData.price,
    currency: 'THB',
    status: PackageStatus.ACTIVE,
  });

  // Update registration request
  registrationRequest.status = 'approved';
  registrationRequest.reviewedAt = new Date();
  registrationRequest.reviewedBy = req.user!._id;
  await registrationRequest.save();

  // Notify the newly created customer about approval
  try {
    await NotificationService.notifyCustomerOfRegistrationApproval({
      customerId: user._id,
      packageName: packageData.packageName,
      totalSessions: packageData.totalSessions,
    });
  } catch (notificationError) {
    logger.error('Failed to send notification to customer:', notificationError);
  }

  res.json({
    message: 'Registration approved successfully and package created',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

export const rejectRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const registrationRequest = await RegistrationRequest.findById(id);
  if (!registrationRequest) {
    throw new AppError('Registration request not found', 404);
  }

  if (registrationRequest.status !== 'pending') {
    throw new AppError('Registration request has already been processed', 400);
  }

  // Update registration request
  registrationRequest.status = 'rejected';
  registrationRequest.rejectionReason = reason || 'Not specified';
  registrationRequest.reviewedAt = new Date();
  registrationRequest.reviewedBy = req.user!._id;
  await registrationRequest.save();

  // Log rejection (can't send in-app notification as user doesn't exist yet)
  try {
    await NotificationService.notifyCustomerOfRegistrationRejection({
      customerEmail: registrationRequest.email,
      reason: reason,
    });
  } catch (notificationError) {
    logger.error('Failed to log registration rejection:', notificationError);
  }

  res.json({
    message: 'Registration rejected',
  });
});
