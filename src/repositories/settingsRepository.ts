import { getDatabase } from '@/db/database';
import { DEFAULT_SETTINGS } from '@/constants/defaults';

export type WeightUnit = 'lbs' | 'kg';
export type Theme = 'light' | 'dark' | 'auto';

export interface UserSettings {
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  weightUnit: WeightUnit;
  theme: Theme;
  notificationsEnabled: boolean;
  reminderTime: string | null;
}

interface SettingRow {
  key: string;
  value: string;
}

const SETTING_KEYS = {
  DAILY_CALORIE_GOAL: 'daily_calorie_goal',
  DAILY_PROTEIN_GOAL: 'daily_protein_goal',
  DAILY_CARBS_GOAL: 'daily_carbs_goal',
  DAILY_FAT_GOAL: 'daily_fat_goal',
  WEIGHT_UNIT: 'weight_unit',
  THEME: 'theme',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  REMINDER_TIME: 'reminder_time',
} as const;

export const settingsRepository = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const db = getDatabase();
    const row = await db.getFirstAsync<SettingRow>(
      'SELECT value FROM user_settings WHERE key = ?',
      [key]
    );

    if (!row) return defaultValue;

    // Parse based on the type of defaultValue
    if (typeof defaultValue === 'number') {
      return parseFloat(row.value) as T;
    }
    if (typeof defaultValue === 'boolean') {
      return (row.value === '1' || row.value === 'true') as T;
    }
    return row.value as T;
  },

  async set(key: string, value: string | number | boolean | null): Promise<void> {
    const db = getDatabase();
    const stringValue = value === null ? null : String(value);
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO user_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
      [key, stringValue, now, stringValue, now]
    );
  },

  async getAll(): Promise<UserSettings> {
    return {
      dailyCalorieGoal: await this.get(
        SETTING_KEYS.DAILY_CALORIE_GOAL,
        DEFAULT_SETTINGS.dailyCalorieGoal
      ),
      dailyProteinGoal: await this.get(
        SETTING_KEYS.DAILY_PROTEIN_GOAL,
        DEFAULT_SETTINGS.dailyProteinGoal
      ),
      dailyCarbsGoal: await this.get(
        SETTING_KEYS.DAILY_CARBS_GOAL,
        DEFAULT_SETTINGS.dailyCarbsGoal
      ),
      dailyFatGoal: await this.get(
        SETTING_KEYS.DAILY_FAT_GOAL,
        DEFAULT_SETTINGS.dailyFatGoal
      ),
      weightUnit: await this.get(
        SETTING_KEYS.WEIGHT_UNIT,
        DEFAULT_SETTINGS.weightUnit
      ) as WeightUnit,
      theme: await this.get(
        SETTING_KEYS.THEME,
        DEFAULT_SETTINGS.theme
      ) as Theme,
      notificationsEnabled: await this.get(
        SETTING_KEYS.NOTIFICATIONS_ENABLED,
        DEFAULT_SETTINGS.notificationsEnabled
      ),
      reminderTime: await this.get(
        SETTING_KEYS.REMINDER_TIME,
        DEFAULT_SETTINGS.reminderTime
      ),
    };
  },

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    if (updates.dailyCalorieGoal !== undefined) {
      await this.set(SETTING_KEYS.DAILY_CALORIE_GOAL, updates.dailyCalorieGoal);
    }
    if (updates.dailyProteinGoal !== undefined) {
      await this.set(SETTING_KEYS.DAILY_PROTEIN_GOAL, updates.dailyProteinGoal);
    }
    if (updates.dailyCarbsGoal !== undefined) {
      await this.set(SETTING_KEYS.DAILY_CARBS_GOAL, updates.dailyCarbsGoal);
    }
    if (updates.dailyFatGoal !== undefined) {
      await this.set(SETTING_KEYS.DAILY_FAT_GOAL, updates.dailyFatGoal);
    }
    if (updates.weightUnit !== undefined) {
      await this.set(SETTING_KEYS.WEIGHT_UNIT, updates.weightUnit);
    }
    if (updates.theme !== undefined) {
      await this.set(SETTING_KEYS.THEME, updates.theme);
    }
    if (updates.notificationsEnabled !== undefined) {
      await this.set(SETTING_KEYS.NOTIFICATIONS_ENABLED, updates.notificationsEnabled);
    }
    if (updates.reminderTime !== undefined) {
      await this.set(SETTING_KEYS.REMINDER_TIME, updates.reminderTime);
    }

    return this.getAll();
  },

  // Convenience methods for common settings
  async getDailyGoals(): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }> {
    return {
      calories: await this.get(
        SETTING_KEYS.DAILY_CALORIE_GOAL,
        DEFAULT_SETTINGS.dailyCalorieGoal
      ),
      protein: await this.get(
        SETTING_KEYS.DAILY_PROTEIN_GOAL,
        DEFAULT_SETTINGS.dailyProteinGoal
      ),
      carbs: await this.get(
        SETTING_KEYS.DAILY_CARBS_GOAL,
        DEFAULT_SETTINGS.dailyCarbsGoal
      ),
      fat: await this.get(
        SETTING_KEYS.DAILY_FAT_GOAL,
        DEFAULT_SETTINGS.dailyFatGoal
      ),
    };
  },

  async setDailyGoals(goals: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }): Promise<void> {
    if (goals.calories !== undefined) {
      await this.set(SETTING_KEYS.DAILY_CALORIE_GOAL, goals.calories);
    }
    if (goals.protein !== undefined) {
      await this.set(SETTING_KEYS.DAILY_PROTEIN_GOAL, goals.protein);
    }
    if (goals.carbs !== undefined) {
      await this.set(SETTING_KEYS.DAILY_CARBS_GOAL, goals.carbs);
    }
    if (goals.fat !== undefined) {
      await this.set(SETTING_KEYS.DAILY_FAT_GOAL, goals.fat);
    }
  },

  async getWeightUnit(): Promise<WeightUnit> {
    return this.get(SETTING_KEYS.WEIGHT_UNIT, DEFAULT_SETTINGS.weightUnit) as Promise<WeightUnit>;
  },

  async setWeightUnit(unit: WeightUnit): Promise<void> {
    await this.set(SETTING_KEYS.WEIGHT_UNIT, unit);
  },

  async getTheme(): Promise<Theme> {
    return this.get(SETTING_KEYS.THEME, DEFAULT_SETTINGS.theme) as Promise<Theme>;
  },

  async setTheme(theme: Theme): Promise<void> {
    await this.set(SETTING_KEYS.THEME, theme);
  },

  async resetToDefaults(): Promise<UserSettings> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM user_settings');
    return this.getAll();
  },
};
