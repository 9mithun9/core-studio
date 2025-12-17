import { format as dateFnsFormat, parseISO, addHours } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const STUDIO_TZ = process.env.NEXT_PUBLIC_STUDIO_TIMEZONE || 'Asia/Bangkok';

export const formatDate = (date: string | Date, formatStr: string = 'PPP'): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(parsedDate, formatStr);
};

export const formatDateTime = (date: string | Date, formatStr: string = 'PPP p'): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(parsedDate, formatStr);
};

export const formatStudioTime = (date: string | Date, formatStr: string = 'PPP p'): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  // Just format in local timezone (which should be Bangkok for users in Thailand)
  // Don't use formatInTimeZone as it causes double conversion
  return dateFnsFormat(parsedDate, formatStr);
};

export const formatTime = (date: string | Date): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(parsedDate, 'p');
};

export const isValidBookingTime = (desiredTime: Date, minHoursAdvance: number = 24): boolean => {
  const now = new Date();
  const minTime = addHours(now, minHoursAdvance);
  return desiredTime >= minTime;
};

// Create a date in the studio timezone
export const createStudioDateTime = (date: Date, hours: number, minutes: number): Date => {
  // Create a date object in local time
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Create a date with the selected time in local timezone
  // This assumes the user's browser is set to Bangkok timezone
  return new Date(year, month, day, hours, minutes, 0, 0);
};
