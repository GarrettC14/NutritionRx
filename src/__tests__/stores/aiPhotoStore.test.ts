/**
 * AI Photo Store Tests
 * Tests for AI photo quota and usage state management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAIPhotoStore } from '@/stores/aiPhotoStore';
import { AI_PHOTO_LIMITS } from '@/types/ai-photo';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const QUOTA_STORAGE_KEY = '@ai_photo_quota';

describe('aiPhotoStore', () => {
  beforeEach(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    useAIPhotoStore.setState({
      quota: {
        dailyUsed: 0,
        dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
        monthlyUsed: 0,
        monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
        lastResetDate: today,
        lastMonthlyResetDate: thisMonth,
      },
      isLoading: false,
      isLoaded: false,
      error: null,
      isPremium: false,
    });

    jest.clearAllMocks();
  });

  // ============================================================
  // Initial State
  // ============================================================

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useAIPhotoStore.getState();

      expect(state.quota.dailyUsed).toBe(0);
      expect(state.quota.monthlyUsed).toBe(0);
      expect(state.quota.dailyLimit).toBe(AI_PHOTO_LIMITS.DAILY_FREE);
      expect(state.quota.monthlyLimit).toBe(AI_PHOTO_LIMITS.MONTHLY_FREE);
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(false);
      expect(state.isPremium).toBe(false);
    });

    it('quota lastResetDate is today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(useAIPhotoStore.getState().quota.lastResetDate).toBe(today);
    });
  });

  // ============================================================
  // loadQuota
  // ============================================================

  describe('loadQuota', () => {
    it('short-circuits if already loaded', async () => {
      useAIPhotoStore.setState({ isLoaded: true });

      await useAIPhotoStore.getState().loadQuota();

      expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('creates default quota when no stored quota exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await useAIPhotoStore.getState().loadQuota();

      const state = useAIPhotoStore.getState();
      expect(state.quota.dailyUsed).toBe(0);
      expect(state.quota.monthlyUsed).toBe(0);
      expect(state.isLoaded).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('loads and preserves stored quota from same day', async () => {
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = today.substring(0, 7);
      const storedQuota = {
        dailyUsed: 5,
        dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
        monthlyUsed: 50,
        monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
        lastResetDate: today,
        lastMonthlyResetDate: thisMonth,
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedQuota));

      await useAIPhotoStore.getState().loadQuota();

      const state = useAIPhotoStore.getState();
      expect(state.quota.dailyUsed).toBe(5);
      expect(state.quota.monthlyUsed).toBe(50);
    });

    it('resets daily usage when stored quota is from a different day', async () => {
      const storedQuota = {
        dailyUsed: 8,
        dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
        monthlyUsed: 50,
        monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
        lastResetDate: '2023-01-01',
        lastMonthlyResetDate: new Date().toISOString().substring(0, 7),
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedQuota));

      await useAIPhotoStore.getState().loadQuota();

      const state = useAIPhotoStore.getState();
      expect(state.quota.dailyUsed).toBe(0);
      // Monthly should be preserved if same month
    });

    it('resets monthly usage when stored quota is from a different month', async () => {
      const storedQuota = {
        dailyUsed: 3,
        dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
        monthlyUsed: 100,
        monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
        lastResetDate: '2023-01-01',
        lastMonthlyResetDate: '2023-01',
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedQuota));

      await useAIPhotoStore.getState().loadQuota();

      const state = useAIPhotoStore.getState();
      expect(state.quota.dailyUsed).toBe(0);
      expect(state.quota.monthlyUsed).toBe(0);
    });

    it('applies premium limits when isPremium is true', async () => {
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = today.substring(0, 7);
      useAIPhotoStore.setState({ isPremium: true });

      const storedQuota = {
        dailyUsed: 2,
        dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
        monthlyUsed: 10,
        monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
        lastResetDate: today,
        lastMonthlyResetDate: thisMonth,
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedQuota));

      await useAIPhotoStore.getState().loadQuota();

      const state = useAIPhotoStore.getState();
      expect(state.quota.dailyLimit).toBe(AI_PHOTO_LIMITS.DAILY_PREMIUM);
      expect(state.quota.monthlyLimit).toBe(AI_PHOTO_LIMITS.MONTHLY_PREMIUM);
    });

    it('sets error on failure and falls back to default quota', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      await useAIPhotoStore.getState().loadQuota();

      const state = useAIPhotoStore.getState();
      expect(state.error).toBe('Storage error');
      expect(state.isLoaded).toBe(true);
      expect(state.quota.dailyUsed).toBe(0);
    });
  });

  // ============================================================
  // canUseAIPhoto
  // ============================================================

  describe('canUseAIPhoto', () => {
    it('returns true when under both limits', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 0,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 0,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().canUseAIPhoto()).toBe(true);
    });

    it('returns false when daily limit is reached', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: AI_PHOTO_LIMITS.DAILY_FREE,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().canUseAIPhoto()).toBe(false);
    });

    it('returns false when monthly limit is reached', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 0,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: AI_PHOTO_LIMITS.MONTHLY_FREE,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().canUseAIPhoto()).toBe(false);
    });

    it('returns true when at daily limit minus 1', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: AI_PHOTO_LIMITS.DAILY_FREE - 1,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 0,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().canUseAIPhoto()).toBe(true);
    });
  });

  // ============================================================
  // incrementUsage
  // ============================================================

  describe('incrementUsage', () => {
    it('increments daily and monthly usage and returns true', async () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 2,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 10,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      const result = await useAIPhotoStore.getState().incrementUsage();

      expect(result).toBe(true);
      const state = useAIPhotoStore.getState();
      expect(state.quota.dailyUsed).toBe(3);
      expect(state.quota.monthlyUsed).toBe(11);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        QUOTA_STORAGE_KEY,
        expect.any(String)
      );
    });

    it('returns false when at daily limit', async () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: AI_PHOTO_LIMITS.DAILY_FREE,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      const result = await useAIPhotoStore.getState().incrementUsage();

      expect(result).toBe(false);
      // Should NOT have incremented
      expect(useAIPhotoStore.getState().quota.dailyUsed).toBe(AI_PHOTO_LIMITS.DAILY_FREE);
    });

    it('returns false when at monthly limit', async () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 0,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: AI_PHOTO_LIMITS.MONTHLY_FREE,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      const result = await useAIPhotoStore.getState().incrementUsage();

      expect(result).toBe(false);
      expect(useAIPhotoStore.getState().quota.monthlyUsed).toBe(AI_PHOTO_LIMITS.MONTHLY_FREE);
    });
  });

  // ============================================================
  // getRemainingDaily / getRemainingMonthly
  // ============================================================

  describe('getRemainingDaily', () => {
    it('returns correct remaining count', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 3,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 0,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().getRemainingDaily()).toBe(
        AI_PHOTO_LIMITS.DAILY_FREE - 3
      );
    });

    it('returns 0 when at limit', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: AI_PHOTO_LIMITS.DAILY_FREE,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 0,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().getRemainingDaily()).toBe(0);
    });

    it('never returns negative', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: AI_PHOTO_LIMITS.DAILY_FREE + 5,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 0,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().getRemainingDaily()).toBe(0);
    });
  });

  describe('getRemainingMonthly', () => {
    it('returns correct remaining count', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 0,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 50,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().getRemainingMonthly()).toBe(
        AI_PHOTO_LIMITS.MONTHLY_FREE - 50
      );
    });

    it('returns 0 when at limit', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 0,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: AI_PHOTO_LIMITS.MONTHLY_FREE,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().getRemainingMonthly()).toBe(0);
    });

    it('never returns negative', () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 0,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: AI_PHOTO_LIMITS.MONTHLY_FREE + 10,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      expect(useAIPhotoStore.getState().getRemainingMonthly()).toBe(0);
    });
  });

  // ============================================================
  // resetQuota
  // ============================================================

  describe('resetQuota', () => {
    it('resets quota to defaults and persists', async () => {
      useAIPhotoStore.setState({
        quota: {
          dailyUsed: 8,
          dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
          monthlyUsed: 150,
          monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
          lastResetDate: '2024-06-10',
          lastMonthlyResetDate: '2024-06',
        },
      });

      await useAIPhotoStore.getState().resetQuota();

      const state = useAIPhotoStore.getState();
      expect(state.quota.dailyUsed).toBe(0);
      expect(state.quota.monthlyUsed).toBe(0);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        QUOTA_STORAGE_KEY,
        expect.any(String)
      );
    });
  });
});
