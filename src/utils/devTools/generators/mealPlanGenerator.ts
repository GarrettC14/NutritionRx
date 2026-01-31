import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, nowISO,
  randomPick, shouldSkip, randomBetween, round, batchInsert,
} from './helpers';
import { ALL_TEMPLATES, MealType } from '../mockData/foodTemplates';

export async function seedMealPlanSettings(db: SQLiteDatabase, verbose: boolean): Promise<number> {
  const now = nowISO();

  await db.runAsync(
    `INSERT OR REPLACE INTO meal_plan_settings (
      id, enabled, show_on_today, reminder_time, created_at, last_modified
    ) VALUES (1, 1, 1, '08:00', ?, ?)`,
    [now, now]
  );

  if (verbose) console.log('[seed] Inserted meal plan settings');
  return 1;
}

export async function seedPlannedMeals(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  // Load food data for nutrition calculations
  const foodDataResult = await db.getAllAsync<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(`SELECT id, name, calories, protein, carbs, fat FROM food_items WHERE id LIKE 'seed-%'`);

  const foodData: Record<string, { name: string; calories: number; protein: number; carbs: number; fat: number }> = {};
  for (const food of foodDataResult) {
    foodData[food.id] = {
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };
  }

  const columns = [
    'id', 'date', 'meal_slot', 'food_id', 'food_name', 'servings',
    'calories', 'protein', 'carbs', 'fat', 'status', 'logged_at', 'created_at',
  ];
  const rows: unknown[][] = [];

  // Plan meals for roughly 50% of weeks in history
  const totalWeeks = Math.floor(monthsOfHistory * 4.3);
  const now = nowISO();

  for (let week = 0; week < totalWeeks; week++) {
    // ~50% of weeks have plans
    if (shouldSkip(0.5)) continue;

    const weekStart = week * 7;
    // Plan 3-5 days per planned week
    const plannedDays = Math.floor(randomBetween(3, 6));

    for (let d = 0; d < plannedDays; d++) {
      const dayOffset = weekStart + d;
      const date = daysAgo(dayOffset);
      const mealSlots: MealType[] = ['breakfast', 'lunch', 'dinner'];

      for (const slot of mealSlots) {
        const templates = ALL_TEMPLATES[slot];
        const template = randomPick(templates);

        // Just use the first food from the template
        const item = template.items[0];
        const food = foodData[item.foodId];
        if (!food) continue;

        const servings = item.servings;
        const isPast = dayOffset > 0;
        const status = isPast
          ? (shouldSkip(0.3) ? 'skipped' : 'logged')
          : 'planned';

        rows.push([
          generateId('plan'),
          date,
          slot,
          item.foodId,
          food.name,
          servings,
          Math.round(food.calories * servings),
          round(food.protein * servings),
          round(food.carbs * servings),
          round(food.fat * servings),
          status,
          status === 'logged' ? now : null,
          now,
        ]);
      }
    }
  }

  await batchInsert(db, 'planned_meals', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} planned meals`);
  return rows.length;
}
