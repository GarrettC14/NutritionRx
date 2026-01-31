import { SQLiteDatabase } from 'expo-sqlite';
import { nowISO } from './helpers';

export async function seedProfile(db: SQLiteDatabase, verbose: boolean): Promise<number> {
  const now = nowISO();

  await db.runAsync(
    `UPDATE user_profile SET
      sex = 'male',
      date_of_birth = '1990-05-15',
      height_cm = 178,
      activity_level = 'moderately_active',
      eating_style = 'flexible',
      protein_priority = 'active',
      has_completed_onboarding = 1,
      onboarding_skipped = 0,
      updated_at = ?
    WHERE id = 'singleton'`,
    [now]
  );

  if (verbose) console.log('[seed] Updated user profile');
  return 1;
}

export async function seedUserSettings(db: SQLiteDatabase, verbose: boolean): Promise<number> {
  const now = nowISO();
  const settings: [string, string][] = [
    ['weight_unit', 'lbs'],
    ['theme', 'dark'],
    ['daily_calorie_goal', '2100'],
    ['daily_protein_goal', '135'],
    ['daily_carbs_goal', '195'],
    ['daily_fat_goal', '87'],
    ['has_seen_onboarding', '1'],
  ];

  for (const [key, value] of settings) {
    await db.runAsync(
      `INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, value, now]
    );
  }

  if (verbose) console.log('[seed] Updated user settings');
  return settings.length;
}

export async function seedGoals(db: SQLiteDatabase, verbose: boolean): Promise<{ count: number; activeGoalId: string }> {
  const now = nowISO();

  // Completed goal from 6 months ago
  const completedGoalId = `goal-completed-${Date.now().toString(36)}`;
  await db.runAsync(
    `INSERT OR REPLACE INTO goals (
      id, type, target_weight_kg, target_rate_percent,
      start_date, start_weight_kg,
      initial_tdee_estimate, initial_target_calories,
      initial_protein_g, initial_carbs_g, initial_fat_g,
      current_tdee_estimate, current_target_calories,
      current_protein_g, current_carbs_g, current_fat_g,
      eating_style, protein_priority,
      is_active, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      completedGoalId, 'lose', 85, 0.5,
      '2024-06-01', 92,
      2700, 2200, 140, 210, 90,
      2650, 2150, 140, 205, 88,
      'flexible', 'active',
      0, '2024-09-15T00:00:00.000Z',
      '2024-06-01T00:00:00.000Z', now,
    ]
  );

  // Active goal
  const activeGoalId = `goal-active-${Date.now().toString(36)}`;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 42);
  const startDateStr = startDate.toISOString().split('T')[0];

  await db.runAsync(
    `INSERT OR REPLACE INTO goals (
      id, type, target_weight_kg, target_rate_percent,
      start_date, start_weight_kg,
      initial_tdee_estimate, initial_target_calories,
      initial_protein_g, initial_carbs_g, initial_fat_g,
      current_tdee_estimate, current_target_calories,
      current_protein_g, current_carbs_g, current_fat_g,
      eating_style, protein_priority,
      is_active, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activeGoalId, 'lose', 80, 0.5,
      startDateStr, 88,
      2650, 2150, 135, 201, 89,
      2600, 2100, 135, 195, 87,
      'flexible', 'active',
      1, null,
      startDate.toISOString(), now,
    ]
  );

  if (verbose) console.log('[seed] Inserted 2 goals');
  return { count: 2, activeGoalId };
}
