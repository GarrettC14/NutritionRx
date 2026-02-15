import {
  formatNutritionContext,
  formatProfileSection,
  formatDerivedInsightsSection,
  formatFrequentFoods,
} from '@/services/context/nutritionContextFormatter';
import type { UnifiedNutritionContext } from '@/services/context/nutritionContextBuilder';

// ============================================================
// Factory
// ============================================================

function makeContext(overrides: any = {}): UnifiedNutritionContext {
  return {
    metrics: {
      todayProgress: {
        calories: { consumed: 1500, target: 2000, remaining: 500, percentComplete: 75 },
        protein: { consumed: 120, target: 150, remaining: 30, percentComplete: 80 },
        carbs: { consumed: 150, target: 200, remaining: 50, percentComplete: 75 },
        fat: { consumed: 50, target: 65, remaining: 15, percentComplete: 77 },
        fiber: { consumed: 20, target: 28, remaining: 8 },
        mealsLoggedToday: 3,
      },
      weeklyTrends: {
        avgCalories: 1900, avgProtein: 140, avgCarbs: 190, avgFat: 60, avgFiber: 22,
        calorieAdherence: 80, proteinAdherence: 75,
        daysLoggedThisWeek: 6, daysLoggedLastWeek: 5,
        calorieDirection: 'stable' as const, proteinDirection: 'increasing' as const,
      },
      consistency: { currentStreak: 5, longestStreak: 14, loggingRate7d: 86, loggingRate30d: 80 },
      mealDistribution: {
        breakfastFrequency: 5, lunchFrequency: 6, dinnerFrequency: 7, snackFrequency: 4,
        avgMealsPerDay: 3.5, largestMealType: 'Dinner',
        calorieDistribution: { breakfast: 25, lunch: 30, dinner: 35, snack: 10 },
      },
      weightTrend: null,
      ...overrides?.metrics,
    },
    profile: { goal: 'lose', activityLevel: 'moderately_active', weightUnit: 'lbs' as const, ...overrides?.profile },
    dataAvailability: { tier: 'high' as any, daysLogged: 14, weeksWithData: 2, hasWeightData: false, hasMealTimingData: true, promptGuidance: 'DATA AVAILABILITY: HIGH', ...overrides?.dataAvailability },
    derivedInsights: overrides?.derivedInsights ?? [],
    frequentFoods: overrides?.frequentFoods ?? [],
  };
}

// ============================================================
// formatNutritionContext
// ============================================================

