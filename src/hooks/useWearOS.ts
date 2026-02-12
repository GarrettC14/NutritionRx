/**
 * useWearOS Hook
 * React hook for Wear OS connectivity and sync
 */
// TODO [POST_LAUNCH_WEAR]: Enable after native modules implemented and schema bugs fixed

import { useEffect, useState, useCallback } from 'react';
import {
  isWearOSAvailable,
  initWearSync,
  cleanupWearSync,
  checkWatchConnection,
  getConnectedWatch,
  syncToWatch,
  WearConnectionState,
  WearSyncStatus,
} from '@/services/wearOS';

/**
 * Hook for managing Wear OS connectivity
 */
export function useWearOS() {
  const [isAvailable] = useState(isWearOSAvailable());
  const [isInitialized, setIsInitialized] = useState(false);
  const [connection, setConnection] = useState<WearConnectionState>({ isConnected: false });
  const [syncStatus, setSyncStatus] = useState<WearSyncStatus>('idle');

  // Initialize on mount
  useEffect(() => {
    if (!isAvailable) return;

    const init = async () => {
      const success = await initWearSync();
      setIsInitialized(success);

      if (success) {
        const conn = await getConnectedWatch();
        setConnection(conn);
      }
    };

    init();

    return () => {
      cleanupWearSync();
    };
  }, [isAvailable]);

  // Sync function
  const sync = useCallback(async () => {
    if (!isInitialized) return false;

    setSyncStatus('syncing');
    try {
      const success = await syncToWatch();
      setSyncStatus(success ? 'success' : 'error');
      return success;
    } catch (error) {
      setSyncStatus('error');
      return false;
    }
  }, [isInitialized]);

  // Check connection
  const checkConnection = useCallback(async () => {
    if (!isAvailable) {
      setConnection({ isConnected: false });
      return false;
    }

    const conn = await getConnectedWatch();
    setConnection(conn);
    return conn.isConnected;
  }, [isAvailable]);

  return {
    isAvailable,
    isInitialized,
    connection,
    syncStatus,
    sync,
    checkConnection,
  };
}

/**
 * Hook for triggering sync after store updates
 * Use this in stores to automatically sync changes to watch
 */
export function useWearSyncTrigger() {
  const { isInitialized, sync } = useWearOS();

  const triggerSync = useCallback(() => {
    if (isInitialized) {
      // Debounce sync calls
      const timeoutId = setTimeout(() => {
        sync();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized, sync]);

  return { triggerSync };
}
