import { useSegments, usePathname } from 'expo-router';
import { useOnboardingStore } from '@/stores';
import { getScreenOrder, ALL_ONBOARDING_SCREENS, type OnboardingScreenName } from '@/utils/onboarding';

interface OnboardingStepInfo {
  currentScreen: OnboardingScreenName | null;
  currentStep: number;   // 1-indexed (0 if unknown)
  totalSteps: number;
  progress: number;       // 0 to 1
}

export function useOnboardingStep(): OnboardingStepInfo {
  const segments = useSegments();
  const pathname = usePathname();
  const draft = useOnboardingStore((s) => s.draft);

  // Extract current screen — try useSegments() first, fall back to usePathname()
  const lastSegment = segments[segments.length - 1] || '';
  let currentScreen: OnboardingScreenName | null = null;

  if ((ALL_ONBOARDING_SCREENS as readonly string[]).includes(lastSegment)) {
    currentScreen = lastSegment as OnboardingScreenName;
  } else {
    const lastPart = pathname.split('/').filter(Boolean).pop() || '';
    if ((ALL_ONBOARDING_SCREENS as readonly string[]).includes(lastPart)) {
      currentScreen = lastPart as OnboardingScreenName;
    }
  }

  if (!currentScreen) {
    return { currentScreen: null, currentStep: 0, totalSteps: 0, progress: 0 };
  }

  // INTENTIONAL UX BEHAVIOR — not a technical fallback.
  //
  // On goal.tsx (step 1), draft.goalPath is null because the user's selection
  // is held in local state until they tap Continue. We default to 8 steps
  // (the "lose"/"gain" path) rather than 7 ("maintain"):
  //   - 1/8 = 12.5% vs 1/7 = 14.3% — a ~0.6px difference at 16px padding.
  //     Visually imperceptible at 3px bar height.
  //   - Defaulting to the LONGER path means the bar shows LESS fill on step 1.
  //     If user picks "maintain" (7 steps), step 2 jumps to 2/7 = 28.6% —
  //     a satisfying forward leap. The reverse would cause step 2 to show
  //     LESS fill than step 1, reading as backwards progress.
  //   - This is stable: once the user taps Continue on goal.tsx,
  //     draft.goalPath is committed and all subsequent steps use the real value.
  const effectiveGoalPath =
    currentScreen === 'goal' && !draft?.goalPath
      ? 'lose'
      : (draft?.goalPath ?? null);

  const screenOrder = getScreenOrder(effectiveGoalPath, draft?.experienceLevel);
  const index = screenOrder.indexOf(currentScreen);

  if (index === -1) {
    return { currentScreen, currentStep: 0, totalSteps: screenOrder.length, progress: 0 };
  }

  const currentStep = index + 1;
  const totalSteps = screenOrder.length;

  return {
    currentScreen,
    currentStep,
    totalSteps,
    progress: currentStep / totalSteps,
  };
}
