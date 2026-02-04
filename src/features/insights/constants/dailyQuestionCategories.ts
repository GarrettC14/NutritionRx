/**
 * Daily Question Category Metadata
 * Labels, emojis, and descriptions for the 6 question categories
 */

import type { DailyQuestionCategoryMeta } from '../types/dailyInsights.types';

export const questionCategories: DailyQuestionCategoryMeta[] = [
  {
    id: 'macro_balance',
    label: 'Macros & Calories',
    emoji: '🎯',
    description: 'Overall calorie and macronutrient progress',
  },
  {
    id: 'protein_focus',
    label: 'Protein Focus',
    emoji: '💪',
    description: 'Protein intake and distribution',
  },
  {
    id: 'meal_balance',
    label: 'Meal Balance',
    emoji: '⚖️',
    description: 'Meal distribution, timing, and variety',
  },
  {
    id: 'hydration',
    label: 'Hydration',
    emoji: '💧',
    description: 'Water intake tracking',
  },
  {
    id: 'trends',
    label: 'Trends & Patterns',
    emoji: '📊',
    description: 'Today in context of your recent history',
  },
  {
    id: 'nutrient_gaps',
    label: 'Nutrient Gaps',
    emoji: '🧬',
    description: 'Micronutrient and fiber awareness',
  },
];

export function getCategoryMeta(categoryId: string): DailyQuestionCategoryMeta | undefined {
  return questionCategories.find((c) => c.id === categoryId);
}
