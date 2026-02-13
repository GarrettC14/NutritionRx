/**
 * Returns the ordered list of onboarding screen names based on goal selection.
 * "target" step is only included for "lose" or "gain" goals.
 */
export function getScreenOrder(goalPath: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...base, 'target', 'your-plan']; // 8 steps
  }
  return [...base, 'your-plan']; // 7 steps
}

/**
 * All possible onboarding screen names, used for route validation.
 */
export const ALL_ONBOARDING_SCREENS = [
  'goal', 'about-you', 'body-stats', 'activity',
  'eating-style', 'protein', 'target', 'your-plan',
] as const;

export type OnboardingScreenName = typeof ALL_ONBOARDING_SCREENS[number];
