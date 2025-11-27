import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { addHours, addMinutes, parseISO } from 'date-fns';
import { config } from '@/config/env';

export const STUDIO_TZ = config.studioTimezone;

/**
 * Convert a date/time string in studio timezone to UTC Date
 */
export const toUTC = (dateString: string): Date => {
  const parsedDate = parseISO(dateString);
  return zonedTimeToUtc(parsedDate, STUDIO_TZ);
};

/**
 * Convert a UTC Date to studio timezone
 */
export const toStudioTime = (date: Date): Date => {
  return utcToZonedTime(date, STUDIO_TZ);
};

/**
 * Format a UTC date to studio timezone string
 */
export const formatStudioTime = (date: Date, formatStr: string = 'yyyy-MM-dd HH:mm:ss zzz'): string => {
  return format(toStudioTime(date), formatStr, { timeZone: STUDIO_TZ });
};

/**
 * Get current time in studio timezone
 */
export const nowInStudioTime = (): Date => {
  return toStudioTime(new Date());
};

/**
 * Check if a booking time is at least N hours in the future (from studio timezone perspective)
 */
export const isBookingTimeValid = (desiredTime: Date, minHoursAdvance: number): boolean => {
  const now = nowInStudioTime();
  const minTime = addHours(now, minHoursAdvance);
  const desiredInStudioTime = toStudioTime(desiredTime);

  return desiredInStudioTime >= minTime;
};

/**
 * Add minutes to a date
 */
export const addMinutesToDate = (date: Date, minutes: number): Date => {
  return addMinutes(date, minutes);
};

/**
 * Parse ISO string or return date as-is
 */
export const parseDate = (input: string | Date): Date => {
  if (input instanceof Date) {
    return input;
  }
  return parseISO(input);
};
