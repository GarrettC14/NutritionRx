/**
 * Trend Analyzers
 * Analyzers for: vs_weekly_avg, consistency_check, trend_direction
 */

import type { DailyInsightData, QuestionAnalysis, DataCardItem } from '../../../types/dailyInsights.types';

export function analyzeVsWeeklyAvg(data: DailyInsightData): QuestionAnalysis {
  const calDiff = data.todayCalories - data.avgCalories7d;
  const calDiffPct = data.avgCalories7d > 0 ? Math.round((calDiff / data.avgCalories7d) * 100) : 0;
  const proDiff = data.todayProtein - data.avgProtein7d;

  const dataBlock = [
    `TODAY vs 7-DAY AVERAGE:`,
    `Calories today: ${data.todayCalories} | 7-day avg: ${data.avgCalories7d} (${calDiff >= 0 ? '+' : ''}${calDiff}, ${calDiffPct >= 0 ? '+' : ''}${calDiffPct}%)`,
    `Protein today: ${data.todayProtein}g | 7-day avg: ${data.avgProtein7d}g (${proDiff >= 0 ? '+' : ''}${proDiff}g)`,
    `Calorie target: ${data.calorieTarget}`,
  ].join('\n');

  const fallbackText = Math.abs(calDiffPct) <= 10
    ? `Today is tracking close to your 7-day average of ${data.avgCalories7d} calories — consistent day.`
    : calDiff > 0
      ? `Today is running ${Math.abs(calDiffPct)}% above your 7-day average of ${data.avgCalories7d} calories.`
      : `Today is running ${Math.abs(calDiffPct)}% below your 7-day average of ${data.avgCalories7d} calories.`;

  const dataCards: DataCardItem[] = [
    { label: 'Today', value: `${data.todayCalories}`, subValue: 'calories', status: 'neutral' },
    { label: '7-Day Avg', value: `${data.avgCalories7d}`, subValue: 'calories', status: 'neutral' },
    { label: 'Difference', value: `${calDiff >= 0 ? '+' : ''}${calDiffPct}%`, subValue: `${Math.abs(calDiff)} cal`, status: Math.abs(calDiffPct) <= 10 ? 'on_track' : 'neutral' },
  ];

  return { questionId: 'vs_weekly_avg', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeConsistencyCheck(data: DailyInsightData): QuestionAnalysis {
  const loggedDays = data.weeklyDailyTotals.filter((d) => d.logged).length;
  const totalDays = data.weeklyDailyTotals.length;

  const dataBlock = [
    `CONSISTENCY CHECK:`,
    `Days logged this week: ${loggedDays} of ${totalDays}`,
    `Logging streak: ${data.loggingStreak} days`,
    `Calorie streak: ${data.calorieStreak} of 7 days within target`,
    `Days using app: ${data.daysUsingApp}`,
  ].join('\n');

  const fallbackText = data.loggingStreak >= 7
    ? `${data.loggingStreak}-day logging streak — your data is getting more valuable with each day of consistent tracking.`
    : loggedDays >= 5
      ? `${loggedDays} of ${totalDays} days logged this week — solid consistency.`
      : `${loggedDays} of ${totalDays} days logged this week. More consistent tracking helps surface more accurate patterns.`;

  const dataCards: DataCardItem[] = [
    { label: 'This Week', value: `${loggedDays}/${totalDays}`, subValue: 'days logged', status: loggedDays >= 5 ? 'on_track' : loggedDays < 3 ? 'behind' : 'neutral' },
    { label: 'Streak', value: `${data.loggingStreak}`, subValue: 'days', status: data.loggingStreak >= 7 ? 'on_track' : 'neutral' },
    { label: 'On Target', value: `${data.calorieStreak}`, subValue: 'of 7 days', status: data.calorieStreak >= 4 ? 'on_track' : 'neutral' },
  ];

  return { questionId: 'consistency_check', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeTrendDirection(data: DailyInsightData): QuestionAnalysis {
  // Sort oldest-first so slice(0,3) = earlier, slice(-3) = recent
  const loggedDays = data.weeklyDailyTotals
    .filter((d) => d.logged)
    .sort((a, b) => a.date.localeCompare(b.date));
  const recentSlice = loggedDays.slice(-3);
  const earlierSlice = loggedDays.slice(0, 3);

  const recentAvgCal = recentSlice.length > 0
    ? Math.round(recentSlice.reduce((s, d) => s + d.calories, 0) / recentSlice.length)
    : 0;
  const earlierAvgCal = earlierSlice.length > 0
    ? Math.round(earlierSlice.reduce((s, d) => s + d.calories, 0) / earlierSlice.length)
    : 0;

  const trendDiff = recentAvgCal - earlierAvgCal;
  const trendPct = earlierAvgCal > 0 ? Math.round((trendDiff / earlierAvgCal) * 100) : 0;
  const trendDir = trendPct > 5 ? 'upward' : trendPct < -5 ? 'downward' : 'steady';

  const goalContext = data.userGoal === 'lose' ? 'your fat loss goal' : data.userGoal === 'gain' ? 'your muscle gain goal' : 'maintenance';
  const trendAlignment =
    (data.userGoal === 'lose' && trendDir === 'downward') ||
    (data.userGoal === 'gain' && trendDir === 'upward') ||
    (data.userGoal === 'maintain' && trendDir === 'steady');

  const dataBlock = [
    `TREND DIRECTION:`,
    `Recent 3-day avg: ${recentAvgCal} cal`,
    `Earlier 3-day avg: ${earlierAvgCal} cal`,
    `Trend: ${trendDir} (${trendPct >= 0 ? '+' : ''}${trendPct}%)`,
    `Goal: ${data.userGoal}`,
    `Calorie target: ${data.calorieTarget}`,
    trendAlignment ? `Trend aligns with ${goalContext}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const fallbackText = trendDir === 'steady'
    ? `Calorie intake is holding steady this week — recent average of ${recentAvgCal} vs ${earlierAvgCal} earlier.`
    : trendAlignment
      ? `Calories are trending ${trendDir} (${recentAvgCal} recently vs ${earlierAvgCal} earlier) — aligned with ${goalContext}.`
      : `Calories are trending ${trendDir} (${recentAvgCal} recently vs ${earlierAvgCal} earlier). Worth noting relative to ${goalContext}.`;

  const dataCards: DataCardItem[] = [
    { label: 'Recent', value: `${recentAvgCal}`, subValue: 'cal/day (3d)', status: 'neutral' },
    { label: 'Earlier', value: `${earlierAvgCal}`, subValue: 'cal/day (3d)', status: 'neutral' },
    { label: 'Trend', value: `${trendPct >= 0 ? '+' : ''}${trendPct}%`, subValue: trendDir, status: trendAlignment ? 'on_track' : 'neutral' },
  ];

  return { questionId: 'trend_direction', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}
