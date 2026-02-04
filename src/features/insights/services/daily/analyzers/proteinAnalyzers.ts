/**
 * Protein Analyzers
 * Analyzers for: protein_status, protein_per_meal, protein_remaining
 */

import type { DailyInsightData, QuestionAnalysis, DataCardItem } from '../../../types/dailyInsights.types';

export function analyzeProteinStatus(data: DailyInsightData): QuestionAnalysis {
  const remaining = Math.max(0, data.proteinTarget - data.todayProtein);
  const proteinLagging = data.proteinPercent < data.caloriePercent - 15;

  const dataBlock = [
    `PROTEIN STATUS:`,
    `Today: ${data.todayProtein}g of ${data.proteinTarget}g (${data.proteinPercent}%)`,
    `Calorie progress: ${data.caloriePercent}%`,
    `Protein gap vs calories: ${data.caloriePercent - data.proteinPercent} percentage points`,
    `Remaining: ${remaining}g`,
    `Meals so far: ${data.todayMealCount}`,
    proteinLagging ? `FLAG: Protein is lagging behind calorie pace.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const fallbackText = proteinLagging
    ? `Protein is at ${data.proteinPercent}% compared to ${data.caloriePercent}% for calories — ${remaining}g still to go. A protein-rich option for your next meal could help close the gap.`
    : data.proteinPercent >= 90
      ? `Protein is tracking well at ${data.proteinPercent}% of your ${data.proteinTarget}g target.`
      : `Protein at ${data.proteinPercent}% — ${remaining}g remaining to reach your ${data.proteinTarget}g target.`;

  const dataCards: DataCardItem[] = [
    { label: 'Protein', value: `${data.proteinPercent}%`, subValue: `${data.todayProtein}g / ${data.proteinTarget}g`, percent: data.proteinPercent, status: data.proteinPercent >= 85 ? 'on_track' : data.proteinPercent < 50 ? 'behind' : 'neutral' },
    { label: 'Remaining', value: `${remaining}g`, subValue: 'to target', status: remaining > 40 ? 'neutral' : 'on_track' },
    { label: 'Calories', value: `${data.caloriePercent}%`, subValue: 'for comparison', status: 'neutral' },
  ];

  return { questionId: 'protein_status', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeProteinPerMeal(data: DailyInsightData): QuestionAnalysis {
  const meals = data.mealsWithTimestamps;
  const mealDetails = meals.map((m) => `${m.mealLabel}: ${m.totalProtein}g protein (${m.totalCalories} cal)`);
  const mealProteins = meals.map((m) => m.totalProtein);
  const maxProtein = mealProteins.length > 0 ? Math.max(...mealProteins) : 0;
  const minProtein = mealProteins.length > 0 ? Math.min(...mealProteins) : 0;
  const avgPerMeal = meals.length > 0 ? Math.round(data.todayProtein / meals.length) : 0;
  const hasLowProteinMeal = mealProteins.some((p) => p < 20);
  const veryUneven = maxProtein > minProtein * 3 && meals.length >= 2;

  const dataBlock = [
    `PROTEIN DISTRIBUTION:`,
    ...mealDetails,
    `Average per meal: ${avgPerMeal}g`,
    `Range: ${minProtein}g – ${maxProtein}g`,
    hasLowProteinMeal ? `FLAG: At least one meal has less than 20g protein.` : '',
    veryUneven ? `FLAG: Protein distribution is uneven (${maxProtein}g max vs ${minProtein}g min).` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const fallbackText = veryUneven
    ? `Protein ranges from ${minProtein}g to ${maxProtein}g across meals — spreading it more evenly (aiming for ~${avgPerMeal}g per meal) can support better absorption.`
    : hasLowProteinMeal
      ? `One of your meals has under 20g protein. Distributing protein more evenly across meals supports better muscle synthesis.`
      : `Protein is well distributed at ~${avgPerMeal}g per meal across ${meals.length} meals.`;

  const dataCards: DataCardItem[] = meals.map((m) => ({
    label: m.mealLabel,
    value: `${m.totalProtein}g`,
    subValue: `${m.totalCalories} cal`,
    percent: data.proteinTarget > 0 ? Math.round((m.totalProtein / data.proteinTarget) * 100) : 0,
    status: m.totalProtein >= 20 ? ('on_track' as const) : ('neutral' as const),
  }));

  return { questionId: 'protein_per_meal', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeProteinRemaining(data: DailyInsightData): QuestionAnalysis {
  const remaining = Math.max(0, data.proteinTarget - data.todayProtein);
  const calRemaining = Math.max(0, data.calorieTarget - data.todayCalories);
  const proteinCalNeeded = remaining * 4;

  const dataBlock = [
    `PROTEIN REMAINING:`,
    `Protein remaining: ${remaining}g of ${data.proteinTarget}g target`,
    `Current: ${data.todayProtein}g (${data.proteinPercent}%)`,
    `Calorie budget remaining: ${calRemaining}`,
    `Calories needed for remaining protein: ${proteinCalNeeded}`,
    `Hour of day: ${data.currentHour}`,
  ].join('\n');

  const fallbackText = remaining > 40
    ? `${remaining}g of protein still to go today. ${calRemaining > proteinCalNeeded ? 'Plenty of calorie room to fit it in.' : 'Budget is tight — lean protein sources would work well.'}`
    : `Just ${remaining}g of protein remaining — you're close to your ${data.proteinTarget}g target.`;

  const dataCards: DataCardItem[] = [
    { label: 'Remaining', value: `${remaining}g`, subValue: `of ${data.proteinTarget}g`, status: remaining > 40 ? 'neutral' : 'on_track' },
    { label: 'Cal Budget', value: `${calRemaining}`, subValue: 'calories left', status: calRemaining > proteinCalNeeded ? 'on_track' : 'neutral' },
  ];

  return { questionId: 'protein_remaining', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}
