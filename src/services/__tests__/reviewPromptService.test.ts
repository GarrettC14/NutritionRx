import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking, Alert } from 'react-native';

// ── Mocks ──

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: { ...RN.Linking, openURL: jest.fn() },
    Alert: { ...RN.Alert, alert: jest.fn() },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    ios: { bundleIdentifier: 'com.nutritionrx.app' },
    android: { package: 'com.nutritionrx.app' },
    extra: {
      appStoreUrl: 'https://apps.apple.com/app/nutritionrx/id123456789',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.nutritionrx.app',
    },
  },
}));

jest.mock('@/repositories/reflectionRepository', () => ({
  reflectionRepository: {
    getCount: jest.fn(),
  },
}));

jest.mock('@/stores/routeStore', () => ({
  useRouteStore: {
    getState: jest.fn(() => ({ currentPath: '/' })),
  },
}));

jest.mock('@/utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

import * as StoreReview from 'expo-store-review';
import { reflectionRepository } from '@/repositories/reflectionRepository';
import { useRouteStore } from '@/stores/routeStore';
import { trackEvent } from '@/utils/analytics';
import { reviewPromptService } from '../reviewPromptService';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockStoreReview = StoreReview as jest.Mocked<typeof StoreReview>;
const mockReflectionRepo = reflectionRepository as jest.Mocked<typeof reflectionRepository>;
const mockRouteStore = useRouteStore as unknown as { getState: jest.Mock };
const mockTrackEvent = trackEvent as jest.Mock;

// ── Helpers ──

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** Set up all gates to pass by default. */
function setupPassingGates() {
  mockStoreReview.isAvailableAsync.mockResolvedValue(true);
  mockReflectionRepo.getCount.mockResolvedValue(5);
  mockRouteStore.getState.mockReturnValue({ currentPath: '/' });

  // Install date 30 days ago
  mockAsyncStorage.getItem.mockImplementation((key: string) => {
    if (key === '@NutritionRx:installDate') return Promise.resolve(daysAgo(30));
    if (key === '@NutritionRx:reviewPromptDates') return Promise.resolve(null);
    return Promise.resolve(null);
  });
}

// ── Tests ──

describe('reviewPromptService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reviewPromptService._resetInFlightForTesting();
  });

  // ── initializeInstallDate ──

  describe('initializeInstallDate', () => {
    it('sets install date on first launch', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await reviewPromptService.initializeInstallDate();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@NutritionRx:installDate',
        expect.any(String),
      );
    });

    it('does not overwrite existing install date', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('2025-01-01T00:00:00.000Z');
      await reviewPromptService.initializeInstallDate();
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // ── onReflectionCompleted — all gates pass ──

  describe('onReflectionCompleted — all gates pass', () => {
    it('requests native review when all gates pass', async () => {
      setupPassingGates();

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_requested',
        expect.objectContaining({ reflectionCount: 5 }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith('review_prompt_completed', {});
    });

    it('records prompt date after successful request', async () => {
      setupPassingGates();

      await reviewPromptService.onReflectionCompleted('neutral');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@NutritionRx:reviewPromptDates',
        expect.any(String),
      );
    });

    it('allows null sentiment (passes gate)', async () => {
      setupPassingGates();

      await reviewPromptService.onReflectionCompleted(null);

      expect(mockStoreReview.requestReview).toHaveBeenCalled();
    });
  });

  // ── Gate: Platform availability ──

  describe('Gate: platform availability', () => {
    it('skips when store review is not available', async () => {
      setupPassingGates();
      mockStoreReview.isAvailableAsync.mockResolvedValue(false);

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        { reason: 'not_available' },
      );
    });
  });

  // ── Gate: Minimum reflections ──

  describe('Gate: minimum reflections', () => {
    it('skips when fewer than 3 reflections', async () => {
      setupPassingGates();
      mockReflectionRepo.getCount.mockResolvedValue(2);

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        expect.objectContaining({ reason: 'insufficient_reflections' }),
      );
    });

    it('passes at exactly 3 reflections', async () => {
      setupPassingGates();
      mockReflectionRepo.getCount.mockResolvedValue(3);

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).toHaveBeenCalled();
    });
  });

  // ── Gate: Days since install ──

  describe('Gate: days since install', () => {
    it('skips when installed less than 21 days ago', async () => {
      setupPassingGates();
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@NutritionRx:installDate') return Promise.resolve(daysAgo(10));
        if (key === '@NutritionRx:reviewPromptDates') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        expect.objectContaining({ reason: 'too_soon' }),
      );
    });

    it('skips when no install date found', async () => {
      setupPassingGates();
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@NutritionRx:installDate') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        { reason: 'no_install_date' },
      );
    });
  });

  // ── Gate: Cooldown (90 days) ──

  describe('Gate: cooldown', () => {
    it('skips when last prompt was fewer than 90 days ago', async () => {
      setupPassingGates();
      const recentPrompt = daysAgo(30);
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@NutritionRx:installDate') return Promise.resolve(daysAgo(120));
        if (key === '@NutritionRx:reviewPromptDates') {
          return Promise.resolve(JSON.stringify([recentPrompt]));
        }
        return Promise.resolve(null);
      });

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        expect.objectContaining({ reason: 'cooldown' }),
      );
    });

    it('passes when last prompt was 90+ days ago', async () => {
      setupPassingGates();
      const oldPrompt = daysAgo(100);
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@NutritionRx:installDate') return Promise.resolve(daysAgo(200));
        if (key === '@NutritionRx:reviewPromptDates') {
          return Promise.resolve(JSON.stringify([oldPrompt]));
        }
        return Promise.resolve(null);
      });

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).toHaveBeenCalled();
    });
  });

  // ── Gate: Annual cap ──

  describe('Gate: annual cap', () => {
    it('skips when 3 prompts have already occurred in the last 365 days', async () => {
      setupPassingGates();
      const prompts = [daysAgo(300), daysAgo(200), daysAgo(100)];
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@NutritionRx:installDate') return Promise.resolve(daysAgo(400));
        if (key === '@NutritionRx:reviewPromptDates') {
          return Promise.resolve(JSON.stringify(prompts));
        }
        return Promise.resolve(null);
      });

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        expect.objectContaining({ reason: 'annual_cap' }),
      );
    });
  });

  // ── Gate: Sentiment ──

  describe('Gate: sentiment', () => {
    it('skips when sentiment is negative', async () => {
      setupPassingGates();

      await reviewPromptService.onReflectionCompleted('negative');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        { reason: 'negative_sentiment' },
      );
    });

    it('allows positive sentiment', async () => {
      setupPassingGates();
      await reviewPromptService.onReflectionCompleted('positive');
      expect(mockStoreReview.requestReview).toHaveBeenCalled();
    });

    it('allows neutral sentiment', async () => {
      setupPassingGates();
      await reviewPromptService.onReflectionCompleted('neutral');
      expect(mockStoreReview.requestReview).toHaveBeenCalled();
    });
  });

  // ── Gate: Blocked routes ──

  describe('Gate: blocked routes', () => {
    const blockedRoutes = [
      '/add-food',
      '/food/abc123',
      '/log-entry/abc123',
      '/log-weight',
      '/onboarding',
      '/weekly-reflection',
    ];

    it.each(blockedRoutes)('skips when on blocked route: %s', async (route) => {
      setupPassingGates();
      mockRouteStore.getState.mockReturnValue({ currentPath: route });

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_skipped',
        expect.objectContaining({ reason: 'blocked_route' }),
      );
    });

    it('does NOT block routes that merely contain "log" (v2 fix #4)', async () => {
      setupPassingGates();
      // "changelog" or "blog" should NOT be blocked
      mockRouteStore.getState.mockReturnValue({ currentPath: '/settings/changelog' });

      await reviewPromptService.onReflectionCompleted('positive');

      expect(mockStoreReview.requestReview).toHaveBeenCalled();
    });
  });

  // ── getStoreReviewUrl ──

  describe('getStoreReviewUrl', () => {
    it('returns URL with action=write-review appended (iOS)', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const url = reviewPromptService.getStoreReviewUrl();
      expect(url).toBe(
        'https://apps.apple.com/app/nutritionrx/id123456789?action=write-review',
      );
    });

    it('appends with & when URL already has query params (Android)', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const url = reviewPromptService.getStoreReviewUrl();
      expect(url).toBe(
        'https://play.google.com/store/apps/details?id=com.nutritionrx.app&action=write-review',
      );
    });
  });

  // ── handleRateApp ──

  describe('handleRateApp', () => {
    it('opens the store URL via Linking', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

      await reviewPromptService.handleRateApp();

      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('action=write-review'),
      );
    });

    it('shows fallback alert when Linking.openURL fails', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      (Linking.openURL as jest.Mock).mockRejectedValue(new Error('fail'));

      await reviewPromptService.handleRateApp();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Rate NutritionRx',
        expect.stringContaining('Search for'),
        expect.anything(),
      );
    });

    it('shows fallback alert when getStoreReviewUrl returns null (v2 fix #1)', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });

      await reviewPromptService.handleRateApp();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Rate NutritionRx',
        expect.stringContaining('Search for'),
        expect.anything(),
      );
    });
  });

  // ── Error handling ──

  describe('error handling', () => {
    it('catches errors and does not throw', async () => {
      setupPassingGates();
      mockStoreReview.requestReview.mockRejectedValue(new Error('native error'));

      await expect(
        reviewPromptService.onReflectionCompleted('positive'),
      ).resolves.not.toThrow();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'review_prompt_error',
        expect.objectContaining({ error: expect.stringContaining('native error') }),
      );
    });
  });
});
