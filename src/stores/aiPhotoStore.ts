import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIPhotoQuota, AI_PHOTO_LIMITS } from '@/types/ai-photo';

const QUOTA_STORAGE_KEY = '@ai_photo_quota';

interface AIPhotoState {
  // Quota state
  quota: AIPhotoQuota;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Premium state (placeholder - would connect to subscription service)
  isPremium: boolean;

  // Actions
  loadQuota: () => Promise<void>;
  incrementUsage: () => Promise<boolean>;
  canUseAIPhoto: () => boolean;
  getRemainingDaily: () => number;
  getRemainingMonthly: () => number;
  resetQuota: () => Promise<void>;
}

const getDefaultQuota = (): AIPhotoQuota => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7); // YYYY-MM
  return {
    dailyUsed: 0,
    dailyLimit: AI_PHOTO_LIMITS.DAILY_FREE,
    monthlyUsed: 0,
    monthlyLimit: AI_PHOTO_LIMITS.MONTHLY_FREE,
    lastResetDate: today,
    lastMonthlyResetDate: thisMonth,
  };
};

const checkAndResetIfNeeded = (quota: AIPhotoQuota): AIPhotoQuota => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  let updated = { ...quota };

  // Reset daily if new day
  if (quota.lastResetDate !== today) {
    updated.dailyUsed = 0;
    updated.lastResetDate = today;
  }

  // Reset monthly if new month
  if (quota.lastMonthlyResetDate !== thisMonth) {
    updated.monthlyUsed = 0;
    updated.lastMonthlyResetDate = thisMonth;
  }

  return updated;
};

export const useAIPhotoStore = create<AIPhotoState>((set, get) => ({
  quota: getDefaultQuota(),
  isLoading: false,
  isLoaded: false,
  error: null,
  isPremium: false, // Would be set based on subscription status

  loadQuota: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });
    try {
      const stored = await AsyncStorage.getItem(QUOTA_STORAGE_KEY);
      let quota: AIPhotoQuota;

      if (stored) {
        quota = JSON.parse(stored);
        // Check and reset if new day/month
        quota = checkAndResetIfNeeded(quota);
        // Update limits based on premium status
        const { isPremium } = get();
        quota.dailyLimit = isPremium
          ? AI_PHOTO_LIMITS.DAILY_PREMIUM
          : AI_PHOTO_LIMITS.DAILY_FREE;
        quota.monthlyLimit = isPremium
          ? AI_PHOTO_LIMITS.MONTHLY_PREMIUM
          : AI_PHOTO_LIMITS.MONTHLY_FREE;
      } else {
        quota = getDefaultQuota();
      }

      // Save updated quota
      await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));

      set({ quota, isLoading: false, isLoaded: true });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to load AI photo quota',
        isLoading: false,
        isLoaded: true,
        quota: getDefaultQuota(),
      });
    }
  },

  incrementUsage: async () => {
    const { quota, canUseAIPhoto } = get();

    if (!canUseAIPhoto()) {
      return false;
    }

    const updatedQuota: AIPhotoQuota = {
      ...quota,
      dailyUsed: quota.dailyUsed + 1,
      monthlyUsed: quota.monthlyUsed + 1,
    };

    try {
      await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(updatedQuota));
      set({ quota: updatedQuota });
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to increment AI photo usage:', error);
      return false;
    }
  },

  canUseAIPhoto: () => {
    const { quota } = get();
    return quota.dailyUsed < quota.dailyLimit && quota.monthlyUsed < quota.monthlyLimit;
  },

  getRemainingDaily: () => {
    const { quota } = get();
    return Math.max(0, quota.dailyLimit - quota.dailyUsed);
  },

  getRemainingMonthly: () => {
    const { quota } = get();
    return Math.max(0, quota.monthlyLimit - quota.monthlyUsed);
  },

  resetQuota: async () => {
    const defaultQuota = getDefaultQuota();
    try {
      await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(defaultQuota));
      set({ quota: defaultQuota });
    } catch (error) {
      if (__DEV__) console.error('Failed to reset AI photo quota:', error);
    }
  },
}));
