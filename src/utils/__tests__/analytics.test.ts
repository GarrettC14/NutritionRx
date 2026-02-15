jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

import * as Sentry from '@sentry/react-native';
import { trackEvent } from '@/utils/analytics';

describe('trackEvent', () => {
  const mockAddBreadcrumb = Sentry.addBreadcrumb as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Sentry.addBreadcrumb with correct params', () => {
    const event = 'button_pressed';
    const properties = { screen: 'home', buttonId: 'save' };

    trackEvent(event, properties);

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'analytics',
      message: event,
      data: properties,
      level: 'info',
    });
  });

  it('logs to console when __DEV__ is true', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const event = 'page_view';
    const properties = { page: 'dashboard' };

    trackEvent(event, properties);

    expect(spy).toHaveBeenCalledWith(`[Analytics] ${event}`, properties);
    spy.mockRestore();
  });

  it('handles multiple consecutive calls correctly', () => {
    trackEvent('event_1', { a: 1 });
    trackEvent('event_2', { b: 2 });
    trackEvent('event_3', { c: 3 });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(3);

    expect(mockAddBreadcrumb).toHaveBeenNthCalledWith(1, {
      category: 'analytics',
      message: 'event_1',
      data: { a: 1 },
      level: 'info',
    });
    expect(mockAddBreadcrumb).toHaveBeenNthCalledWith(2, {
      category: 'analytics',
      message: 'event_2',
      data: { b: 2 },
      level: 'info',
    });
    expect(mockAddBreadcrumb).toHaveBeenNthCalledWith(3, {
      category: 'analytics',
      message: 'event_3',
      data: { c: 3 },
      level: 'info',
    });
  });

  it('passes empty properties object correctly', () => {
    trackEvent('empty_props', {});

    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'analytics',
      message: 'empty_props',
      data: {},
      level: 'info',
    });
  });
});
