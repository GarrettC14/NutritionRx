import {
  buildSystemPrompt,
  buildDailyUserMessage,
  buildWeeklyUserMessage,
} from '@/services/context/nutritionSystemPrompt';
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
// buildSystemPrompt
// ============================================================

describe('buildSystemPrompt', () => {
  it('contains core template sections', () => {
    const ctx = makeContext();
    const result = buildSystemPrompt(ctx);

    expect(result).toContain('IDENTITY');
    expect(result).toContain('DATA AVAILABILITY');
    expect(result).toContain('YOUR DATA');
    expect(result).toContain('DERIVED OBSERVATIONS');
    expect(result).toContain('FREQUENT FOODS');
    expect(result).toContain('RESPONSE GUIDELINES');
    expect(result).toContain('HARD BOUNDARIES');
  });

  it('replaces {DATA_AVAILABILITY} with promptGuidance from context', () => {
    const ctx = makeContext({
      dataAvailability: { promptGuidance: 'DATA AVAILABILITY: HIGH' },
    });
    const result = buildSystemPrompt(ctx);

    expect(result).toContain('DATA AVAILABILITY: HIGH');
    expect(result).not.toContain('{DATA_AVAILABILITY}');
  });

  it('replaces {NUTRITION_CONTEXT} with formatted context (no raw placeholder remains)', () => {
    const ctx = makeContext();
    const result = buildSystemPrompt(ctx);

    expect(result).not.toContain('{NUTRITION_CONTEXT}');
    // The formatted core context should include profile and today's progress
    expect(result).toContain('USER PROFILE:');
    expect(result).toContain("TODAY'S PROGRESS:");
  });

  it('replaces {WEIGHT_UNIT} with the profile weight unit', () => {
    const ctx = makeContext({ profile: { weightUnit: 'lbs' } });
    const result = buildSystemPrompt(ctx);

    expect(result).not.toContain('{WEIGHT_UNIT}');
    expect(result).toContain('lbs');
  });

  it('replaces {DERIVED_INSIGHTS} placeholder', () => {
    const ctx = makeContext();
    const result = buildSystemPrompt(ctx);

    expect(result).not.toContain('{DERIVED_INSIGHTS}');
  });

  it('replaces {FREQUENT_FOODS} placeholder', () => {
    const ctx = makeContext();
    const result = buildSystemPrompt(ctx);

    expect(result).not.toContain('{FREQUENT_FOODS}');
  });

  it('uses formatNutritionContext with includeDerived=false and includeFrequentFoods=false for the core section', () => {
    const ctx = makeContext({
      derivedInsights: [
        { id: 'i1', category: 'protein', message: 'Protein drops on weekends', confidence: 0.85, priority: 1 },
      ],
      frequentFoods: [{ name: 'Chicken Breast', timesLogged: 12, avgCalories: 250 }],
    });
    const result = buildSystemPrompt(ctx);

    // The core YOUR DATA section should NOT contain the derived insights or frequent foods
    // (they appear in their own dedicated sections instead)
    // The derived insight should still appear in the DERIVED OBSERVATIONS section
    expect(result).toContain('Protein drops on weekends');
    expect(result).toContain('Chicken Breast');
  });

  it('shows "No patterns detected yet" when derivedInsights is empty', () => {
    const ctx = makeContext({ derivedInsights: [] });
    const result = buildSystemPrompt(ctx);

    expect(result).toContain('No patterns detected yet');
  });

  it('shows formatted insights when derivedInsights has items', () => {
    const ctx = makeContext({
      derivedInsights: [
        { id: 'i1', category: 'calories', message: 'Calorie intake is consistent', confidence: 0.9, priority: 1 },
      ],
    });
    const result = buildSystemPrompt(ctx);

    expect(result).toContain('LOCALLY COMPUTED OBSERVATIONS');
    expect(result).toContain('[calories] Calorie intake is consistent (confidence: 0.9)');
    expect(result).not.toContain('No patterns detected yet');
  });

  it('shows "No frequent foods data yet" when frequentFoods is empty', () => {
    const ctx = makeContext({ frequentFoods: [] });
    const result = buildSystemPrompt(ctx);

    expect(result).toContain('No frequent foods data yet.');
  });

  it('shows formatted frequent foods when data exists', () => {
    const ctx = makeContext({
      frequentFoods: [
        { name: 'Greek Yogurt', timesLogged: 18, avgCalories: 150 },
      ],
    });
    const result = buildSystemPrompt(ctx);

    expect(result).toContain("USER'S FREQUENT FOODS:");
    expect(result).toContain('Greek Yogurt: logged 18 times, ~150 kcal avg');
    expect(result).not.toContain('No frequent foods data yet.');
  });

  it('contains all template placeholders replaced (no leftover curly brace placeholders)', () => {
    const ctx = makeContext({
      derivedInsights: [
        { id: 'i1', category: 'protein', message: 'Test insight', confidence: 0.8, priority: 1 },
      ],
      frequentFoods: [{ name: 'Eggs', timesLogged: 20, avgCalories: 140 }],
    });
    const result = buildSystemPrompt(ctx);

    // No template placeholders should remain
    expect(result).not.toMatch(/\{[A-Z_]+\}/);
  });
});

// ============================================================
// buildDailyUserMessage
// ============================================================

describe('buildDailyUserMessage', () => {
  it('contains JSON format instructions', () => {
    const result = buildDailyUserMessage();

    expect(result).toContain('JSON');
    expect(result).toContain('"insights"');
    expect(result).toContain('"category"');
    expect(result).toContain('"text"');
  });

  it('contains valid insight categories', () => {
    const result = buildDailyUserMessage();

    expect(result).toContain('macro_balance');
    expect(result).toContain('protein');
    expect(result).toContain('consistency');
    expect(result).toContain('pattern');
    expect(result).toContain('trend');
    expect(result).toContain('timing');
  });

  it('mentions time of day', () => {
    const result = buildDailyUserMessage();

    // The message should mention one of the time-of-day values
    expect(result).toMatch(/morning|midday|evening|late night/);
  });

  it('asks for 2-3 insights', () => {
    const result = buildDailyUserMessage();

    expect(result).toContain('2-3');
  });

  it('requests concise responses', () => {
    const result = buildDailyUserMessage();

    expect(result).toMatch(/1-2 sentence/i);
  });
});

// ============================================================
// buildWeeklyUserMessage
// ============================================================

describe('buildWeeklyUserMessage', () => {
  it('asks for 2-3 paragraphs', () => {
    const result = buildWeeklyUserMessage();

    expect(result).toContain('2-3');
    expect(result).toContain('paragraphs');
  });

  it('mentions trends', () => {
    const result = buildWeeklyUserMessage();

    expect(result).toMatch(/trend/i);
  });

  it('mentions consistency', () => {
    const result = buildWeeklyUserMessage();

    expect(result).toMatch(/consistency/i);
  });

  it('asks for actionable suggestion', () => {
    const result = buildWeeklyUserMessage();

    expect(result).toMatch(/actionable/i);
  });

  it('asks for an encouraging forward-looking statement', () => {
    const result = buildWeeklyUserMessage();

    expect(result).toMatch(/encouraging/i);
    expect(result).toMatch(/forward-looking/i);
  });
});
