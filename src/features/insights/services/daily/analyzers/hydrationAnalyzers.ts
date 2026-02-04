/**
 * Hydration Analyzers
 * Analyzers for: hydration_status, hydration_pacing
 */

import type { DailyInsightData, QuestionAnalysis, DataCardItem } from '../../../types/dailyInsights.types';

export function analyzeHydrationStatus(data: DailyInsightData): QuestionAnalysis {
  const remaining = Math.max(0, data.waterTarget - data.todayWater);
  const remainingMl = remaining;
  const remainingGlasses = Math.ceil(remaining / 250); // ~250ml per glass

  const dataBlock = [
    `HYDRATION STATUS:`,
    `Today: ${data.todayWater}ml of ${data.waterTarget}ml (${data.waterPercent}%)`,
    `Remaining: ${remainingMl}ml (~${remainingGlasses} glasses)`,
    `Hour of day: ${data.currentHour}`,
  ].join('\n');

  const fallbackText = data.waterPercent >= 100
    ? `You've reached your water goal — ${data.todayWater}ml of ${data.waterTarget}ml target.`
    : data.waterPercent >= 70
      ? `${data.waterPercent}% of your water goal reached — ${remainingMl}ml to go.`
      : `Water intake is at ${data.waterPercent}% — about ${remainingGlasses} glasses remaining to reach your target.`;

  const dataCards: DataCardItem[] = [
    { label: 'Water', value: `${data.waterPercent}%`, subValue: `${data.todayWater}ml / ${data.waterTarget}ml`, percent: data.waterPercent, status: data.waterPercent >= 85 ? 'on_track' : data.waterPercent < 50 ? 'behind' : 'neutral' },
    { label: 'Remaining', value: `${remainingMl}ml`, subValue: `~${remainingGlasses} glasses`, status: remainingMl === 0 ? 'on_track' : 'neutral' },
  ];

  return { questionId: 'hydration_status', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeHydrationPacing(data: DailyInsightData): QuestionAnalysis {
  const expectedPercent = Math.round(data.dayProgress * 100);
  const deviation = data.waterPercent - expectedPercent;
  const remaining = Math.max(0, data.waterTarget - data.todayWater);

  const dataBlock = [
    `HYDRATION PACING:`,
    `Current: ${data.todayWater}ml of ${data.waterTarget}ml (${data.waterPercent}%)`,
    `Expected at this time: ~${expectedPercent}%`,
    `Deviation: ${deviation > 0 ? '+' : ''}${deviation} percentage points`,
    `Day progress: ${Math.round(data.dayProgress * 100)}%`,
    `Remaining: ${remaining}ml`,
  ].join('\n');

  const fallbackText = deviation >= -10
    ? `Water intake is pacing well at ${data.waterPercent}% with the day ${Math.round(data.dayProgress * 100)}% through.`
    : `Water is at ${data.waterPercent}% while the day is ${Math.round(data.dayProgress * 100)}% through — picking up the pace with a glass or two could help you stay on track.`;

  const dataCards: DataCardItem[] = [
    { label: 'Current', value: `${data.waterPercent}%`, subValue: `${data.todayWater}ml`, status: deviation >= -10 ? 'on_track' : 'neutral' },
    { label: 'Expected', value: `${expectedPercent}%`, subValue: 'at this time', status: 'neutral' },
  ];

  return { questionId: 'hydration_pacing', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}
