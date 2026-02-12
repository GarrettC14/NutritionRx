import React, { ReactNode } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Provider that initializes network monitoring.
 * Mount once near the app root, inside ThemeProvider.
 *
 * This is intentionally thin — all state lives in the Zustand networkStore.
 * The provider just ensures the NetInfo subscription is active.
 */
export function NetworkProvider({ children }: { children: ReactNode }) {
  useNetworkStatus();
  return <>{children}</>;
}
