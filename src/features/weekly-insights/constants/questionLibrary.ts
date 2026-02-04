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
    category: 'highlights',
    icon: '\u{1F31F}', // star
    isPinned: true,
    minimumLoggedDays: 2,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-HI-02',
    displayText: "What's one thing I could focus on next week?",
    category: 'highlights',
    icon: '\u{1F3AF}', // target
    isPinned: true,
    minimumLoggedDays: 2,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── CONSISTENCY ──
  {
    id: 'Q-CON-01',
    displayText: 'How consistent were my macros this week?',
    category: 'consistency',
    icon: '\u{1F4CA}', // bar chart
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CON-02',
    displayText: 'Which days threw off my averages?',
    category: 'consistency',
    icon: '\u{1F4C8}', // chart increasing
    isPinned: false,
    minimumLoggedDays: 4,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CON-03',
    displayText: 'How many days did I hit my targets this week?',
    category: 'consistency',
    icon: '\u2705', // check mark
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── MACRO BALANCE ──
  {
    id: 'Q-MAC-01',
    displayText: 'Is my protein intake where it needs to be?',
    category: 'macro_balance',
    icon: '\u{1F4AA}', // flexed bicep
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-MAC-02',
    displayText: 'How balanced are my macros across the week?',
    category: 'macro_balance',
    icon: '\u2696\uFE0F', // balance scale
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-MAC-03',
    displayText: 'Am I eating enough fiber?',
    category: 'macro_balance',
    icon: '\u{1F33E}', // sheaf of rice
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: true, // PERMANENTLY GATED
  },

  // ── CALORIE TREND ──
  {
    id: 'Q-CAL-01',
    displayText: 'Am I in a caloric surplus or deficit this week?',
    category: 'calorie_trend',
    icon: '\u{1F525}', // fire
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CAL-02',
    displayText: 'Is my calorie intake trending up or down?',
    category: 'calorie_trend',
    icon: '\u{1F4C9}', // chart decreasing
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: true,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CAL-03',
    displayText: 'What does my calorie pattern look like day by day?',
    category: 'calorie_trend',
    icon: '\u{1F5D3}\uFE0F', // spiral calendar
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── HYDRATION ──
  {
    id: 'Q-HYD-01',
    displayText: 'How was my water intake this week?',
    category: 'hydration',
    icon: '\u{1F4A7}', // droplet
    isPinned: false,
    minimumLoggedDays: 2,
    requiresPriorWeek: false,
    requiresWaterData: true,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── TIMING ──
  {
    id: 'Q-TIM-01',
    displayText: 'How many meals am I eating per day?',
    category: 'timing',
    icon: '\u{1F37D}\uFE0F', // fork and knife with plate
    isPinned: false,
    minimumLoggedDays: 3,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-TIM-02',
    displayText: 'Are weekdays and weekends different for me?',
    category: 'timing',
    icon: '\u{1F4C6}', // tear-off calendar
    isPinned: false,
    minimumLoggedDays: 4,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },

  // ── NUTRIENTS (permanently gated) ──
  {
    id: 'Q-NUT-01',
    displayText: "Are there nutrients I've been consistently low on?",
    category: 'nutrients',
    icon: '\u{1F48A}', // pill
    isPinned: false,
    minimumLoggedDays: 5,
    requiresPriorWeek: false,
    requiresWaterData: false,
    requiresDeficiencyData: true, // PERMANENTLY GATED
    requiresFiberData: false,
  },

  // ── COMPARISON ──
  {
    id: 'Q-CMP-01',
    displayText: 'How does this week compare to last week?',
    category: 'comparison',
    icon: '\u{1F504}', // counterclockwise arrows
    isPinned: false,
    minimumLoggedDays: 4,
    requiresPriorWeek: true,
    requiresWaterData: false,
    requiresDeficiencyData: false,
    requiresFiberData: false,
  },
  {
    id: 'Q-CMP-02',
    displayText: 'Is my protein intake trending up or down over recent weeks?',
    category: 'comparison',
    icon: '\u{1F4C8}', // chart increasing
    isPinned: false,
    minimumLoggedDays: 4,
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
