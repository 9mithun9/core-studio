import { format as dateFnsFormat, parseISO, addHours } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

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
  const zonedDate = toZonedTime(parsedDate, STUDIO_TZ);
  return formatTz(zonedDate, formatStr, { timeZone: STUDIO_TZ });
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
