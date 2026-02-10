import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';
import {
  MacroCycleConfig,
  MacroCycleOverride,
  MacroCycleConfigRow,
  MacroCycleOverrideRow,
  MacroCyclePatternType,
  DayTargets,
} from '@/types/planning';

// Default values
export const DEFAULT_MACRO_CYCLE_CONFIG: Omit<MacroCycleConfig, 'createdAt' | 'lastModified'> = {
  enabled: false,
  patternType: 'training_rest',
  markedDays: [], // No training days set by default
  dayTargets: {},
};

function mapConfigRowToConfig(row: MacroCycleConfigRow): MacroCycleConfig {
  return {
    enabled: Boolean(row.enabled),
    patternType: row.pattern_type as MacroCyclePatternType,
    markedDays: JSON.parse(row.marked_days),
    dayTargets: JSON.parse(row.day_targets),
    createdAt: row.created_at,
    lastModified: row.last_modified,
  };
}

function mapOverrideRowToOverride(row: MacroCycleOverrideRow): MacroCycleOverride {
  return {
    id: row.id,
    date: row.date,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    createdAt: row.created_at,
  };
}

export const macroCycleRepository = {
  // ============================================================
  // Configuration
  // ============================================================

  async getConfig(): Promise<MacroCycleConfig | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<MacroCycleConfigRow>(
      'SELECT * FROM macro_cycle_config WHERE id = 1'
    );
    return row ? mapConfigRowToConfig(row) : null;
  },

  async getOrCreateConfig(): Promise<MacroCycleConfig> {
    const existing = await this.getConfig();
    if (existing) return existing;

    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO macro_cycle_config (
        id, enabled, pattern_type, marked_days, day_targets, created_at, last_modified
      ) VALUES (1, 0, 'training_rest', '[]', '{}', ?, ?)`,
      [now, now]
    );

    return this.getConfig() as Promise<MacroCycleConfig>;
  },

  async updateConfig(updates: Partial<MacroCycleConfig>): Promise<MacroCycleConfig> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure config exists
    await this.getOrCreateConfig();

    const setClauses: string[] = ['last_modified = ?'];
    const values: (string | number)[] = [now];

    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.patternType !== undefined) {
      setClauses.push('pattern_type = ?');
      values.push(updates.patternType);
    }
    if (updates.markedDays !== undefined) {
      setClauses.push('marked_days = ?');
      values.push(JSON.stringify(updates.markedDays));
    }
    if (updates.dayTargets !== undefined) {
      setClauses.push('day_targets = ?');
      values.push(JSON.stringify(updates.dayTargets));
    }

    await db.runAsync(
      `UPDATE macro_cycle_config SET ${setClauses.join(', ')} WHERE id = 1`,
      values
    );

    return this.getConfig() as Promise<MacroCycleConfig>;
  },

  async disableCycling(): Promise<MacroCycleConfig> {
    return this.updateConfig({ enabled: false });
  },

  // ============================================================
  // Day Targets
  // ============================================================

  async getTargetsForDate(date: string, baseTargets: DayTargets): Promise<DayTargets> {
    // First check for manual override
    const override = await this.getOverrideByDate(date);
    if (override) {
      return {
        calories: override.calories,
        protein: override.protein,
        carbs: override.carbs,
        fat: override.fat,
      };
    }

    // Then check macro cycle config
    const config = await this.getConfig();
    if (!config || !config.enabled) {
      return baseTargets;
    }

    // Parse at noon local time to avoid date-shifting from UTC offset.
    // e.g., '2026-02-10' parsed as UTC in some engines would roll back
    // to Feb 9 in UTC-8. Noon gives a 12-hour buffer in either direction.
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    // Return day-specific targets if they exist
    if (config.dayTargets[dayOfWeek]) {
      return config.dayTargets[dayOfWeek];
    }

    return baseTargets;
  },

  getDayType(
    dayOfWeek: number,
    config: MacroCycleConfig
  ): 'training' | 'rest' | 'high_carb' | 'low_carb' | 'custom' | 'even' | null {
    if (!config.enabled) return null;

    const isMarkedDay = config.markedDays.includes(dayOfWeek);

    switch (config.patternType) {
      case 'training_rest':
        return isMarkedDay ? 'training' : 'rest';
      case 'high_low_carb':
        return isMarkedDay ? 'high_carb' : 'low_carb';
      case 'even_distribution':
        return 'even';
      case 'custom':
        return 'custom';
      default:
        return null;
    }
  },

  // ============================================================
  // Overrides
  // ============================================================

  async getOverrideByDate(date: string): Promise<MacroCycleOverride | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<MacroCycleOverrideRow>(
      'SELECT * FROM macro_cycle_overrides WHERE date = ?',
      [date]
    );
    return row ? mapOverrideRowToOverride(row) : null;
  },

  async setOverride(date: string, targets: DayTargets): Promise<MacroCycleOverride> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();

    // Delete existing override for this date
    await db.runAsync('DELETE FROM macro_cycle_overrides WHERE date = ?', [date]);

    await db.runAsync(
      `INSERT INTO macro_cycle_overrides (id, date, calories, protein, carbs, fat, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, date, targets.calories, targets.protein, targets.carbs, targets.fat, now]
    );

    return this.getOverrideByDate(date) as Promise<MacroCycleOverride>;
  },

  async clearOverride(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM macro_cycle_overrides WHERE date = ?', [date]);
  },

  async getAllOverrides(): Promise<MacroCycleOverride[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<MacroCycleOverrideRow>(
      'SELECT * FROM macro_cycle_overrides ORDER BY date ASC'
    );
    return rows.map(mapOverrideRowToOverride);
  },

  async clearAllOverrides(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM macro_cycle_overrides');
  },

  // ============================================================
  // Utilities
  // ============================================================

  calculateWeeklyAverage(config: MacroCycleConfig): DayTargets {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let daysWithTargets = 0;

    for (let day = 0; day < 7; day++) {
      const targets = config.dayTargets[day];
      if (targets) {
        totalCalories += targets.calories;
        totalProtein += targets.protein;
        totalCarbs += targets.carbs;
        totalFat += targets.fat;
        daysWithTargets++;
      }
    }

    if (daysWithTargets === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    return {
      calories: Math.round(totalCalories / daysWithTargets),
      protein: Math.round(totalProtein / daysWithTargets),
      carbs: Math.round(totalCarbs / daysWithTargets),
      fat: Math.round(totalFat / daysWithTargets),
    };
  },
};
