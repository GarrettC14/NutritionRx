/**
 * Widget Definitions Registry
 * Defines all available widgets and their metadata
 */

import { ComponentType } from 'react';
import { WidgetType, WidgetSize, WidgetProps, WidgetDefinition } from '@/types/dashboard';
import {
  CalorieRingWidget,
  MacroBarsWidget,
  WaterTrackerWidget,
  WeightTrendWidget,
  TodaysMealsWidget,
  StreakBadgeWidget,
  WeeklyAverageWidget,
  ProteinFocusWidget,
  QuickAddWidget,
  GoalsSummaryWidget,
  MealIdeasWidget,
  NutritionOverviewWidget,
  // Premium widgets
  FastingTimerWidget,
  MicronutrientSnapshotWidget,
  AIDailyInsightWidget,
  WeeklyRecapWidget,
} from '@/components/dashboard/widgets';

/**
 * Widget definitions with metadata for the widget picker
 */
export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  calorie_ring: {
    type: 'calorie_ring',
    name: 'Calorie Ring',
    description: 'Daily calorie progress with remaining budget',
    icon: 'pie-chart-outline',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    category: 'nutrition',
    component: CalorieRingWidget as ComponentType<WidgetProps>,
  },
  macro_bars: {
    type: 'macro_bars',
    name: 'Macro Bars',
    description: 'Protein, carbs, and fat progress bars',
    icon: 'bar-chart-outline',
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'large',
    category: 'nutrition',
    component: MacroBarsWidget as ComponentType<WidgetProps>,
  },
  water_tracker: {
    type: 'water_tracker',
    name: 'Water Tracker',
    description: 'Track daily water intake with quick add',
    icon: 'water-outline',
    defaultSize: 'small',
    minSize: 'small',
    maxSize: 'medium',
    category: 'nutrition',
    component: WaterTrackerWidget as ComponentType<WidgetProps>,
  },
  weight_trend: {
    type: 'weight_trend',
    name: 'Weight Trend',
    description: 'Weight progress chart over time',
    icon: 'trending-down-outline',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'large',
    category: 'progress',
    component: WeightTrendWidget as ComponentType<WidgetProps>,
  },
  todays_meals: {
    type: 'todays_meals',
    name: "Today's Meals",
    description: 'Collapsible list of logged meals',
    icon: 'restaurant-outline',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'large',
    category: 'meals',
    component: TodaysMealsWidget as ComponentType<WidgetProps>,
  },
  streak_badge: {
    type: 'streak_badge',
    name: 'Streak Badge',
    description: 'Consecutive days of logging',
    icon: 'flame-outline',
    defaultSize: 'small',
    minSize: 'small',
    maxSize: 'medium',
    category: 'progress',
    component: StreakBadgeWidget as ComponentType<WidgetProps>,
  },
  weekly_average: {
    type: 'weekly_average',
    name: 'Weekly Average',
    description: 'Average daily calories this week',
    icon: 'calendar-outline',
    defaultSize: 'small',
    minSize: 'small',
    maxSize: 'medium',
    category: 'progress',
    component: WeeklyAverageWidget as ComponentType<WidgetProps>,
  },
  protein_focus: {
    type: 'protein_focus',
    name: 'Protein Focus',
    description: 'Protein-only progress ring',
    icon: 'barbell-outline',
    defaultSize: 'small',
    minSize: 'small',
    maxSize: 'medium',
    category: 'nutrition',
    component: ProteinFocusWidget as ComponentType<WidgetProps>,
  },
  quick_add: {
    type: 'quick_add',
    name: 'Quick Add',
    description: 'Recent and favorite foods for fast logging',
    icon: 'add-circle-outline',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    category: 'meals',
    component: QuickAddWidget as ComponentType<WidgetProps>,
  },
  goals_summary: {
    type: 'goals_summary',
    name: 'Goals Summary',
    description: 'Calorie, protein, and weight goals',
    icon: 'flag-outline',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'large',
    category: 'progress',
    component: GoalsSummaryWidget as ComponentType<WidgetProps>,
  },
  meal_ideas: {
    type: 'meal_ideas',
    name: 'Meal Ideas',
    description: 'Smart suggestions based on remaining macros',
    icon: 'bulb-outline',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    category: 'meals',
    component: MealIdeasWidget as ComponentType<WidgetProps>,
    isPremium: true,
  },
  nutrition_overview: {
    type: 'nutrition_overview',
    name: 'Nutrition Overview',
    description: 'Combined calorie ring and macro bars in one card',
    icon: 'fitness-outline',
    defaultSize: 'large',
    minSize: 'large',
    maxSize: 'large',
    category: 'nutrition',
    component: NutritionOverviewWidget as ComponentType<WidgetProps>,
  },

  // Premium Widgets
  fasting_timer: {
    type: 'fasting_timer',
    name: 'Fasting Timer',
    description: 'Track your intermittent fasting window',
    icon: 'timer-outline',
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'medium',
    category: 'progress',
    component: FastingTimerWidget as ComponentType<WidgetProps>,
    isPremium: true,
  },
  micronutrient_snapshot: {
    type: 'micronutrient_snapshot',
    name: 'Nutrient Snapshot',
    description: 'See your top nutrient gaps today',
    icon: 'nutrition-outline',
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'medium',
    category: 'nutrition',
    component: MicronutrientSnapshotWidget as ComponentType<WidgetProps>,
    isPremium: true,
  },
  ai_daily_insight: {
    type: 'ai_daily_insight',
    name: 'Daily Insight',
    description: 'Personalized AI-powered nutrition insight',
    icon: 'sparkles',
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'medium',
    category: 'progress',
    component: AIDailyInsightWidget as ComponentType<WidgetProps>,
    isPremium: true,
  },
  weekly_recap: {
    type: 'weekly_recap',
    name: 'Weekly Recap',
    description: 'Weekly summary with stats and AI insights',
    icon: 'calendar-outline',
    defaultSize: 'large',
    minSize: 'large',
    maxSize: 'large',
    category: 'progress',
    component: WeeklyRecapWidget as ComponentType<WidgetProps>,
    isPremium: true,
  },
};

/**
 * Get widget definition by type
 */
export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS[type];
}

/**
 * Get all widget definitions as an array
 */
export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return Object.values(WIDGET_DEFINITIONS);
}

/**
 * Get widget definitions by category
 */
export function getWidgetsByCategory(category: string): WidgetDefinition[] {
  return Object.values(WIDGET_DEFINITIONS).filter((def) => def.category === category);
}

/**
 * Widget categories for grouping in the picker
 */
export const WIDGET_CATEGORIES = [
  { id: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline' },
  { id: 'meals', label: 'Meals', icon: 'restaurant-outline' },
  { id: 'progress', label: 'Progress', icon: 'trending-up-outline' },
] as const;

/**
 * Default widgets for new users
 */
export const DEFAULT_WIDGET_TYPES: WidgetType[] = [
  'nutrition_overview',
  'quick_add',
  'water_tracker',
  'todays_meals',
  'streak_badge',
];
