import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { AuthTokenPayload } from '@/types';

export const signToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as any);
};

export const signRefreshToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  } as any);
};

export const verifyToken = (token: string): AuthTokenPayload => {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as AuthTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
