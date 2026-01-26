import { create } from 'zustand';
import {
  goalRepository,
  profileRepository,
  CreateGoalInput,
  CreateWeeklyReflectionInput,
  GoalType,
} from '@/repositories';
import { Goal, WeeklyReflection, UserProfile } from '@/types/domain';
import {
  ACTIVITY_MULTIPLIERS,
  CALORIE_FLOORS,
  CALORIES_PER_KG,
  CALORIES_PER_GRAM,
  MAX_WEEKLY_ADJUSTMENTS,
  DATA_QUALITY_THRESHOLDS,
} from '@/constants/defaults';

interface GoalState {
  // State
  activeGoal: Goal | null;
  profile: UserProfile | null;
  reflections: WeeklyReflection[];
  pendingReflection: WeeklyReflection | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadActiveGoal: () => Promise<void>;
  loadProfile: () => Promise<void>;
  loadReflections: () => Promise<void>;
  loadPendingReflection: () => Promise<void>;

  // Goal management
  createGoal: (params: {
    type: GoalType;
    targetWeightKg?: number;
    targetRatePercent: number;
    currentWeightKg: number;
    sex: 'male' | 'female';
    heightCm: number;
    age: number;
    activityLevel: keyof typeof ACTIVITY_MULTIPLIERS;
  }) => Promise<Goal>;
  updateGoalTargets: (
    newTdee: number,
    newCalories: number,
    newMacros: { protein: number; carbs: number; fat: number }
  ) => Promise<void>;
  completeGoal: () => Promise<void>;

  // Reflection management
  acceptReflection: (id: string, notes?: string) => Promise<void>;
  declineReflection: (id: string, notes?: string) => Promise<void>;

  // Calculations
  calculateBMR: (weightKg: number, heightCm: number, age: number, sex: 'male' | 'female') => number;
  calculateTDEE: (bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS) => number;
  calculateTargetCalories: (tdee: number, goalType: GoalType, ratePercent: number, sex: 'male' | 'female') => number;
  calculateMacros: (targetCalories: number, weightKg: number) => { protein: number; carbs: number; fat: number };
}

