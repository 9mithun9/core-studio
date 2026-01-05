import mongoose from 'mongoose';
import { Booking, Teacher } from '../src/models';
import { BookingStatus } from '../src/types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    // Check December 2025
    const year = 2025;
    const month = 12;
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const completedBookings = await Booking.find({
      status: BookingStatus.COMPLETED,
      startTime: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('packageId', 'name price type')
      .populate('teacherId')
      .lean();

    const teachers = await Teacher.find()
      .populate('userId', 'name email')
      .lean();

    console.log('=== DECEMBER 2025 SESSION COUNTS (FIXED) ===\n');

    teachers.forEach((teacher: any) => {
      const teacherSessions = completedBookings.filter(
        (booking: any) => booking.teacherId?._id.toString() === teacher._id.toString()
      );

      if (teacherSessions.length > 0) {
        const sessionCounts = {
          private: 0,
          duo: 0,
          group: 0,
        };

        teacherSessions.forEach((session: any) => {
          const sessionType = session.packageId?.type || 'group';
          if (sessionType === 'private' || sessionType === 'duo' || sessionType === 'group') {
            sessionCounts[sessionType]++;
          }
        });

        console.log(`${teacher.userId?.name}:`);
        console.log(`  Total: ${teacherSessions.length}`);
        console.log(`  Private: ${sessionCounts.private}`);
        console.log(`  Duo: ${sessionCounts.duo}`);
        console.log(`  Group: ${sessionCounts.group}`);
        console.log();
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

verify();
