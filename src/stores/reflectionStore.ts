import { create } from 'zustand';
import { reflectionRepository, Reflection, Sentiment } from '@/repositories/reflectionRepository';
import { settingsRepository, weightRepository } from '@/repositories';
import { withTransaction } from '@/db/database';
import { calculateTrendWeight } from '@/utils/trendWeight';
import { useGoalStore } from './goalStore';
import { useProfileStore } from './profileStore';
import { useWeightStore } from './weightStore';
import { useSettingsStore } from './settingsStore';
import { ACTIVITY_MULTIPLIERS } from '@/constants/defaults';

const SMOOTHING_THRESHOLD = 25; // Don't update targets for ≤25 cal difference

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

interface ReflectionState {
  // Persisted state
  lastReflectionDate: string | null;
  daysSinceLastReflection: number | null;
  shouldShowBanner: boolean;
  bannerDismissCount: number;
  isInitialized: boolean;

  // Reflection in progress
  isReflecting: boolean;
  inputWeightKg: number | null;
  selectedSentiment: Sentiment | null;
  previewCalories: number | null;
  previewProteinG: number | null;
  previewCarbsG: number | null;
  previewFatG: number | null;
  hasChanges: boolean;
  isSubmitting: boolean;
  submitError: string | null;

  // Actions
  initialize: () => Promise<void>;
  dismissBanner: () => Promise<void>;
  startReflection: () => void;
  setInputWeight: (weightKg: number) => void;
  setSentiment: (sentiment: Sentiment | null) => void;
  submitReflection: () => Promise<void>;
  cancelReflection: () => void;
}

