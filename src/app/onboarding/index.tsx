import { useEffect } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { useOnboardingStore } from '@/stores';

// ─── Screen order logic ──────────────────────────────────────────

function getScreenOrder(goalPath: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...base, 'target', 'your-plan'];
  }
  return [...base, 'your-plan'];
}

// ─── Component ───────────────────────────────────────────────────

export default function OnboardingIndex() {
  const router = useRouter();
  const { isComplete, draft } = useOnboardingStore();

  useEffect(() => {
    // Already completed onboarding — go to dashboard
    if (isComplete) {
      router.replace('/');
      return;
    }

    // Resuming a partially-completed flow
    if (draft.lastCompletedScreen) {
      const order = getScreenOrder(draft.goalPath);
      const lastIndex = order.indexOf(draft.lastCompletedScreen);
      const nextScreen = order[lastIndex + 1];
      if (nextScreen) {
        router.replace(`/onboarding/${nextScreen}` as any);
        return;
      }
    }

    // Default: start at goal screen
    router.replace('/onboarding/goal');
  }, []);

  return null;
}
