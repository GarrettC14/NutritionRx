import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/db/database';
import { GoalRow, WeeklyReflectionRow, DailyMetabolismRow } from '@/types/database';
import { Goal, WeeklyReflection, DailyMetabolism } from '@/types/domain';
import {
  mapGoalRowToDomain,
  mapWeeklyReflectionRowToDomain,
  mapDailyMetabolismRowToDomain,
} from '@/types/mappers';

export type GoalType = 'lose' | 'maintain' | 'gain';

export interface CreateGoalInput {
  type: GoalType;
  targetWeightKg?: number;
  targetRatePercent: number;
  startDate: string;
  startWeightKg: number;
  initialTdeeEstimate: number;
  initialTargetCalories: number;
  initialProteinG: number;
  initialCarbsG: number;
  initialFatG: number;
}

export interface UpdateGoalInput {
  targetWeightKg?: number;
  targetRatePercent?: number;
  currentTdeeEstimate?: number;
  currentTargetCalories?: number;
  currentProteinG?: number;
  currentCarbsG?: number;
  currentFatG?: number;
  isActive?: boolean;
  completedAt?: string;
}

export interface CreateWeeklyReflectionInput {
  goalId: string;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  avgCalorieIntake?: number;
  daysLogged?: number;
  daysWeighed?: number;
  startTrendWeightKg?: number;
  endTrendWeightKg?: number;
  weightChangeKg?: number;
  calculatedDailyBurn?: number;
  previousTdeeEstimate?: number;
  previousTargetCalories?: number;
  newTdeeEstimate?: number;
  newTargetCalories?: number;
  newProteinG?: number;
  newCarbsG?: number;
  newFatG?: number;
  dataQuality?: string;
}

export interface UpdateWeeklyReflectionInput {
  wasAccepted?: boolean;
  userNotes?: string;
}

export interface CreateDailyMetabolismInput {
  date: string;
  trendWeightKg?: number;
  calorieIntake?: number;
  estimatedDailyBurn?: number;
  dataQuality?: string;
}

