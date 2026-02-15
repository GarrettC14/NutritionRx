jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

import * as Sentry from '@sentry/react-native';
import {
  trackPaywallEvent,
  generatePaywallSessionId,
} from '@/utils/paywallAnalytics';

// ---------------------------------------------------------------------------
// trackPaywallEvent
// ---------------------------------------------------------------------------
describe('trackPaywallEvent', () => {
  const mockAddBreadcrumb = Sentry.addBreadcrumb as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Sentry.addBreadcrumb with category "paywall"', () => {
    trackPaywallEvent('paywall_shown', { source: 'settings' });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'paywall' }),
    );
  });

  it('passes event as message and properties as data', () => {
    const event = 'purchase_started';
    const properties = { product: 'monthly', price: '$4.99' };

    trackPaywallEvent(event, properties);

    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'paywall',
      message: event,
      data: properties,
      level: 'info',
    });
  });

  it('handles empty properties', () => {
    trackPaywallEvent('paywall_dismissed', {});

    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'paywall',
      message: 'paywall_dismissed',
      data: {},
      level: 'info',
    });
  });

  it('logs to console when __DEV__ is true', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const event = 'paywall_shown';
    const properties = { source: 'onboarding' };

    trackPaywallEvent(event, properties);

    expect(spy).toHaveBeenCalledWith(`[Paywall] ${event}`, properties);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// generatePaywallSessionId
// ---------------------------------------------------------------------------
describe('generatePaywallSessionId', () => {
  const UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('returns a string', () => {
    expect(typeof generatePaywallSessionId()).toBe('string');
  });

  it('matches UUID v4 format', () => {
    const id = generatePaywallSessionId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('always has "4" in the version position', () => {
    for (let i = 0; i < 50; i++) {
      const id = generatePaywallSessionId();
      // Version nibble is the 15th hex character (index 14), which falls
      // at string index 14 after accounting for hyphens at positions 8 and 13.
      // In the pattern xxxxxxxx-xxxx-4xxx, the '4' is at string index 14.
      expect(id[14]).toBe('4');
    }
  });

  it('y position (variant) is always 8, 9, a, or b', () => {
    for (let i = 0; i < 50; i++) {
      const id = generatePaywallSessionId();
      // The variant nibble is at string index 19 (xxxxxxxx-xxxx-4xxx-Yxxx-...)
      expect(['8', '9', 'a', 'b']).toContain(id[19]);
    }
  });

  it('produces different IDs on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generatePaywallSessionId());
    }
    // With 100 random v4 UUIDs, collisions are astronomically unlikely.
    expect(ids.size).toBe(100);
  });

  it('has correct length (36 characters including hyphens)', () => {
    const id = generatePaywallSessionId();
    expect(id.length).toBe(36);
  });
});
