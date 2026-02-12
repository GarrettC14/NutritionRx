import * as Sentry from '@sentry/react-native';

/**
 * Lightweight paywall analytics tracker.
 * Logs events as Sentry breadcrumbs (for error context) and to console in dev.
 * Replace the body with a real analytics SDK call (Amplitude, Mixpanel, etc.)
 * when one is integrated.
 */
export function trackPaywallEvent(
  event: string,
  properties: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category: 'paywall',
    message: event,
    data: properties as Record<string, string>,
    level: 'info',
  });

  if (__DEV__) {
    console.log(`[Paywall] ${event}`, properties);
  }
}

/** Generate a UUID v4 session ID for paywall funnel tracking. */
export function generatePaywallSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
