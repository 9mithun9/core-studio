import mongoose from 'mongoose';
import { config } from './env';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error:', error);
});
