import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { ValidationError } from '@/utils/validation';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle different error types
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.message,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation error',
      details: err.message,
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      error: 'Invalid ID format',
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    res.status(409).json({
      error: 'Duplicate key error',
      details: 'A record with this value already exists',
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { message: err.message, stack: err.stack }),
  });
};

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
