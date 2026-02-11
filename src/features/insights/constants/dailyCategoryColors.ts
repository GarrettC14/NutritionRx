/**
 * Daily Insight Category Colors
 * Single source of truth for category color and label mapping used in DailyQuestionCard and DailyCategoryChips.
 */

import type { DailyQuestionCategory } from '../types/dailyInsights.types';

export const DAILY_CATEGORY_COLORS: Record<DailyQuestionCategory, string> = {
  macro_balance: '#AB47BC',
  protein_focus: '#42A5F5',
  meal_balance: '#FFA726',
  hydration: '#81D4FA',
  trends: '#66BB6A',
  nutrient_gaps: '#26A69A',
};

export const DAILY_CATEGORY_LABELS: Record<DailyQuestionCategory, string> = {
  macro_balance: 'Macros',
  protein_focus: 'Protein',
  meal_balance: 'Meals',
  hydration: 'Hydration',
  trends: 'Trends',
  nutrient_gaps: 'Nutrients',
};
