/**
 * useLLMStatus Hook
 * Shared hook for reactive LLM status across widgets, screens, and settings.
 * Centralizes the pattern of checking LLMService.getStatus() and managing downloads.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LLMService } from '@/features/insights/services/LLMService';
import { useDailyInsightStore } from '@/features/insights/stores/dailyInsightStore';
import type { LLMStatus } from '@/features/insights/types/insights.types';

interface UseLLMStatusReturn {
  status: LLMStatus;
  isReady: boolean;
  needsDownload: boolean;
  isUnsupported: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  providerName: string;
  startDownload: () => Promise<boolean>;
  cancelDownload: () => void;
}

export function useLLMStatus(): UseLLMStatusReturn {
  const llmStatus = useDailyInsightStore((s) => s.llmStatus);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const mountedRef = useRef(true);

  // Check status on mount
  useEffect(() => {
    mountedRef.current = true;
    LLMService.getStatus().then((status) => {
      if (mountedRef.current) {
        useDailyInsightStore.setState({ llmStatus: status });
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startDownload = useCallback(async (): Promise<boolean> => {
    setIsDownloading(true);
    setDownloadProgress(0);
    useDailyInsightStore.setState({ llmStatus: 'downloading' });

    try {
      const result = await LLMService.downloadModel((progress) => {
        if (mountedRef.current) {
          setDownloadProgress(progress.percentage);
        }
      });

      if (mountedRef.current) {
        if (result.success) {
          useDailyInsightStore.setState({ llmStatus: 'ready' });
        } else {
          useDailyInsightStore.setState({ llmStatus: 'not_downloaded' });
        }
        setIsDownloading(false);
      }

      return result.success;
    } catch {
      if (mountedRef.current) {
        useDailyInsightStore.setState({ llmStatus: 'not_downloaded' });
        setIsDownloading(false);
      }
      return false;
    }
  }, []);

  const cancelDownload = useCallback(() => {
    LLMService.cancelDownload();
    setIsDownloading(false);
    setDownloadProgress(0);
    useDailyInsightStore.setState({ llmStatus: 'not_downloaded' });
  }, []);

  return {
    status: llmStatus,
    isReady: llmStatus === 'ready',
    needsDownload: llmStatus === 'not_downloaded',
    isUnsupported: llmStatus === 'unsupported',
    isDownloading,
    downloadProgress,
    providerName: LLMService.getProviderName(),
    startDownload,
    cancelDownload,
  };
}
