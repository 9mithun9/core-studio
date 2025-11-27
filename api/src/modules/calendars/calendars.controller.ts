import { Request, Response } from 'express';
import { GoogleCalendarService } from './google.service';
import { AppError, asyncHandler } from '@/middlewares';
import { CalendarConnection } from '@/models';

export const getAuthUrl = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const authUrl = GoogleCalendarService.getAuthUrl(req.user._id.toString());

  res.json({
    authUrl,
  });
});

export const handleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || !state) {
    throw new AppError('Missing code or state parameter', 400);
  }

  const userId = state as string;

  await GoogleCalendarService.handleCallback(code as string, userId);

  res.json({
    message: 'Google Calendar connected successfully',
  });
});

export const getConnection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const connection = await CalendarConnection.findOne({ userId: req.user._id }).select(
    '-accessToken -refreshToken'
  );

  res.json({
    connected: !!connection,
    connection: connection || null,
  });
});

export const disconnect = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  await GoogleCalendarService.disconnect(req.user._id.toString());

  res.json({
    message: 'Google Calendar disconnected successfully',
  });
});
