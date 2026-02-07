/**
 * Data Availability / Confidence Gating
 * Prevents the LLM from hallucinating when there isn't enough data.
 * The tier is injected into the system prompt so the LLM knows its own limitations.
 */

import type { RawNutritionData } from './nutritionContextQueries';

export type DataAvailabilityTier = 'none' | 'minimal' | 'moderate' | 'high';

export interface DataAvailabilityResult {
  tier: DataAvailabilityTier;
  daysLogged: number;
  weeksWithData: number;
  hasWeightData: boolean;
  hasMealTimingData: boolean;
  promptGuidance: string;
}

export function computeDataAvailability(
  rawData: RawNutritionData,
): DataAvailabilityResult {
  const daysLogged = rawData.dailyLogs.length;
  const weeksWithData = rawData.weeklyAverages.filter(
    (w) => w.daysLogged >= 3,
  ).length;
  const hasWeightData = rawData.weightTrend.length >= 3;
  const hasMealTimingData = rawData.mealPatterns.length > 0;

  let tier: DataAvailabilityTier;
  let promptGuidance: string;

  if (daysLogged === 0) {
    tier = 'none';
    promptGuidance = `DATA AVAILABILITY: NONE
The user has not logged any nutrition data yet.
YOUR TASK: Help them get started. Ask about their goals, suggest logging their next meal, explain how tracking works.
DO NOT: Make any nutrition recommendations, reference any data, or suggest macro adjustments.`;
  } else if (daysLogged < 3) {
    tier = 'minimal';
    promptGuidance = `DATA AVAILABILITY: MINIMAL (${daysLogged} days logged)
You have very limited data. Patterns are NOT reliable yet.
YOUR TASK: Encourage continued logging. You may comment on what you see but qualify everything as preliminary.
DO NOT: Identify trends, suggest calorie/macro changes, or make specific food recommendations based on patterns.
SAY: "As you log more days, I'll be able to spot patterns and give better guidance."`;
  } else if (daysLogged < 7 || weeksWithData < 2) {
    tier = 'moderate';
    promptGuidance = `DATA AVAILABILITY: MODERATE (${daysLogged} days logged, ${weeksWithData} full weeks)
You have enough data for general observations but not enough for confident trend analysis.
YOUR TASK: Offer general guidance based on what you see. Note where more data would help.
DO NOT: Make definitive statements about weight trends, identify multi-week patterns, or suggest specific caloric adjustments.
YOU MAY: Comment on daily consistency, protein intake patterns, meal timing, and adherence.`;
  } else {
    tier = 'high';
    promptGuidance = `DATA AVAILABILITY: HIGH (${daysLogged} days logged, ${weeksWithData} full weeks${hasWeightData ? ', weight data available' : ''})
You have sufficient data for data-driven recommendations.
YOUR TASK: Provide specific, actionable nutrition guidance based on the data provided.
YOU MAY: Identify trends, suggest macro adjustments, comment on patterns, and give specific food recommendations.`;
  }

  return {
    tier,
    daysLogged,
    weeksWithData,
    hasWeightData,
    hasMealTimingData,
    promptGuidance,
  };
}
