/**
 * Send scheduled LINE notifications
 * This job runs every 5 minutes and processes due notifications
 */

import { Client, TextMessage } from '@line/bot-sdk';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

// Import models (using dynamic require to avoid path issues)
const Notification = mongoose.model('Notification');
const User = mongoose.model('User');
const MessageTemplate = mongoose.model('MessageTemplate');

export async function sendNotifications(): Promise<void> {
  const now = new Date();

  // Find notifications that are due
  const notifications = await Notification.find({
    status: 'scheduled',
    scheduledFor: { $lte: now },
  })
    .limit(50) // Process in batches
    .populate('userId');

  if (notifications.length === 0) {
    logger.debug('No notifications to send');
    return;
  }

  logger.info(`Processing ${notifications.length} notifications`);

  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      const user = notification.userId as any;

      if (!user) {
        notification.status = 'failed';
        notification.errorMessage = 'User not found';
        await notification.save();
        failed++;
        continue;
      }

      if (!user.lineUserId) {
        notification.status = 'failed';
        notification.errorMessage = 'User has no LINE ID';
        await notification.save();
        failed++;
        continue;
      }

      // Get template
      const templateKey = getTemplateKey(notification.type);
      const template = await MessageTemplate.findOne({
        key: templateKey,
        channel: 'line',
      });

      if (!template) {
        notification.status = 'failed';
        notification.errorMessage = `Template not found: ${templateKey}`;
        await notification.save();
        failed++;
        continue;
      }

      // Build message
      const message = replaceVariables(template.body, notification.payload);

      // Send LINE message
      const textMessage: TextMessage = {
        type: 'text',
        text: message,
      };

      await lineClient.pushMessage(user.lineUserId, textMessage);

      // Update notification
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      sent++;
      logger.debug(`Sent notification to ${user.email}`);
    } catch (error: any) {
      notification.status = 'failed';
      notification.errorMessage = error.message;
      await notification.save();
      failed++;
      logger.error(`Failed to send notification ${notification._id}:`, error);
    }
  }

  logger.info(`Notification processing complete: ${sent} sent, ${failed} failed`);
}

function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}

function getTemplateKey(type: string): string {
  const mapping: Record<string, string> = {
    BOOKING_CONFIRMED: 'booking_confirmed',
    BOOKING_REJECTED: 'booking_rejected',
    REMINDER_24H: 'reminder_24h',
    REMINDER_6H: 'reminder_6h',
    MISSED_SESSION: 'missed_session',
    INACTIVE_30D: 'inactive_30d',
    PROMO: 'promo',
    BOOKING_REMINDER: 'booking_reminder',
    PACKAGE_EXPIRING: 'package_expiring',
    WELCOME: 'welcome',
  };

  return mapping[type] || 'default';
}
