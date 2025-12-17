import { Request, Response } from 'express';
import { z } from 'zod';
import { User, Customer, RegistrationRequest } from '@/models';
import { hashPassword, comparePassword } from '@/utils/password';
import { signToken, signRefreshToken } from '@/utils/jwt';
import { validateSchema } from '@/utils/validation';
import { AppError, asyncHandler } from '@/middlewares';
import { UserRole } from '@/types';
import { NotificationService } from '@/services/notificationService';
import { logger } from '@/config/logger';

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate request
  const data = validateSchema(registerSchema, req.body);

  // Check if user already exists
  const existingUserByEmail = await User.findOne({ email: data.email });
  const existingUserByPhone = await User.findOne({ phone: data.phone });

  if (existingUserByEmail) {
    throw new AppError('An account with this email already exists. Please login instead.', 409);
  }

  if (existingUserByPhone) {
    throw new AppError('An account with this phone number already exists. Please login instead.', 409);
  }

  // Check for existing registration requests (pending or approved only - allow re-submission for rejected)
  const existingRequestByEmail = await RegistrationRequest.findOne({
    email: data.email,
    status: { $in: ['pending', 'approved'] },
  });

  const existingRequestByPhone = await RegistrationRequest.findOne({
    phone: data.phone,
    status: { $in: ['pending', 'approved'] },
  });

  if (existingRequestByEmail) {
    if (existingRequestByEmail.status === 'pending') {
      throw new AppError('A registration request with this email is already pending approval', 409);
    } else if (existingRequestByEmail.status === 'approved') {
      throw new AppError('An account with this email has already been created. Please login instead.', 409);
    }
  }

  if (existingRequestByPhone) {
    if (existingRequestByPhone.status === 'pending') {
      throw new AppError('A registration request with this phone number is already pending approval', 409);
    } else if (existingRequestByPhone.status === 'approved') {
      throw new AppError('An account with this phone number has already been created. Please login instead.', 409);
    }
  }

  // Delete any old rejected requests for this email or phone to allow re-submission
  await RegistrationRequest.deleteMany({
    $or: [{ email: data.email }, { phone: data.phone }],
    status: 'rejected',
  });

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create registration request
  const registrationRequest = await RegistrationRequest.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash,
    status: 'pending',
  });

  // Notify all admins about the new registration request
  try {
    const admins = await User.find({ role: UserRole.ADMIN });
    await Promise.all(
      admins.map(async (admin) => {
        await NotificationService.notifyAdminOfRegistration({
          adminId: admin._id,
          customerName: data.name,
          customerEmail: data.email,
          registrationId: registrationRequest._id,
        });
      })
    );
  } catch (notificationError) {
    logger.error('Failed to send notification to admins:', notificationError);
  }

  res.status(201).json({
    message: 'Registration request submitted successfully. Please wait for admin approval.',
    requestId: registrationRequest._id,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validate request
  const data = validateSchema(loginSchema, req.body);

  // Find user
  const user = await User.findOne({ email: data.email });
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await comparePassword(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (user.status !== 'active') {
    throw new AppError('Account is inactive', 401);
  }

  // Generate tokens
  const accessToken = signToken({
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  const refreshToken = signRefreshToken({
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  res.json({
    message: 'Login successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const user = req.user;

  // Load additional profile data based on role
  let profile = null;
  if (user.role === UserRole.CUSTOMER) {
    profile = await Customer.findOne({ userId: user._id })
      .populate('preferredTeacherId', 'userId bio specialties')
      .lean();
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      lineUserId: user.lineUserId,
    },
    profile,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side by deleting the token
  // For more security, you could implement a token blacklist here

  res.json({
    message: 'Logout successful',
  });
});
