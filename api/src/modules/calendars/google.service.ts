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
   * Generate OAuth URL for admin to connect studio calendar
   */
  static getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to get refresh token
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

      logger.info('Received tokens from Google:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      });

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // If no refresh token, user might have already authorized - try to get it
      if (!tokens.refresh_token) {
        logger.warn('No refresh token received. User may need to revoke access and reconnect.');
        // Check if we have an existing refresh token
        const existingConnection = await CalendarConnection.findOne({ userId });
        if (existingConnection?.refreshToken) {
          logger.info('Using existing refresh token');
          tokens.refresh_token = existingConnection.refreshToken;
        } else {
          throw new Error('No refresh token available. Please revoke app access in Google account settings and reconnect.');
        }
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
   * Uses the studio calendar (not individual teacher calendars)
   */
  static async createEvent(booking: any): Promise<string> {
    try {
      // Use the studio calendar connection (connected by admin)
      const connection = await CalendarConnection.findOne().sort({ createdAt: -1 });

      if (!connection) {
        logger.warn('No studio calendar connected, skipping event creation');
        return '';
      }

      // Check if token needs refresh
      if (connection.tokenExpiresAt < new Date()) {
        oauth2Client.setCredentials({
          refresh_token: connection.refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

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

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const customerName = booking.customerId.userId?.name || 'Customer';
      const teacherName = booking.teacherId.userId?.name || 'Teacher';

      // Create simple event - one calendar card per booking
      const summary = `Pilates - ${customerName}`;
      const description = `
Teacher: ${teacherName}
Type: ${booking.type}
Customer: ${customerName}
Package: ${booking.packageId?.name || 'N/A'}
Notes: ${booking.notes || 'None'}
      `.trim();

      // Assign different colors for different teachers
      // Google Calendar color IDs: 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana, 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
      // Use teacher ID hash to consistently assign same color to same teacher
      const teacherIdStr = booking.teacherId._id?.toString() || '0';
      const colorId = ((parseInt(teacherIdStr.slice(-2), 16) % 11) + 1).toString();

      const event = {
        summary,
        description,
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        location: booking.location || config.studioName,
        colorId: colorId, // Different color for each teacher
      };

      const response = await calendar.events.insert({
        calendarId: connection.calendarId,
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
   * Uses the studio calendar (not individual teacher calendars)
   */
  static async updateEvent(booking: any): Promise<void> {
    try {
      if (!booking.googleCalendarEventId) {
        throw new Error('No calendar event ID found for this booking');
      }

      // Use the studio calendar connection
      const connection = await CalendarConnection.findOne().sort({ createdAt: -1 });

      if (!connection) {
        logger.warn('No studio calendar connected, skipping event update');
        return;
      }

      // Check if token needs refresh
      if (connection.tokenExpiresAt < new Date()) {
        oauth2Client.setCredentials({
          refresh_token: connection.refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

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

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const customerName = booking.customerId.userId?.name || 'Customer';
      const teacherName = booking.teacherId.userId?.name || 'Teacher';

      // Create simple event - one calendar card per booking
      const summary = `Pilates - ${customerName}`;
      const description = `
Teacher: ${teacherName}
Type: ${booking.type}
Customer: ${customerName}
Package: ${booking.packageId?.name || 'N/A'}
Notes: ${booking.notes || 'None'}
      `.trim();

      // Assign different colors for different teachers
      // Google Calendar color IDs: 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana, 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
      // Use teacher ID hash to consistently assign same color to same teacher
      const teacherIdStr = booking.teacherId._id?.toString() || '0';
      const colorId = ((parseInt(teacherIdStr.slice(-2), 16) % 11) + 1).toString();

      const event = {
        summary,
        description,
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: config.studioTimezone,
        },
        location: booking.location || config.studioName,
        colorId: colorId, // Different color for each teacher
      };

      await calendar.events.update({
        calendarId: connection.calendarId,
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
   * Uses the studio calendar (not individual teacher calendars)
   */
  static async deleteEvent(booking: any): Promise<void> {
    try {
      if (!booking.googleCalendarEventId) {
        return; // Nothing to delete
      }

      // Use the studio calendar connection
      const connection = await CalendarConnection.findOne().sort({ createdAt: -1 });

      if (!connection) {
        logger.warn('No studio calendar connected, skipping event deletion');
        return;
      }

      // Check if token needs refresh
      if (connection.tokenExpiresAt < new Date()) {
        oauth2Client.setCredentials({
          refresh_token: connection.refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

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

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      await calendar.events.delete({
        calendarId: connection.calendarId,
        eventId: booking.googleCalendarEventId,
      });

      logger.info(`Deleted Google Calendar event ${booking.googleCalendarEventId}`);
    } catch (error) {
      logger.error('Error deleting Google Calendar event:', error);
      // Don't throw - event might already be deleted
    }
  }

  /**
   * Get busy time slots from the STUDIO's Google Calendar (not teacher-specific)
   * This uses the admin's connected calendar which represents the studio's availability
   */
  static async getBusyTimes(
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ start: Date; end: Date; teacher?: string; type?: string }>> {
    try {
      logger.info('getBusyTimes called', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // Find the studio calendar connection (connected by admin)
      const connection = await CalendarConnection.findOne().sort({ createdAt: -1 });

      if (!connection) {
        logger.info('No studio calendar connected');
        return [];
      }

      logger.info('Found calendar connection', {
        calendarId: connection.calendarId,
        tokenExpiresAt: connection.tokenExpiresAt,
      });

      // Check if token needs refresh
      if (connection.tokenExpiresAt < new Date()) {
        logger.info('Token expired, refreshing...');
        oauth2Client.setCredentials({
          refresh_token: connection.refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update stored tokens
        connection.accessToken = credentials.access_token!;
        connection.tokenExpiresAt = new Date(credentials.expiry_date || Date.now() + 3600000);
        await connection.save();

        oauth2Client.setCredentials(credentials);
        logger.info('Token refreshed successfully');
      } else {
        oauth2Client.setCredentials({
          access_token: connection.accessToken,
          refresh_token: connection.refreshToken,
        });
        logger.info('Using existing token');
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      logger.info('Fetching events from Google Calendar', {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        calendarId: connection.calendarId,
      });

      // Fetch actual events to get details like teacher name and type
      const eventsResponse = await calendar.events.list({
        calendarId: connection.calendarId,
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = eventsResponse.data.items || [];

      logger.info('Events found', {
        count: events.length,
        events: events.map(e => ({ summary: e.summary, start: e.start, end: e.end })),
      });

      const result = events.map((event) => {
        // Parse description to extract teacher and type
        const description = event.description || '';
        const teacherMatch = description.match(/Teacher:\s*(.+?)(?:\n|$)/);
        const typeMatch = description.match(/Type:\s*(.+?)(?:\n|$)/);

        return {
          start: new Date(event.start?.dateTime || event.start?.date!),
          end: new Date(event.end?.dateTime || event.end?.date!),
          teacher: teacherMatch ? teacherMatch[1].trim() : undefined,
          type: typeMatch ? typeMatch[1].trim() : undefined,
        };
      });

      logger.info('Returning busy times with details', {
        count: result.length,
        times: result,
      });

      return result;
    } catch (error) {
      logger.error('Error fetching busy times from Google Calendar:', error);
      // Return empty array if calendar is not connected or error occurs
      return [];
    }
  }

  /**
   * Check if studio calendar is connected
   */
  static async hasCalendarConnected(): Promise<boolean> {
    const connection = await CalendarConnection.findOne();
    return !!connection;
  }

  /**
   * Disconnect calendar for a user
   */
  static async disconnect(userId: string): Promise<void> {
    await CalendarConnection.deleteOne({ userId });
    logger.info(`Disconnected Google Calendar for user ${userId}`);
  }
}
