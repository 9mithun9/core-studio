import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { hashPassword } from '../src/utils/password';
import { User, Customer, Teacher, Package, Booking } from '../src/models';
import { UserRole, UserStatus, PackageType, PackageStatus, BookingStatus } from '../src/types';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function createExpiredPackageUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Find a teacher
    const teacher = await Teacher.findOne().populate('userId');
    if (!teacher) {
      console.error('No teachers found. Please run seed script first.');
      process.exit(1);
    }

    console.log('\nCreating user with expired package...');

    // Delete existing test user if exists
    const existingUser = await User.findOne({ email: 'expired@example.com' });
    if (existingUser) {
      const existingCustomer = await Customer.findOne({ userId: existingUser._id });
      if (existingCustomer) {
        await Booking.deleteMany({ customerId: existingCustomer._id });
        await Package.deleteMany({ customerId: existingCustomer._id });
        await Customer.deleteOne({ _id: existingCustomer._id });
      }
      await User.deleteOne({ _id: existingUser._id });
      console.log('✓ Removed existing test user');
    }

    // Create test user with expired package
    const testPasswordHash = await hashPassword('expired123');
    const testUser = await User.create({
      role: UserRole.CUSTOMER,
      name: 'Expired Package User',
      email: 'expired@example.com',
      phone: '+66-888-888-8888',
      passwordHash: testPasswordHash,
      status: UserStatus.ACTIVE,
    });

    const testCustomer = await Customer.create({
      userId: testUser._id,
      dateOfBirth: new Date(1988, 3, 10),
      height: 168,
      weight: 62,
      medicalNotes: 'All sessions completed, package expired',
      healthNotes: 'Healthy',
      profession: 'Office Worker',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+66-888-888-8887',
      tags: ['Returning Customer'],
    });

    console.log('✓ User created:', testUser.email);

    // Create EXPIRED package (ended 1 month ago, all sessions used)
    const now = new Date();

    // Package started 14 months ago
    const validFrom = new Date(now);
    validFrom.setMonth(validFrom.getMonth() - 14);

    // Package expired 2 months ago (1 year validity)
    const validTo = new Date(validFrom);
    validTo.setMonth(validTo.getMonth() + 12);

    const expiredPackage = await Package.create({
      customerId: testCustomer._id,
      name: '20 Session Package',
      type: PackageType.PRIVATE,
      totalSessions: 20,
      remainingSessions: 0, // All sessions used
      price: 20000,
      currency: 'THB',
      validFrom,
      validTo,
      status: PackageStatus.EXPIRED, // EXPIRED status
    });

    console.log('✓ Expired package created (expired 2 months ago, 0 sessions remaining)');

    // Create some completed bookings from the past
    const completedBookings = [];
    for (let i = 0; i < 20; i++) {
      const bookingDate = new Date(validFrom);
      bookingDate.setDate(bookingDate.getDate() + (i * 7)); // Weekly sessions
      bookingDate.setHours(10, 0, 0, 0);

      const endTime = new Date(bookingDate);
      endTime.setHours(11, 0, 0, 0);

      completedBookings.push({
        customerId: testCustomer._id,
        teacherId: teacher._id,
        packageId: expiredPackage._id,
        type: PackageType.PRIVATE,
        startTime: bookingDate,
        endTime: endTime,
        status: BookingStatus.COMPLETED,
        notes: `Completed session ${i + 1}/20`,
        createdBy: testUser._id, // Add required createdBy field
      });
    }

    await Booking.insertMany(completedBookings);
    console.log('✓ Created 20 completed past sessions');

    console.log('\n═══════════════════════════════════════');
    console.log('TEST USER WITH EXPIRED PACKAGE:');
    console.log('═══════════════════════════════════════');
    console.log('Email:    expired@example.com');
    console.log('Password: expired123');
    console.log('═══════════════════════════════════════');
    console.log('\nPackage Status:');
    console.log('- Status: EXPIRED');
    console.log('- Expired: 2 months ago');
    console.log('- Sessions: 0/20 remaining (all used)');
    console.log('- Type: Private');
    console.log('\nYou can now:');
    console.log('1. Log in with this user');
    console.log('2. See the expired package in dashboard');
    console.log('3. Click "Request Package" button');
    console.log('4. Submit a new package request');
    console.log('5. Admin can approve the request');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createExpiredPackageUser();
