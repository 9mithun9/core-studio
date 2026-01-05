import mongoose from 'mongoose';
import { Booking, Package } from '../src/models';
import { BookingStatus } from '../src/types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function getSessionType(packageName: string): 'private' | 'duo' | 'group' {
  const lowerName = packageName.toLowerCase();
  if (lowerName.includes('private') || lowerName.includes('1-on-1')) return 'private';
  if (lowerName.includes('duo') || lowerName.includes('duet')) return 'duo';
  return 'group';
}

async function debugSessions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    // Check December 2025
    const year = 2025;
    const month = 12;
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    console.log('=== DECEMBER 2025 DEBUG ===');
    console.log('Start:', startDate.toISOString());
    console.log('End:', endDate.toISOString());
    console.log();

    // Get all completed bookings
    const completedBookings = await Booking.find({
      status: BookingStatus.COMPLETED,
      startTime: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('packageId', 'name price type')
      .populate('teacherId', 'userId')
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'name',
        },
      })
      .lean();

    console.log(`Found ${completedBookings.length} completed bookings\n`);

    // Group by teacher
    const teacherMap = new Map<string, any[]>();

    completedBookings.forEach((booking: any) => {
      const teacherId = booking.teacherId?._id?.toString();
      if (teacherId) {
        if (!teacherMap.has(teacherId)) {
          teacherMap.set(teacherId, []);
        }
        teacherMap.get(teacherId)!.push(booking);
      }
    });

    console.log(`Teachers with sessions: ${teacherMap.size}\n`);

    // Analyze each teacher
    for (const [teacherId, bookings] of teacherMap.entries()) {
      const teacherName = bookings[0]?.teacherId?.userId?.name || 'Unknown';
      console.log(`=== ${teacherName} ===`);
      console.log(`Total sessions: ${bookings.length}`);

      const sessionCounts = {
        private: 0,
        duo: 0,
        group: 0,
      };

      console.log('\nBookings breakdown:');
      bookings.forEach((booking: any, index) => {
        const packageName = booking.packageId?.name || 'Unknown';
        const packageType = booking.packageId?.type || 'unknown';
        const sessionType = getSessionType(packageName);
        sessionCounts[sessionType]++;

        console.log(`  ${index + 1}. Package: "${packageName}" | Package.type: "${packageType}" | Detected as: ${sessionType} | Date: ${new Date(booking.startTime).toISOString().split('T')[0]}`);
      });

      console.log('\nSession counts:');
      console.log(`  Private: ${sessionCounts.private}`);
      console.log(`  Duo: ${sessionCounts.duo}`);
      console.log(`  Group: ${sessionCounts.group}`);
      console.log();
    }

    // Check package types in DB
    console.log('=== CHECKING PACKAGE TYPES ===');
    const packages = await Package.find().limit(20).lean();
    console.log('\nSample of package names and types:');
    packages.forEach((pkg: any) => {
      const detected = getSessionType(pkg.name);
      console.log(`  "${pkg.name}" | type: "${pkg.type}" | detected: ${detected} ${pkg.type !== detected ? '⚠️ MISMATCH' : '✓'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

debugSessions();
