import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  webUrl: process.env.WEB_URL || 'http://localhost:3000',

  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Studio Configuration
  studioTimezone: process.env.STUDIO_TIMEZONE || 'Asia/Bangkok',
  studioName: process.env.STUDIO_NAME || 'Core Studio Pilates',
  studioEmail: process.env.STUDIO_EMAIL || 'info@corestudio.com',
  studioPhone: process.env.STUDIO_PHONE || '+66-xxx-xxx-xxxx',

  // Google Calendar
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',

  // LINE Messaging
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET || '',
  lineWebhookUrl: process.env.LINE_WEBHOOK_URL || 'http://localhost:5000/api/webhook/line',

  // Booking Rules
  minBookingHoursAdvance: parseInt(process.env.MIN_BOOKING_HOURS_ADVANCE || '24', 10),
  sessionDurationMinutes: parseInt(process.env.SESSION_DURATION_MINUTES || '60', 10),
  cancellationHoursBefore: parseInt(process.env.CANCELLATION_HOURS_BEFORE || '24', 10),
};
