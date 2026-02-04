/**
 * Meal Analyzers
 * Analyzers for: meal_distribution, meal_timing, meal_variety
 */

import type { DailyInsightData, QuestionAnalysis, DataCardItem } from '../../../types/dailyInsights.types';

export function analyzeMealDistribution(data: DailyInsightData): QuestionAnalysis {
  const meals = data.mealsWithTimestamps;
  const mealCals = meals.map((m) => m.totalCalories);
  const maxMeal = mealCals.length > 0 ? Math.max(...mealCals) : 0;
  const minMeal = mealCals.length > 0 ? Math.min(...mealCals) : 0;
  const avgMeal = meals.length > 0 ? Math.round(data.todayCalories / meals.length) : 0;
  const heaviestMeal = meals.find((m) => m.totalCalories === maxMeal);
  const oneMealDominates = maxMeal > data.todayCalories * 0.5 && meals.length >= 2;

  const dataBlock = [
    `MEAL DISTRIBUTION:`,
    ...meals.map((m) => `${m.mealLabel}: ${m.totalCalories} cal (${m.totalProtein}g pro)`),
    `Average: ${avgMeal} cal/meal`,
    `Range: ${minMeal} – ${maxMeal} cal`,
    oneMealDominates ? `FLAG: ${heaviestMeal?.mealLabel || 'One meal'} accounts for over 50% of daily calories.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const fallbackText = oneMealDominates
    ? `${heaviestMeal?.mealLabel || 'One meal'} makes up ${Math.round((maxMeal / Math.max(1, data.todayCalories)) * 100)}% of today's calories — spreading intake more evenly can help with energy levels.`
    : `Meals are fairly balanced at ~${avgMeal} cal each across ${meals.length} meals.`;

  const dataCards: DataCardItem[] = meals.map((m) => ({
    label: m.mealLabel,
    value: `${m.totalCalories}`,
    subValue: `cal`,
    percent: data.todayCalories > 0 ? Math.round((m.totalCalories / data.todayCalories) * 100) : 0,
    status: ('neutral' as const),
  }));

  return { questionId: 'meal_distribution', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeMealTiming(data: DailyInsightData): QuestionAnalysis {
  const meals = data.mealsWithTimestamps;
  const sortedMeals = [...meals]
    .filter((m) => m.firstLogTime)
    .sort((a, b) => new Date(a.firstLogTime).getTime() - new Date(b.firstLogTime).getTime());

  const gaps: { from: string; to: string; hours: number }[] = [];
  for (let i = 1; i < sortedMeals.length; i++) {
    const prevTime = new Date(sortedMeals[i - 1].firstLogTime).getTime();
    const currTime = new Date(sortedMeals[i].firstLogTime).getTime();
    const diffHours = Math.round((currTime - prevTime) / (1000 * 60 * 60));
    gaps.push({
      from: sortedMeals[i - 1].mealLabel,
      to: sortedMeals[i].mealLabel,
      hours: diffHours,
    });
  }

  const largeGaps = gaps.filter((g) => g.hours > 6);

  const dataBlock = [
    `MEAL TIMING:`,
    ...sortedMeals.map((m) => {
      const time = new Date(m.firstLogTime);
      return `${m.mealLabel}: ${time.getUTCHours()}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
    }),
    `Gaps between meals:`,
    ...gaps.map((g) => `  ${g.from} → ${g.to}: ${g.hours} hours`),
    largeGaps.length > 0 ? `FLAG: ${largeGaps.length} gap(s) over 6 hours.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const fallbackText = largeGaps.length > 0
    ? `There's a ${largeGaps[0].hours}-hour gap between ${largeGaps[0].from} and ${largeGaps[0].to}. Spacing meals 3-5 hours apart can help maintain steady energy.`
    : `Meals are spaced well throughout the day — consistent timing supports better digestion and energy.`;

  const dataCards: DataCardItem[] = sortedMeals.map((m) => {
    const time = new Date(m.firstLogTime);
    return {
      label: m.mealLabel,
      value: `${time.getUTCHours()}:${String(time.getUTCMinutes()).padStart(2, '0')}`,
      subValue: `${m.totalCalories} cal`,
      status: 'neutral' as const,
    };
  });

  return { questionId: 'meal_timing', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeMealVariety(data: DailyInsightData): QuestionAnalysis {
  const foods = data.todayFoods;
  const uniqueNames = new Set(foods.map((f) => f.name.toLowerCase()));
  const totalFoods = foods.length;
  const uniqueCount = uniqueNames.size;
  const repeatCount = totalFoods - uniqueCount;

  const dataBlock = [
    `FOOD VARIETY:`,
    `Total food items: ${totalFoods}`,
    `Unique items: ${uniqueCount}`,
    `Repeated items: ${repeatCount}`,
    `Foods logged: ${foods.map((f) => f.name).join(', ')}`,
  ].join('\n');

  const fallbackText = repeatCount > totalFoods * 0.5
    ? `${uniqueCount} unique foods out of ${totalFoods} logged — some repetition today. Variety supports a broader nutrient profile.`
    : `${uniqueCount} different foods today — good variety in your choices.`;

  const dataCards: DataCardItem[] = [
    { label: 'Unique', value: `${uniqueCount}`, subValue: 'different foods', status: uniqueCount >= 5 ? 'on_track' : 'neutral' },
    { label: 'Total', value: `${totalFoods}`, subValue: 'food items', status: 'neutral' },
  ];

  return { questionId: 'meal_variety', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}
