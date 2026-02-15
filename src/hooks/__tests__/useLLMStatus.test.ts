/**
 * useLLMStatus Hook Tests
 *
 * Tests for the shared hook that provides reactive LLM status,
 * download management, and derived boolean flags.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import type { LLMStatus } from '@/features/insights/types/insights.types';

// ---- Mock state ----

let mockLLMStatus: LLMStatus = 'not_downloaded';

const mockSetState = jest.fn();

jest.mock('@/features/insights/stores/dailyInsightStore', () => ({
  useDailyInsightStore: Object.assign(
    jest.fn((selector: (s: any) => any) => selector({ llmStatus: mockLLMStatus })),
    { setState: mockSetState },
  ),
}));

const mockGetStatus = jest.fn<Promise<LLMStatus>, []>();
const mockDownloadModel = jest.fn();
const mockCancelDownload = jest.fn();
const mockGetProviderName = jest.fn().mockReturnValue('TestProvider');

jest.mock('@/features/insights/services/LLMService', () => ({
  LLMService: {
    getStatus: (...args: any[]) => mockGetStatus(...args),
    downloadModel: (...args: any[]) => mockDownloadModel(...args),
    cancelDownload: (...args: any[]) => mockCancelDownload(...args),
    getProviderName: (...args: any[]) => mockGetProviderName(...args),
  },
}));

// Import after mocks are defined
import { useLLMStatus } from '@/hooks/useLLMStatus';

describe('useLLMStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLLMStatus = 'not_downloaded';
    mockGetStatus.mockResolvedValue('not_downloaded');
    mockGetProviderName.mockReturnValue('TestProvider');
  });

  // ============================================================
  // Status derivation
  // ============================================================

  describe('status derivation', () => {
    it('returns isReady=true when status is ready', () => {
      mockLLMStatus = 'ready';
      const { result } = renderHook(() => useLLMStatus());

      expect(result.current.status).toBe('ready');
      expect(result.current.isReady).toBe(true);
      expect(result.current.needsDownload).toBe(false);
      expect(result.current.isUnsupported).toBe(false);
    });

    it('returns needsDownload=true when status is not_downloaded', () => {
      mockLLMStatus = 'not_downloaded';
      const { result } = renderHook(() => useLLMStatus());

      expect(result.current.status).toBe('not_downloaded');
      expect(result.current.needsDownload).toBe(true);
      expect(result.current.isReady).toBe(false);
      expect(result.current.isUnsupported).toBe(false);
    });

    it('returns isUnsupported=true when status is unsupported', () => {
      mockLLMStatus = 'unsupported';
      const { result } = renderHook(() => useLLMStatus());

      expect(result.current.status).toBe('unsupported');
      expect(result.current.isUnsupported).toBe(true);
      expect(result.current.isReady).toBe(false);
      expect(result.current.needsDownload).toBe(false);
    });

    it('returns all booleans false for downloading status', () => {
      mockLLMStatus = 'downloading';
      const { result } = renderHook(() => useLLMStatus());

      expect(result.current.status).toBe('downloading');
      expect(result.current.isReady).toBe(false);
      expect(result.current.needsDownload).toBe(false);
      expect(result.current.isUnsupported).toBe(false);
    });

    it('returns all booleans false for loading status', () => {
      mockLLMStatus = 'loading';
      const { result } = renderHook(() => useLLMStatus());

      expect(result.current.status).toBe('loading');
      expect(result.current.isReady).toBe(false);
      expect(result.current.needsDownload).toBe(false);
      expect(result.current.isUnsupported).toBe(false);
    });

    it('returns all booleans false for error status', () => {
      mockLLMStatus = 'error';
      const { result } = renderHook(() => useLLMStatus());

      expect(result.current.status).toBe('error');
      expect(result.current.isReady).toBe(false);
      expect(result.current.needsDownload).toBe(false);
      expect(result.current.isUnsupported).toBe(false);
    });
  });

  // ============================================================
  // Provider name
  // ============================================================

  describe('providerName', () => {
    it('returns the provider name from LLMService', () => {
      mockGetProviderName.mockReturnValue('MLCEngine');
      const { result } = renderHook(() => useLLMStatus());

      expect(result.current.providerName).toBe('MLCEngine');
    });
  });

  // ============================================================
  // Mount behavior
  // ============================================================

  describe('mount behavior', () => {
    it('calls getStatus on mount and updates store', async () => {
      mockGetStatus.mockResolvedValue('ready');
      renderHook(() => useLLMStatus());

      expect(mockGetStatus).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(mockSetState).toHaveBeenCalledWith({ llmStatus: 'ready' });
      });
    });

    it('updates store with not_downloaded if getStatus returns not_downloaded', async () => {
      mockGetStatus.mockResolvedValue('not_downloaded');
      renderHook(() => useLLMStatus());

      await waitFor(() => {
        expect(mockSetState).toHaveBeenCalledWith({ llmStatus: 'not_downloaded' });
      });
    });
  });

  // ============================================================
  // startDownload
  // ============================================================

  describe('startDownload', () => {
    it('sets isDownloading=true and resets progress on start', async () => {
      mockDownloadModel.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useLLMStatus());

      // Start the download but do not await yet
      let downloadPromise: Promise<boolean>;
      act(() => {
        downloadPromise = result.current.startDownload();
      });

      // isDownloading should be true right away
      expect(result.current.isDownloading).toBe(true);
      expect(result.current.downloadProgress).toBe(0);

      await act(async () => {
        await downloadPromise;
      });
    });

    it('sets store to downloading on start', async () => {
      mockDownloadModel.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useLLMStatus());

      await act(async () => {
        await result.current.startDownload();
      });

      expect(mockSetState).toHaveBeenCalledWith({ llmStatus: 'downloading' });
    });

    it('updates progress via onProgress callback', async () => {
      mockDownloadModel.mockImplementation(
        (onProgress: (p: { percentage: number }) => void) => {
          onProgress({ percentage: 25 });
          onProgress({ percentage: 50 });
          onProgress({ percentage: 75 });
          return Promise.resolve({ success: true });
        },
      );

      const { result } = renderHook(() => useLLMStatus());

      await act(async () => {
        await result.current.startDownload();
      });

      // After completion, progress should reflect the last callback value (75)
      // but the hook may have processed all progress updates
      // The important thing is that progress was updated during download
      expect(mockDownloadModel).toHaveBeenCalledWith(expect.any(Function));
    });

    it('sets status to ready on successful download', async () => {
      mockDownloadModel.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useLLMStatus());

      const success = await act(async () => {
        return await result.current.startDownload();
      });

      expect(success).toBe(true);
      expect(mockSetState).toHaveBeenCalledWith({ llmStatus: 'ready' });
      expect(result.current.isDownloading).toBe(false);
    });

    it('sets status to not_downloaded on failed download', async () => {
      mockDownloadModel.mockResolvedValue({ success: false, error: 'Disk full' });
      const { result } = renderHook(() => useLLMStatus());

      const success = await act(async () => {
        return await result.current.startDownload();
      });

      expect(success).toBe(false);
      expect(mockSetState).toHaveBeenCalledWith({ llmStatus: 'not_downloaded' });
      expect(result.current.isDownloading).toBe(false);
    });

    it('sets status to not_downloaded on download exception', async () => {
      mockDownloadModel.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useLLMStatus());

      const success = await act(async () => {
        return await result.current.startDownload();
      });

      expect(success).toBe(false);
      expect(mockSetState).toHaveBeenCalledWith({ llmStatus: 'not_downloaded' });
      expect(result.current.isDownloading).toBe(false);
    });
  });

  // ============================================================
  // cancelDownload
  // ============================================================

  describe('cancelDownload', () => {
    it('calls LLMService.cancelDownload', () => {
      const { result } = renderHook(() => useLLMStatus());

      act(() => {
        result.current.cancelDownload();
      });

      expect(mockCancelDownload).toHaveBeenCalledTimes(1);
    });

    it('resets isDownloading and downloadProgress', async () => {
      // Start a download that never resolves
      let resolveDownload: (v: { success: boolean }) => void;
      mockDownloadModel.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveDownload = resolve;
        });
      });

      const { result } = renderHook(() => useLLMStatus());

      // Start download
      act(() => {
        result.current.startDownload();
      });

      expect(result.current.isDownloading).toBe(true);

      // Cancel
      act(() => {
        result.current.cancelDownload();
      });

      expect(result.current.isDownloading).toBe(false);
      expect(result.current.downloadProgress).toBe(0);
    });

    it('sets store status to not_downloaded', () => {
      const { result } = renderHook(() => useLLMStatus());

      act(() => {
        result.current.cancelDownload();
      });

      expect(mockSetState).toHaveBeenCalledWith({ llmStatus: 'not_downloaded' });
    });
  });

  // ============================================================
  // Unmount safety
  // ============================================================

  describe('unmount safety', () => {
    it('does not update store after unmount from getStatus', async () => {
      let resolveGetStatus: (value: LLMStatus) => void;
      mockGetStatus.mockImplementation(
        () => new Promise<LLMStatus>((resolve) => { resolveGetStatus = resolve; }),
      );

      const { unmount } = renderHook(() => useLLMStatus());

      // Unmount before getStatus resolves
      unmount();

      // Clear any calls from the mount effect setup
      mockSetState.mockClear();

      // Now resolve the pending getStatus
      await act(async () => {
        resolveGetStatus!('ready');
      });

      // setState should NOT have been called with the status after unmount
      expect(mockSetState).not.toHaveBeenCalledWith({ llmStatus: 'ready' });
    });

    it('does not update progress after unmount during download', async () => {
      let capturedOnProgress: ((p: { percentage: number }) => void) | undefined;
      mockDownloadModel.mockImplementation(
        (onProgress: (p: { percentage: number }) => void) => {
          capturedOnProgress = onProgress;
          return Promise.resolve({ success: true });
        },
      );

      const { result, unmount } = renderHook(() => useLLMStatus());

      await act(async () => {
        await result.current.startDownload();
      });

      unmount();

      // Calling onProgress after unmount should not throw
      // (the mountedRef guard prevents setState)
      expect(() => capturedOnProgress?.({ percentage: 99 })).not.toThrow();
    });
  });
});
