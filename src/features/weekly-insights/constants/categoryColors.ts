/**
 * Weekly Insight Category Colors
 * Single source of truth for category color mapping used in QuestionCard and CategoryChips.
 */

import type { WeeklyQuestionCategory } from '../types/weeklyInsights.types';

export const WEEKLY_CATEGORY_COLORS: Record<WeeklyQuestionCategory, string> = {
  consistency: '#FFA726',
  macro_balance: '#AB47BC',
  calorie_trend: '#66BB6A',
  hydration: '#81D4FA',
  timing: '#FFCA28',
  nutrients: '#26A69A',
  comparison: '#42A5F5',
  highlights: '#7E57C2',
};

export const CATEGORY_LABELS: Record<WeeklyQuestionCategory, string> = {
  consistency: 'Consistency',
  macro_balance: 'Macros',
  calorie_trend: 'Calories',
  hydration: 'Hydration',
  timing: 'Timing',
  nutrients: 'Nutrients',
  comparison: 'Comparison',
  highlights: 'Highlights',
};
