/**
 * useNetworkStatus Hook Tests
 *
 * Tests for the hook that subscribes to NetInfo and keeps the
 * network store connectivity state in sync.
 */

import { renderHook } from '@testing-library/react-native';

// ---- Mocks ----

// Capture the NetInfo listener callback so we can invoke it in tests
let capturedListener: ((state: any) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((callback: (state: any) => void) => {
      capturedListener = callback;
      return mockUnsubscribe;
    }),
  },
}));

const mockSetConnectivity = jest.fn();

jest.mock('@/stores/networkStore', () => ({
  useNetworkStore: jest.fn((selector: (s: any) => any) =>
    selector({ setConnectivity: mockSetConnectivity })
  ),
}));

// Import after mocks are defined
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedListener = null;
  });

  // ============================================================
  // Subscription lifecycle
  // ============================================================

  describe('subscription lifecycle', () => {
    it('subscribes to NetInfo on mount', () => {
      renderHook(() => useNetworkStatus());

      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
      expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('unsubscribes from NetInfo on unmount', () => {
      const { unmount } = renderHook(() => useNetworkStatus());

      expect(mockUnsubscribe).not.toHaveBeenCalled();
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Connectivity mapping
  // ============================================================

  describe('connectivity state mapping', () => {
    it('sets "online" when isConnected=true and isInternetReachable=true', () => {
      renderHook(() => useNetworkStatus());

      capturedListener!({ isConnected: true, isInternetReachable: true });

      expect(mockSetConnectivity).toHaveBeenCalledWith('online');
    });

    it('sets "online" when isConnected=true and isInternetReachable=null (not false)', () => {
      renderHook(() => useNetworkStatus());

      capturedListener!({ isConnected: true, isInternetReachable: null });

      expect(mockSetConnectivity).toHaveBeenCalledWith('online');
    });

    it('sets "offline" when isConnected=false', () => {
      renderHook(() => useNetworkStatus());

      capturedListener!({ isConnected: false, isInternetReachable: false });

      expect(mockSetConnectivity).toHaveBeenCalledWith('offline');
    });

    it('sets "unknown" when isConnected=null', () => {
      renderHook(() => useNetworkStatus());

      capturedListener!({ isConnected: null, isInternetReachable: null });

      expect(mockSetConnectivity).toHaveBeenCalledWith('unknown');
    });

    it('sets "unknown" when isConnected=true but isInternetReachable=false', () => {
      renderHook(() => useNetworkStatus());

      capturedListener!({ isConnected: true, isInternetReachable: false });

      expect(mockSetConnectivity).toHaveBeenCalledWith('unknown');
    });
  });

  // ============================================================
  // Multiple state changes
  // ============================================================

  describe('multiple state changes', () => {
    it('calls setConnectivity for each NetInfo event', () => {
      renderHook(() => useNetworkStatus());

      capturedListener!({ isConnected: true, isInternetReachable: true });
      capturedListener!({ isConnected: false, isInternetReachable: false });
      capturedListener!({ isConnected: true, isInternetReachable: null });

      expect(mockSetConnectivity).toHaveBeenCalledTimes(3);
      expect(mockSetConnectivity).toHaveBeenNthCalledWith(1, 'online');
      expect(mockSetConnectivity).toHaveBeenNthCalledWith(2, 'offline');
      expect(mockSetConnectivity).toHaveBeenNthCalledWith(3, 'online');
    });
  });
});
