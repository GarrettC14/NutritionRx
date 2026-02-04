/**
 * Sentiment Deriver
 * Rules-based sentiment derivation from analysis data
 * Maps to left-border color: green (positive) / default (neutral) / orange (negative)
 */

import type { QuestionAnalysisResult, InsightSentiment } from '../types/weeklyInsights.types';

type SentimentRule = (data: any) => InsightSentiment;

const sentimentRules: Record<string, SentimentRule> = {
  'Q-HI-01': (d) => (d.highlightCount >= 2 ? 'positive' : 'neutral'),

  'Q-HI-02': () => 'neutral',

  'Q-CON-01': (d) =>
    d.overallConsistency === 'very_consistent' || d.overallConsistency === 'fairly_consistent'
      ? 'positive'
      : d.overallConsistency === 'quite_variable'
        ? 'negative'
        : 'neutral',

  'Q-CON-02': (d) => (d.outlierDays.length === 0 ? 'positive' : d.outlierDays.length >= 3 ? 'negative' : 'neutral'),

  'Q-CON-03': (d) => {
    const hitPct = d.loggedDays > 0 ? d.calorieHitDays / d.loggedDays : 0;
    return hitPct >= 0.7 ? 'positive' : hitPct < 0.4 ? 'negative' : 'neutral';
  },

  'Q-MAC-01': (d) =>
    d.avgProteinPct >= 90 ? 'positive' : d.avgProteinPct < 70 ? 'negative' : 'neutral',

  'Q-MAC-02': (d) => (d.skewedMacro ? 'negative' : 'positive'),

  'Q-CAL-01': (d) =>
    d.alignsWithGoal ? 'positive' : d.isNeutral ? 'positive' : 'negative',

  'Q-CAL-02': (d) =>
    d.trendStrength === 'strong' ? 'neutral' : 'neutral',

  'Q-CAL-03': (d) => {
    const onTarget = d.days?.filter((day: any) => day.classification === 'on_target').length ?? 0;
    const total = d.days?.length ?? 0;
    return total > 0 && onTarget / total >= 0.5 ? 'positive' : 'neutral';
  },

  'Q-HYD-01': (d) =>
    d.avgWaterPct >= 90 ? 'positive' : d.avgWaterPct < 60 ? 'negative' : 'neutral',

  'Q-TIM-01': () => 'neutral',

  'Q-TIM-02': (d) =>
    Math.abs(d.weekendEffect) > 20 ? 'negative' : 'neutral',

  'Q-CMP-01': (d) => (d.biggestImprovement ? 'positive' : 'neutral'),

  'Q-CMP-02': (d) =>
    d.trendDirection === 'rising' ? 'positive' : d.trendDirection === 'falling' ? 'negative' : 'neutral',
};

export class SentimentDeriver {
  static derive(questionId: string, analysisResult: QuestionAnalysisResult): InsightSentiment {
    const rule = sentimentRules[questionId];
    if (!rule) return 'neutral';
    try {
      return rule(analysisResult);
    } catch {
      return 'neutral';
    }
  }
}
