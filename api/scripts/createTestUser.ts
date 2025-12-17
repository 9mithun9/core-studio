import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { hashPassword } from '../src/utils/password';
import { User, Customer, Teacher, Package, Booking } from '../src/models';
import { UserRole, UserStatus, PackageType, PackageStatus, BookingStatus } from '../src/types';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

// Helper to create dates in Bangkok timezone (UTC+7)
function createDate(year: number, month: number, day: number, hour: number = 10): Date {
  const bangkokDate = new Date(Date.UTC(year, month - 1, day, hour - 7, 0, 0));
  return bangkokDate;
}

async function createTestUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Find an existing teacher
    const teacher = await Teacher.findOne().populate('userId');
    if (!teacher) {
      console.error('No teachers found. Please run seed script first.');
      process.exit(1);
    }

    console.log('\nCreating Test User...');

    // Create test user
    const testPasswordHash = await hashPassword('test123');
    const testUser = await User.create({
      role: UserRole.CUSTOMER,
      name: 'Test User',
      email: 'test@example.com',
      phone: '+66-999-999-9999',
      passwordHash: testPasswordHash,
      status: UserStatus.ACTIVE,
    });

    const testCustomer = await Customer.create({
      userId: testUser._id,
      dateOfBirth: new Date(1990, 5, 15),
      height: 170,
      weight: 65,
      medicalNotes: 'Test user for cancellation scenarios',
      healthNotes: 'Healthy',
      profession: 'Tester',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+66-999-999-9998',
      tags: ['Test'],
    });

    console.log('✓ Test user created:', testUser.email);

    // Create a package with 30 sessions
    const now = new Date();
    const validFrom = new Date(now);
    validFrom.setDate(validFrom.getDate() - 30); // Started 30 days ago

    const validTo = new Date(validFrom);
    validTo.setMonth(validTo.getMonth() + 12); // Valid for 1 year

    const testPackage = await Package.create({
      customerId: testCustomer._id,
      name: '30 Session Package',
      type: PackageType.PRIVATE,
      totalSessions: 30,
      remainingSessions: 27, // Used 3 sessions
      price: 30000,
      currency: 'THB',
      validFrom,
      validTo,
      status: PackageStatus.ACTIVE,
    });

    console.log('✓ Package created: 30 Session Package (27 remaining)');

    // Create bookings at different times to test cancellation rules
    const bookings = [];

    // 1. PAST booking (completed - should not show cancel button)
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 5);
    pastDate.setHours(10, 0, 0, 0);
    const pastEndDate = new Date(pastDate);
    pastEndDate.setHours(11, 0, 0, 0);

    bookings.push({
      customerId: testCustomer._id,
      teacherId: teacher._id,
      packageId: testPackage._id,
      type: PackageType.PRIVATE,
      startTime: pastDate,
      endTime: pastEndDate,
      status: BookingStatus.COMPLETED,
      notes: 'Past completed session',
    });

    // 2. Booking in 3 hours (within 6h - should be BLOCKED, cannot cancel)
    const in3Hours = new Date(now);
    in3Hours.setHours(in3Hours.getHours() + 3);
    in3Hours.setMinutes(0, 0, 0);
    const in3HoursEnd = new Date(in3Hours);
    in3HoursEnd.setHours(in3HoursEnd.getHours() + 1);

    bookings.push({
      customerId: testCustomer._id,
      teacherId: teacher._id,
      packageId: testPackage._id,
      type: PackageType.PRIVATE,
      startTime: in3Hours,
      endTime: in3HoursEnd,
      status: BookingStatus.CONFIRMED,
      notes: 'Within 6 hours - should show Cannot Cancel (disabled)',
    });

    // 3. Booking in 8 hours (6-12h window - requires approval)
    const in8Hours = new Date(now);
    in8Hours.setHours(in8Hours.getHours() + 8);
    in8Hours.setMinutes(0, 0, 0);
    const in8HoursEnd = new Date(in8Hours);
    in8HoursEnd.setHours(in8HoursEnd.getHours() + 1);

    bookings.push({
      customerId: testCustomer._id,
      teacherId: teacher._id,
      packageId: testPackage._id,
      type: PackageType.PRIVATE,
      startTime: in8Hours,
      endTime: in8HoursEnd,
      status: BookingStatus.CONFIRMED,
      notes: '6-12 hour window - requires approval to cancel',
    });

    // 4. Booking in 3 days (>12h - can cancel directly)
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(10, 0, 0, 0);
    const in3DaysEnd = new Date(in3Days);
    in3DaysEnd.setHours(11, 0, 0, 0);

    bookings.push({
      customerId: testCustomer._id,
      teacherId: teacher._id,
      packageId: testPackage._id,
      type: PackageType.PRIVATE,
      startTime: in3Days,
      endTime: in3DaysEnd,
      status: BookingStatus.CONFIRMED,
      notes: 'More than 12 hours - can cancel directly',
    });

    await Booking.insertMany(bookings);

    console.log('\n✓ Created 4 test bookings:');
    console.log('  1. Past completed session (5 days ago)');
    console.log('  2. In 3 hours - Cannot cancel (disabled button)');
    console.log('  3. In 8 hours - Requires approval (6-12h window)');
    console.log('  4. In 3 days - Can cancel directly (>12h)');

    console.log('\n═══════════════════════════════════════');
    console.log('TEST USER CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log('Email:    test@example.com');
    console.log('Password: test123');
    console.log('═══════════════════════════════════════');
    console.log('\nYou can now log in and test:');
    console.log('- Past bookings (no cancel button)');
    console.log('- <6h booking (disabled "Cannot Cancel" button)');
    console.log('- 6-12h booking (request approval)');
    console.log('- >12h booking (direct cancellation)');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
