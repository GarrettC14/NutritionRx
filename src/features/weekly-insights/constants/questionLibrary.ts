/**
 * Question Library
 * All 15 weekly insight question definitions with metadata
 */

import type { WeeklyQuestionDefinition, WeeklyQuestionCategory } from '../types/weeklyInsights.types';

export const QUESTION_LIBRARY: WeeklyQuestionDefinition[] = [
  // ── HIGHLIGHTS (pinned) ──
  {
    id: 'Q-HI-01',
    displayText: 'What went well this week?',
    shortDescription: 'Your wins and positive patterns',
    category: 'highlights',
    icon: 'star-outline',
    isPinned: true,
    minimumLoggedDays: 2,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-HI-02', 'Q-CON-03'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-HI-02',
    displayText: "What's one thing I could focus on next week?",
    shortDescription: 'Actionable area for improvement',
    category: 'highlights',
    icon: 'locate-outline',
    isPinned: true,
    minimumLoggedDays: 2,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-HI-01', 'Q-MAC-01'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── CONSISTENCY ──
  {
    id: 'Q-CON-01',
    displayText: 'How consistent were my macros this week?',
    shortDescription: 'Day-to-day macro variation',
    category: 'consistency',
    icon: 'bar-chart-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-CON-02', 'Q-MAC-02'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CON-02',
    displayText: 'Which days threw off my averages?',
    shortDescription: 'Outlier days that shifted your numbers',
    category: 'consistency',
    icon: 'trending-up-outline',
    isPinned: false,
    minimumLoggedDays: 4,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-CON-01', 'Q-CAL-03'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CON-03',
    displayText: 'How many days did I hit my targets this week?',
    shortDescription: 'Target adherence across the week',
    category: 'consistency',
    icon: 'checkmark-circle-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-CAL-01', 'Q-MAC-01'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── MACRO BALANCE ──
  {
    id: 'Q-MAC-01',
    displayText: 'Is my protein intake where it needs to be?',
    shortDescription: 'Protein vs your daily target',
    category: 'macro_balance',
    icon: 'barbell-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-MAC-02', 'Q-CMP-02'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-MAC-02',
    displayText: 'How balanced are my macros across the week?',
    shortDescription: 'Protein, carb, and fat split',
    category: 'macro_balance',
    icon: 'scale-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-MAC-01', 'Q-CON-01'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-MAC-03',
    displayText: 'Am I eating enough fiber?',
    shortDescription: 'Fiber intake vs recommendations',
    category: 'macro_balance',
    icon: 'leaf-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-MAC-02'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: true, // PERMANENTLY GATED
  },

  // ── CALORIE TREND ──
  {
    id: 'Q-CAL-01',
    displayText: 'Am I in a caloric surplus or deficit this week?',
    shortDescription: 'Weekly energy balance overview',
    category: 'calorie_trend',
    icon: 'flame-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-CAL-02', 'Q-CAL-03'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CAL-02',
    displayText: 'Is my calorie intake trending up or down?',
    shortDescription: 'Multi-week calorie direction',
    category: 'calorie_trend',
    icon: 'trending-down-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 2,
    followUpIds: ['Q-CAL-01', 'Q-CMP-01'],
    requiresPriorWeek: true,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CAL-03',
    displayText: 'What does my calorie pattern look like day by day?',
    shortDescription: 'Daily calorie breakdown',
    category: 'calorie_trend',
    icon: 'calendar-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-CON-02', 'Q-TIM-02'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── HYDRATION ──
  {
    id: 'Q-HYD-01',
    displayText: 'How was my water intake this week?',
    shortDescription: 'Hydration vs your daily goal',
    category: 'hydration',
    icon: 'water-outline',
    isPinned: false,
    minimumLoggedDays: 2,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-CON-03'],
    requiresPriorWeek: false,
    requiresWaterData: true,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── TIMING ──
  {
    id: 'Q-TIM-01',
    displayText: 'How many meals am I eating per day?',
    shortDescription: 'Average meals and variation',
    category: 'timing',
    icon: 'restaurant-outline',
    isPinned: false,
    minimumLoggedDays: 3,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-TIM-02', 'Q-CAL-03'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-TIM-02',
    displayText: 'Are weekdays and weekends different for me?',
    shortDescription: 'Weekday vs weekend eating patterns',
    category: 'timing',
    icon: 'calendar-outline',
    isPinned: false,
    minimumLoggedDays: 4,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-TIM-01', 'Q-CON-02'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── NUTRIENTS (permanently gated) ──
  {
    id: 'Q-NUT-01',
    displayText: "Are there nutrients I've been consistently low on?",
    shortDescription: 'Micronutrient gaps in your diet',
    category: 'nutrients',
    icon: 'medkit-outline',
    isPinned: false,
    minimumLoggedDays: 5,
    minimumWeeksNeeded: 1,
    followUpIds: ['Q-MAC-02'],
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: true, // PERMANENTLY GATED
    requiresFiberData: false,
  },

  // ── COMPARISON ──
  {
    id: 'Q-CMP-01',
    displayText: 'How does this week compare to last week?',
    shortDescription: 'Week-over-week changes',
    category: 'comparison',
    icon: 'repeat-outline',
    isPinned: false,
    minimumLoggedDays: 4,
    minimumWeeksNeeded: 2,
    followUpIds: ['Q-CMP-02', 'Q-CAL-02'],
    requiresPriorWeek: true,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CMP-02',
    displayText: 'Is my protein intake trending up or down over recent weeks?',
    shortDescription: 'Multi-week protein direction',
    category: 'comparison',
    icon: 'trending-up-outline',
    isPinned: false,
    minimumLoggedDays: 4,
    minimumWeeksNeeded: 3,
    followUpIds: ['Q-MAC-01', 'Q-CMP-01'],
    requiresPriorWeek: true,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
];

/**
 * Get a question definition by ID.
 */
export function getQuestionById(id: string): WeeklyQuestionDefinition | undefined {
  return QUESTION_LIBRARY.find((q) => q.id === id);
}

/**
 * Get all questions for a category.
 */
export function getQuestionsByCategory(
  category: WeeklyQuestionCategory
): WeeklyQuestionDefinition[] {
  return QUESTION_LIBRARY.filter((q) => q.category === category);
}

/**
 * Get all active (non-gated) question IDs.
 * Excludes Q-MAC-03 (fiber) and Q-NUT-01 (nutrients).
 */
export function getActiveQuestionIds(): string[] {
  return QUESTION_LIBRARY.filter((q) => !q.requiresFiberData && !q.requiresDeficiencyData).map(
    (q) => q.id
  );
}
