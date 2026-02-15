import { create } from 'zustand';
import { waterRepository, WaterLog, DEFAULT_WATER_GOAL, DEFAULT_GLASS_SIZE_ML } from '@/repositories';
import { settingsRepository } from '@/repositories';
import { syncWaterToHealthPlatform } from '@/services/healthSyncWriteCoordinator';
import * as Sentry from '@sentry/react-native';
import { isExpectedError } from '@/utils/sentryHelpers';

interface WaterState {
  // State
  todayLog: WaterLog | null;
  recentLogs: WaterLog[];
  goalGlasses: number;
  glassSizeMl: number;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadTodayWater: () => Promise<void>;
  loadWaterSettings: () => Promise<void>;
  addGlass: () => Promise<void>;
  removeGlass: () => Promise<void>;
  setGlasses: (glasses: number) => Promise<void>;
  setGoalGlasses: (goal: number) => Promise<void>;
  setGlassSizeMl: (size: number) => Promise<void>;
  loadRecentLogs: (days?: number) => Promise<void>;

  // Computed
  getTodayProgress: () => { glasses: number; goal: number; percent: number };
  hasMetGoal: () => boolean;
}

const SETTING_KEYS = {
  WATER_GOAL: 'water_goal_glasses',
  GLASS_SIZE: 'water_glass_size_ml',
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export const useWaterStore = create<WaterState>((set, get) => ({
  // Initial state
  todayLog: null,
  recentLogs: [],
  goalGlasses: DEFAULT_WATER_GOAL,
  glassSizeMl: DEFAULT_GLASS_SIZE_ML,
  isLoading: false,
  isLoaded: false,
  error: null,

  loadTodayWater: async () => {
    set({ isLoading: true, error: null });
    try {
      const today = getToday();
      const log = await waterRepository.getOrCreateByDate(today);
      set({ todayLog: log, isLoading: false, isLoaded: true });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'load' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to load water data',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  loadWaterSettings: async () => {
    try {
      const goalGlasses = await settingsRepository.get(SETTING_KEYS.WATER_GOAL, DEFAULT_WATER_GOAL);
      const glassSizeMl = await settingsRepository.get(SETTING_KEYS.GLASS_SIZE, DEFAULT_GLASS_SIZE_ML);
      set({ goalGlasses, glassSizeMl });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'load-settings' } });
      if (__DEV__) console.error('Failed to load water settings:', error);
    }
  },

  addGlass: async () => {
    const today = getToday();
    try {
      const log = await waterRepository.addGlass(today);
      set({ todayLog: log });

      // Sync to health platform via coordinator (non-blocking)
      const { glassSizeMl } = get();
      if (log?.id) {
        void syncWaterToHealthPlatform({
          localRecordId: log.id,
          localRecordType: 'water_entry',
          milliliters: glassSizeMl,
          timestamp: new Date().toISOString(),
        }).catch((error) => {
          if (__DEV__) console.warn('[HealthSync] water addGlass failed', error);
        });
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'add-glass' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to add glass',
      });
    }
  },

  removeGlass: async () => {
    const today = getToday();
    try {
      const log = await waterRepository.removeGlass(today);
      set({ todayLog: log });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'remove-glass' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to remove glass',
      });
    }
  },

  setGlasses: async (glasses: number) => {
    const today = getToday();
    const previousGlasses = get().todayLog?.glasses ?? 0;
    try {
      const log = await waterRepository.setGlasses(today, glasses);
      set({ todayLog: log });

      // Sync difference to health platform via coordinator (non-blocking)
      const { glassSizeMl } = get();
      const glassesAdded = glasses - previousGlasses;
      if (glassesAdded > 0 && log?.id) {
        void syncWaterToHealthPlatform({
          localRecordId: log.id,
          localRecordType: 'water_entry',
          milliliters: glassesAdded * glassSizeMl,
          timestamp: new Date().toISOString(),
        }).catch((error) => {
          if (__DEV__) console.warn('[HealthSync] water setGlasses failed', error);
        });
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'set-glasses' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to set glasses',
      });
    }
  },

  setGoalGlasses: async (goal: number) => {
    try {
      await settingsRepository.set(SETTING_KEYS.WATER_GOAL, goal);
      set({ goalGlasses: goal });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'set-goal' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to set water goal',
      });
    }
  },

  setGlassSizeMl: async (size: number) => {
    try {
      await settingsRepository.set(SETTING_KEYS.GLASS_SIZE, size);
      set({ glassSizeMl: size });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'set-glass-size' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to set glass size',
      });
    }
  },

  loadRecentLogs: async (days: number = 7) => {
    try {
      const logs = await waterRepository.getRecentLogs(days);
      set({ recentLogs: logs });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'water', action: 'load-recent' } });
      if (__DEV__) console.error('Failed to load recent water logs:', error);
    }
  },

  getTodayProgress: () => {
    const { todayLog, goalGlasses } = get();
    const glasses = todayLog?.glasses ?? 0;
    const percent = goalGlasses > 0 ? Math.min((glasses / goalGlasses) * 100, 100) : 0;
    return { glasses, goal: goalGlasses, percent };
  },

  hasMetGoal: () => {
    const { todayLog, goalGlasses } = get();
    return (todayLog?.glasses ?? 0) >= goalGlasses;
  },
}));
