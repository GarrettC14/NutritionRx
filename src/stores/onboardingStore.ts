import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboardingRepository, GoalPath, EnergyUnit, OnboardingData } from '@/repositories/onboardingRepository';
import { EatingStyle, ExperienceLevel, ProteinPriority } from '@/types/domain';
import { ActivityLevel } from '@/constants/defaults';

// ============================================================
// Onboarding Draft (new screens collect data here)
// ============================================================

export interface OnboardingDraft {
  // Screen 1
  goalPath: GoalPath | null;
  // Screen 2
  sex: 'male' | 'female' | null;
  dateOfBirth: string | null; // YYYY-MM-DD
  // Screen 3
  heightCm: number | null;
  currentWeightKg: number | null;
  weightUnit: 'lbs' | 'kg';
  heightUnit: 'ft_in' | 'cm';
  // Not exposed in UI, required by existing store/repo contract
  energyUnit: EnergyUnit;
  // Screen 4
  activityLevel: ActivityLevel | null;
  // Screen 4.5 — experience gate
  experienceLevel: ExperienceLevel | null;
  // Screen 5
  eatingStyle: EatingStyle | null;
  // Screen 6
  proteinPriority: ProteinPriority | null;
  // Screen 7 (conditional: lose/gain only)
  targetWeightKg: number | null;
  targetRatePercent: number; // canonical percent from RATE_OPTIONS, 0 for maintain/track
  // Resume tracking
  lastCompletedScreen: string | null;
}

// Detect locale-based defaults for units
function detectLocaleUnits(): { weightUnit: 'lbs' | 'kg'; heightUnit: 'ft_in' | 'cm' } {
  const defaults = onboardingRepository.getLocaleDefaults();
  return {
    weightUnit: defaults.weightUnit,
    heightUnit: defaults.weightUnit === 'lbs' ? 'ft_in' : 'cm',
  };
}

const localeUnits = detectLocaleUnits();

export const INITIAL_DRAFT: OnboardingDraft = {
  goalPath: null,
  sex: null,
  dateOfBirth: null,
  heightCm: null,
  currentWeightKg: null,
  weightUnit: localeUnits.weightUnit,
  heightUnit: localeUnits.heightUnit,
  energyUnit: 'calories', // hardcoded — kJ not supported app-wide
  activityLevel: null,
  experienceLevel: null,
  eatingStyle: null,
  proteinPriority: null,
  targetWeightKg: null,
  targetRatePercent: 0,
  lastCompletedScreen: null,
};

// ============================================================
// Store Interface
// ============================================================

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

  // Draft state (new)
  draft: OnboardingDraft;

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

  // Draft actions (new)
  updateDraft: (partial: Partial<OnboardingDraft>) => void;
  clearDraft: () => void;

  // Computed
  shouldShowCelebration: () => boolean;
}

// ============================================================
// Helpers
// ============================================================

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

// ============================================================
// Store with persist middleware
// ============================================================

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
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

      // Draft state
      draft: INITIAL_DRAFT,

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
        try {
          const { energyUnit, weightUnit } = get();
          const data = await onboardingRepository.completeOnboarding('track', energyUnit, weightUnit);
          set({ ...mapDataToState(data) });
        } catch (error) {
          if (__DEV__) console.error('Failed to migrate legacy onboarding:', error);
          set({ isComplete: true });
        }
      },

      setGoalPath: (goal) => {
        set({ goalPath: goal });
        onboardingRepository.setGoalPath(goal).catch((e) => { if (__DEV__) console.error(e); });
      },

      setEnergyUnit: (unit) => {
        set({ energyUnit: unit });
        onboardingRepository.setEnergyUnit(unit).catch((e) => { if (__DEV__) console.error(e); });
      },

      setWeightUnit: (unit) => {
        set({ weightUnit: unit });
        onboardingRepository.setWeightUnit(unit).catch((e) => { if (__DEV__) console.error(e); });
      },

      markTooltipSeen: async (id) => {
        const { seenTooltips } = get();
        if (seenTooltips.includes(id)) return;

        const updated = [...seenTooltips, id];
        set({ seenTooltips: updated });

        try {
          await onboardingRepository.markTooltipSeen(id);
        } catch (error) {
          if (__DEV__) console.error('Failed to persist tooltip seen:', error);
        }
      },

      hasSeenTooltip: (id) => {
        return get().seenTooltips.includes(id);
      },

      markFirstFoodLogged: async () => {
        const { firstFoodLoggedAt } = get();

        if (firstFoodLoggedAt !== null) {
          return false;
        }

        const now = new Date();
        set({ firstFoodLoggedAt: now });

        try {
          await onboardingRepository.markFirstFoodLogged();
        } catch (error) {
          if (__DEV__) console.error('Failed to mark first food logged:', error);
        }

        return true;
      },

      incrementFoodsLogged: async () => {
        const { totalFoodsLogged } = get();
        const newCount = totalFoodsLogged + 1;
        set({ totalFoodsLogged: newCount });

        try {
          await onboardingRepository.incrementFoodsLogged();
        } catch (error) {
          if (__DEV__) console.error('Failed to increment foods logged:', error);
        }
      },

      incrementDaysTracked: async () => {
        const { daysTracked } = get();
        const newCount = daysTracked + 1;
        set({ daysTracked: newCount });

        try {
          await onboardingRepository.incrementDaysTracked();
        } catch (error) {
          if (__DEV__) console.error('Failed to increment days tracked:', error);
        }
      },

      resetOnboarding: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await onboardingRepository.resetOnboarding();
          set({
            ...mapDataToState(data),
            draft: INITIAL_DRAFT,
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
          if (__DEV__) console.error('Failed to reset tooltips:', error);
        }
      },

      // Draft actions
      updateDraft: (partial) => {
        set((state) => ({
          draft: { ...state.draft, ...partial },
        }));
      },

      clearDraft: () => {
        set({ draft: INITIAL_DRAFT });
      },

      shouldShowCelebration: () => {
        const { goalPath } = get();
        return goalPath !== 'track' && goalPath !== null;
      },
    }),
    {
      name: 'nutritionrx-onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // ONLY persist the draft (for crash recovery mid-onboarding)
        draft: state.draft,
        // Persist stable, serialization-safe existing fields:
        isComplete: state.isComplete,
        goalPath: state.goalPath,
        energyUnit: state.energyUnit,
        weightUnit: state.weightUnit,
        seenTooltips: state.seenTooltips,
        // DO NOT persist:
        // - isLoaded (runtime flag — must start false so loadOnboarding() runs)
        // - isLoading (runtime flag)
        // - completedAt (Date object — serialization mismatch)
        // - firstFoodLoggedAt (Date object — serialization mismatch)
        // - totalFoodsLogged (loaded from DB by loadOnboarding)
        // - daysTracked (loaded from DB by loadOnboarding)
        // - error (transient)
      }),
    },
  ),
);
