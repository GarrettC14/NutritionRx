/**
 * Nutrition Context Formatter
 * Stage 3: Convert structured metrics into readable natural language
 * sections that the LLM can reference.
 */

import type { UnifiedNutritionContext } from './nutritionContextBuilder';
import type { DerivedInsight } from './derivedNutritionInsights';

export function formatNutritionContext(ctx: UnifiedNutritionContext): string {
  const sections: string[] = [];

  sections.push(formatProfileSection(ctx.profile));
  sections.push(formatTodaySection(ctx.metrics.todayProgress, ctx.profile));
  sections.push(formatWeeklySection(ctx.metrics.weeklyTrends));
  sections.push(formatConsistencySection(ctx.metrics.consistency));
  sections.push(formatMealDistributionSection(ctx.metrics.mealDistribution));

  if (ctx.metrics.weightTrend) {
    sections.push(formatWeightTrendSection(ctx.metrics.weightTrend, ctx.profile));
  }

  if (ctx.derivedInsights.length > 0) {
    sections.push(formatDerivedInsightsSection(ctx.derivedInsights));
  }

  if (ctx.frequentFoods.length > 0) {
    sections.push(formatFrequentFoods(ctx.frequentFoods));
  }

  return sections.join('\n\n');
}

// ============================================================
// Section Formatters
// ============================================================

export function formatProfileSection(profile: UnifiedNutritionContext['profile']): string {
  return `USER PROFILE:
Nutrition goal: ${goalToReadable(profile.goal)}
Activity level: ${profile.activityLevel.replace(/_/g, ' ')}
Units: ${profile.weightUnit}`;
}

function formatTodaySection(
  today: UnifiedNutritionContext['metrics']['todayProgress'],
  profile: UnifiedNutritionContext['profile'],
): string {
  return `TODAY'S PROGRESS:
Calories: ${today.calories.consumed} / ${today.calories.target} kcal (${today.calories.percentComplete}% complete, ${today.calories.remaining} remaining)
Protein: ${today.protein.consumed}g / ${today.protein.target}g (${today.protein.percentComplete}% complete)
Carbs: ${today.carbs.consumed}g / ${today.carbs.target}g (${today.carbs.percentComplete}% complete)
Fat: ${today.fat.consumed}g / ${today.fat.target}g (${today.fat.percentComplete}% complete)
Fiber: ${today.fiber.consumed}g / ${today.fiber.target}g (${today.fiber.remaining}g remaining)
Meals logged today: ${today.mealsLoggedToday}`;
}

function formatWeeklySection(
  weekly: UnifiedNutritionContext['metrics']['weeklyTrends'],
): string {
  return `WEEKLY TRENDS (last 7 days):
Average daily calories: ${weekly.avgCalories} kcal (trend: ${weekly.calorieDirection})
Average daily protein: ${weekly.avgProtein}g (trend: ${weekly.proteinDirection})
Average daily carbs: ${weekly.avgCarbs}g
Average daily fat: ${weekly.avgFat}g
Average daily fiber: ${weekly.avgFiber}g
Calorie adherence: ${weekly.calorieAdherence}% of days within target range
Protein adherence: ${weekly.proteinAdherence}% of days hitting protein target
Days logged this week: ${weekly.daysLoggedThisWeek} (last week: ${weekly.daysLoggedLastWeek})`;
}

function formatConsistencySection(
  consistency: UnifiedNutritionContext['metrics']['consistency'],
): string {
  return `CONSISTENCY:
Current logging streak: ${consistency.currentStreak} days
Longest streak: ${consistency.longestStreak} days
Logging rate (7 days): ${consistency.loggingRate7d}%
Logging rate (30 days): ${consistency.loggingRate30d}%`;
}

function formatMealDistributionSection(
  meals: UnifiedNutritionContext['metrics']['mealDistribution'],
): string {
  return `MEAL DISTRIBUTION:
Average meals per day: ${meals.avgMealsPerDay}
Breakfast: logged ${meals.breakfastFrequency} days/week (~${meals.calorieDistribution.breakfast}% of daily calories)
Lunch: logged ${meals.lunchFrequency} days/week (~${meals.calorieDistribution.lunch}% of daily calories)
Dinner: logged ${meals.dinnerFrequency} days/week (~${meals.calorieDistribution.dinner}% of daily calories)
Snacks: logged ${meals.snackFrequency} days/week (~${meals.calorieDistribution.snack}% of daily calories)
Largest meal: ${meals.largestMealType}`;
}

function formatWeightTrendSection(
  weight: NonNullable<UnifiedNutritionContext['metrics']['weightTrend']>,
  profile: UnifiedNutritionContext['profile'],
): string {
  const unit = profile.weightUnit;
  const convert = (kg: number) => unit === 'lbs' ? Math.round(kg * 2.205 * 10) / 10 : Math.round(kg * 10) / 10;

  let trend = 'WEIGHT TREND:\n';
  if (weight.currentWeight) {
    trend += `Current weight: ${convert(weight.currentWeight)} ${unit}\n`;
  }
  if (weight.weightChange7d !== null) {
    const val = convert(weight.weightChange7d);
    trend += `Change (7 days): ${val > 0 ? '+' : ''}${val} ${unit}\n`;
  }
  if (weight.weightChange30d !== null) {
    const val = convert(weight.weightChange30d);
    trend += `Change (30 days): ${val > 0 ? '+' : ''}${val} ${unit}\n`;
  }
  trend += `Direction: ${weight.direction}`;
  return trend;
}

export function formatDerivedInsightsSection(insights: DerivedInsight[]): string {
  const formatted = insights
    .map((i) => `- [${i.category}] ${i.message} (confidence: ${i.confidence})`)
    .join('\n');
  return `LOCALLY COMPUTED OBSERVATIONS (expand on these, do not recompute):\n${formatted}`;
}

export function formatFrequentFoods(
  foods: { name: string; timesLogged: number; avgCalories: number }[],
): string {
  const list = foods
    .map((f) => `- ${f.name}: logged ${f.timesLogged} times, ~${f.avgCalories} kcal avg`)
    .join('\n');
  return `USER'S FREQUENT FOODS:\n${list}`;
}

// ============================================================
// Helpers
// ============================================================

function goalToReadable(goal: string): string {
  switch (goal) {
    case 'lose':
      return 'Weight loss (calorie deficit)';
    case 'gain':
      return 'Muscle gain (calorie surplus)';
    case 'maintain':
      return 'Maintenance';
    default:
      return goal;
  }
}
