/**
 * Macro Analyzers
 * Analyzers for: macro_overview, calorie_pacing, macro_ratio, remaining_budget
 */

import type { DailyInsightData, QuestionAnalysis, DataCardItem } from '../../../types/dailyInsights.types';

function getStatus(percent: number): DataCardItem['status'] {
  if (percent >= 85 && percent <= 115) return 'on_track';
  if (percent > 115) return 'ahead';
  if (percent < 50) return 'behind';
  return 'neutral';
}

export function analyzeMacroOverview(data: DailyInsightData): QuestionAnalysis {
  const remaining = Math.max(0, data.calorieTarget - data.todayCalories);
  const proteinGap = Math.max(0, data.proteinTarget - data.todayProtein);

  const allAbove80 =
    data.caloriePercent >= 80 && data.proteinPercent >= 80 && data.carbPercent >= 80 && data.fatPercent >= 80;
  const proteinLagging = data.proteinPercent < data.caloriePercent - 15;
  const overCalories = data.caloriePercent > 110;

  const dataBlock = [
    `TODAY'S MACRO PROGRESS:`,
    `Calories: ${data.todayCalories} of ${data.calorieTarget} (${data.caloriePercent}%)`,
    `Protein: ${data.todayProtein}g of ${data.proteinTarget}g (${data.proteinPercent}%)`,
    `Carbs: ${data.todayCarbs}g of ${data.carbTarget}g (${data.carbPercent}%)`,
    `Fat: ${data.todayFat}g of ${data.fatTarget}g (${data.fatPercent}%)`,
    `Meals logged: ${data.todayMealCount}`,
    `Remaining calories: ${remaining}`,
    `Remaining protein: ${proteinGap}g`,
    ``,
    `STATUS FLAGS:`,
    allAbove80 ? `All macros above 80% — well balanced.` : '',
    proteinLagging ? `Protein is lagging behind calories by ${data.caloriePercent - data.proteinPercent} percentage points.` : '',
    overCalories ? `Calories are above target.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const fallbackText = proteinLagging
    ? `Protein is at ${data.proteinPercent}% while calories are at ${data.caloriePercent}% — a protein-rich choice for your next meal could help balance things out.`
    : allAbove80
      ? `All your macros are tracking above 80% of target today — well balanced across the board.`
      : `Calories at ${data.caloriePercent}%, protein at ${data.proteinPercent}%. ${remaining > 0 ? `${remaining} calories remaining.` : 'Target reached.'}`;

  const dataCards: DataCardItem[] = [
    { label: 'Calories', value: `${data.caloriePercent}%`, subValue: `${data.todayCalories} / ${data.calorieTarget}`, percent: data.caloriePercent, status: getStatus(data.caloriePercent) },
    { label: 'Protein', value: `${data.proteinPercent}%`, subValue: `${data.todayProtein}g / ${data.proteinTarget}g`, percent: data.proteinPercent, status: getStatus(data.proteinPercent) },
    { label: 'Carbs', value: `${data.carbPercent}%`, subValue: `${data.todayCarbs}g / ${data.carbTarget}g`, percent: data.carbPercent, status: getStatus(data.carbPercent) },
    { label: 'Fat', value: `${data.fatPercent}%`, subValue: `${data.todayFat}g / ${data.fatTarget}g`, percent: data.fatPercent, status: getStatus(data.fatPercent) },
  ];

  return { questionId: 'macro_overview', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeCaloriePacing(data: DailyInsightData): QuestionAnalysis {
  const expectedPercent = Math.round(data.dayProgress * 100);
  const deviation = data.caloriePercent - expectedPercent;
  const remaining = Math.max(0, data.calorieTarget - data.todayCalories);

  const pacingStatus = deviation > 15 ? 'ahead of pace' : deviation < -15 ? 'below pace' : 'on pace';

  const dataBlock = [
    `CALORIE PACING:`,
    `Current: ${data.todayCalories} of ${data.calorieTarget} (${data.caloriePercent}%)`,
    `Expected at this time of day: ~${expectedPercent}%`,
    `Deviation: ${deviation > 0 ? '+' : ''}${deviation} percentage points (${pacingStatus})`,
    `Day progress: ${Math.round(data.dayProgress * 100)}% (hour ${data.currentHour} of waking hours)`,
    `Remaining: ${remaining} calories`,
  ].join('\n');

  const fallbackText =
    Math.abs(deviation) <= 15
      ? `You're pacing well — ${data.caloriePercent}% of calories at ${Math.round(data.dayProgress * 100)}% through the day.`
      : deviation > 15
        ? `You're a bit ahead of pace at ${data.caloriePercent}% with the day ${Math.round(data.dayProgress * 100)}% through — consider lighter options for remaining meals.`
        : `You're pacing below expected at ${data.caloriePercent}% with the day ${Math.round(data.dayProgress * 100)}% through — ${remaining} calories still available.`;

  const dataCards: DataCardItem[] = [
    { label: 'Current', value: `${data.caloriePercent}%`, subValue: `${data.todayCalories} cal`, status: getStatus(data.caloriePercent) },
    { label: 'Expected', value: `${expectedPercent}%`, subValue: `at this time`, status: 'neutral' },
    { label: 'Remaining', value: `${remaining}`, subValue: 'calories left', status: remaining > 0 ? 'neutral' : 'on_track' },
  ];

  return { questionId: 'calorie_pacing', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeMacroRatio(data: DailyInsightData): QuestionAnalysis {
  const totalMacroCal = Math.max(1, data.todayProtein * 4 + data.todayCarbs * 4 + data.todayFat * 9);
  const proteinCalPct = Math.round(((data.todayProtein * 4) / totalMacroCal) * 100);
  const carbCalPct = Math.round(((data.todayCarbs * 4) / totalMacroCal) * 100);
  const fatCalPct = Math.round(((data.todayFat * 9) / totalMacroCal) * 100);

  const dataBlock = [
    `MACRO CALORIE SPLIT:`,
    `Protein: ${proteinCalPct}% of calories (${data.todayProtein}g × 4 = ${data.todayProtein * 4} cal)`,
    `Carbs: ${carbCalPct}% of calories (${data.todayCarbs}g × 4 = ${data.todayCarbs * 4} cal)`,
    `Fat: ${fatCalPct}% of calories (${data.todayFat}g × 9 = ${data.todayFat * 9} cal)`,
    `Total calories: ${data.todayCalories}`,
  ].join('\n');

  const balanced = proteinCalPct >= 20 && proteinCalPct <= 35 && fatCalPct >= 20 && fatCalPct <= 40;
  const fallbackText = balanced
    ? `Today's macro split is ${carbCalPct}% carbs, ${proteinCalPct}% protein, ${fatCalPct}% fat — nicely balanced.`
    : `Today's split: ${carbCalPct}% carbs, ${proteinCalPct}% protein, ${fatCalPct}% fat. ${proteinCalPct < 20 ? 'Room to boost protein share.' : fatCalPct > 40 ? 'Fat proportion is on the higher side.' : 'A slight adjustment could improve balance.'}`;

  const dataCards: DataCardItem[] = [
    { label: 'Protein', value: `${proteinCalPct}%`, subValue: `${data.todayProtein}g`, status: proteinCalPct >= 20 && proteinCalPct <= 35 ? 'on_track' : 'neutral' },
    { label: 'Carbs', value: `${carbCalPct}%`, subValue: `${data.todayCarbs}g`, status: 'neutral' },
    { label: 'Fat', value: `${fatCalPct}%`, subValue: `${data.todayFat}g`, status: fatCalPct <= 40 ? 'on_track' : 'neutral' },
  ];

  return { questionId: 'macro_ratio', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeRemainingBudget(data: DailyInsightData): QuestionAnalysis {
  const remaining = Math.max(0, data.calorieTarget - data.todayCalories);
  const proteinGap = Math.max(0, data.proteinTarget - data.todayProtein);
  const proteinCalNeeded = proteinGap * 4;
  const calAfterProtein = Math.max(0, remaining - proteinCalNeeded);

  const dataBlock = [
    `REMAINING BUDGET:`,
    `Calories remaining: ${remaining}`,
    `Protein remaining: ${proteinGap}g (${proteinCalNeeded} cal from protein)`,
    `Calories after protein priority: ${calAfterProtein}`,
    `Current totals: ${data.todayCalories} cal, ${data.todayProtein}g protein`,
  ].join('\n');

  const fallbackText = proteinGap > 30
    ? `You have ${remaining} calories remaining with ${proteinGap}g of protein still to go — a protein-focused meal could cover both.`
    : `${remaining} calories remaining today. ${proteinGap > 0 ? `${proteinGap}g protein left to hit your target.` : 'Protein target already reached.'}`;

  const dataCards: DataCardItem[] = [
    { label: 'Cal Left', value: `${remaining}`, subValue: 'calories', status: remaining > 300 ? 'neutral' : remaining > 0 ? 'on_track' : 'ahead' },
    { label: 'Pro Left', value: `${proteinGap}g`, subValue: 'protein', status: proteinGap > 40 ? 'neutral' : proteinGap > 0 ? 'on_track' : 'ahead' },
  ];

  return { questionId: 'remaining_budget', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}
