import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, mealTimeOfDay,
  randomPick, shouldSkip, batchInsert, round,
} from './helpers';
import { ALL_TEMPLATES, MealType } from '../mockData/foodTemplates';
import {
  EDGE_CASE_FOOD_NOTES,
  EDGE_CASE_QUICK_ADD_DESCRIPTIONS,
  EDGE_CASE_SERVINGS,
} from '../mockData/edgeCases';

interface FoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function seedLogEntries(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  includeEdgeCases: boolean,
  verbose: boolean
): Promise<number> {
  const totalDays = monthsOfHistory * 30;

  // Load seed food nutrition data
  const foodDataResult = await db.getAllAsync<{
    id: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(`SELECT id, calories, protein, carbs, fat FROM food_items WHERE id LIKE 'seed-%'`);

  const foodData: Record<string, FoodNutrition> = {};
  for (const food of foodDataResult) {
    foodData[food.id] = {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };
  }

  const columns = [
    'id', 'food_item_id', 'date', 'meal_type', 'servings',
    'calories', 'protein', 'carbs', 'fat', 'notes',
    'created_at', 'updated_at',
  ];
  const rows: unknown[][] = [];
  let edgeCaseNoteIdx = 0;

  for (let dayOffset = totalDays; dayOffset >= 0; dayOffset--) {
    // ~10% chance of skipping a day entirely (not logging)
    if (dayOffset > 0 && shouldSkip(0.1)) continue;

    const date = daysAgo(dayOffset);
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];

    // ~70% chance of including a snack
    if (!shouldSkip(0.3)) {
      mealTypes.push('snack');
    }
    // ~20% chance of a second snack
    if (!shouldSkip(0.8)) {
      mealTypes.push('snack');
    }

    for (const mealType of mealTypes) {
      const templates = ALL_TEMPLATES[mealType];
      const template = randomPick(templates);

      for (const item of template.items) {
        const food = foodData[item.foodId];
        if (!food) continue;

        let servings = item.servings;
        let notes: string | null = null;

        // Inject edge cases
        if (includeEdgeCases && edgeCaseNoteIdx < EDGE_CASE_FOOD_NOTES.length && shouldSkip(0.9)) {
          notes = EDGE_CASE_FOOD_NOTES[edgeCaseNoteIdx++] || null;
        }
        if (includeEdgeCases && shouldSkip(0.95)) {
          servings = randomPick(EDGE_CASE_SERVINGS);
        }

        const calories = Math.round(food.calories * servings);
        const protein = round(food.protein * servings);
        const carbs = round(food.carbs * servings);
        const fat = round(food.fat * servings);
        const datetime = mealTimeOfDay(date, mealType);

        rows.push([
          generateId('log'),
          item.foodId,
          date,
          mealType,
          servings,
          calories,
          protein,
          carbs,
          fat,
          notes,
          datetime,
          datetime,
        ]);
      }
    }
  }

  await batchInsert(db, 'log_entries', columns, rows);

  // Update food_items usage tracking
  await db.runAsync(`
    UPDATE food_items SET
      last_used_at = (SELECT MAX(created_at) FROM log_entries WHERE log_entries.food_item_id = food_items.id),
      usage_count = (SELECT COUNT(*) FROM log_entries WHERE log_entries.food_item_id = food_items.id),
      updated_at = datetime('now')
    WHERE id IN (SELECT DISTINCT food_item_id FROM log_entries)
  `);

  if (verbose) console.log(`[seed] Inserted ${rows.length} log entries`);
  return rows.length;
}

export async function seedQuickAddEntries(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  includeEdgeCases: boolean,
  verbose: boolean
): Promise<number> {
  const totalDays = monthsOfHistory * 30;
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  const columns = [
    'id', 'date', 'meal_type', 'calories', 'protein', 'carbs', 'fat',
    'description', 'created_at', 'updated_at',
  ];
  const rows: unknown[][] = [];
  let edgeCaseIdx = 0;

  // Sporadic quick adds — roughly 1 every 5-6 days
  for (let dayOffset = totalDays; dayOffset >= 0; dayOffset--) {
    if (shouldSkip(0.83)) continue;

    const date = daysAgo(dayOffset);
    const mealType = randomPick(mealTypes);
    const calories = Math.round(100 + Math.random() * 400);
    const protein = Math.round(Math.random() * 30);
    const carbs = Math.round(Math.random() * 50);
    const fat = Math.round(Math.random() * 20);

    let description = randomPick([
      'Trail mix handful',
      'Chipotle bowl',
      'Granola bar',
      'Office snack',
      'Smoothie',
      'Leftovers',
      'Restaurant meal estimate',
    ]);

    if (includeEdgeCases && edgeCaseIdx < EDGE_CASE_QUICK_ADD_DESCRIPTIONS.length) {
      description = EDGE_CASE_QUICK_ADD_DESCRIPTIONS[edgeCaseIdx++];
    }

    const datetime = mealTimeOfDay(date, mealType);

    rows.push([
      generateId('qa'),
      date,
      mealType,
      calories,
      protein > 0 ? protein : null,
      carbs > 0 ? carbs : null,
      fat > 0 ? fat : null,
      description,
      datetime,
      datetime,
    ]);
  }

  // Add zero-calorie entries if edge cases enabled
  if (includeEdgeCases) {
    const recentDate = daysAgo(2);
    const datetime = mealTimeOfDay(recentDate, 'snack');
    rows.push([
      generateId('qa'), recentDate, 'snack', 0, 0, 0, 0,
      'Black coffee - 0 cal', datetime, datetime,
    ]);
    rows.push([
      generateId('qa'), recentDate, 'snack', 0, null, null, null,
      'Water with lemon', datetime, datetime,
    ]);
  }

  await batchInsert(db, 'quick_add_entries', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} quick add entries`);
  return rows.length;
}
