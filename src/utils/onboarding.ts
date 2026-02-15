/**
 * Returns the ordered list of onboarding screen names based on goal selection
 * and experience level. Beginners skip eating-style and protein screens.
 * "target" step is only included for "lose" or "gain" goals.
 */
export function getScreenOrder(goalPath: string | null, experienceLevel?: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'experience'];

  // Beginners skip eating-style and protein — auto-configured as flexible/active
  if (experienceLevel === 'beginner') {
    if (goalPath === 'lose' || goalPath === 'gain') {
      return [...base, 'target', 'your-plan'];
    }
    return [...base, 'your-plan'];
  }

  // Intermediate/advanced get the full flow
  const full = [...base, 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...full, 'target', 'your-plan'];
  }
  return [...full, 'your-plan'];
}

/**
 * Returns the next screen in the onboarding flow given the current screen,
 * goal path, and experience level. Returns null if at the end.
 */
export function getNextStep(
  currentScreen: string,
  goalPath: string | null,
  experienceLevel?: string | null,
): string | null {
  const order = getScreenOrder(goalPath, experienceLevel);
  const index = order.indexOf(currentScreen);
  if (index === -1 || index >= order.length - 1) return null;
  return order[index + 1];
}

/**
 * All possible onboarding screen names, used for route validation.
 */
export const ALL_ONBOARDING_SCREENS = [
  'goal', 'about-you', 'body-stats', 'activity', 'experience',
  'eating-style', 'protein', 'target', 'your-plan',
] as const;

export type OnboardingScreenName = typeof ALL_ONBOARDING_SCREENS[number];
