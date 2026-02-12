/**
 * Sentry Helpers
 * Shared utilities for Sentry integration — expected error filtering and privacy scrubbing.
 */

/**
 * Check if an error is expected/ignorable and should NOT be sent to Sentry.
 * User cancellations, network timeouts, and aborted requests are normal
 * mobile conditions, not bugs.
 */
export function isExpectedError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('user cancelled') ||
      msg.includes('user canceled') ||
      msg.includes('network request failed') ||
      msg.includes('aborted') ||
      msg.includes('timeout')
    );
  }
  // RevenueCat user cancellation
  if (typeof error === 'object' && error !== null && 'userCancelled' in error) {
    return (error as { userCancelled: boolean }).userCancelled;
  }
  return false;
}

/** Keys that indicate nutrition/health PII — used for breadcrumb and event scrubbing. */
export const SENSITIVE_KEYS = [
  'calories', 'protein', 'carbs', 'fat', 'weight', 'food',
  'meal', 'serving', 'macros', 'grams', 'intake',
] as const;

/** Regex to catch accidental nutrition values in free-text fields. */
export const NUTRITION_PATTERN = /\b(\d+\s*(cal|kcal|g|oz|mg|serving|macro)s?\b)/gi;

/** Recursively strip sensitive keys from an object (mutates in place). */
export function scrubSensitiveData(obj: Record<string, any>): void {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk))) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      scrubSensitiveData(obj[key]);
    }
  }
}