describe('formatNutritionContext', () => {
  it('includes all core sections in the output', () => {
    const ctx = makeContext();
    const result = formatNutritionContext(ctx);

    expect(result).toContain('USER PROFILE:');
    expect(result).toContain("TODAY'S PROGRESS:");
    expect(result).toContain('WEEKLY TRENDS');
    expect(result).toContain('CONSISTENCY:');
    expect(result).toContain('MEAL DISTRIBUTION:');
  });

  it('includes derived insights by default when present', () => {
    const ctx = makeContext({
      derivedInsights: [
        { id: 'i1', category: 'protein', message: 'Protein is low on weekends', confidence: 0.85, priority: 1 },
      ],
    });
    const result = formatNutritionContext(ctx);

    expect(result).toContain('LOCALLY COMPUTED OBSERVATIONS');
    expect(result).toContain('Protein is low on weekends');
  });

  it('includes frequent foods by default when present', () => {
    const ctx = makeContext({
      frequentFoods: [{ name: 'Chicken Breast', timesLogged: 12, avgCalories: 250 }],
    });
    const result = formatNutritionContext(ctx);

    expect(result).toContain("USER'S FREQUENT FOODS:");
    expect(result).toContain('Chicken Breast');
  });

  it('excludes derived insights when includeDerived is false', () => {
    const ctx = makeContext({
      derivedInsights: [
        { id: 'i1', category: 'protein', message: 'Protein is low', confidence: 0.8, priority: 1 },
      ],
    });
    const result = formatNutritionContext(ctx, { includeDerived: false });

    expect(result).not.toContain('LOCALLY COMPUTED OBSERVATIONS');
    expect(result).not.toContain('Protein is low');
  });

  it('excludes frequent foods when includeFrequentFoods is false', () => {
    const ctx = makeContext({
      frequentFoods: [{ name: 'Oatmeal', timesLogged: 8, avgCalories: 300 }],
    });
    const result = formatNutritionContext(ctx, { includeFrequentFoods: false });

    expect(result).not.toContain("USER'S FREQUENT FOODS:");
    expect(result).not.toContain('Oatmeal');
  });

  it('excludes derived insights section when array is empty even if includeDerived is true', () => {
    const ctx = makeContext({ derivedInsights: [] });
    const result = formatNutritionContext(ctx, { includeDerived: true });

    expect(result).not.toContain('LOCALLY COMPUTED OBSERVATIONS');
  });

  it('excludes frequent foods section when array is empty even if includeFrequentFoods is true', () => {
    const ctx = makeContext({ frequentFoods: [] });
    const result = formatNutritionContext(ctx, { includeFrequentFoods: true });

    expect(result).not.toContain("USER'S FREQUENT FOODS:");
  });

  it('includes weight trend section when weightTrend is present', () => {
    const ctx = makeContext({
      metrics: {
        weightTrend: {
          currentWeight: 80,
          weightChange7d: -0.5,
          weightChange30d: -1.5,
          direction: 'losing',
        },
      },
    });
    const result = formatNutritionContext(ctx);

    expect(result).toContain('WEIGHT TREND:');
  });

  it('omits weight trend section when weightTrend is null', () => {
    const ctx = makeContext();
    const result = formatNutritionContext(ctx);

    expect(result).not.toContain('WEIGHT TREND:');
  });

  it('joins sections with double newlines', () => {
    const ctx = makeContext();
    const result = formatNutritionContext(ctx);

    // All core sections present and separated by blank lines
    const sections = result.split('\n\n');
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================
// formatProfileSection
// ============================================================

describe('formatProfileSection', () => {
  it('maps "lose" goal to readable text', () => {
    const result = formatProfileSection({ goal: 'lose', activityLevel: 'moderately_active', weightUnit: 'lbs' });
    expect(result).toContain('Weight loss (calorie deficit)');
  });

  it('maps "gain" goal to readable text', () => {
    const result = formatProfileSection({ goal: 'gain', activityLevel: 'moderately_active', weightUnit: 'lbs' });
    expect(result).toContain('Muscle gain (calorie surplus)');
  });

  it('maps "maintain" goal to readable text', () => {
    const result = formatProfileSection({ goal: 'maintain', activityLevel: 'moderately_active', weightUnit: 'lbs' });
    expect(result).toContain('Maintenance');
  });

  it('passes through unknown goal values as-is', () => {
    const result = formatProfileSection({ goal: 'recomp', activityLevel: 'moderately_active', weightUnit: 'lbs' });
    expect(result).toContain('Nutrition goal: recomp');
  });

  it('replaces underscores in activity level with spaces', () => {
    const result = formatProfileSection({ goal: 'lose', activityLevel: 'very_active', weightUnit: 'lbs' });
    expect(result).toContain('Activity level: very active');
    expect(result).not.toContain('very_active');
  });

  it('includes the weight unit', () => {
    const result = formatProfileSection({ goal: 'lose', activityLevel: 'sedentary', weightUnit: 'kg' });
    expect(result).toContain('Units: kg');
  });

  it('starts with USER PROFILE header', () => {
    const result = formatProfileSection({ goal: 'lose', activityLevel: 'moderately_active', weightUnit: 'lbs' });
    expect(result).toMatch(/^USER PROFILE:/);
  });
});

// ============================================================
// formatDerivedInsightsSection
// ============================================================

describe('formatDerivedInsightsSection', () => {
  it('formats insights with category, message, and confidence', () => {
    const insights = [
      { id: 'i1', category: 'protein' as const, message: 'Protein drops on weekends', confidence: 0.85, priority: 1 },
      { id: 'i2', category: 'calories' as const, message: 'Calorie intake increasing', confidence: 0.7, priority: 2 },
    ];
    const result = formatDerivedInsightsSection(insights);

    expect(result).toContain('LOCALLY COMPUTED OBSERVATIONS');
    expect(result).toContain('- [protein] Protein drops on weekends (confidence: 0.85)');
    expect(result).toContain('- [calories] Calorie intake increasing (confidence: 0.7)');
  });

  it('includes the instruction not to recompute', () => {
    const insights = [
      { id: 'i1', category: 'consistency' as const, message: 'Great streak', confidence: 0.9, priority: 1 },
    ];
    const result = formatDerivedInsightsSection(insights);

    expect(result).toContain('expand on these, do not recompute');
  });

  it('handles a single insight', () => {
    const insights = [
      { id: 'i1', category: 'fiber' as const, message: 'Fiber is consistently low', confidence: 0.75, priority: 1 },
    ];
    const result = formatDerivedInsightsSection(insights);

    expect(result).toContain('- [fiber] Fiber is consistently low (confidence: 0.75)');
  });
});

// ============================================================
// formatFrequentFoods
// ============================================================

describe('formatFrequentFoods', () => {
  it('formats a list of frequent foods', () => {
    const foods = [
      { name: 'Chicken Breast', timesLogged: 15, avgCalories: 250 },
      { name: 'Brown Rice', timesLogged: 10, avgCalories: 210 },
    ];
    const result = formatFrequentFoods(foods);

    expect(result).toContain("USER'S FREQUENT FOODS:");
    expect(result).toContain('- Chicken Breast: logged 15 times, ~250 kcal avg');
    expect(result).toContain('- Brown Rice: logged 10 times, ~210 kcal avg');
  });

  it('formats a single food item', () => {
    const foods = [{ name: 'Oatmeal', timesLogged: 20, avgCalories: 300 }];
    const result = formatFrequentFoods(foods);

    expect(result).toContain('- Oatmeal: logged 20 times, ~300 kcal avg');
  });
});

// ============================================================
// Weight trend section (via formatNutritionContext)
// ============================================================

describe('weight trend section', () => {
  it('converts kg to lbs when weightUnit is lbs', () => {
    const ctx = makeContext({
      metrics: {
        weightTrend: {
          currentWeight: 80,
          weightChange7d: -0.5,
          weightChange30d: -1.5,
          direction: 'losing',
        },
      },
      profile: { weightUnit: 'lbs' as const },
    });
    const result = formatNutritionContext(ctx);

    // 80 kg * 2.205 = 176.4 lbs
    expect(result).toContain('176.4 lbs');
    expect(result).toContain('Direction: losing');
  });

  it('keeps kg when weightUnit is kg', () => {
    const ctx = makeContext({
      metrics: {
        weightTrend: {
          currentWeight: 80,
          weightChange7d: -0.5,
          weightChange30d: -1.5,
          direction: 'losing',
        },
      },
      profile: { weightUnit: 'kg' as const },
    });
    const result = formatNutritionContext(ctx);

    expect(result).toContain('80 kg');
  });

  it('shows + prefix for positive weight change', () => {
    const ctx = makeContext({
      metrics: {
        weightTrend: {
          currentWeight: 80,
          weightChange7d: 0.5,
          weightChange30d: 1.0,
          direction: 'gaining',
        },
      },
      profile: { weightUnit: 'kg' as const },
    });
    const result = formatNutritionContext(ctx);

    expect(result).toContain('Change (7 days): +0.5 kg');
    expect(result).toContain('Change (30 days): +1 kg');
  });

  it('shows no + prefix for negative weight change', () => {
    const ctx = makeContext({
      metrics: {
        weightTrend: {
          currentWeight: 80,
          weightChange7d: -0.3,
          weightChange30d: -1.2,
          direction: 'losing',
        },
      },
      profile: { weightUnit: 'kg' as const },
    });
    const result = formatNutritionContext(ctx);

    expect(result).toContain('Change (7 days): -0.3 kg');
    expect(result).toContain('Change (30 days): -1.2 kg');
  });

  it('handles null weightChange7d and weightChange30d', () => {
    const ctx = makeContext({
      metrics: {
        weightTrend: {
          currentWeight: 80,
          weightChange7d: null,
          weightChange30d: null,
          direction: 'insufficient_data',
        },
      },
      profile: { weightUnit: 'kg' as const },
    });
    const result = formatNutritionContext(ctx);

    expect(result).toContain('WEIGHT TREND:');
    expect(result).toContain('Current weight: 80 kg');
    expect(result).not.toContain('Change (7 days)');
    expect(result).not.toContain('Change (30 days)');
    expect(result).toContain('Direction: insufficient_data');
  });

  it('converts weight changes to lbs correctly', () => {
    const ctx = makeContext({
      metrics: {
        weightTrend: {
          currentWeight: 90,
          weightChange7d: 1.0,
          weightChange30d: -2.0,
          direction: 'maintaining',
        },
      },
      profile: { weightUnit: 'lbs' as const },
    });
    const result = formatNutritionContext(ctx);

    // 1.0 kg * 2.205 = 2.2 lbs (rounded to 1 decimal)
    expect(result).toContain('+2.2 lbs');
    // -2.0 kg * 2.205 = -4.4 lbs (rounded to 1 decimal)
    expect(result).toContain('-4.4 lbs');
  });
});

// ============================================================
// Empty data edge cases
// ============================================================

describe('empty data handling', () => {
  it('produces output without weight trend when weightTrend is null', () => {
    const ctx = makeContext();
    const result = formatNutritionContext(ctx);

    expect(result).not.toContain('WEIGHT TREND:');
    // But still contains other sections
    expect(result).toContain('USER PROFILE:');
    expect(result).toContain("TODAY'S PROGRESS:");
  });

  it('produces output without derived insights when array is empty', () => {
    const ctx = makeContext({ derivedInsights: [] });
    const result = formatNutritionContext(ctx);

    expect(result).not.toContain('LOCALLY COMPUTED OBSERVATIONS');
  });

  it('produces output without frequent foods when array is empty', () => {
    const ctx = makeContext({ frequentFoods: [] });
    const result = formatNutritionContext(ctx);

    expect(result).not.toContain("USER'S FREQUENT FOODS:");
  });

  it('produces output with all core sections even when optional data is empty', () => {
    const ctx = makeContext({ derivedInsights: [], frequentFoods: [] });
    const result = formatNutritionContext(ctx);

    expect(result).toContain('USER PROFILE:');
    expect(result).toContain("TODAY'S PROGRESS:");
    expect(result).toContain('WEEKLY TRENDS');
    expect(result).toContain('CONSISTENCY:');
    expect(result).toContain('MEAL DISTRIBUTION:');
  });
});
