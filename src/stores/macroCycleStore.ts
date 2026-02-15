import { create } from 'zustand';
import { useSubscriptionStore } from './subscriptionStore';
import { macroCycleRepository } from '@/repositories';
import {
  MacroCycleConfig,
  MacroCycleOverride,
  MacroCyclePatternType,
  DayTargets,
  DayBudget,
  MacroAdjustment,
  LOW_CARB_SCALE,
} from '@/types/planning';
import {
  redistributeCalories,
  generateInitialBudget,
} from '@/utils/redistribution';

interface MacroCycleState {
  // State
  config: MacroCycleConfig | null;
  todayOverride: MacroCycleOverride | null;
  allOverrides: MacroCycleOverride[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Redistribution state
  redistributionDays: DayBudget[];
  weeklyTotal: number;
  isRedistributionActive: boolean;

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

  // Actions - Redistribution
  initializeRedistribution: (
    baseCalories: number,
    baseProtein: number,
    baseCarbs: number,
    baseFat: number,
    proteinFloor: number,
    startDay: number
  ) => void;
  loadRedistribution: () => Promise<void>;
  adjustDay: (
    dayIndex: number,
    newCalories: number,
    proteinFloor: number
  ) => DayBudget[] | null;
  toggleDayLock: (dayIndex: number) => void;
  resetRedistribution: () => void;
  setRedistributionStartDay: (day: number) => void;
  saveRedistribution: () => Promise<void>;

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

  // Redistribution state
  redistributionDays: [],
  weeklyTotal: 0,
  isRedistributionActive: false,

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
    const { isPremium } = useSubscriptionStore.getState();
    if (!isPremium) {
      console.warn('[macroCycleStore] Macro cycling is a premium feature');
      return;
    }

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
      if (__DEV__) console.error('Failed to load today override:', error);
    }
  },

  setTodayOverride: async (targets) => {
    const { isPremium } = useSubscriptionStore.getState();
    if (!isPremium) {
      console.warn('[macroCycleStore] Macro cycling is a premium feature');
      return;
    }

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
      if (__DEV__) console.error('Failed to load overrides:', error);
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
  // Redistribution Actions
  // ============================================================

  initializeRedistribution: (baseCalories, baseProtein, baseCarbs, baseFat, _proteinFloor, startDay) => {
    const today = new Date();
    // Find the most recent startDay occurrence
    const dayOfWeek = today.getDay();
    const diff = (dayOfWeek - startDay + 7) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diff);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    const days = generateInitialBudget(
      baseCalories, baseProtein, baseCarbs, baseFat,
      weekStartDate, startDay
    );
    const weeklyTotal = days.reduce((s, d) => s + d.calories, 0);
    set({ redistributionDays: days, weeklyTotal, isRedistributionActive: true });
  },

  loadRedistribution: async () => {
    try {
      const { config } = get();
      if (!config || config.patternType !== 'redistribution') return;

      const redistConfig = await macroCycleRepository.getRedistributionConfig();
      const startDay = redistConfig.redistributionStartDay;
      const lockedDays = redistConfig.lockedDays;

      // Compute current week start
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dayOfWeek = today.getDay();
      const diff = (dayOfWeek - startDay + 7) % 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - diff);

      const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }

      // Query overrides for these dates
      const overrides = await macroCycleRepository.getAllOverrides();
      const overrideMap = new Map(overrides.map((o) => [o.date, o]));

      const matchedOverrides = dates.filter((d) => overrideMap.has(d));

      if (matchedOverrides.length === 7) {
        // Populate from overrides
        const days: DayBudget[] = dates.map((date) => {
          const o = overrideMap.get(date)!;
          const dow = new Date(date + 'T12:00:00').getDay();
          return {
            date,
            dayOfWeek: dow,
            dayLabel: labels[dow],
            calories: o.calories,
            protein: o.protein,
            carbs: o.carbs,
            fat: o.fat,
            locked: lockedDays.includes(dow),
            isToday: date === todayStr,
            isPast: date < todayStr,
          };
        });
        const weeklyTotal = days.reduce((s, d) => s + d.calories, 0);
        set({ redistributionDays: days, weeklyTotal, isRedistributionActive: true });
      } else {
        // No full week of overrides — generate fresh from base targets
        // (base targets come from the config's day targets for day 0 or fallback)
        if (__DEV__) console.log('[macroCycleStore] No full redistribution week found, state not loaded');
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to load redistribution:', error);
    }
  },

  adjustDay: (dayIndex, newCalories, proteinFloor) => {
    const { redistributionDays } = get();
    const result = redistributeCalories(redistributionDays, dayIndex, newCalories, proteinFloor);
    if (result) {
      const weeklyTotal = result.reduce((s, d) => s + d.calories, 0);
      set({ redistributionDays: result, weeklyTotal });
    }
    return result;
  },

  toggleDayLock: (dayIndex) => {
    const { redistributionDays } = get();
    const updated = redistributionDays.map((d, i) =>
      i === dayIndex ? { ...d, locked: !d.locked } : d
    );
    set({ redistributionDays: updated });
  },

  resetRedistribution: () => {
    const { redistributionDays, weeklyTotal } = get();
    const avgCalories = Math.round(weeklyTotal / 7);
    const reset = redistributionDays.map((d) => ({
      ...d,
      calories: avgCalories,
      locked: false,
    }));
    set({ redistributionDays: reset });
  },

  setRedistributionStartDay: (day) => {
    // Store value will be persisted in saveRedistribution
    set((state) => ({
      config: state.config ? { ...state.config, redistributionStartDay: day } : state.config,
    }));
  },

  saveRedistribution: async () => {
    const { config, redistributionDays } = get();
    try {
      // Update config: enable redistribution pattern
      const lockedDayNumbers = redistributionDays
        .filter((d) => d.locked)
        .map((d) => d.dayOfWeek);
      const startDay = config?.redistributionStartDay ?? 0;

      await macroCycleRepository.updateConfig({
        enabled: true,
        patternType: 'redistribution',
        lockedDays: lockedDayNumbers,
        redistributionStartDay: startDay,
      });

      // Save overrides
      await macroCycleRepository.saveRedistributionOverrides(
        redistributionDays.map((d) => ({
          date: d.date,
          calories: d.calories,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
        }))
      );

      // Reload config to sync state
      const updatedConfig = await macroCycleRepository.getConfig();
      set({ config: updatedConfig });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save redistribution',
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
