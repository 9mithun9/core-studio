import mongoose from 'mongoose';
import { Booking, Teacher } from '../src/models';
import { BookingStatus } from '../src/types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function debugSessions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    // Get Sarah Johnson's teacher ID
    const sarah = await Teacher.findOne()
      .populate('userId', 'name')
      .lean() as any;

    const teachers = await Teacher.find()
      .populate('userId', 'name')
      .lean() as any[];

    const sarahTeacher = teachers.find((t: any) => t.userId?.name === 'Sarah Johnson');

    if (!sarahTeacher) {
      console.log('Sarah Johnson not found!');
      return;
    }

    console.log('=== SARAH JOHNSON SESSION ANALYSIS ===\n');
    console.log('Teacher ID:', sarahTeacher._id);

    // October 2025
    const octStartDate = new Date(Date.UTC(2025, 9, 1, 0, 0, 0, 0)); // Month 9 = October
    const octEndDate = new Date(Date.UTC(2025, 9, 31, 23, 59, 59, 999));

    console.log('\n=== OCTOBER 2025 ===');
    console.log('Start:', octStartDate.toISOString());
    console.log('End:', octEndDate.toISOString());

    // Finance page query: COMPLETED status only
    const financeQuery = await Booking.find({
      teacherId: sarahTeacher._id,
      status: BookingStatus.COMPLETED,
      startTime: {
        $gte: octStartDate,
        $lte: octEndDate,
      },
    }).lean();

    console.log('\nFINANCE PAGE QUERY (COMPLETED only):');
    console.log('Count:', financeQuery.length);

    // Teacher details query: ALL sessions
    const teacherDetailsQuery = await Booking.find({
      teacherId: sarahTeacher._id,
      startTime: {
        $gte: octStartDate,
        $lte: octEndDate,
      },
    }).lean();

    console.log('\nTEACHER DETAILS (ALL statuses):');
    console.log('Total:', teacherDetailsQuery.length);

    // Break down by status
    const statusBreakdown: any = {};
    teacherDetailsQuery.forEach((booking: any) => {
      statusBreakdown[booking.status] = (statusBreakdown[booking.status] || 0) + 1;
    });

    console.log('Status breakdown:');
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show all October sessions
    console.log('\n=== ALL OCTOBER SESSIONS ===');
    teacherDetailsQuery.forEach((booking: any, index) => {
      console.log(`${index + 1}. ${new Date(booking.startTime).toISOString().split('T')[0]} - Status: ${booking.status}`);
    });

    // September 2025
    const sepStartDate = new Date(Date.UTC(2025, 8, 1, 0, 0, 0, 0)); // Month 8 = September
    const sepEndDate = new Date(Date.UTC(2025, 8, 30, 23, 59, 59, 999));

    console.log('\n\n=== SEPTEMBER 2025 ===');
    console.log('Start:', sepStartDate.toISOString());
    console.log('End:', sepEndDate.toISOString());

    const sepFinanceQuery = await Booking.find({
      teacherId: sarahTeacher._id,
      status: BookingStatus.COMPLETED,
      startTime: {
        $gte: sepStartDate,
        $lte: sepEndDate,
      },
    }).lean();

    console.log('\nFINANCE PAGE QUERY (COMPLETED only):');
    console.log('Count:', sepFinanceQuery.length);

    const sepTeacherQuery = await Booking.find({
      teacherId: sarahTeacher._id,
      startTime: {
        $gte: sepStartDate,
        $lte: sepEndDate,
      },
    }).lean();

    console.log('\nTEACHER DETAILS (ALL statuses):');
    console.log('Total:', sepTeacherQuery.length);

    const sepStatusBreakdown: any = {};
    sepTeacherQuery.forEach((booking: any) => {
      sepStatusBreakdown[booking.status] = (sepStatusBreakdown[booking.status] || 0) + 1;
    });

    console.log('Status breakdown:');
    Object.entries(sepStatusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n=== ALL SEPTEMBER SESSIONS ===');
    sepTeacherQuery.forEach((booking: any, index) => {
      console.log(`${index + 1}. ${new Date(booking.startTime).toISOString().split('T')[0]} - Status: ${booking.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n\nDisconnected from MongoDB');
  }
}

debugSessions();
