import { create } from 'zustand';
import { onboardingRepository, GoalPath, EnergyUnit, OnboardingData } from '@/repositories/onboardingRepository';

interface OnboardingState {
  // State
  isComplete: boolean;
  completedAt: Date | null;
  goalPath: GoalPath | null;
  energyUnit: EnergyUnit;
  weightUnit: 'lbs' | 'kg';
  seenTooltips: string[];
  firstFoodLoggedAt: Date | null;
  totalFoodsLogged: number;
  daysTracked: number;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadOnboarding: () => Promise<void>;
  completeOnboarding: (goalPath: GoalPath, energyUnit: EnergyUnit, weightUnit: 'lbs' | 'kg') => Promise<void>;
  migrateFromLegacy: () => Promise<void>;
  setGoalPath: (goal: GoalPath) => void;
  setEnergyUnit: (unit: EnergyUnit) => void;
  setWeightUnit: (unit: 'lbs' | 'kg') => void;
  markTooltipSeen: (id: string) => Promise<void>;
  hasSeenTooltip: (id: string) => boolean;
  markFirstFoodLogged: () => Promise<boolean>;
  incrementFoodsLogged: () => Promise<void>;
  incrementDaysTracked: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  resetTooltips: () => Promise<void>;

  // Computed
  shouldShowCelebration: () => boolean;
}

function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function mapDataToState(data: OnboardingData) {
  return {
    isComplete: data.isComplete,
    completedAt: parseDate(data.completedAt),
    goalPath: data.goalPath,
    energyUnit: data.energyUnit,
    weightUnit: data.weightUnit,
    seenTooltips: data.seenTooltips,
    firstFoodLoggedAt: parseDate(data.firstFoodLoggedAt),
    totalFoodsLogged: data.totalFoodsLogged,
    daysTracked: data.daysTracked,
  };
}

// Get locale-based defaults for initial state
const localeDefaults = onboardingRepository.getLocaleDefaults();

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  // Initial state
  isComplete: false,
  completedAt: null,
  goalPath: null,
  energyUnit: localeDefaults.energyUnit,
  weightUnit: localeDefaults.weightUnit,
  seenTooltips: [],
  firstFoodLoggedAt: null,
  totalFoodsLogged: 0,
  daysTracked: 0,
  isLoading: false,
  isLoaded: false,
  error: null,

  loadOnboarding: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });
    try {
      const data = await onboardingRepository.getAll();
      set({
        ...mapDataToState(data),
        isLoading: false,
        isLoaded: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load onboarding data',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  completeOnboarding: async (goalPath, energyUnit, weightUnit) => {
    set({ isLoading: true, error: null });
    try {
      const data = await onboardingRepository.completeOnboarding(goalPath, energyUnit, weightUnit);
      set({
        ...mapDataToState(data),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
        isLoading: false,
      });
    }
  },

  migrateFromLegacy: async () => {
    // Migrate from legacy profile flags to onboarding store
    try {
      const { energyUnit, weightUnit } = get();
      const data = await onboardingRepository.completeOnboarding('track', energyUnit, weightUnit);
      set({ ...mapDataToState(data) });
    } catch (error) {
      console.error('Failed to migrate legacy onboarding:', error);
      // Still mark as complete in memory to avoid blocking the user
      set({ isComplete: true });
    }
  },

  setGoalPath: (goal) => {
    set({ goalPath: goal });
    // Persist asynchronously (fire and forget)
    onboardingRepository.setGoalPath(goal).catch(console.error);
  },

  setEnergyUnit: (unit) => {
    set({ energyUnit: unit });
    onboardingRepository.setEnergyUnit(unit).catch(console.error);
  },

  setWeightUnit: (unit) => {
    set({ weightUnit: unit });
    onboardingRepository.setWeightUnit(unit).catch(console.error);
  },

  markTooltipSeen: async (id) => {
    const { seenTooltips } = get();
    if (seenTooltips.includes(id)) return;

    const updated = [...seenTooltips, id];
    set({ seenTooltips: updated });

    try {
      await onboardingRepository.markTooltipSeen(id);
    } catch (error) {
      console.error('Failed to persist tooltip seen:', error);
    }
  },

  hasSeenTooltip: (id) => {
    return get().seenTooltips.includes(id);
  },

  markFirstFoodLogged: async () => {
    const { firstFoodLoggedAt } = get();

    // Return false if already logged first food
    if (firstFoodLoggedAt !== null) {
      return false;
    }

    const now = new Date();
    set({ firstFoodLoggedAt: now });

    try {
      await onboardingRepository.markFirstFoodLogged();
    } catch (error) {
      console.error('Failed to mark first food logged:', error);
    }

    // Return true to indicate this was the first food
    return true;
  },

  incrementFoodsLogged: async () => {
    const { totalFoodsLogged } = get();
    const newCount = totalFoodsLogged + 1;
    set({ totalFoodsLogged: newCount });

    try {
      await onboardingRepository.incrementFoodsLogged();
    } catch (error) {
      console.error('Failed to increment foods logged:', error);
    }
  },

  incrementDaysTracked: async () => {
    const { daysTracked } = get();
    const newCount = daysTracked + 1;
    set({ daysTracked: newCount });

    try {
      await onboardingRepository.incrementDaysTracked();
    } catch (error) {
      console.error('Failed to increment days tracked:', error);
    }
  },

  resetOnboarding: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await onboardingRepository.resetOnboarding();
      set({
        ...mapDataToState(data),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reset onboarding',
        isLoading: false,
      });
    }
  },

  resetTooltips: async () => {
    set({ seenTooltips: [], firstFoodLoggedAt: null });
    try {
      await onboardingRepository.resetTooltips();
    } catch (error) {
      console.error('Failed to reset tooltips:', error);
    }
  },

  shouldShowCelebration: () => {
    const { goalPath } = get();
    // Show progress bar in celebration for users with a goal
    // Users with "track" goal path don't show progress bar
    return goalPath !== 'track' && goalPath !== null;
  },
}));
