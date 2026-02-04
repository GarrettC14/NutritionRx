/**
 * Daily Question Category Metadata
 * Labels, emojis, and descriptions for the 6 question categories
 */

import type { DailyQuestionCategoryMeta } from '../types/dailyInsights.types';

export const questionCategories: DailyQuestionCategoryMeta[] = [
  {
    id: 'macro_balance',
    label: 'Macros & Calories',
    icon: 'pie-chart-outline',
    description: 'Overall calorie and macronutrient progress',
  },
  {
    id: 'protein_focus',
    label: 'Protein Focus',
    icon: 'barbell-outline',
    description: 'Protein intake and distribution',
  },
  {
    id: 'meal_balance',
    label: 'Meal Balance',
    icon: 'restaurant-outline',
    description: 'Meal distribution, timing, and variety',
  },
  {
    id: 'hydration',
    label: 'Hydration',
    icon: 'water-outline',
    description: 'Water intake tracking',
  },
  {
    id: 'trends',
    label: 'Trends & Patterns',
    icon: 'trending-up-outline',
    description: 'Today in context of your recent history',
  },
  {
    id: 'nutrient_gaps',
    label: 'Nutrient Gaps',
    icon: 'nutrition-outline',
    description: 'Micronutrient and fiber awareness',
  },
];

export function getCategoryMeta(categoryId: string): DailyQuestionCategoryMeta | undefined {
  return questionCategories.find((c) => c.id === categoryId);
}