export const goalRepository = {
  // Goal methods
  async findById(id: string): Promise<Goal | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<GoalRow>(
      'SELECT * FROM goals WHERE id = ?',
      [id]
    );
    return row ? mapGoalRowToDomain(row) : null;
  },

  async getActiveGoal(): Promise<Goal | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<GoalRow>(
      'SELECT * FROM goals WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    );
    return row ? mapGoalRowToDomain(row) : null;
  },

  async getAllGoals(): Promise<Goal[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<GoalRow>(
      'SELECT * FROM goals ORDER BY created_at DESC'
    );
    return rows.map(mapGoalRowToDomain);
  },

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Deactivate any existing active goals
    await db.runAsync(
      'UPDATE goals SET is_active = 0, updated_at = ? WHERE is_active = 1',
      [now]
    );

    await db.runAsync(
      `INSERT INTO goals (
        id, type, target_weight_kg, target_rate_percent, start_date, start_weight_kg,
        initial_tdee_estimate, initial_target_calories, initial_protein_g, initial_carbs_g, initial_fat_g,
        current_tdee_estimate, current_target_calories, current_protein_g, current_carbs_g, current_fat_g,
        is_active, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.type,
        input.targetWeightKg ?? null,
        input.targetRatePercent,
        input.startDate,
        input.startWeightKg,
        input.initialTdeeEstimate,
        input.initialTargetCalories,
        input.initialProteinG,
        input.initialCarbsG,
        input.initialFatG,
        input.initialTdeeEstimate,
        input.initialTargetCalories,
        input.initialProteinG,
        input.initialCarbsG,
        input.initialFatG,
        1, // is_active
        null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create goal');
    return created;
  },

  async updateGoal(id: string, updates: UpdateGoalInput): Promise<Goal> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.targetWeightKg !== undefined) {
      setClauses.push('target_weight_kg = ?');
      values.push(updates.targetWeightKg);
    }
    if (updates.targetRatePercent !== undefined) {
      setClauses.push('target_rate_percent = ?');
      values.push(updates.targetRatePercent);
    }
    if (updates.currentTdeeEstimate !== undefined) {
      setClauses.push('current_tdee_estimate = ?');
      values.push(updates.currentTdeeEstimate);
    }
    if (updates.currentTargetCalories !== undefined) {
      setClauses.push('current_target_calories = ?');
      values.push(updates.currentTargetCalories);
    }
    if (updates.currentProteinG !== undefined) {
      setClauses.push('current_protein_g = ?');
      values.push(updates.currentProteinG);
    }
    if (updates.currentCarbsG !== undefined) {
      setClauses.push('current_carbs_g = ?');
      values.push(updates.currentCarbsG);
    }
    if (updates.currentFatG !== undefined) {
      setClauses.push('current_fat_g = ?');
      values.push(updates.currentFatG);
    }
    if (updates.isActive !== undefined) {
      setClauses.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    values.push(id);

    await db.runAsync(
      `UPDATE goals SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Goal not found');
    return updated;
  },

  async completeGoal(id: string): Promise<Goal> {
    const now = new Date().toISOString();
    return this.updateGoal(id, { isActive: false, completedAt: now });
  },

  async deleteGoal(id: string): Promise<void> {
    const db = getDatabase();
    // Delete related weekly reflections first
    await db.runAsync('DELETE FROM weekly_reflections WHERE goal_id = ?', [id]);
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
  },

  // Weekly Reflection methods
  async findReflectionById(id: string): Promise<WeeklyReflection | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<WeeklyReflectionRow>(
      'SELECT * FROM weekly_reflections WHERE id = ?',
      [id]
    );
    return row ? mapWeeklyReflectionRowToDomain(row) : null;
  },

  async getReflectionsForGoal(goalId: string): Promise<WeeklyReflection[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<WeeklyReflectionRow>(
      'SELECT * FROM weekly_reflections WHERE goal_id = ? ORDER BY week_number ASC',
      [goalId]
    );
    return rows.map(mapWeeklyReflectionRowToDomain);
  },

  async getLatestReflection(goalId: string): Promise<WeeklyReflection | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<WeeklyReflectionRow>(
      'SELECT * FROM weekly_reflections WHERE goal_id = ? ORDER BY week_number DESC LIMIT 1',
      [goalId]
    );
    return row ? mapWeeklyReflectionRowToDomain(row) : null;
  },

  async getPendingReflection(goalId: string): Promise<WeeklyReflection | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<WeeklyReflectionRow>(
      'SELECT * FROM weekly_reflections WHERE goal_id = ? AND was_accepted IS NULL ORDER BY week_number DESC LIMIT 1',
      [goalId]
    );
    return row ? mapWeeklyReflectionRowToDomain(row) : null;
  },

  async createReflection(input: CreateWeeklyReflectionInput): Promise<WeeklyReflection> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO weekly_reflections (
        id, goal_id, week_number, week_start_date, week_end_date,
        avg_calorie_intake, days_logged, days_weighed,
        start_trend_weight_kg, end_trend_weight_kg, weight_change_kg,
        calculated_daily_burn, previous_tdee_estimate, previous_target_calories,
        new_tdee_estimate, new_target_calories, new_protein_g, new_carbs_g, new_fat_g,
        was_accepted, user_notes, data_quality, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.goalId,
        input.weekNumber,
        input.weekStartDate,
        input.weekEndDate,
        input.avgCalorieIntake ?? null,
        input.daysLogged ?? null,
        input.daysWeighed ?? null,
        input.startTrendWeightKg ?? null,
        input.endTrendWeightKg ?? null,
        input.weightChangeKg ?? null,
        input.calculatedDailyBurn ?? null,
        input.previousTdeeEstimate ?? null,
        input.previousTargetCalories ?? null,
        input.newTdeeEstimate ?? null,
        input.newTargetCalories ?? null,
        input.newProteinG ?? null,
        input.newCarbsG ?? null,
        input.newFatG ?? null,
        null, // was_accepted starts as null
        null, // user_notes
        input.dataQuality ?? null,
        now,
      ]
    );

    const created = await this.findReflectionById(id);
    if (!created) throw new Error('Failed to create weekly reflection');
    return created;
  },

  async updateReflection(id: string, updates: UpdateWeeklyReflectionInput): Promise<WeeklyReflection> {
    const db = getDatabase();

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.wasAccepted !== undefined) {
      setClauses.push('was_accepted = ?');
      values.push(updates.wasAccepted ? 1 : 0);
    }
    if (updates.userNotes !== undefined) {
      setClauses.push('user_notes = ?');
      values.push(updates.userNotes);
    }

    if (setClauses.length === 0) {
      const existing = await this.findReflectionById(id);
      if (!existing) throw new Error('Weekly reflection not found');
      return existing;
    }

    values.push(id);

    await db.runAsync(
      `UPDATE weekly_reflections SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findReflectionById(id);
    if (!updated) throw new Error('Weekly reflection not found');
    return updated;
  },

  async acceptReflection(id: string, userNotes?: string): Promise<WeeklyReflection> {
    return this.updateReflection(id, { wasAccepted: true, userNotes });
  },

  async declineReflection(id: string, userNotes?: string): Promise<WeeklyReflection> {
    return this.updateReflection(id, { wasAccepted: false, userNotes });
  },

  // Daily Metabolism methods
  async findMetabolismByDate(date: string): Promise<DailyMetabolism | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<DailyMetabolismRow>(
      'SELECT * FROM daily_metabolism WHERE date = ?',
      [date]
    );
    return row ? mapDailyMetabolismRowToDomain(row) : null;
  },

  async getMetabolismForRange(startDate: string, endDate: string): Promise<DailyMetabolism[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<DailyMetabolismRow>(
      'SELECT * FROM daily_metabolism WHERE date BETWEEN ? AND ? ORDER BY date ASC',
      [startDate, endDate]
    );
    return rows.map(mapDailyMetabolismRowToDomain);
  },

  async upsertMetabolism(input: CreateDailyMetabolismInput): Promise<DailyMetabolism> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = await this.findMetabolismByDate(input.date);

    if (existing) {
      // Update existing
      await db.runAsync(
        `UPDATE daily_metabolism SET
          trend_weight_kg = COALESCE(?, trend_weight_kg),
          calorie_intake = COALESCE(?, calorie_intake),
          estimated_daily_burn = COALESCE(?, estimated_daily_burn),
          data_quality = COALESCE(?, data_quality),
          updated_at = ?
         WHERE date = ?`,
        [
          input.trendWeightKg ?? null,
          input.calorieIntake ?? null,
          input.estimatedDailyBurn ?? null,
          input.dataQuality ?? null,
          now,
          input.date,
        ]
      );
    } else {
      // Create new
      const id = uuidv4();
      await db.runAsync(
        `INSERT INTO daily_metabolism (
          id, date, trend_weight_kg, calorie_intake, estimated_daily_burn,
          data_quality, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.date,
          input.trendWeightKg ?? null,
          input.calorieIntake ?? null,
          input.estimatedDailyBurn ?? null,
          input.dataQuality ?? null,
          now,
          now,
        ]
      );
    }

    const result = await this.findMetabolismByDate(input.date);
    if (!result) throw new Error('Failed to upsert daily metabolism');
    return result;
  },

  async deleteMetabolismByDate(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM daily_metabolism WHERE date = ?', [date]);
  },
};
