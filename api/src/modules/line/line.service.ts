import { Client, TextMessage } from '@line/bot-sdk';
import { config } from '@/config/env';
import { logger } from '@/config/logger';
import { User, MessageTemplate, Notification } from '@/models';
import { NotificationType } from '@/types';

let lineClient: Client | null = null;

// Initialize LINE client only if credentials are available
function getLineClient(): Client | null {
  if (lineClient) return lineClient;

  if (!config.lineChannelAccessToken || !config.lineChannelSecret) {
    logger.warn('LINE credentials not configured. LINE messaging features will be disabled.');
    return null;
  }

  lineClient = new Client({
    channelAccessToken: config.lineChannelAccessToken,
    channelSecret: config.lineChannelSecret,
  });

  return lineClient;
}

export class LineService {
  /**
   * Replace template variables with actual values
   */
  private static replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Send a LINE message to a user
   */
  static async sendMessage(lineUserId: string, message: string): Promise<void> {
    const client = getLineClient();

    if (!client) {
      logger.warn('LINE client not available. Skipping message send.');
      return;
    }

    try {
      const textMessage: TextMessage = {
        type: 'text',
        text: message,
      };

      await client.pushMessage(lineUserId, textMessage);
      logger.info(`Sent LINE message to ${lineUserId}`);
    } catch (error) {
      logger.error('Error sending LINE message:', error);
      throw error;
    }
  }

  /**
   * Send a notification using a template
   */
  static async sendTemplatedNotification(
    notification: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user
      const user = await User.findById(notification.userId);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.lineUserId) {
        return { success: false, error: 'User has no LINE ID connected' };
      }

      // Get template
      const templateKey = this.getTemplateKey(notification.type);
      const template = await MessageTemplate.findOne({
        key: templateKey,
        channel: 'line',
      });

      if (!template) {
        return { success: false, error: `Template not found: ${templateKey}` };
      }

      // Build message
      const message = this.replaceVariables(template.body, notification.payload);

      // Send
      await this.sendMessage(user.lineUserId, message);

      return { success: true };
    } catch (error: any) {
      logger.error('Error sending templated notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Map notification type to template key
   */
  private static getTemplateKey(type: NotificationType): string {
    const mapping: Record<NotificationType, string> = {
      [NotificationType.BOOKING_CONFIRMED]: 'booking_confirmed',
      [NotificationType.BOOKING_REJECTED]: 'booking_rejected',
      [NotificationType.REMINDER_24H]: 'reminder_24h',
      [NotificationType.REMINDER_6H]: 'reminder_6h',
      [NotificationType.MISSED_SESSION]: 'missed_session',
      [NotificationType.INACTIVE_30D]: 'inactive_30d',
      [NotificationType.PROMO]: 'promo',
      [NotificationType.BOOKING_REMINDER]: 'booking_reminder',
      [NotificationType.PACKAGE_EXPIRING]: 'package_expiring',
      [NotificationType.WELCOME]: 'welcome',
    };

    return mapping[type] || 'default';
  }

  /**
   * Process scheduled notifications
   * This is called by the background worker
   */
  static async processScheduledNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const now = new Date();

    // Find due notifications
    const notifications = await Notification.find({
      status: 'scheduled',
      scheduledFor: { $lte: now },
    }).limit(100); // Process in batches

    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      const result = await this.sendTemplatedNotification(notification);

      if (result.success) {
        notification.status = 'sent' as any;
        notification.sentAt = new Date();
        sent++;
      } else {
        notification.status = 'failed' as any;
        notification.errorMessage = result.error;
        failed++;
      }

      await notification.save();
    }

    logger.info(
      `Processed ${notifications.length} notifications: ${sent} sent, ${failed} failed`
    );

    return {
      processed: notifications.length,
      sent,
      failed,
    };
  }

  /**
   * Link a LINE user ID to a user account
   */
  static async linkUser(userId: string, lineUserId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lineUserId });
    logger.info(`Linked LINE user ${lineUserId} to user ${userId}`);
  }

  /**
   * Unlink LINE from a user account
   */
  static async unlinkUser(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lineUserId: null });
    logger.info(`Unlinked LINE from user ${userId}`);
  }
}
