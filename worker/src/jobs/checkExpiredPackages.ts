/**
 * Check for expired packages and update their status
 * This job runs once a day
 */

import mongoose from 'mongoose';
import { logger } from '../config/logger';

const Package = mongoose.model('Package');

export async function checkExpiredPackages(): Promise<void> {
  const now = new Date();

  // Find packages that have expired but status is still active
  const expiredPackages = await Package.find({
    status: 'active',
    validTo: { $lt: now },
  });

  let updated = 0;

  for (const pkg of expiredPackages) {
    try {
      pkg.status = 'expired';
      await pkg.save();
      updated++;
    } catch (error) {
      logger.error(`Error updating package ${pkg._id}:`, error);
    }
  }

  logger.info(`Updated ${updated} expired packages`);

  // Also check packages with 0 remaining sessions
  const usedPackages = await Package.find({
    status: 'active',
    remainingSessions: 0,
  });

  let usedCount = 0;

  for (const pkg of usedPackages) {
    try {
      pkg.status = 'used';
      await pkg.save();
      usedCount++;
    } catch (error) {
      logger.error(`Error updating used package ${pkg._id}:`, error);
    }
  }

  logger.info(`Updated ${usedCount} used packages`);
}
