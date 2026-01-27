import { getDatabase } from '@/db/database';
import { NativeModules, Platform } from 'react-native';

export type GoalPath = 'lose' | 'maintain' | 'gain' | 'track';
export type EnergyUnit = 'calories' | 'kilojoules';

export interface OnboardingData {
  isComplete: boolean;
  completedAt: string | null;
  goalPath: GoalPath | null;
  energyUnit: EnergyUnit;
  weightUnit: 'lbs' | 'kg';
  seenTooltips: string[];
  firstFoodLoggedAt: string | null;
  totalFoodsLogged: number;
  daysTracked: number;
}

const SETTING_KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  ONBOARDING_COMPLETED_AT: 'onboarding_completed_at',
  GOAL_PATH: 'onboarding_goal_path',
  ENERGY_UNIT: 'energy_unit',
  WEIGHT_UNIT: 'weight_unit',
  SEEN_TOOLTIPS: 'seen_tooltips',
  FIRST_FOOD_LOGGED_AT: 'first_food_logged_at',
  TOTAL_FOODS_LOGGED: 'total_foods_logged',
  DAYS_TRACKED: 'days_tracked',
} as const;

// Detect locale for smart defaults
function getLocaleDefaults(): { energyUnit: EnergyUnit; weightUnit: 'lbs' | 'kg' } {
  try {
    // Try to get device locale
    let locale = 'en-US';

    if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
               NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
               'en-US';
    } else if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager?.localeIdentifier || 'en-US';
    }

    // US/UK typically use calories and lbs
    const usesImperial = locale.includes('US') || locale.includes('GB') || locale.includes('en_');
    // Australia often uses kilojoules
    const usesKilojoules = locale.includes('AU');

    return {
      energyUnit: usesKilojoules ? 'kilojoules' : 'calories',
      weightUnit: usesImperial ? 'lbs' : 'kg',
    };
  } catch {
    // Default to US settings
    return { energyUnit: 'calories', weightUnit: 'lbs' };
  }
}

interface SettingRow {
  key: string;
  value: string;
}

export const onboardingRepository = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const db = getDatabase();
    const row = await db.getFirstAsync<SettingRow>(
      'SELECT value FROM user_settings WHERE key = ?',
      [key]
    );

    if (!row || row.value === null) return defaultValue;

    // Parse based on the type of defaultValue
    if (typeof defaultValue === 'number') {
      return parseFloat(row.value) as T;
    }
    if (typeof defaultValue === 'boolean') {
      return (row.value === '1' || row.value === 'true') as T;
    }
    if (Array.isArray(defaultValue)) {
      try {
        return JSON.parse(row.value) as T;
      } catch {
        return defaultValue;
      }
    }
    return row.value as T;
  },

  async set(key: string, value: string | number | boolean | string[] | null): Promise<void> {
    const db = getDatabase();
    let stringValue: string | null = null;

    if (value !== null) {
      if (Array.isArray(value)) {
        stringValue = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        stringValue = value ? '1' : '0';
      } else {
        stringValue = String(value);
      }
    }

    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO user_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
      [key, stringValue, now, stringValue, now]
    );
  },

  async getAll(): Promise<OnboardingData> {
    const defaults = getLocaleDefaults();

    return {
      isComplete: await this.get(SETTING_KEYS.ONBOARDING_COMPLETE, false),
      completedAt: await this.get(SETTING_KEYS.ONBOARDING_COMPLETED_AT, null as string | null),
      goalPath: await this.get(SETTING_KEYS.GOAL_PATH, null as GoalPath | null),
      energyUnit: await this.get(SETTING_KEYS.ENERGY_UNIT, defaults.energyUnit),
      weightUnit: await this.get(SETTING_KEYS.WEIGHT_UNIT, defaults.weightUnit),
      seenTooltips: await this.get(SETTING_KEYS.SEEN_TOOLTIPS, [] as string[]),
      firstFoodLoggedAt: await this.get(SETTING_KEYS.FIRST_FOOD_LOGGED_AT, null as string | null),
      totalFoodsLogged: await this.get(SETTING_KEYS.TOTAL_FOODS_LOGGED, 0),
      daysTracked: await this.get(SETTING_KEYS.DAYS_TRACKED, 0),
    };
  },

  async completeOnboarding(goalPath: GoalPath, energyUnit: EnergyUnit, weightUnit: 'lbs' | 'kg'): Promise<OnboardingData> {
    const now = new Date().toISOString();

    await this.set(SETTING_KEYS.ONBOARDING_COMPLETE, true);
    await this.set(SETTING_KEYS.ONBOARDING_COMPLETED_AT, now);
    await this.set(SETTING_KEYS.GOAL_PATH, goalPath);
    await this.set(SETTING_KEYS.ENERGY_UNIT, energyUnit);
    await this.set(SETTING_KEYS.WEIGHT_UNIT, weightUnit);

    return this.getAll();
  },

  async setGoalPath(goalPath: GoalPath): Promise<void> {
    await this.set(SETTING_KEYS.GOAL_PATH, goalPath);
  },

  async setEnergyUnit(unit: EnergyUnit): Promise<void> {
    await this.set(SETTING_KEYS.ENERGY_UNIT, unit);
  },

  async setWeightUnit(unit: 'lbs' | 'kg'): Promise<void> {
    await this.set(SETTING_KEYS.WEIGHT_UNIT, unit);
  },

  async markTooltipSeen(tooltipId: string): Promise<string[]> {
    const current = await this.get(SETTING_KEYS.SEEN_TOOLTIPS, [] as string[]);
    if (!current.includes(tooltipId)) {
      const updated = [...current, tooltipId];
      await this.set(SETTING_KEYS.SEEN_TOOLTIPS, updated);
      return updated;
    }
    return current;
  },

  async hasSeenTooltip(tooltipId: string): Promise<boolean> {
    const seen = await this.get(SETTING_KEYS.SEEN_TOOLTIPS, [] as string[]);
    return seen.includes(tooltipId);
  },

  async markFirstFoodLogged(): Promise<void> {
    const existing = await this.get(SETTING_KEYS.FIRST_FOOD_LOGGED_AT, null as string | null);
    if (!existing) {
      await this.set(SETTING_KEYS.FIRST_FOOD_LOGGED_AT, new Date().toISOString());
    }
  },

  async incrementFoodsLogged(): Promise<number> {
    const current = await this.get(SETTING_KEYS.TOTAL_FOODS_LOGGED, 0);
    const newCount = current + 1;
    await this.set(SETTING_KEYS.TOTAL_FOODS_LOGGED, newCount);
    return newCount;
  },

  async incrementDaysTracked(): Promise<number> {
    const current = await this.get(SETTING_KEYS.DAYS_TRACKED, 0);
    const newCount = current + 1;
    await this.set(SETTING_KEYS.DAYS_TRACKED, newCount);
    return newCount;
  },

  async resetOnboarding(): Promise<OnboardingData> {
    const db = getDatabase();

    // Delete all onboarding-related settings
    const keysToDelete = Object.values(SETTING_KEYS);
    for (const key of keysToDelete) {
      await db.runAsync('DELETE FROM user_settings WHERE key = ?', [key]);
    }

    return this.getAll();
  },

  async resetTooltips(): Promise<void> {
    await this.set(SETTING_KEYS.SEEN_TOOLTIPS, []);
    await this.set(SETTING_KEYS.FIRST_FOOD_LOGGED_AT, null);
  },

  getLocaleDefaults,
};