export const useGoalStore = create<GoalState>((set, get) => ({
  activeGoal: null,
  profile: null,
  reflections: [],
  pendingReflection: null,
  isLoading: false,
  error: null,

  loadActiveGoal: async () => {
    set({ isLoading: true, error: null });
    try {
      const activeGoal = await goalRepository.getActiveGoal();
      set({ activeGoal, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load goal',
        isLoading: false,
      });
    }
  },

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileRepository.getOrCreate();
      set({ profile, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load profile',
        isLoading: false,
      });
    }
  },

  loadReflections: async () => {
    const { activeGoal } = get();
    if (!activeGoal) return;

    set({ isLoading: true, error: null });
    try {
      const reflections = await goalRepository.getReflectionsForGoal(activeGoal.id);
      set({ reflections, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load reflections',
        isLoading: false,
      });
    }
  },

  loadPendingReflection: async () => {
    const { activeGoal } = get();
    if (!activeGoal) return;

    set({ isLoading: true, error: null });
    try {
      const pendingReflection = await goalRepository.getPendingReflection(activeGoal.id);
      set({ pendingReflection, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load pending reflection',
        isLoading: false,
      });
    }
  },

  createGoal: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const bmr = get().calculateBMR(params.currentWeightKg, params.heightCm, params.age, params.sex);
      const tdee = get().calculateTDEE(bmr, params.activityLevel);
      const targetCalories = get().calculateTargetCalories(tdee, params.type, params.targetRatePercent, params.sex);
      const macros = get().calculateMacros(targetCalories, params.currentWeightKg);

      const input: CreateGoalInput = {
        type: params.type,
        targetWeightKg: params.targetWeightKg,
        targetRatePercent: params.targetRatePercent,
        startDate: new Date().toISOString().split('T')[0],
        startWeightKg: params.currentWeightKg,
        initialTdeeEstimate: Math.round(tdee),
        initialTargetCalories: Math.round(targetCalories),
        initialProteinG: macros.protein,
        initialCarbsG: macros.carbs,
        initialFatG: macros.fat,
      };

      const goal = await goalRepository.createGoal(input);
      set({ activeGoal: goal, isLoading: false });
      return goal;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create goal',
        isLoading: false,
      });
      throw error;
    }
  },

  updateGoalTargets: async (newTdee, newCalories, newMacros) => {
    const { activeGoal } = get();
    if (!activeGoal) return;

    set({ isLoading: true, error: null });
    try {
      const updated = await goalRepository.updateGoal(activeGoal.id, {
        currentTdeeEstimate: Math.round(newTdee),
        currentTargetCalories: Math.round(newCalories),
        currentProteinG: newMacros.protein,
        currentCarbsG: newMacros.carbs,
        currentFatG: newMacros.fat,
      });
      set({ activeGoal: updated, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update goal',
        isLoading: false,
      });
    }
  },

  completeGoal: async () => {
    const { activeGoal } = get();
    if (!activeGoal) return;

    set({ isLoading: true, error: null });
    try {
      await goalRepository.completeGoal(activeGoal.id);
      set({ activeGoal: null, reflections: [], pendingReflection: null, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to complete goal',
        isLoading: false,
      });
    }
  },

  acceptReflection: async (id, notes) => {
    const { activeGoal, pendingReflection } = get();
    if (!activeGoal || !pendingReflection) return;

    set({ isLoading: true, error: null });
    try {
      await goalRepository.acceptReflection(id, notes);

      // Apply the new targets to the goal
      if (
        pendingReflection.newTdeeEstimate &&
        pendingReflection.newTargetCalories &&
        pendingReflection.newProteinG &&
        pendingReflection.newCarbsG &&
        pendingReflection.newFatG
      ) {
        await get().updateGoalTargets(
          pendingReflection.newTdeeEstimate,
          pendingReflection.newTargetCalories,
          {
            protein: pendingReflection.newProteinG,
            carbs: pendingReflection.newCarbsG,
            fat: pendingReflection.newFatG,
          }
        );
      }

      set({ pendingReflection: null, isLoading: false });
      get().loadReflections();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to accept reflection',
        isLoading: false,
      });
    }
  },

  declineReflection: async (id, notes) => {
    set({ isLoading: true, error: null });
    try {
      await goalRepository.declineReflection(id, notes);
      set({ pendingReflection: null, isLoading: false });
      get().loadReflections();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to decline reflection',
        isLoading: false,
      });
    }
  },

  // Mifflin-St Jeor equation
  calculateBMR: (weightKg, heightCm, age, sex) => {
    const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return sex === 'male' ? baseBMR + 5 : baseBMR - 161;
  },

  calculateTDEE: (bmr, activityLevel) => {
    return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
  },

  calculateTargetCalories: (tdee, goalType, ratePercent, sex) => {
    const weeklyKgChange = ratePercent / 100; // % of body weight per week
    const dailyDeficitOrSurplus = (weeklyKgChange * CALORIES_PER_KG) / 7;

    let targetCalories: number;

    switch (goalType) {
      case 'lose':
        targetCalories = tdee - dailyDeficitOrSurplus;
        break;
      case 'gain':
        targetCalories = tdee + dailyDeficitOrSurplus;
        break;
      case 'maintain':
      default:
        targetCalories = tdee;
        break;
    }

    // Apply safety floor
    const floor = CALORIE_FLOORS[sex];
    return Math.max(targetCalories, floor);
  },

  calculateMacros: (targetCalories, weightKg) => {
    // Protein: 1.6-2.2g per kg of body weight (use 1.8g as middle ground)
    const protein = Math.round(weightKg * 1.8);
    const proteinCalories = protein * CALORIES_PER_GRAM.protein;

    // Fat: 25-30% of calories (use 27.5% as middle ground)
    const fatCalories = targetCalories * 0.275;
    const fat = Math.round(fatCalories / CALORIES_PER_GRAM.fat);

    // Carbs: remaining calories
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / CALORIES_PER_GRAM.carbs);

    return { protein, carbs, fat };
  },
}));
