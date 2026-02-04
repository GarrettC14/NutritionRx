/**
 * Widget Headline Engine
 * Pure template engine — no LLM. Selects the most relevant headline
 * for the widget based on today's data state.
 *
 * Priority order: first matching rule wins.
 */

import type { DailyInsightData, WidgetHeadlineData } from '../../types/dailyInsights.types';

export function computeWidgetHeadline(data: DailyInsightData): WidgetHeadlineData {
  console.log(`[LLM:Headline] computeWidgetHeadline() — meals=${data.todayMealCount}, cal=${data.todayCalories}/${data.calorieTarget} (${data.caloriePercent}%), protein=${data.proteinPercent}%, water=${data.waterPercent}%, streak=${data.loggingStreak}`);
  const now = Date.now();

  // Rule 1: No data
  if (data.todayMealCount === 0) {
    return {
      text: 'Ready to start tracking today? Log your first meal to unlock insights.',
      icon: 'leaf-outline',
      priority: 1,
      computedAt: now,
    };
  }

  // Rule 2: Minimal data
  if (data.todayMealCount === 1 && data.todayCalories < 500) {
    return {
      text: "You've logged 1 meal so far — keep going to see how your day shapes up.",
      icon: 'leaf-outline',
      priority: 2,
      computedAt: now,
    };
  }

  const remaining = Math.max(0, data.calorieTarget - data.todayCalories);
  const estimatedMealsLeft = estimateRemainingMeals(data);

  // Rule 3: Near/at calorie target
  if (data.caloriePercent >= 90 && data.caloriePercent <= 110) {
    return {
      text: `You've reached ${data.caloriePercent}% of your calorie target today — nicely paced.`,
      icon: 'checkmark-circle-outline',
      priority: 3,
      computedAt: now,
    };
  }

  // Rule 4: Over calorie target
  if (data.caloriePercent > 110) {
    return {
      text: `${formatNumber(data.todayCalories)} calories logged today — ${data.caloriePercent}% of your ${formatNumber(data.calorieTarget)} target.`,
      icon: 'bar-chart-outline',
      priority: 4,
      computedAt: now,
    };
  }

  // Rule 5: Protein gap
  if (data.proteinPercent < 60 && data.caloriePercent >= 70) {
    return {
      text: `Protein is at ${data.proteinPercent}% while calories are at ${data.caloriePercent}% — room to boost protein in your next meal.`,
      icon: 'barbell-outline',
      priority: 5,
      computedAt: now,
    };
  }

  // Rule 6: Hydration reminder (afternoon)
  if (data.waterTarget > 0 && data.waterPercent < 50 && data.currentHour >= 13) {
    return {
      text: `Water intake is at ${data.waterPercent}% — a good time to hydrate.`,
      icon: 'water-outline',
      priority: 6,
      computedAt: now,
    };
  }

  // Rule 7: Streak callout
  if (data.loggingStreak >= 7) {
    return {
      text: `Day ${data.loggingStreak} of consistent logging — your data is getting richer every day.`,
      icon: 'link-outline',
      priority: 7,
      computedAt: now,
    };
  }

  // Rule 8: Standard progress (default)
  console.log('[LLM:Headline] → Rule 8 (standard progress)');
  return {
    text: `${formatNumber(data.todayCalories)} of ${formatNumber(data.calorieTarget)} cal today — ${formatNumber(remaining)} remaining${estimatedMealsLeft > 0 ? ` with ~${estimatedMealsLeft} meal${estimatedMealsLeft === 1 ? '' : 's'} to go` : ''}.`,
    icon: 'leaf-outline',
    priority: 8,
    computedAt: now,
  };
}

function estimateRemainingMeals(data: DailyInsightData): number {
  if (data.caloriePercent >= 100) return 0;
  if (data.currentHour >= 21) return 0;
  if (data.currentHour >= 18) return 1;
  if (data.currentHour >= 12) return Math.max(1, 3 - data.todayMealCount);
  return Math.max(1, 4 - data.todayMealCount);
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
