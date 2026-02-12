import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '@/stores/networkStore';
import type { ConnectivityState } from '@/types/network';

/**
 * Subscribes to NetInfo and keeps the network store in sync.
 * Mount once at app root (inside NetworkProvider).
 */
export function useNetworkStatus() {
  const setConnectivity = useNetworkStore((s) => s.setConnectivity);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      let connectivity: ConnectivityState = 'unknown';

      if (state.isConnected === true && state.isInternetReachable !== false) {
        connectivity = 'online';
      } else if (state.isConnected === false) {
        connectivity = 'offline';
      }
      // isConnected === true but isInternetReachable === null → 'unknown'
      // isConnected === null → 'unknown'

      setConnectivity(connectivity);
    });

    return unsubscribe;
  }, [setConnectivity]);
}
