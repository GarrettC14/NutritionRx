/**
 * Week Utilities
 * Date helpers for weekly boundary calculations
 */

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * Get the Sunday that starts the week containing the given date.
 * Uses UTC to avoid timezone shifts.
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return toDateString(d);
}

/**
 * Get the Saturday that ends the week starting on weekStart.
 */
export function getWeekEnd(weekStart: string): string {
  return addDays(weekStart, 6);
}

/**
 * Add days to a date string, returning a new date string.
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/**
 * Format a week range for display: "Jan 26-Feb 1" or "Jan 26-31"
 */
export function formatWeekRange(weekStart: string): string {
  const startParts = weekStart.split('-').map(Number);
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const endStr = addDays(weekStart, 6);
  const endParts = endStr.split('-').map(Number);
  const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}\u2013${endDay}`;
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}`;
}

/**
 * Check if a week start date represents the current week.
 */
export function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getWeekStart();
}

/**
 * Get the day name for a day-of-week index (0=Sunday).
 */
export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? 'Unknown';
}

/**
 * Convert a Date to YYYY-MM-DD string without timezone issues.
 */
function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to get the day of week (0=Sunday).
 */
export function getDayOfWeek(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.getDay();
}
