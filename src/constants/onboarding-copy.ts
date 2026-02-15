/**
 * Onboarding contextual copy — displayed as screen-level subtitles
 * on each onboarding step via the <OnboardingScreen subtitle={...}> prop.
 *
 * SCOPE: This file covers ONLY screen-level subtitles, not option-level
 * subtitles on radio cards or other hardcoded onboarding strings.
 *
 * Writing guidelines for future edits:
 * - One sentence max, under 15 words ideal, never more than 20
 * - Benefit-focused: tell the user what THEY get, not what WE need
 * - Non-technical: no "TDEE", "basal metabolic rate", "macronutrients"
 * - Non-judgmental: never imply there\'s a right/wrong answer
 * - Warm but not patronizing
 */

/** Union type constraining keys to the 8 onboarding route segments */
type OnboardingStep =
  | 'goal'
  | 'about-you'
  | 'body-stats'
  | 'activity'
  | 'experience'
  | 'eating-style'
  | 'protein'
  | 'target'
  | 'your-plan';

export const ONBOARDING_SUBTITLES: Record<OnboardingStep, string> = {
  goal: "Your goal shapes everything \u2014 from daily targets to the insights you\'ll see.",
  'about-you': "Age and sex help us estimate your body\'s daily energy needs.",
  'body-stats': "Height and weight help us find a starting point that fits your body.",
  activity: "Your activity level shapes how many calories you need each day.",
  experience: "This helps us tailor how much detail you see upfront.",
  'eating-style': "Your preferences help us suggest a carb and fat balance you\'ll enjoy.",
  protein: "Protein needs vary by goal \u2014 we\'ll calibrate yours to match.",
  target: "Adjust to your comfort level \u2014 you can change this anytime.",
  'your-plan': "Built from everything you shared \u2014 and easy to adjust as you go.",
};
