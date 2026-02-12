import { useCallback } from 'react';
import { useNetworkStore } from '@/stores/networkStore';
import type { ServiceId } from '@/types/network';

interface NetworkGuardOptions {
  /** Which service this action depends on (optional — defaults to general connectivity check) */
  service?: ServiceId;
}

interface NetworkGuardResult {
  /** Whether the network action can proceed */
  isOnline: boolean;
  /** Whether the relevant service is healthy */
  isServiceHealthy: boolean;
  /**
   * Wraps an async action with a network check.
   * Returns the action result, or null if offline/unhealthy.
   * Calls onOffline if provided and the check fails.
   */
  guardedAction: <T>(
    action: () => Promise<T>,
    onOffline?: () => void
  ) => Promise<T | null>;
}

/**
 * Hook for action-level network checks.
 * Use before API calls to prevent wasted attempts when offline.
 *
 * @example
 * const { guardedAction } = useNetworkGuard({ service: 'ai' });
 * const result = await guardedAction(
 *   () => analyzePhoto(image),
 *   () => showToast('No internet connection')
 * );
 */
export function useNetworkGuard(options?: NetworkGuardOptions): NetworkGuardResult {
  const connectivity = useNetworkStore((s) => s.connectivity);
  const serviceHealth = useNetworkStore((s) => s.serviceHealth);

  const isOnline = connectivity === 'online';
  const isServiceHealthy = options?.service
    ? serviceHealth[options.service].health !== 'down'
    : true;

  const guardedAction = useCallback(
    async <T>(
      action: () => Promise<T>,
      onOffline?: () => void
    ): Promise<T | null> => {
      if (!isOnline || !isServiceHealthy) {
        onOffline?.();
        return null;
      }
      return action();
    },
    [isOnline, isServiceHealthy]
  );

  return { isOnline, isServiceHealthy, guardedAction };
}
