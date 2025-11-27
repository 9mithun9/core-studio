import { Request, Response } from 'express';
import { z } from 'zod';
import { User, Customer } from '@/models';
import { hashPassword, comparePassword } from '@/utils/password';
import { signToken, signRefreshToken } from '@/utils/jwt';
import { validateSchema } from '@/utils/validation';
import { AppError, asyncHandler } from '@/middlewares';
import { UserRole } from '@/types';

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
  const existingUser = await User.findOne({
    $or: [{ email: data.email }, { phone: data.phone }],
  });

  if (existingUser) {
    throw new AppError('User with this email or phone already exists', 409);
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user
  const user = await User.create({
    role: UserRole.CUSTOMER,
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash,
  });

  // Create customer profile
  await Customer.create({
    userId: user._id,
    tags: [],
  });

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

  res.status(201).json({
    message: 'Registration successful',
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
