import { create } from 'zustand';
import { getDatabase } from '@/db/database';
import {
  Gender,
  AgeGroup,
  LifeStage,
  NutrientTarget,
  NutrientIntake,
  DailyNutrientIntake,
  NutrientStatus,
  NutrientCategory,
  NutrientContributor,
} from '@/types/micronutrients';
import { ALL_NUTRIENTS, FREE_NUTRIENTS, NUTRIENT_BY_ID } from '@/data/nutrients';
import { getRDA, DEFAULT_ADULT_RDAS } from '@/data/rdaTables';

// ============================================================
// Types
// ============================================================

interface UserNutrientProfile {
  gender: Gender;
  ageGroup: AgeGroup;
  lifeStage: LifeStage;
}

interface MicronutrientState {
  // User profile for RDA calculation
  profile: UserNutrientProfile;

  // Custom targets (user overrides)
  customTargets: Map<string, NutrientTarget>;

  // Daily intake data
  dailyIntake: DailyNutrientIntake | null;

  // Contributors for selected date
  contributors: NutrientContributor[];

  // Loading states
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Selected date
  selectedDate: string;

  // View settings
  selectedCategory: NutrientCategory | 'all';
  showOnlyIssues: boolean;

  // Actions
  loadProfile: () => Promise<void>;
  updateProfile: (profile: Partial<UserNutrientProfile>) => Promise<void>;
  loadDailyIntake: (date: string) => Promise<void>;
  loadContributors: (date: string, nutrientId: string) => Promise<void>;
  setCustomTarget: (nutrientId: string, target: Partial<NutrientTarget>) => Promise<void>;
  removeCustomTarget: (nutrientId: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSelectedCategory: (category: NutrientCategory | 'all') => void;
  setShowOnlyIssues: (show: boolean) => void;

  // Derived getters
  getTargetForNutrient: (nutrientId: string) => NutrientTarget | null;
  getStatusForIntake: (nutrientId: string, amount: number) => NutrientStatus;
  getVisibleNutrients: (isPremium: boolean) => typeof ALL_NUTRIENTS;
}

// ============================================================
// Helper Functions
// ============================================================

const calculateStatus = (
  amount: number,
  target: number,
  upperLimit?: number
): NutrientStatus => {
  const percent = (amount / target) * 100;

  // Check upper limit first
  if (upperLimit && amount > upperLimit) {
    return 'excessive';
  }

  if (percent < 50) return 'deficient';
  if (percent < 75) return 'low';
  if (percent < 100) return 'adequate';
  if (percent <= 150) return 'optimal';
  if (percent <= 200) return 'high';
  return 'excessive';
};

const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// ============================================================
// Store
// ============================================================

export const useMicronutrientStore = create<MicronutrientState>((set, get) => ({
  profile: {
    gender: 'male',
    ageGroup: '19-30y',
    lifeStage: 'normal',
  },
  customTargets: new Map(),
  dailyIntake: null,
  contributors: [],
  isLoading: false,
  isLoaded: false,
  error: null,
  selectedDate: getTodayString(),
  selectedCategory: 'all',
  showOnlyIssues: false,

  loadProfile: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      const db = getDatabase();

      // Load profile settings
      const profileRow = await db.getFirstAsync<{
        gender: string;
        age_group: string;
        life_stage: string;
      }>('SELECT gender, age_group, life_stage FROM nutrient_settings WHERE id = 1');

      if (profileRow) {
        set({
          profile: {
            gender: profileRow.gender as Gender,
            ageGroup: profileRow.age_group as AgeGroup,
            lifeStage: profileRow.life_stage as LifeStage,
          },
        });
      }

      // Load custom targets
      const targetRows = await db.getAllAsync<{
        nutrient_id: string;
        target_amount: number;
        upper_limit: number | null;
      }>('SELECT nutrient_id, target_amount, upper_limit FROM custom_nutrient_targets');

      const customTargets = new Map<string, NutrientTarget>();
      for (const row of targetRows) {
        customTargets.set(row.nutrient_id, {
          nutrientId: row.nutrient_id,
          targetAmount: row.target_amount,
          upperLimit: row.upper_limit ?? undefined,
          isCustom: true,
        });
      }

      set({
        customTargets,
        isLoading: false,
        isLoaded: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load nutrient profile',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  updateProfile: async (profileUpdate) => {
    const { profile } = get();
    const newProfile = { ...profile, ...profileUpdate };

    try {
      const db = getDatabase();
      await db.runAsync(
        `UPDATE nutrient_settings
         SET gender = ?, age_group = ?, life_stage = ?, updated_at = datetime('now')
         WHERE id = 1`,
        [newProfile.gender, newProfile.ageGroup, newProfile.lifeStage]
      );

      set({ profile: newProfile });
    } catch (error) {
      console.error('Failed to update nutrient profile:', error);
    }
  },

  loadDailyIntake: async (date: string) => {
    set({ isLoading: true, selectedDate: date });

    try {
      const db = getDatabase();
      const { profile, getTargetForNutrient, getStatusForIntake } = get();

      // Get total foods logged for the date
      const countResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM log_entries WHERE date = ?',
        [date]
      );
      const totalFoodsLogged = countResult?.count ?? 0;

      // Single JOIN query to get all nutrient totals — replaces N+1 per-entry queries
      const nutrientRows = await db.getAllAsync<{
        nutrient_id: string;
        total: number;
      }>(
        `SELECT fin.nutrient_id, SUM(fin.amount * le.servings) as total
         FROM log_entries le
         JOIN food_item_nutrients fin ON fin.food_item_id = le.food_item_id
         WHERE le.date = ?
         GROUP BY fin.nutrient_id`,
        [date]
      );

      const nutrientTotals = new Map<string, number>(
        nutrientRows.map(r => [r.nutrient_id, r.total])
      );

      // Build intake objects
      const intakeList: NutrientIntake[] = [];

      for (const nutrient of ALL_NUTRIENTS) {
        const amount = nutrientTotals.get(nutrient.id) || 0;
        const target = getTargetForNutrient(nutrient.id);

        if (target) {
          const percentOfTarget = target.targetAmount > 0
            ? (amount / target.targetAmount) * 100
            : 0;

          intakeList.push({
            nutrientId: nutrient.id,
            amount,
            percentOfTarget,
            status: getStatusForIntake(nutrient.id, amount),
          });
        }
      }

      const dailyIntake: DailyNutrientIntake = {
        date,
        nutrients: intakeList,
        totalFoodsLogged,
        hasCompleteData: totalFoodsLogged > 0,
      };

      set({ dailyIntake, isLoading: false });
    } catch (error) {
      console.error('Failed to load daily intake:', error);
      set({ isLoading: false, error: 'Failed to load daily intake' });
    }
  },

  loadContributors: async (date: string, nutrientId: string) => {
    try {
      const db = getDatabase();

      // Compute contributors on-the-fly via JOIN (nutrient_contributors table is never populated)
      const rows = await db.getAllAsync<{
        log_entry_id: string;
        food_name: string;
        amount: number;
      }>(
        `SELECT
           le.id AS log_entry_id,
           fi.name AS food_name,
           fin.amount * le.servings AS amount
         FROM log_entries le
         JOIN food_item_nutrients fin ON fin.food_item_id = le.food_item_id
         JOIN food_items fi ON fi.id = le.food_item_id
         WHERE le.date = ?
           AND fin.nutrient_id = ?
           AND fin.amount > 0
         ORDER BY fin.amount * le.servings DESC
         LIMIT 10`,
        [date, nutrientId]
      );

      const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

      const contributors: NutrientContributor[] = rows.map(row => ({
        nutrientId,
        date,
        logEntryId: row.log_entry_id,
        foodName: row.food_name,
        amount: row.amount,
        percentOfDailyIntake: totalAmount > 0
          ? Math.round((row.amount / totalAmount) * 1000) / 10
          : 0,
      }));

      set({ contributors });
    } catch (error) {
      console.error('Failed to load contributors:', error);
    }
  },

  setCustomTarget: async (nutrientId: string, targetUpdate: Partial<NutrientTarget>) => {
    const { customTargets } = get();
    const existing = customTargets.get(nutrientId);

    const newTarget: NutrientTarget = {
      nutrientId,
      targetAmount: targetUpdate.targetAmount ?? existing?.targetAmount ?? 0,
      upperLimit: targetUpdate.upperLimit ?? existing?.upperLimit,
      isCustom: true,
    };

    try {
      const db = getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO custom_nutrient_targets
         (nutrient_id, target_amount, upper_limit, updated_at)
         VALUES (?, ?, ?, datetime('now'))`,
        [nutrientId, newTarget.targetAmount, newTarget.upperLimit ?? null]
      );

      const newCustomTargets = new Map(customTargets);
      newCustomTargets.set(nutrientId, newTarget);
      set({ customTargets: newCustomTargets });
    } catch (error) {
      console.error('Failed to set custom target:', error);
    }
  },

  removeCustomTarget: async (nutrientId: string) => {
    try {
      const db = getDatabase();
      await db.runAsync(
        'DELETE FROM custom_nutrient_targets WHERE nutrient_id = ?',
        [nutrientId]
      );

      const { customTargets } = get();
      const newCustomTargets = new Map(customTargets);
      newCustomTargets.delete(nutrientId);
      set({ customTargets: newCustomTargets });
    } catch (error) {
      console.error('Failed to remove custom target:', error);
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().loadDailyIntake(date);
  },

  setSelectedCategory: (category: NutrientCategory | 'all') => {
    set({ selectedCategory: category });
  },

  setShowOnlyIssues: (show: boolean) => {
    set({ showOnlyIssues: show });
  },

  getTargetForNutrient: (nutrientId: string): NutrientTarget | null => {
    const { customTargets, profile } = get();

    // Check for custom target first
    if (customTargets.has(nutrientId)) {
      return customTargets.get(nutrientId)!;
    }

    // Get RDA from tables
    const rda = getRDA(nutrientId, profile.gender, profile.ageGroup, profile.lifeStage);

    if (rda) {
      return {
        nutrientId,
        targetAmount: rda.rda ?? rda.ai ?? 0,
        upperLimit: rda.ul,
        isCustom: false,
      };
    }

    // Fallback to default adult values
    const defaultRDA = DEFAULT_ADULT_RDAS[nutrientId];
    if (defaultRDA) {
      return {
        nutrientId,
        targetAmount: defaultRDA.rda,
        upperLimit: defaultRDA.ul,
        isCustom: false,
      };
    }

    return null;
  },

  getStatusForIntake: (nutrientId: string, amount: number): NutrientStatus => {
    const target = get().getTargetForNutrient(nutrientId);
    if (!target) return 'adequate';

    return calculateStatus(amount, target.targetAmount, target.upperLimit);
  },

  getVisibleNutrients: (isPremium: boolean) => {
    if (isPremium) return ALL_NUTRIENTS;
    return FREE_NUTRIENTS;
  },
}));
