/**
 * useWearOS Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWearOS } from '@/hooks/useWearOS';

// Mock the wear OS service
jest.mock('@/services/wearOS', () => ({
  isWearOSAvailable: jest.fn().mockReturnValue(true),
  initWearSync: jest.fn().mockResolvedValue(true),
  cleanupWearSync: jest.fn(),
  checkWatchConnection: jest.fn().mockResolvedValue(true),
  getConnectedWatch: jest.fn().mockResolvedValue({
    isConnected: true,
    nodeId: 'node-1',
    nodeName: 'Pixel Watch',
  }),
  syncToWatch: jest.fn().mockResolvedValue(true),
}));

import {
  isWearOSAvailable,
  initWearSync,
  cleanupWearSync,
  getConnectedWatch,
  syncToWatch,
} from '@/services/wearOS';

describe('useWearOS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes Wear OS on mount', async () => {
    const { result } = renderHook(() => useWearOS());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(initWearSync).toHaveBeenCalled();
  });

  it('checks watch connection after initialization', async () => {
    const { result } = renderHook(() => useWearOS());

    await waitFor(() => {
      expect(result.current.connection.isConnected).toBe(true);
    });

    expect(getConnectedWatch).toHaveBeenCalled();
  });

  it('cleans up on unmount', async () => {
    const { unmount } = renderHook(() => useWearOS());

    await waitFor(() => {
      expect(initWearSync).toHaveBeenCalled();
    });

    unmount();

    expect(cleanupWearSync).toHaveBeenCalled();
  });

  it('syncs data to watch', async () => {
    const { result } = renderHook(() => useWearOS());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    let syncResult: boolean = false;
    await act(async () => {
      syncResult = await result.current.sync();
    });

    expect(syncResult).toBe(true);
    expect(result.current.syncStatus).toBe('success');
    expect(syncToWatch).toHaveBeenCalled();
  });

  it('handles sync failure', async () => {
    (syncToWatch as jest.Mock).mockResolvedValueOnce(false);

    const { result } = renderHook(() => useWearOS());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.syncStatus).toBe('error');
  });

  it('checks connection manually', async () => {
    const { result } = renderHook(() => useWearOS());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    let isConnected: boolean = false;
    await act(async () => {
      isConnected = await result.current.checkConnection();
    });

    expect(isConnected).toBe(true);
  });

  describe('when Wear OS is not available', () => {
    beforeEach(() => {
      (isWearOSAvailable as jest.Mock).mockReturnValue(false);
    });

    afterEach(() => {
      (isWearOSAvailable as jest.Mock).mockReturnValue(true);
    });

    it('does not initialize', async () => {
      jest.clearAllMocks();
      const { result } = renderHook(() => useWearOS());

      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.isAvailable).toBe(false);
      expect(initWearSync).not.toHaveBeenCalled();
    });
  });
});
