import { Request, Response } from 'express';
import { Customer, User, Package, Booking } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';
import { UserRole, PackageStatus } from '@/types';

export const getAllCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { search, tag, page = 1, limit = 20 } = req.query;

  const query: any = {};

  // Build search query
  if (search) {
    const users = await User.find({
      role: UserRole.CUSTOMER,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');

    query.userId = { $in: users.map((u) => u._id) };
  }

  if (tag) {
    query.tags = tag;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .populate('userId', 'name email phone status')
      .populate('preferredTeacherId', 'userId bio')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean(),
    Customer.countDocuments(query),
  ]);

  res.json({
    customers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const getCustomerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const customer = await Customer.findById(id)
    .populate('userId', 'name email phone status lineUserId')
    .populate('preferredTeacherId', 'userId bio specialties')
    .lean();

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  res.json({
    customer,
  });
});

export const getCustomerOverview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const customer = await Customer.findOne({ userId: req.user._id })
    .populate('userId', 'name email phone')
    .populate('preferredTeacherId', 'userId bio specialties')
    .lean();

  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  // Get active packages
  const activePackages = await Package.find({
    customerId: customer._id,
    status: PackageStatus.ACTIVE,
  }).lean();

  // Get upcoming bookings (including cancellation requested)
  const upcomingBookings = await Booking.find({
    customerId: customer._id,
    startTime: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed', 'cancellationRequested'] },
  })
    .populate({
      path: 'teacherId',
      select: 'userId bio specialties',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .sort({ startTime: 1 })
    .limit(5)
    .lean();

  // Get total sessions completed
  const completedSessions = await Booking.countDocuments({
    customerId: customer._id,
    status: 'completed',
  });

  res.json({
    customer,
    activePackages,
    upcomingBookings,
    stats: {
      completedSessions,
    },
  });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  // Update allowed fields
  const allowedFields = [
    'dateOfBirth',
    'height',
    'weight',
    'medicalNotes',
    'profilePhoto',
    'healthNotes',
    'preferredTeacherId',
    'emergencyContactName',
    'emergencyContactPhone',
    'tags',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      (customer as any)[field] = updates[field];
    }
  }

  await customer.save();

  res.json({
    message: 'Customer updated successfully',
    customer,
  });
});

// Update own profile (for customers)
export const updateOwnProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const updates = req.body;

  // Find customer by userId
  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  // Update allowed fields for customer self-service
  const allowedFields = [
    'dateOfBirth',
    'height',
    'weight',
    'medicalNotes',
    'profilePhoto',
    'profession',
    'gender',
    'emergencyContactName',
    'emergencyContactPhone',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      (customer as any)[field] = updates[field];
    }
  }

  // Update phone number in User model if provided
  if (updates.phone !== undefined) {
    await User.findByIdAndUpdate(req.user._id, { phone: updates.phone });
  }

  await customer.save();

  // Populate userId to return updated user data
  await customer.populate('userId', 'name email phone');

  res.json({
    message: 'Profile updated successfully',
    customer,
  });
});

// Upload profile photo
export const uploadProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  // Find customer by userId
  const customer = await Customer.findOne({ userId: req.user._id });
  if (!customer) {
    throw new AppError('Customer profile not found', 404);
  }

  // Generate the URL for the uploaded file
  const photoUrl = `/uploads/profiles/${req.file.filename}`;

  // Update customer's profile photo
  customer.profilePhoto = photoUrl;
  await customer.save();

  res.json({
    message: 'Profile photo uploaded successfully',
    photoUrl,
  });
});
