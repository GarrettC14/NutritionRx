import { create } from 'zustand';
import { macroCycleRepository } from '@/repositories';
import {
  MacroCycleConfig,
  MacroCycleOverride,
  MacroCyclePatternType,
  DayTargets,
  MacroAdjustment,
  LOW_CARB_SCALE,
} from '@/types/planning';

interface MacroCycleState {
  // State
  config: MacroCycleConfig | null;
  todayOverride: MacroCycleOverride | null;
  allOverrides: MacroCycleOverride[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions - Config
  loadConfig: () => Promise<void>;
  enableCycling: (
    patternType: MacroCyclePatternType,
    markedDays: number[],
    dayTargets: { [day: number]: DayTargets }
  ) => Promise<void>;
  disableCycling: () => Promise<void>;
  updatePattern: (
    patternType: MacroCyclePatternType,
    markedDays: number[],
    dayTargets: { [day: number]: DayTargets }
  ) => Promise<void>;

  // Actions - Overrides
  loadTodayOverride: () => Promise<void>;
  setTodayOverride: (targets: DayTargets) => Promise<void>;
  clearTodayOverride: () => Promise<void>;
  loadAllOverrides: () => Promise<void>;
  clearOverride: (date: string) => Promise<void>;
  clearAllOverrides: () => Promise<void>;

  // Computed / Helpers
  getTargetsForDate: (date: string, baseTargets: DayTargets) => Promise<DayTargets>;
  getTodayTargets: (baseTargets: DayTargets) => Promise<DayTargets>;
  getDayType: (dayOfWeek: number) => 'training' | 'rest' | 'high_carb' | 'low_carb' | 'custom' | 'even' | null;
  getWeeklyAverage: () => DayTargets | null;
  calculateDayTargets: (
    baseTargets: DayTargets,
    patternType: MacroCyclePatternType,
    markedDays: number[],
    adjustment: MacroAdjustment
  ) => { [day: number]: DayTargets };
}

export const useMacroCycleStore = create<MacroCycleState>((set, get) => ({
  // Initial state
  config: null,
  todayOverride: null,
  allOverrides: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  // ============================================================
  // Config Actions
  // ============================================================

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await macroCycleRepository.getOrCreateConfig();
      const today = new Date().toISOString().split('T')[0];
      const todayOverride = await macroCycleRepository.getOverrideByDate(today);
      set({ config, todayOverride, isLoading: false, isLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load macro cycle config',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  enableCycling: async (patternType, markedDays, dayTargets) => {
    try {
      const config = await macroCycleRepository.updateConfig({
        enabled: true,
        patternType,
        markedDays,
        dayTargets,
      });
      set({ config });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to enable macro cycling',
      });
    }
  },

  disableCycling: async () => {
    try {
      const config = await macroCycleRepository.disableCycling();
      set({ config });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to disable macro cycling',
      });
    }
  },

  updatePattern: async (patternType, markedDays, dayTargets) => {
    try {
      const config = await macroCycleRepository.updateConfig({
        patternType,
        markedDays,
        dayTargets,
      });
      set({ config });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update pattern',
      });
    }
  },

  // ============================================================
  // Override Actions
  // ============================================================

  loadTodayOverride: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayOverride = await macroCycleRepository.getOverrideByDate(today);
      set({ todayOverride });
    } catch (error) {
      console.error('Failed to load today override:', error);
    }
  },

  setTodayOverride: async (targets) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const override = await macroCycleRepository.setOverride(today, targets);
      set({ todayOverride: override });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to set override',
      });
    }
  },

  clearTodayOverride: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await macroCycleRepository.clearOverride(today);
      set({ todayOverride: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear override',
      });
    }
  },

  loadAllOverrides: async () => {
    try {
      const allOverrides = await macroCycleRepository.getAllOverrides();
      set({ allOverrides });
    } catch (error) {
      console.error('Failed to load overrides:', error);
    }
  },

  clearOverride: async (date) => {
    try {
      await macroCycleRepository.clearOverride(date);
      const allOverrides = get().allOverrides.filter((o) => o.date !== date);
      const today = new Date().toISOString().split('T')[0];
      set({
        allOverrides,
        todayOverride: date === today ? null : get().todayOverride,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear override',
      });
    }
  },

  clearAllOverrides: async () => {
    try {
      await macroCycleRepository.clearAllOverrides();
      set({ allOverrides: [], todayOverride: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear all overrides',
      });
    }
  },

  // ============================================================
  // Computed / Helpers
  // ============================================================

  getTargetsForDate: async (date, baseTargets) => {
    return macroCycleRepository.getTargetsForDate(date, baseTargets);
  },

  getTodayTargets: async (baseTargets) => {
    const today = new Date().toISOString().split('T')[0];
    return macroCycleRepository.getTargetsForDate(today, baseTargets);
  },

  getDayType: (dayOfWeek) => {
    const { config } = get();
    if (!config || !config.enabled) return null;
    return macroCycleRepository.getDayType(dayOfWeek, config);
  },

  getWeeklyAverage: () => {
    const { config } = get();
    if (!config || !config.enabled) return null;
    return macroCycleRepository.calculateWeeklyAverage(config);
  },

  calculateDayTargets: (baseTargets, patternType, markedDays, adjustment) => {
    const dayTargets: { [day: number]: DayTargets } = {};

    for (let day = 0; day < 7; day++) {
      const isMarkedDay = markedDays.includes(day);

      if (patternType === 'training_rest') {
        // Training days get the adjustment, rest days get base
        if (isMarkedDay) {
          dayTargets[day] = {
            calories: baseTargets.calories + adjustment.calories,
            protein: baseTargets.protein + adjustment.protein,
            carbs: baseTargets.carbs + adjustment.carbs,
            fat: baseTargets.fat + adjustment.fat,
          };
        } else {
          dayTargets[day] = { ...baseTargets };
        }
      } else if (patternType === 'high_low_carb') {
        // High carb days are marked days, low carb days are unmarked
        if (isMarkedDay) {
          // High carb day: more carbs, less fat
          dayTargets[day] = {
            calories: baseTargets.calories,
            protein: baseTargets.protein,
            carbs: baseTargets.carbs + adjustment.carbs,
            fat: baseTargets.fat + adjustment.fat, // adjustment.fat is negative for high carb
          };
        } else {
          // Low carb day: less carbs, more fat (softened inverse of adjustment)
          dayTargets[day] = {
            calories: baseTargets.calories,
            protein: baseTargets.protein,
            carbs: baseTargets.carbs - Math.round(adjustment.carbs * LOW_CARB_SCALE),
            fat: baseTargets.fat - Math.round(adjustment.fat * LOW_CARB_SCALE),
          };
        }
      } else if (patternType === 'even_distribution') {
        dayTargets[day] = { ...baseTargets };
      } else {
        // Custom: user sets each day manually (handled outside this function)
        dayTargets[day] = { ...baseTargets };
      }
    }

    return dayTargets;
  },
}));
