import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

/**
 * Format date for display in UI
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format date for chat messages
 */
export function formatChatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(dateObj)) {
    return format(dateObj, 'HH:mm');
  } else if (isYesterday(dateObj)) {
    return 'Yesterday';
  } else {
    return format(dateObj, 'MMM dd');
  }
}

/**
 * Format timestamp for trading
 */
export function formatTradingTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm');
}

/**
 * Check if date is within trading hours (example: 9:30 AM - 4:00 PM EST)
 */
export function isWithinTradingHours(date: Date = new Date()): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 9:30 AM = 570 minutes, 4:00 PM = 960 minutes
  return timeInMinutes >= 570 && timeInMinutes <= 960;
}

/**
 * Get market timezone offset
 */
export function getMarketTimezone(): string {
  return 'America/New_York'; // NYSE/NASDAQ timezone
}
