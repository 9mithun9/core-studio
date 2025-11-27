import { google } from 'googleapis';
import { config } from '@/config/env';
import { CalendarConnection, Booking } from '@/models';
import { logger } from '@/config/logger';
import { formatStudioTime } from '@/utils/time';

const oauth2Client = new google.auth.OAuth2(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUri
);

export class GoogleCalendarService {
  /**
   * Generate OAuth URL for teacher to connect their calendar
   */
  static getAuthUrl(userId: string): string {
    const scopes = ['https://www.googleapis.com/auth/calendar.events'];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId to identify after redirect
    });
  }

  /**
   * Exchange authorization code for tokens and save connection
   */
  static async handleCallback(code: string, userId: string): Promise<void> {
    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get tokens from Google');
      }

      oauth2Client.setCredentials(tokens);

      // Get user's calendar ID (primary calendar)
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find((cal) => cal.primary);

      if (!primaryCalendar || !primaryCalendar.id) {
        throw new Error('Could not find primary calendar');
      }

      // Save or update connection
      await CalendarConnection.findOneAndUpdate(
        { userId },
        {
          userId,
          googleAccountId: primaryCalendar.id,
          calendarId: primaryCalendar.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        },
        { upsert: true, new: true }
      );

      logger.info(`Google Calendar connected for user ${userId}`);
    } catch (error) {
      logger.error('Error handling Google Calendar callback:', error);
      throw error;
    }
  }

  /**
   * Get authenticated calendar client for a user
   */
  private static async getCalendarClient(userId: string) {
    const connection = await CalendarConnection.findOne({ userId });

    if (!connection) {
      throw new Error('No calendar connection found for this user');
    }

    // Check if token needs refresh
    if (connection.tokenExpiresAt < new Date()) {
      oauth2Client.setCredentials({
        refresh_token: connection.refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update stored tokens
      connection.accessToken = credentials.access_token!;
      connection.tokenExpiresAt = new Date(credentials.expiry_date || Date.now() + 3600000);
      await connection.save();

      oauth2Client.setCredentials(credentials);
    } else {
      oauth2Client.setCredentials({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
      });
    }

    return {
      calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
      calendarId: connection.calendarId,
    };
  }

  /**
   * Create a calendar event for a confirmed booking
   */
  static async createEvent(booking: any): Promise<string> {
    try {
      const { calendar, calendarId } = await this.getCalendarClient(booking.teacherId.userId);

      const customerName = booking.customerId.userId?.name || 'Customer';

      const event = {
        summary: `Pilates - ${customerName}`,
        description: `
Type: ${booking.type}
Customer: ${customerName}
Package: ${booking.packageId?.name || 'N/A'}
Notes: ${booking.notes || 'None'}
        `.trim(),
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        location: booking.location || config.studioName,
      };

      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      logger.info(`Created Google Calendar event ${response.data.id} for booking ${booking._id}`);

      return response.data.id!;
    } catch (error) {
      logger.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  static async updateEvent(booking: any): Promise<void> {
    try {
      if (!booking.googleCalendarEventId) {
        throw new Error('No calendar event ID found for this booking');
      }

      const { calendar, calendarId } = await this.getCalendarClient(booking.teacherId.userId);

      const customerName = booking.customerId.userId?.name || 'Customer';

      const event = {
        summary: `Pilates - ${customerName}`,
        description: `
Type: ${booking.type}
Customer: ${customerName}
Package: ${booking.packageId?.name || 'N/A'}
Notes: ${booking.notes || 'None'}
        `.trim(),
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        location: booking.location || config.studioName,
      };

      await calendar.events.update({
        calendarId,
        eventId: booking.googleCalendarEventId,
        requestBody: event,
      });

      logger.info(`Updated Google Calendar event ${booking.googleCalendarEventId}`);
    } catch (error) {
      logger.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  static async deleteEvent(booking: any): Promise<void> {
    try {
      if (!booking.googleCalendarEventId) {
        return; // Nothing to delete
      }

      const { calendar, calendarId } = await this.getCalendarClient(booking.teacherId.userId);

      await calendar.events.delete({
        calendarId,
        eventId: booking.googleCalendarEventId,
      });

      logger.info(`Deleted Google Calendar event ${booking.googleCalendarEventId}`);
    } catch (error) {
      logger.error('Error deleting Google Calendar event:', error);
      // Don't throw - event might already be deleted
    }
  }

  /**
   * Disconnect calendar for a user
   */
  static async disconnect(userId: string): Promise<void> {
    await CalendarConnection.deleteOne({ userId });
    logger.info(`Disconnected Google Calendar for user ${userId}`);
  }
}
