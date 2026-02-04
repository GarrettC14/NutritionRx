/**
 * Insights Store Tests (LLM Status integration)
 * Validates the store works with the new discriminated union LLMStatus type.
 */

import { useInsightsStore } from '@/features/insights/stores/insightsStore';
import type { LLMStatus } from '@/services/llm/types';
import type { Insight } from '@/features/insights/types/insights.types';

// Reset store state between tests
beforeEach(() => {
  useInsightsStore.setState({
    cachedInsights: null,
    llmStatus: null,
    downloadProgress: null,
    isGenerating: false,
    lastGenerationTime: null,
    generationError: null,
  });
});

describe('insightsStore - LLMStatus', () => {
  describe('initial state', () => {
    it('starts with llmStatus as null', () => {
      expect(useInsightsStore.getState().llmStatus).toBeNull();
    });

    it('starts with downloadProgress as null', () => {
      expect(useInsightsStore.getState().downloadProgress).toBeNull();
    });

    it('starts with no cached insights', () => {
      expect(useInsightsStore.getState().cachedInsights).toBeNull();
    });
  });

  describe('setLLMStatus', () => {
    it('sets ready status with provider name', () => {
      const status: LLMStatus = { ready: true, provider: 'llama-standard' };
      useInsightsStore.getState().setLLMStatus(status);

      const current = useInsightsStore.getState().llmStatus;
      expect(current).not.toBeNull();
      expect(current!.ready).toBe(true);
      if (current!.ready) {
        expect(current!.provider).toBe('llama-standard');
      }
    });

    it('sets model-download-required status', () => {
      const status: LLMStatus = {
        ready: false,
        reason: 'model-download-required',
        downloadSizeMB: 1020,
        modelName: 'SmolLM2 1.7B',
      };
      useInsightsStore.getState().setLLMStatus(status);

      const current = useInsightsStore.getState().llmStatus;
      expect(current).not.toBeNull();
      expect(current!.ready).toBe(false);
      if (!current!.ready && current!.reason === 'model-download-required') {
        expect(current!.downloadSizeMB).toBe(1020);
        expect(current!.modelName).toBe('SmolLM2 1.7B');
      }
    });

    it('sets unsupported status', () => {
      const status: LLMStatus = {
        ready: false,
        reason: 'unsupported',
        message: 'Device too weak',
      };
      useInsightsStore.getState().setLLMStatus(status);

      const current = useInsightsStore.getState().llmStatus;
      expect(current).not.toBeNull();
      expect(current!.ready).toBe(false);
      if (!current!.ready && current!.reason === 'unsupported') {
        expect(current!.message).toBe('Device too weak');
      }
    });

    it('sets apple-foundation ready status', () => {
      const status: LLMStatus = {
        ready: true,
        provider: 'apple-foundation',
      };
      useInsightsStore.getState().setLLMStatus(status);

      const current = useInsightsStore.getState().llmStatus;
      expect(current!.ready).toBe(true);
      if (current!.ready) {
        expect(current!.provider).toBe('apple-foundation');
      }
    });
  });

  describe('setDownloadProgress', () => {
    it('stores fractional progress (0-1)', () => {
      useInsightsStore.getState().setDownloadProgress(0.5);
      expect(useInsightsStore.getState().downloadProgress).toBe(0.5);
    });

    it('stores zero progress', () => {
      useInsightsStore.getState().setDownloadProgress(0);
      expect(useInsightsStore.getState().downloadProgress).toBe(0);
    });

    it('stores complete progress', () => {
      useInsightsStore.getState().setDownloadProgress(1);
      expect(useInsightsStore.getState().downloadProgress).toBe(1);
    });

    it('clears progress with null', () => {
      useInsightsStore.getState().setDownloadProgress(0.7);
      useInsightsStore.getState().setDownloadProgress(null);
      expect(useInsightsStore.getState().downloadProgress).toBeNull();
    });
  });

  describe('setInsights', () => {
    const mockInsights: Insight[] = [
      {
        id: '1',
        type: 'observation',
        title: 'Test Insight',
        body: 'Test body',
        category: 'nutrition',
      } as Insight,
    ];

    it('stores insights with source "llm"', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      const cached = useInsightsStore.getState().cachedInsights;
      expect(cached).not.toBeNull();
      expect(cached!.insights).toEqual(mockInsights);
      expect(cached!.source).toBe('llm');
    });

    it('sets generatedAt and validUntil timestamps', () => {
      const before = Date.now();
      useInsightsStore.getState().setInsights(mockInsights, 'llm');
      const after = Date.now();

      const cached = useInsightsStore.getState().cachedInsights!;
      expect(cached.generatedAt).toBeGreaterThanOrEqual(before);
      expect(cached.generatedAt).toBeLessThanOrEqual(after);
      // 4 hour cache
      expect(cached.validUntil).toBe(cached.generatedAt + 4 * 60 * 60 * 1000);
    });

    it('clears generation error and isGenerating', () => {
      useInsightsStore.getState().setGenerationError('Previous error');
      useInsightsStore.getState().setIsGenerating(true);

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      expect(useInsightsStore.getState().generationError).toBeNull();
      expect(useInsightsStore.getState().isGenerating).toBe(false);
    });

    it('sets today date string', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'llm');
      const cached = useInsightsStore.getState().cachedInsights!;
      const today = new Date().toISOString().split('T')[0];
      expect(cached.date).toBe(today);
    });
  });

  describe('shouldRegenerateInsights', () => {
    const mockInsights: Insight[] = [
      {
        id: '1',
        type: 'observation',
        title: 'Test',
        body: 'Body',
        category: 'nutrition',
      } as Insight,
    ];

    it('returns true when no cached insights', () => {
      expect(
        useInsightsStore.getState().shouldRegenerateInsights(),
      ).toBe(true);
    });

    it('returns false when insights were just generated', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'llm');
      expect(
        useInsightsStore.getState().shouldRegenerateInsights(),
      ).toBe(false);
    });

    it('returns true when cache has expired', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      // Manually expire the cache
      const cached = useInsightsStore.getState().cachedInsights!;
      useInsightsStore.setState({
        cachedInsights: {
          ...cached,
          validUntil: Date.now() - 1000,
        },
      });

      expect(
        useInsightsStore.getState().shouldRegenerateInsights(),
      ).toBe(true);
    });

    it('returns true when date has changed', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      // Set cache date to yesterday
      const cached = useInsightsStore.getState().cachedInsights!;
      useInsightsStore.setState({
        cachedInsights: {
          ...cached,
          date: '2020-01-01',
        },
      });

      expect(
        useInsightsStore.getState().shouldRegenerateInsights(),
      ).toBe(true);
    });
  });

  describe('generation state', () => {
    it('setIsGenerating updates state', () => {
      useInsightsStore.getState().setIsGenerating(true);
      expect(useInsightsStore.getState().isGenerating).toBe(true);

      useInsightsStore.getState().setIsGenerating(false);
      expect(useInsightsStore.getState().isGenerating).toBe(false);
    });

    it('setGenerationError sets error and clears isGenerating', () => {
      useInsightsStore.getState().setIsGenerating(true);
      useInsightsStore.getState().setGenerationError('Something failed');

      expect(useInsightsStore.getState().generationError).toBe('Something failed');
      expect(useInsightsStore.getState().isGenerating).toBe(false);
    });

    it('clearInsights removes cached insights', () => {
      useInsightsStore.getState().setInsights(
        [{ id: '1', type: 'observation', title: 'T', body: 'B', category: 'nutrition' } as Insight],
        'llm',
      );
      expect(useInsightsStore.getState().cachedInsights).not.toBeNull();

      useInsightsStore.getState().clearInsights();
      expect(useInsightsStore.getState().cachedInsights).toBeNull();
    });
  });
});