export const useReflectionStore = create<ReflectionState>((set, get) => ({
  // Initial state
  lastReflectionDate: null,
  daysSinceLastReflection: null,
  shouldShowBanner: false,
  bannerDismissCount: 0,
  isInitialized: false,

  isReflecting: false,
  inputWeightKg: null,
  selectedSentiment: null,
  previewCalories: null,
  previewProteinG: null,
  previewCarbsG: null,
  previewFatG: null,
  hasChanges: false,
  isSubmitting: false,
  submitError: null,

  initialize: async () => {
    try {
      const lastDate = await reflectionRepository.getLastReflectionDate();
      const dismissCount = await settingsRepository.get('reflection_banner_dismiss_count', 0);

      let daysSince: number | null = null;
      if (lastDate) {
        const now = new Date();
        const last = new Date(lastDate);
        daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Check guards: need active goal and weight data
      const goalStore = useGoalStore.getState();
      const hasActiveGoal = goalStore.activeGoal?.isActive === true;
      const hasAnyWeight = goalStore.currentWeightKg != null;

      const shouldShow = hasActiveGoal && hasAnyWeight && (daysSince === null || daysSince >= 6);

      set({
        lastReflectionDate: lastDate,
        daysSinceLastReflection: daysSince,
        shouldShowBanner: shouldShow,
        bannerDismissCount: dismissCount,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to initialize reflection store:', error);
      set({ isInitialized: true });
    }
  },

  dismissBanner: async () => {
    try {
      const newCount = get().bannerDismissCount + 1;
      await settingsRepository.set('reflection_banner_dismiss_count', newCount);
      set({ bannerDismissCount: newCount });
    } catch (error) {
      console.error('Failed to persist banner dismiss:', error);
    }
  },

  startReflection: () => {
    // Pre-fill with latest weight
    const goalStore = useGoalStore.getState();
    const prefillWeight = goalStore.currentWeightKg ?? null;

    set({
      isReflecting: true,
      inputWeightKg: prefillWeight,
      selectedSentiment: null,
      previewCalories: null,
      previewProteinG: null,
      previewCarbsG: null,
      previewFatG: null,
      hasChanges: false,
      isSubmitting: false,
      submitError: null,
    });

    // If we have a pre-filled weight, compute preview
    if (prefillWeight) {
      get().setInputWeight(prefillWeight);
    }
  },

  setInputWeight: (weightKg: number) => {
    // Compute preview of new targets using goal store's calculation methods
    const goalStore = useGoalStore.getState();
    const profileStore = useProfileStore.getState();
    const { activeGoal } = goalStore;
    const profile = profileStore.profile;

    if (!activeGoal || !profile?.sex || !profile?.heightCm || !profile?.dateOfBirth) {
      set({ inputWeightKg: weightKg });
      return;
    }

    const age = Math.floor(
      (Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    const activityLevel = (profile.activityLevel || 'moderately_active') as keyof typeof ACTIVITY_MULTIPLIERS;

    const bmr = goalStore.calculateBMR(weightKg, profile.heightCm, age, profile.sex);
    const tdee = goalStore.calculateTDEE(bmr, activityLevel);
    const rawCalories = goalStore.calculateTargetCalories(
      tdee,
      activeGoal.type,
      activeGoal.targetRatePercent,
      profile.sex,
      weightKg
    );
    const newCalories = roundToNearest(rawCalories, 10);
    const macros = goalStore.calculateMacros(newCalories, weightKg);

    const previousCalories = activeGoal.currentTargetCalories;
    const calorieDiff = Math.abs(newCalories - previousCalories);
    const shouldUpdate = calorieDiff > SMOOTHING_THRESHOLD;

    set({
      inputWeightKg: weightKg,
      previewCalories: shouldUpdate ? newCalories : previousCalories,
      previewProteinG: shouldUpdate ? macros.protein : activeGoal.currentProteinG,
      previewCarbsG: shouldUpdate ? macros.carbs : activeGoal.currentCarbsG,
      previewFatG: shouldUpdate ? macros.fat : activeGoal.currentFatG,
      hasChanges: shouldUpdate,
    });
  },

  setSentiment: (sentiment: Sentiment | null) => {
    set({ selectedSentiment: sentiment });
  },

  submitReflection: async () => {
    const { inputWeightKg, selectedSentiment, previewCalories, previewProteinG, previewCarbsG, previewFatG, hasChanges } = get();
    if (!inputWeightKg) return;

    set({ isSubmitting: true, submitError: null });

    try {
      const goalStore = useGoalStore.getState();
      const profileStore = useProfileStore.getState();
      const { activeGoal } = goalStore;
      const profile = profileStore.profile;

      if (!activeGoal || !profile?.sex || !profile?.heightCm || !profile?.dateOfBirth) {
        throw new Error('Missing goal or profile data');
      }

      // 1. Snapshot previous targets
      const previousCalories = activeGoal.currentTargetCalories;
      const previousProteinG = activeGoal.currentProteinG;
      const previousCarbsG = activeGoal.currentCarbsG;
      const previousFatG = activeGoal.currentFatG;

      // 2. Get previous reflection for weight change
      const lastReflection = await reflectionRepository.getLatest();
      const weightChangeKg = lastReflection
        ? inputWeightKg - lastReflection.weightKg
        : null;

      // 3. Wrap all writes in a transaction
      await withTransaction(async (db) => {
        // 3a. Upsert weight entry (weightRepository.create handles upsert)
        const today = new Date().toISOString().split('T')[0];
        const existing = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM weight_entries WHERE date = ?',
          [today]
        );
        const now = new Date().toISOString();

        if (existing) {
          await db.runAsync(
            'UPDATE weight_entries SET weight_kg = ?, updated_at = ? WHERE id = ?',
            [inputWeightKg, now, existing.id]
          );
        } else {
          const id = `we_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await db.runAsync(
            `INSERT INTO weight_entries (id, date, weight_kg, notes, created_at, updated_at)
             VALUES (?, ?, ?, NULL, ?, ?)`,
            [id, today, inputWeightKg, now, now]
          );
        }

        // 3b. Calculate trend weight
        const trendWeightKg = await calculateTrendWeight();

        // 3c. Calculate new targets
        const age = Math.floor(
          (Date.now() - new Date(profile.dateOfBirth!).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        const activityLevel = (profile.activityLevel || 'moderately_active') as keyof typeof ACTIVITY_MULTIPLIERS;
        const calcWeight = trendWeightKg ?? inputWeightKg;

        const bmr = goalStore.calculateBMR(calcWeight, profile.heightCm!, age, profile.sex!);
        const tdee = goalStore.calculateTDEE(bmr, activityLevel);
        const rawCalories = goalStore.calculateTargetCalories(
          tdee,
          activeGoal.type,
          activeGoal.targetRatePercent,
          profile.sex!,
          calcWeight
        );
        const newCalories = roundToNearest(rawCalories, 10);
        const macros = goalStore.calculateMacros(newCalories, calcWeight);
        const calorieDiff = Math.abs(newCalories - previousCalories);
        const shouldUpdate = calorieDiff > SMOOTHING_THRESHOLD;

        const finalCalories = shouldUpdate ? newCalories : previousCalories;
        const finalProtein = shouldUpdate ? macros.protein : previousProteinG;
        const finalCarbs = shouldUpdate ? macros.carbs : previousCarbsG;
        const finalFat = shouldUpdate ? macros.fat : previousFatG;

        // 3d. Update goal targets if changed
        if (shouldUpdate) {
          await db.runAsync(
            `UPDATE goals SET
              current_tdee_estimate = ?,
              current_target_calories = ?,
              current_protein_g = ?,
              current_carbs_g = ?,
              current_fat_g = ?,
              updated_at = ?
            WHERE id = ?`,
            [Math.round(tdee), finalCalories, finalProtein, finalCarbs, finalFat, now, activeGoal.id]
          );
        }

        // 3e. Save reflection record
        await db.runAsync(
          `INSERT INTO reflections (
            reflected_at, weight_kg, weight_trend_kg, sentiment,
            previous_calories, previous_protein_g, previous_carbs_g, previous_fat_g,
            new_calories, new_protein_g, new_carbs_g, new_fat_g,
            weight_change_kg
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            now,
            inputWeightKg,
            trendWeightKg,
            selectedSentiment,
            previousCalories,
            previousProteinG,
            previousCarbsG,
            previousFatG,
            finalCalories,
            finalProtein,
            finalCarbs,
            finalFat,
            weightChangeKg,
          ]
        );

        // 3f. Reset banner dismiss count
        await db.runAsync(
          `INSERT INTO user_settings (key, value, updated_at)
           VALUES ('reflection_banner_dismiss_count', '0', ?)
           ON CONFLICT(key) DO UPDATE SET value = '0', updated_at = ?`,
          [now, now]
        );
      });

      // 4. Update in-memory state across stores (after transaction succeeds)
      // Reload goal to pick up new targets
      await goalStore.loadActiveGoal();
      // Reload weight data
      const weightStore = useWeightStore.getState();
      await Promise.all([
        weightStore.loadLatest(),
        weightStore.loadTrendWeight(),
      ]);
      // Reload settings to pick up daily goal changes
      const settingsStore = useSettingsStore.getState();

      // Update settings with new daily goals if targets changed
      if (hasChanges && previewCalories && previewProteinG && previewCarbsG && previewFatG) {
        await settingsRepository.setDailyGoals({
          calories: previewCalories,
          protein: previewProteinG,
          carbs: previewCarbsG,
          fat: previewFatG,
        });
        await settingsStore.loadSettings();
      }

      set({
        lastReflectionDate: new Date().toISOString(),
        daysSinceLastReflection: 0,
        shouldShowBanner: false,
        bannerDismissCount: 0,
        isReflecting: false,
        isSubmitting: false,
        submitError: null,
      });
    } catch (error) {
      console.error('Failed to submit reflection:', error);
      set({
        isSubmitting: false,
        submitError: 'Something went wrong — please try again.',
      });
    }
  },

  cancelReflection: () => {
    set({
      isReflecting: false,
      inputWeightKg: null,
      selectedSentiment: null,
      previewCalories: null,
      previewProteinG: null,
      previewCarbsG: null,
      previewFatG: null,
      hasChanges: false,
      isSubmitting: false,
      submitError: null,
    });
  },
}));
