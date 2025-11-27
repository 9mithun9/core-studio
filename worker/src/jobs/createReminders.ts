/**
 * Create reminder notifications for upcoming sessions
 * This job runs every hour
 */

import mongoose from 'mongoose';
import { addHours, subHours } from 'date-fns';
import { logger } from '../config/logger';

const Booking = mongoose.model('Booking');
const Notification = mongoose.model('Notification');
const Customer = mongoose.model('Customer');
const Teacher = mongoose.model('Teacher');

export async function createReminders(): Promise<void> {
  const now = new Date();

  // Create 24-hour reminders
  await create24HourReminders(now);

  // Create 6-hour reminders
  await create6HourReminders(now);

  logger.info('Reminder creation complete');
}

async function create24HourReminders(now: Date): Promise<void> {
  const targetTime = addHours(now, 24);
  const windowStart = subHours(targetTime, 1);
  const windowEnd = addHours(targetTime, 1);

  // Find bookings happening in 24 hours
  const bookings = await Booking.find({
    status: 'confirmed',
    startTime: { $gte: windowStart, $lte: windowEnd },
  })
    .populate('customerId')
    .populate('teacherId');

  let created = 0;

  for (const booking of bookings) {
    try {
      // Check if reminder already exists
      const existing = await Notification.findOne({
        bookingId: booking._id,
        type: 'REMINDER_24H',
      });

      if (existing) {
        continue;
      }

      // Get user ID
      const customer = await Customer.findById(booking.customerId).populate('userId');
      if (!customer) continue;

      const teacher = await Teacher.findById(booking.teacherId).populate('userId');

      // Create reminder notification
      await Notification.create({
        userId: (customer as any).userId._id,
        channel: 'line',
        type: 'REMINDER_24H',
        bookingId: booking._id,
        payload: {
          time: booking.startTime.toISOString(),
          teacher: (teacher as any)?.userId?.name || 'Instructor',
        },
        scheduledFor: subHours(booking.startTime, 24),
      });

      created++;
    } catch (error) {
      logger.error(`Error creating 24h reminder for booking ${booking._id}:`, error);
    }
  }

  logger.info(`Created ${created} 24-hour reminders`);
}

async function create6HourReminders(now: Date): Promise<void> {
  const targetTime = addHours(now, 6);
  const windowStart = subHours(targetTime, 0.5);
  const windowEnd = addHours(targetTime, 0.5);

  // Find bookings happening in 6 hours
  const bookings = await Booking.find({
    status: 'confirmed',
    startTime: { $gte: windowStart, $lte: windowEnd },
  })
    .populate('customerId')
    .populate('teacherId');

  let created = 0;

  for (const booking of bookings) {
    try {
      // Check if reminder already exists
      const existing = await Notification.findOne({
        bookingId: booking._id,
        type: 'REMINDER_6H',
      });

      if (existing) {
        continue;
      }

      // Get user ID
      const customer = await Customer.findById(booking.customerId).populate('userId');
      if (!customer) continue;

      const teacher = await Teacher.findById(booking.teacherId).populate('userId');

      // Create reminder notification
      await Notification.create({
        userId: (customer as any).userId._id,
        channel: 'line',
        type: 'REMINDER_6H',
        bookingId: booking._id,
        payload: {
          time: booking.startTime.toISOString(),
          teacher: (teacher as any)?.userId?.name || 'Instructor',
        },
        scheduledFor: subHours(booking.startTime, 6),
      });

      created++;
    } catch (error) {
      logger.error(`Error creating 6h reminder for booking ${booking._id}:`, error);
    }
  }

  logger.info(`Created ${created} 6-hour reminders`);
}
