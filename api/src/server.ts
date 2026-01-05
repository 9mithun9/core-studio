import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from '@/config/db';
import { logger } from '@/config/logger';
import { config } from '@/config/env';
import { errorHandler } from '@/middlewares';
import routes from '@/routes';
import { BookingAutoConfirmService } from '@/services/bookingAutoConfirmService';
import { SchedulerService } from '@/services/schedulerService';
import { initializeReportScheduler } from '@/services/reportScheduler';
import { initializeInactiveCustomerScheduler } from '@/services/inactiveCustomerScheduler';

const app: Application = express();

// Middleware
const allowedOrigins = [
  config.webUrl,
  'https://core-studio-web-mog7.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', routes);

// Error handling (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening
    app.listen(config.port, () => {
      logger.info(`Server running on ${config.apiUrl}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Studio timezone: ${config.studioTimezone}`);

      // Start auto-confirm service for pending bookings
      BookingAutoConfirmService.startPeriodicCheck();

      // Start scheduler service for automatic session completion
      SchedulerService.initialize();

      // Start report scheduler for automatic monthly payment reports
      initializeReportScheduler();

      // Start inactive customer scheduler for 15-day reminders
      initializeInactiveCustomerScheduler();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
