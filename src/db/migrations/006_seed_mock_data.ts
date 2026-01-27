import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration 006: Seed Mock Data for Testing
 *
 * Populates the database with realistic mock data to demonstrate all screens:
 * - User profile with completed onboarding
 * - 45 days of weight entries showing weight loss progress
 * - 14 days of food log entries across all meals
 * - Quick add entries for variety
 * - Active goal with targets
 * - Weekly reflections
 * - Daily metabolism tracking
 * - Updated user settings
 */

// Helper to generate a simple ID
function generateId(): string {
  return 'mock-' + Math.random().toString(36).substring(2, 11);
}

// Helper to get date string N days ago
function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split('T')[0];
}

// Helper to get ISO datetime N days ago
function datetimeAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString();
}

export async function migration006SeedMockData(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  // ============================================================
  // USER PROFILE - Completed onboarding
  // ============================================================
  await db.runAsync(`
    UPDATE user_profile SET
      sex = 'male',
      date_of_birth = '1990-05-15',
      height_cm = 178,
      activity_level = 'moderately_active',
      eating_style = 'flexible',
      protein_priority = 'active',
      has_completed_onboarding = 1,
      onboarding_skipped = 0,
      updated_at = ?
    WHERE id = 'singleton'
  `, [now]);

  console.log('Updated user profile');

  // ============================================================
  // WEIGHT ENTRIES - 45 days of data showing ~5kg loss
  // Starting at 88kg, ending around 83kg
  // ============================================================
  const startWeight = 88;
  const weightLossPerDay = 0.11; // About 0.5kg/week

  for (let i = 45; i >= 0; i--) {
    const date = daysAgo(i);
    // Add some natural fluctuation (+/- 0.3kg)
    const fluctuation = (Math.random() - 0.5) * 0.6;
    const weight = startWeight - (45 - i) * weightLossPerDay + fluctuation;
    const weightRounded = Math.round(weight * 10) / 10;

    // Skip some days randomly (about 15% chance) to simulate real usage
    if (i > 0 && Math.random() < 0.15) continue;

    await db.runAsync(`
      INSERT OR REPLACE INTO weight_entries (id, date, weight_kg, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      `weight-${date}`,
      date,
      weightRounded,
      null,
      datetimeAgo(i),
      datetimeAgo(i)
    ]);
  }

  console.log('Inserted weight entries');

  // ============================================================
  // GOALS - Active weight loss goal
  // ============================================================
  const goalId = generateId();
  const goalStartDate = daysAgo(42); // 6 weeks ago
  const startWeightKg = 88;
  const targetWeightKg = 80;

  // Calculated values for a 180lb (82kg) male, moderately active
  const initialTdee = 2650;
  const deficitCals = 500; // ~0.5kg/week
  const targetCalories = initialTdee - deficitCals;

  // Macro targets: flexible eating style + active protein priority
  // Protein: 0.75g/lb * 180lb = 135g
  // Remaining cals after protein: 2150 - (135*4) = 1610
  // 50/50 split: 805 each
  // Carbs: 805/4 = 201g, Fat: 805/9 = 89g

  await db.runAsync(`
    INSERT INTO goals (
      id, type, target_weight_kg, target_rate_percent,
      start_date, start_weight_kg,
      initial_tdee_estimate, initial_target_calories,
      initial_protein_g, initial_carbs_g, initial_fat_g,
      current_tdee_estimate, current_target_calories,
      current_protein_g, current_carbs_g, current_fat_g,
      eating_style, protein_priority,
      is_active, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    goalId,
    'lose',
    targetWeightKg,
    0.5, // 0.5% body weight per week
    goalStartDate,
    startWeightKg,
    initialTdee,
    targetCalories,
    135, 201, 89,
    initialTdee - 50, // Slightly adjusted TDEE after weeks
    targetCalories - 50,
    135, 195, 87,
    'flexible',
    'active',
    1,
    null,
    datetimeAgo(42),
    now
  ]);

  console.log('Inserted goal');

  // ============================================================
  // UPDATE USER SETTINGS with macro goals
  // ============================================================
  await db.runAsync(`
    UPDATE user_settings SET value = ?, updated_at = ? WHERE key = 'daily_calorie_goal'
  `, [String(targetCalories - 50), now]);

  await db.runAsync(`
    UPDATE user_settings SET value = ?, updated_at = ? WHERE key = 'daily_protein_goal'
  `, ['135', now]);

  await db.runAsync(`
    UPDATE user_settings SET value = ?, updated_at = ? WHERE key = 'daily_carbs_goal'
  `, ['195', now]);

  await db.runAsync(`
    UPDATE user_settings SET value = ?, updated_at = ? WHERE key = 'daily_fat_goal'
  `, ['87', now]);

  await db.runAsync(`
    UPDATE user_settings SET value = ?, updated_at = ? WHERE key = 'has_seen_onboarding'
  `, ['1', now]);

  console.log('Updated user settings');

  // ============================================================
  // FOOD LOG ENTRIES - 14 days of realistic meal logging
  // ============================================================

  // Define meal templates using seed food IDs
  const mealTemplates = {
    breakfast: [
      // Oatmeal + banana + protein shake
      [
        { foodId: 'seed-057', servings: 0.5, meal: 'breakfast' }, // Oats
        { foodId: 'seed-024', servings: 1, meal: 'breakfast' },   // Banana
        { foodId: 'seed-104', servings: 1, meal: 'breakfast' },   // Protein shake
      ],
      // Eggs + whole wheat bread
      [
        { foodId: 'seed-004', servings: 3, meal: 'breakfast' },   // Eggs
        { foodId: 'seed-059', servings: 0.5, meal: 'breakfast' }, // Whole wheat bread
        { foodId: 'seed-120', servings: 1, meal: 'breakfast' },   // Coffee
      ],
      // Greek yogurt + blueberries + granola
      [
        { foodId: 'seed-063', servings: 2, meal: 'breakfast' },   // Greek yogurt nonfat
        { foodId: 'seed-028', servings: 1, meal: 'breakfast' },   // Blueberries
        { foodId: 'seed-106', servings: 0.3, meal: 'breakfast' }, // Granola
      ],
      // Bagel + cream cheese + latte
      [
        { foodId: 'seed-115', servings: 1, meal: 'breakfast' },   // Bagel
        { foodId: 'seed-074', servings: 0.3, meal: 'breakfast' }, // Cream cheese
        { foodId: 'seed-121', servings: 1, meal: 'breakfast' },   // Latte
      ],
    ],
    lunch: [
      // Chicken breast + brown rice + broccoli
      [
        { foodId: 'seed-001', servings: 1.5, meal: 'lunch' },     // Chicken breast
        { foodId: 'seed-054', servings: 1.5, meal: 'lunch' },     // Brown rice
        { foodId: 'seed-037', servings: 1, meal: 'lunch' },       // Broccoli steamed
      ],
      // Tuna salad + whole wheat bread
      [
        { foodId: 'seed-015', servings: 1, meal: 'lunch' },       // Tuna canned
        { foodId: 'seed-059', servings: 1, meal: 'lunch' },       // Whole wheat bread
        { foodId: 'seed-038', servings: 0.5, meal: 'lunch' },     // Spinach
        { foodId: 'seed-043', servings: 0.5, meal: 'lunch' },     // Tomato
      ],
      // Turkey wrap
      [
        { foodId: 'seed-011', servings: 1, meal: 'lunch' },       // Turkey breast
        { foodId: 'seed-061', servings: 1, meal: 'lunch' },       // Flour tortilla
        { foodId: 'seed-034', servings: 0.5, meal: 'lunch' },     // Avocado
        { foodId: 'seed-071', servings: 0.3, meal: 'lunch' },     // Cheddar
      ],
      // Caesar salad with chicken
      [
        { foodId: 'seed-103', servings: 3, meal: 'lunch' },       // Caesar salad with chicken
      ],
    ],
    dinner: [
      // Salmon + sweet potato + asparagus
      [
        { foodId: 'seed-013', servings: 1.5, meal: 'dinner' },    // Salmon wild
        { foodId: 'seed-044', servings: 1.5, meal: 'dinner' },    // Sweet potato
        { foodId: 'seed-046', servings: 1, meal: 'dinner' },      // Asparagus
      ],
      // Beef steak + potato + green beans
      [
        { foodId: 'seed-008', servings: 1.5, meal: 'dinner' },    // Beef sirloin
        { foodId: 'seed-045', servings: 1.5, meal: 'dinner' },    // Potato baked
        { foodId: 'seed-047', servings: 1, meal: 'dinner' },      // Green beans
      ],
      // Pasta with ground turkey
      [
        { foodId: 'seed-058', servings: 2, meal: 'dinner' },      // Pasta
        { foodId: 'seed-012', servings: 1, meal: 'dinner' },      // Ground turkey
        { foodId: 'seed-082', servings: 1, meal: 'dinner' },      // Olive oil
      ],
      // Chicken thigh + quinoa + mixed veggies
      [
        { foodId: 'seed-002', servings: 1.5, meal: 'dinner' },    // Chicken thigh
        { foodId: 'seed-055', servings: 1.5, meal: 'dinner' },    // Quinoa
        { foodId: 'seed-041', servings: 1, meal: 'dinner' },      // Bell pepper
        { foodId: 'seed-049', servings: 0.5, meal: 'dinner' },    // Zucchini
      ],
    ],
    snack: [
      // Protein bar
      [
        { foodId: 'seed-105', servings: 1, meal: 'snack' },       // Protein bar
      ],
      // Apple + peanut butter
      [
        { foodId: 'seed-025', servings: 1, meal: 'snack' },       // Apple
        { foodId: 'seed-080', servings: 0.15, meal: 'snack' },    // Peanut butter
      ],
      // Greek yogurt
      [
        { foodId: 'seed-063', servings: 1.5, meal: 'snack' },     // Greek yogurt
      ],
      // Almonds
      [
        { foodId: 'seed-076', servings: 0.3, meal: 'snack' },     // Almonds
      ],
    ],
  };

  // Get seed food data for calorie/macro calculations
  const foodDataResult = await db.getAllAsync<{
    id: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(`SELECT id, calories, protein, carbs, fat FROM food_items WHERE id LIKE 'seed-%'`);

  const foodData: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
  for (const food of foodDataResult) {
    foodData[food.id] = {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };
  }

  // Generate log entries for 14 days
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const date = daysAgo(dayOffset);

    // Pick random meals for each meal type
    const breakfastIdx = Math.floor(Math.random() * mealTemplates.breakfast.length);
    const lunchIdx = Math.floor(Math.random() * mealTemplates.lunch.length);
    const dinnerIdx = Math.floor(Math.random() * mealTemplates.dinner.length);
    const snackIdx = Math.floor(Math.random() * mealTemplates.snack.length);

    // Sometimes skip snacks
    const includeSnack = Math.random() > 0.3;

    const meals = [
      ...mealTemplates.breakfast[breakfastIdx],
      ...mealTemplates.lunch[lunchIdx],
      ...mealTemplates.dinner[dinnerIdx],
      ...(includeSnack ? mealTemplates.snack[snackIdx] : []),
    ];

    for (const meal of meals) {
      const food = foodData[meal.foodId];
      if (!food) continue;

      const calories = Math.round(food.calories * meal.servings);
      const protein = Math.round(food.protein * meal.servings * 10) / 10;
      const carbs = Math.round(food.carbs * meal.servings * 10) / 10;
      const fat = Math.round(food.fat * meal.servings * 10) / 10;

      await db.runAsync(`
        INSERT INTO log_entries (
          id, food_item_id, date, meal_type, servings,
          calories, protein, carbs, fat, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        generateId(),
        meal.foodId,
        date,
        meal.meal,
        meal.servings,
        calories,
        protein,
        carbs,
        fat,
        null,
        datetimeAgo(dayOffset),
        datetimeAgo(dayOffset)
      ]);
    }
  }

  console.log('Inserted food log entries');

  // ============================================================
  // UPDATE FOOD ITEMS USAGE TRACKING
  // Set last_used_at and usage_count based on log entries
  // ============================================================
  await db.runAsync(`
    UPDATE food_items
    SET
      last_used_at = (
        SELECT MAX(created_at)
        FROM log_entries
        WHERE log_entries.food_item_id = food_items.id
      ),
      usage_count = (
        SELECT COUNT(*)
        FROM log_entries
        WHERE log_entries.food_item_id = food_items.id
      ),
      updated_at = ?
    WHERE id IN (SELECT DISTINCT food_item_id FROM log_entries)
  `, [now]);

  console.log('Updated food items usage tracking');

  // ============================================================
  // QUICK ADD ENTRIES - A few quick add examples
  // ============================================================
  const quickAddEntries = [
    { date: daysAgo(5), meal: 'snack', calories: 150, protein: 2, carbs: 20, fat: 7, description: 'Trail mix handful' },
    { date: daysAgo(3), meal: 'lunch', calories: 450, protein: 25, carbs: 45, fat: 18, description: 'Chipotle bowl' },
    { date: daysAgo(1), meal: 'snack', calories: 200, protein: 4, carbs: 35, fat: 5, description: 'Granola bar' },
    { date: today, meal: 'snack', calories: 100, protein: 1, carbs: 25, fat: 0, description: 'Apple' },
  ];

  for (const entry of quickAddEntries) {
    const dayOffset = entry.date === today ? 0 : parseInt(entry.date.split('-')[2]) - new Date().getDate();

    await db.runAsync(`
      INSERT INTO quick_add_entries (
        id, date, meal_type, calories, protein, carbs, fat,
        description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generateId(),
      entry.date,
      entry.meal,
      entry.calories,
      entry.protein,
      entry.carbs,
      entry.fat,
      entry.description,
      now,
      now
    ]);
  }

  console.log('Inserted quick add entries');

  // ============================================================
  // WEEKLY REFLECTIONS - 5 weeks of check-ins
  // ============================================================
  for (let weekNum = 1; weekNum <= 5; weekNum++) {
    const weekStartOffset = 7 + (5 - weekNum) * 7;
    const weekStart = daysAgo(weekStartOffset);
    const weekEnd = daysAgo(weekStartOffset - 6);

    const weeklyWeightChange = -0.4 - Math.random() * 0.3; // -0.4 to -0.7 kg/week
    const avgCalories = 2050 + Math.floor(Math.random() * 200) - 100;
    const daysLogged = 5 + Math.floor(Math.random() * 3);
    const daysWeighed = 4 + Math.floor(Math.random() * 3);

    await db.runAsync(`
      INSERT INTO weekly_reflections (
        id, goal_id, week_number, week_start_date, week_end_date,
        avg_calorie_intake, days_logged, days_weighed,
        start_trend_weight_kg, end_trend_weight_kg, weight_change_kg,
        calculated_daily_burn, previous_tdee_estimate, previous_target_calories,
        new_tdee_estimate, new_target_calories, new_protein_g, new_carbs_g, new_fat_g,
        was_accepted, user_notes, data_quality, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generateId(),
      goalId,
      weekNum,
      weekStart,
      weekEnd,
      avgCalories,
      daysLogged,
      daysWeighed,
      startWeight - (weekNum - 1) * 0.5,
      startWeight - weekNum * 0.5,
      weeklyWeightChange,
      2550 + Math.floor(Math.random() * 100),
      initialTdee - (weekNum - 1) * 10,
      targetCalories - (weekNum - 1) * 10,
      initialTdee - weekNum * 10,
      targetCalories - weekNum * 10,
      135,
      195 - weekNum,
      87,
      1, // was accepted
      weekNum === 3 ? 'Feeling good, energy levels stable' : null,
      daysLogged >= 5 ? 'high' : 'moderate',
      datetimeAgo(weekStartOffset - 7)
    ]);
  }

  console.log('Inserted weekly reflections');

  // ============================================================
  // DAILY METABOLISM - 30 days of tracking
  // ============================================================
  for (let i = 30; i >= 0; i--) {
    const date = daysAgo(i);
    const trendWeight = startWeight - (30 - i) * 0.12 + (Math.random() - 0.5) * 0.3;
    const calorieIntake = 1950 + Math.floor(Math.random() * 300);
    const estimatedBurn = 2500 + Math.floor(Math.random() * 200);

    // Skip some days randomly
    if (i > 0 && Math.random() < 0.2) continue;

    await db.runAsync(`
      INSERT OR REPLACE INTO daily_metabolism (
        id, date, trend_weight_kg, calorie_intake, estimated_daily_burn,
        data_quality, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `metab-${date}`,
      date,
      Math.round(trendWeight * 10) / 10,
      calorieIntake,
      estimatedBurn,
      'moderate',
      datetimeAgo(i),
      datetimeAgo(i)
    ]);
  }

  console.log('Inserted daily metabolism data');

  // Record migration
  await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [6]);

  console.log('Migration 006: Seeded comprehensive mock data');
}

// Export alias for developer menu
export const seedMockData = migration006SeedMockData;
