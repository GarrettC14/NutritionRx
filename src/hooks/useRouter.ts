/**
 * Guarded useRouter hook — drop-in replacement for expo-router's useRouter.
 *
 * Prevents double-navigation when the user taps a button twice quickly.
 * Uses a module-level timestamp so the guard is shared across ALL mounted
 * components (if component A navigates, component B can't also navigate
 * within the cooldown window).
 */

import { useRouter as useExpoRouter } from 'expo-router';
import { useMemo } from 'react';

let lastNavTime = 0;
const NAVIGATION_COOLDOWN_MS = 500;

function shouldAllow(): boolean {
  const now = Date.now();
  if (now - lastNavTime < NAVIGATION_COOLDOWN_MS) {
    return false;
  }
  lastNavTime = now;
  return true;
}

export function useRouter() {
  const router = useExpoRouter();

  return useMemo(() => {
    const push: typeof router.push = (...args) => {
      if (!shouldAllow()) return;
      return router.push(...args);
    };

    const replace: typeof router.replace = (...args) => {
      if (!shouldAllow()) return;
      return router.replace(...args);
    };

    const navigate: typeof router.navigate = (...args) => {
      if (!shouldAllow()) return;
      return router.navigate(...args);
    };

    return { ...router, push, replace, navigate };
  }, [router]);
}
