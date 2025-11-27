import { Request, Response } from 'express';
import { WebhookEvent, validateSignature } from '@line/bot-sdk';
import { LineService } from './line.service';
import { config } from '@/config/env';
import { logger } from '@/config/logger';
import { User } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';

/**
 * LINE webhook handler
 * Receives events from LINE (messages, follows, etc.)
 */
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-line-signature'] as string;

  if (!signature) {
    throw new AppError('No signature found', 400);
  }

  // Validate signature
  const body = JSON.stringify(req.body);
  if (!validateSignature(body, config.lineChannelSecret, signature)) {
    throw new AppError('Invalid signature', 403);
  }

  const events: WebhookEvent[] = req.body.events;

  // Process each event
  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (error) {
      logger.error('Error handling LINE event:', error);
    }
  }

  res.json({ success: true });
});

/**
 * Handle individual LINE events
 */
async function handleEvent(event: WebhookEvent): Promise<void> {
  logger.info('Received LINE event:', event.type);

  switch (event.type) {
    case 'follow':
      // User followed the LINE account
      await handleFollow(event);
      break;

    case 'unfollow':
      // User unfollowed
      await handleUnfollow(event);
      break;

    case 'message':
      // User sent a message
      if (event.message.type === 'text') {
        await handleTextMessage(event);
      }
      break;

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle user following the LINE account
 */
async function handleFollow(event: any): Promise<void> {
  const lineUserId = event.source.userId;

  // Send welcome message
  const welcomeMessage = `
Welcome to ${config.studioName}! 👋

To link your account, please reply with your email address or phone number registered with us.

Or contact our admin to link your account manually.
  `.trim();

  await LineService.sendMessage(lineUserId, welcomeMessage);
}

/**
 * Handle user unfollowing
 */
async function handleUnfollow(event: any): Promise<void> {
  const lineUserId = event.source.userId;

  // Find and unlink user
  const user = await User.findOne({ lineUserId });
  if (user) {
    await LineService.unlinkUser(user._id.toString());
  }
}

/**
 * Handle text messages from users
 */
async function handleTextMessage(event: any): Promise<void> {
  const lineUserId = event.source.userId;
  const text = event.message.text.trim();

  // Check if user is already linked
  const existingUser = await User.findOne({ lineUserId });

  if (existingUser) {
    // User is linked - respond accordingly
    const response = `
Hi ${existingUser.name}! 👋

Your account is already linked. You'll receive booking confirmations and reminders here.

For bookings and inquiries, please use the website or contact the studio.
    `.trim();

    await LineService.sendMessage(lineUserId, response);
    return;
  }

  // Try to find user by email or phone
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[\d\s-()]+$/;

  let user = null;

  if (emailRegex.test(text)) {
    user = await User.findOne({ email: text.toLowerCase() });
  } else if (phoneRegex.test(text.replace(/[\s-()]/g, ''))) {
    const cleanPhone = text.replace(/[\s-()]/g, '');
    user = await User.findOne({ phone: { $regex: cleanPhone, $options: 'i' } });
  }

  if (user) {
    // Link the account
    await LineService.linkUser(user._id.toString(), lineUserId);

    const response = `
Great! Your account has been linked successfully. ✅

Name: ${user.name}
Email: ${user.email}

You'll now receive booking confirmations and reminders via LINE.
    `.trim();

    await LineService.sendMessage(lineUserId, response);
  } else {
    // User not found
    const response = `
We couldn't find an account with that email or phone number. 😕

Please make sure you're registered with us first, or contact our admin for assistance.
    `.trim();

    await LineService.sendMessage(lineUserId, response);
  }
}

/**
 * Link LINE manually (admin function)
 */
export const linkUserManually = asyncHandler(async (req: Request, res: Response) => {
  const { userId, lineUserId } = req.body;

  if (!userId || !lineUserId) {
    throw new AppError('userId and lineUserId are required', 400);
  }

  await LineService.linkUser(userId, lineUserId);

  res.json({
    message: 'LINE account linked successfully',
  });
});

/**
 * Unlink LINE
 */
export const unlinkUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  await LineService.unlinkUser(userId);

  res.json({
    message: 'LINE account unlinked successfully',
  });
});

/**
 * Get LINE connection status
 */
export const getConnectionStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const user = await User.findById(req.user._id);

  res.json({
    connected: !!user?.lineUserId,
    lineUserId: user?.lineUserId || null,
  });
});
