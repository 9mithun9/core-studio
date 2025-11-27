import express, { Application } from 'express';
import cors from 'cors';
import { connectDB } from '@/config/db';
import { logger } from '@/config/logger';
import { config } from '@/config/env';
import { errorHandler } from '@/middlewares';
import routes from '@/routes';

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.webUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
