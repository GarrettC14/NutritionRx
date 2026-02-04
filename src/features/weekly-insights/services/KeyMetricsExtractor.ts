/**
 * Key Metrics Extractor
 * Extracts 2-3 key data points from each analysis result for display in cards
 */

import type { QuestionAnalysisResult, KeyMetric } from '../types/weeklyInsights.types';

type MetricsExtractor = (data: any) => KeyMetric[];

const extractorMap: Record<string, MetricsExtractor> = {
  'Q-HI-01': (d) => [
    { label: 'Wins', value: `${d.highlightCount}` },
  ],

  'Q-HI-02': (d) => [
    { label: 'Focus', value: d.focusArea },
  ],

  'Q-CON-01': (d) => [
    { label: 'Consistency', value: d.overallConsistency.replace(/_/g, ' ') },
    { label: 'Steadiest', value: d.mostConsistentMacro },
    { label: 'Most variable', value: d.leastConsistentMacro },
  ],

  'Q-CON-02': (d) => [
    { label: 'Outliers', value: `${d.outlierDays.length} day${d.outlierDays.length !== 1 ? 's' : ''}` },
    { label: 'Avg cal', value: `${Math.round(d.weekMean)}` },
  ],

  'Q-CON-03': (d) => [
    { label: 'Cal hits', value: `${d.calorieHitDays}/${d.loggedDays}` },
    { label: 'Protein hits', value: `${d.proteinHitDays}/${d.loggedDays}` },
  ],

  'Q-MAC-01': (d) => [
    { label: 'Avg protein', value: `${d.avgProtein}g` },
    { label: 'vs target', value: `${d.avgProteinPct}%` },
    ...(d.trend ? [{ label: 'Trend', value: d.trend }] : []),
  ],

  'Q-MAC-02': (d) => [
    { label: 'Protein', value: `${d.proteinPct}%` },
    { label: 'Carbs', value: `${d.carbsPct}%` },
    { label: 'Fat', value: `${d.fatPct}%` },
  ],

  'Q-CAL-01': (d) => [
    { label: 'Daily avg', value: `${Math.round(d.dailyAvgIntake)} cal` },
    { label: 'Delta', value: `${d.dailyDelta > 0 ? '+' : ''}${Math.round(d.dailyDelta)} cal` },
  ],

  'Q-CAL-02': (d) => [
    { label: 'This week', value: `${Math.round(d.currentWeekAvg)} cal` },
    { label: 'Last week', value: `${Math.round(d.priorWeekAvg)} cal` },
    { label: 'Trend', value: d.trendDirection },
  ],

  'Q-CAL-03': (d) => {
    const onTarget = d.days?.filter((day: any) => day.classification === 'on_target').length ?? 0;
    return [
      { label: 'On target', value: `${onTarget} days` },
      ...(d.pattern ? [{ label: 'Pattern', value: d.pattern }] : []),
    ];
  },

  'Q-HYD-01': (d) => [
    { label: 'Avg water', value: `${d.avgWaterPct}%` },
    { label: 'Met goal', value: `${d.daysMetTarget}/${d.loggedDays} days` },
  ],

  'Q-TIM-01': (d) => [
    { label: 'Avg meals', value: `${d.avgMeals}` },
    { label: 'Range', value: `${d.minMeals}-${d.maxMeals}` },
  ],

  'Q-TIM-02': (d) => [
    { label: 'Weekday', value: `${d.weekdayAvgCal} cal` },
    { label: 'Weekend', value: `${d.weekendAvgCal} cal` },
    { label: 'Diff', value: `${d.weekendEffect > 0 ? '+' : ''}${d.weekendEffect}%` },
  ],

  'Q-CMP-01': (d) => {
    const biggest = d.comparisons?.[0];
    return biggest
      ? [
          { label: biggest.metric, value: `${biggest.direction === 'up' ? '+' : ''}${biggest.changePct}%` },
          ...(d.biggestImprovement ? [{ label: 'Best gain', value: d.biggestImprovement }] : []),
        ]
      : [];
  },

  'Q-CMP-02': (d) => [
    { label: 'Direction', value: d.trendDirection },
    { label: 'Target', value: `${d.proteinTarget}g` },
  ],
};

export class KeyMetricsExtractor {
  static extract(questionId: string, analysisResult: QuestionAnalysisResult): KeyMetric[] {
    const extractor = extractorMap[questionId];
    if (!extractor) return [];
    try {
      return extractor(analysisResult).slice(0, 3);
    } catch {
      return [];
    }
  }
}
