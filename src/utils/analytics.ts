import * as Sentry from '@sentry/react-native';

/**
 * Shared analytics event tracker.
 * Logs events as Sentry breadcrumbs (for error context) and to console in dev.
 * Replace the body with a PostHog / Amplitude call when integrated.
 */
export function trackEvent(
  event: string,
  properties: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: event,
    data: properties as Record<string, string>,
    level: 'info',
  });

  if (__DEV__) {
    console.log(`[Analytics] ${event}`, properties);
  }
}
