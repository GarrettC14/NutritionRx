/**
 * Insights Store Tests
 * Tests the Zustand persist store for cached insights and LLM state
 */

import { useInsightsStore } from '../stores/insightsStore';
import type { Insight, LLMDownloadProgress } from '../types/insights.types';

// Override the global AsyncStorage mock from jest.setup.js with one that
// provides a default export (required by zustand/middleware persist + createJSONStorage).
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => Promise.resolve()),
    },
  };
});

const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours — matches store constant

const mockInsights: Insight[] = [
  { category: 'protein', text: 'You hit your protein target today!' },
  { category: 'hydration', text: 'Drink more water in the afternoon.' },
];

/**
 * Helper: build the initial/default state values for assertions.
 */
const defaultState = {
  cachedInsights: null,
  llmStatus: 'not_downloaded' as const,
  downloadProgress: null,
  isGenerating: false,
  lastGenerationTime: null,
  generationError: null,
  llmEnabled: true,
};

describe('useInsightsStore', () => {
  beforeEach(() => {
    // Reset the store to defaults between every test
    useInsightsStore.setState({
      ...defaultState,
    });
    jest.useRealTimers();
  });

  // ===========================================================================
  // Initial state
  // ===========================================================================

  describe('initial state', () => {
    it('has null cachedInsights', () => {
      expect(useInsightsStore.getState().cachedInsights).toBeNull();
    });

    it('has llmStatus set to not_downloaded', () => {
      expect(useInsightsStore.getState().llmStatus).toBe('not_downloaded');
    });

    it('has null downloadProgress', () => {
      expect(useInsightsStore.getState().downloadProgress).toBeNull();
    });

    it('has isGenerating set to false', () => {
      expect(useInsightsStore.getState().isGenerating).toBe(false);
    });

    it('has null lastGenerationTime', () => {
      expect(useInsightsStore.getState().lastGenerationTime).toBeNull();
    });

    it('has null generationError', () => {
      expect(useInsightsStore.getState().generationError).toBeNull();
    });

    it('has llmEnabled set to true', () => {
      expect(useInsightsStore.getState().llmEnabled).toBe(true);
    });
  });

  // ===========================================================================
  // setInsights
  // ===========================================================================

  describe('setInsights', () => {
    it('creates cachedInsights with correct structure', () => {
      const now = Date.parse('2024-06-15T10:00:00.000Z');
      jest.useFakeTimers({ now });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      const cached = useInsightsStore.getState().cachedInsights;
      expect(cached).not.toBeNull();
      expect(cached!.insights).toEqual(mockInsights);
      expect(cached!.generatedAt).toBe(now);
      expect(cached!.validUntil).toBe(now + CACHE_DURATION_MS);
      expect(cached!.source).toBe('llm');
      expect(cached!.date).toBe('2024-06-15');
    });

    it('sets source to fallback when specified', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'fallback');

      expect(useInsightsStore.getState().cachedInsights!.source).toBe('fallback');
    });

    it('updates lastGenerationTime to current time', () => {
      const now = Date.parse('2024-06-15T10:00:00.000Z');
      jest.useFakeTimers({ now });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      expect(useInsightsStore.getState().lastGenerationTime).toBe(now);
    });

    it('resets generationError to null', () => {
      useInsightsStore.setState({ generationError: 'Some previous error' });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      expect(useInsightsStore.getState().generationError).toBeNull();
    });

    it('resets isGenerating to false', () => {
      useInsightsStore.setState({ isGenerating: true });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      expect(useInsightsStore.getState().isGenerating).toBe(false);
    });

    it('overwrites previously cached insights', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'llm');
      const newInsights: Insight[] = [{ category: 'trend', text: 'New insight' }];
      useInsightsStore.getState().setInsights(newInsights, 'fallback');

      const cached = useInsightsStore.getState().cachedInsights;
      expect(cached!.insights).toEqual(newInsights);
      expect(cached!.source).toBe('fallback');
    });
  });

  // ===========================================================================
  // shouldRegenerateInsights
  // ===========================================================================

  describe('shouldRegenerateInsights', () => {
    it('returns true when no cache exists', () => {
      expect(useInsightsStore.getState().shouldRegenerateInsights()).toBe(true);
    });

    it('returns true when cache has expired', () => {
      const start = Date.parse('2024-06-15T08:00:00.000Z');
      jest.useFakeTimers({ now: start });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      // Advance past cache duration
      jest.setSystemTime(start + CACHE_DURATION_MS + 1);

      expect(useInsightsStore.getState().shouldRegenerateInsights()).toBe(true);
    });

    it('returns true when date has changed (even if cache not expired by time)', () => {
      // Set cache at 23:00 UTC on June 15
      const lateNight = Date.parse('2024-06-15T23:00:00.000Z');
      jest.useFakeTimers({ now: lateNight });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      // Move to 00:30 UTC on June 16 — only 1.5 hours later (within 4h cache window)
      // but the UTC date changed from 2024-06-15 to 2024-06-16
      const earlyMorning = Date.parse('2024-06-16T00:30:00.000Z');
      jest.setSystemTime(earlyMorning);

      expect(useInsightsStore.getState().shouldRegenerateInsights()).toBe(true);
    });

    it('returns false when cache is valid and date matches', () => {
      const morning = Date.parse('2024-06-15T08:00:00.000Z');
      jest.useFakeTimers({ now: morning });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      // Advance 1 hour — still same day, still within 4h window
      jest.setSystemTime(morning + 60 * 60 * 1000);

      expect(useInsightsStore.getState().shouldRegenerateInsights()).toBe(false);
    });

    it('returns false when cache is exactly at the expiration boundary', () => {
      // Use a time where +4h does NOT cross midnight in UTC
      const morning = Date.parse('2024-06-15T08:00:00.000Z');
      jest.useFakeTimers({ now: morning });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      // Exactly at validUntil: condition is `now > validUntil` which is false for equality
      jest.setSystemTime(morning + CACHE_DURATION_MS);

      expect(useInsightsStore.getState().shouldRegenerateInsights()).toBe(false);
    });

    it('returns true when cache is 1ms past expiration', () => {
      const morning = Date.parse('2024-06-15T08:00:00.000Z');
      jest.useFakeTimers({ now: morning });

      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      jest.setSystemTime(morning + CACHE_DURATION_MS + 1);

      expect(useInsightsStore.getState().shouldRegenerateInsights()).toBe(true);
    });
  });

  // ===========================================================================
  // Simple setters
  // ===========================================================================

  describe('setLLMStatus', () => {
    it('updates llmStatus to ready', () => {
      useInsightsStore.getState().setLLMStatus('ready');
      expect(useInsightsStore.getState().llmStatus).toBe('ready');
    });

    it('updates llmStatus to downloading', () => {
      useInsightsStore.getState().setLLMStatus('downloading');
      expect(useInsightsStore.getState().llmStatus).toBe('downloading');
    });

    it('updates llmStatus to error', () => {
      useInsightsStore.getState().setLLMStatus('error');
      expect(useInsightsStore.getState().llmStatus).toBe('error');
    });

    it('updates llmStatus to unsupported', () => {
      useInsightsStore.getState().setLLMStatus('unsupported');
      expect(useInsightsStore.getState().llmStatus).toBe('unsupported');
    });
  });

  describe('setDownloadProgress', () => {
    it('sets download progress with all fields', () => {
      const progress: LLMDownloadProgress = {
        bytesDownloaded: 500000,
        totalBytes: 1000000,
        percentage: 50,
        estimatedSecondsRemaining: 120,
      };

      useInsightsStore.getState().setDownloadProgress(progress);
      expect(useInsightsStore.getState().downloadProgress).toEqual(progress);
    });

    it('sets download progress to null', () => {
      useInsightsStore.setState({
        downloadProgress: { bytesDownloaded: 100, totalBytes: 200, percentage: 50 },
      });

      useInsightsStore.getState().setDownloadProgress(null);
      expect(useInsightsStore.getState().downloadProgress).toBeNull();
    });
  });

  describe('setIsGenerating', () => {
    it('sets isGenerating to true', () => {
      useInsightsStore.getState().setIsGenerating(true);
      expect(useInsightsStore.getState().isGenerating).toBe(true);
    });

    it('sets isGenerating to false', () => {
      useInsightsStore.setState({ isGenerating: true });
      useInsightsStore.getState().setIsGenerating(false);
      expect(useInsightsStore.getState().isGenerating).toBe(false);
    });
  });

  describe('setGenerationError', () => {
    it('sets a generation error string', () => {
      useInsightsStore.getState().setGenerationError('Model failed to load');
      expect(useInsightsStore.getState().generationError).toBe('Model failed to load');
    });

    it('also sets isGenerating to false', () => {
      useInsightsStore.setState({ isGenerating: true });
      useInsightsStore.getState().setGenerationError('Error occurred');
      expect(useInsightsStore.getState().isGenerating).toBe(false);
    });

    it('clears a generation error by setting null', () => {
      useInsightsStore.setState({ generationError: 'Previous error' });
      useInsightsStore.getState().setGenerationError(null);
      expect(useInsightsStore.getState().generationError).toBeNull();
    });
  });

  describe('setLLMEnabled', () => {
    it('sets llmEnabled to false', () => {
      useInsightsStore.getState().setLLMEnabled(false);
      expect(useInsightsStore.getState().llmEnabled).toBe(false);
    });

    it('sets llmEnabled to true', () => {
      useInsightsStore.setState({ llmEnabled: false });
      useInsightsStore.getState().setLLMEnabled(true);
      expect(useInsightsStore.getState().llmEnabled).toBe(true);
    });
  });

  // ===========================================================================
  // clearInsights
  // ===========================================================================

  describe('clearInsights', () => {
    it('resets cachedInsights to null', () => {
      useInsightsStore.getState().setInsights(mockInsights, 'llm');
      expect(useInsightsStore.getState().cachedInsights).not.toBeNull();

      useInsightsStore.getState().clearInsights();
      expect(useInsightsStore.getState().cachedInsights).toBeNull();
    });

    it('does not affect other state fields', () => {
      useInsightsStore.setState({
        isGenerating: true,
        llmStatus: 'ready',
        generationError: 'something',
        llmEnabled: false,
      });
      useInsightsStore.getState().setInsights(mockInsights, 'llm');

      useInsightsStore.getState().clearInsights();

      const state = useInsightsStore.getState();
      expect(state.cachedInsights).toBeNull();
      // setInsights resets isGenerating and generationError, but clearInsights only touches cachedInsights
      expect(state.llmStatus).toBe('ready');
      expect(state.llmEnabled).toBe(false);
    });

    it('is safe to call when already null', () => {
      expect(useInsightsStore.getState().cachedInsights).toBeNull();
      useInsightsStore.getState().clearInsights();
      expect(useInsightsStore.getState().cachedInsights).toBeNull();
    });
  });

  // ===========================================================================
  // Persistence partialize
  // ===========================================================================

  describe('persistence partialize', () => {
    it('only persists cachedInsights and llmEnabled', () => {
      // Access the persist options to verify partialize behavior
      const persistOptions = (useInsightsStore as any).persist;
      expect(persistOptions).toBeDefined();

      // The partialize function is applied during persist. We can verify
      // by checking that the persist API exposes getOptions.
      const options = persistOptions.getOptions();
      expect(options.name).toBe('insights-storage');

      // Test the partialize function directly
      const fullState = {
        cachedInsights: { insights: [], generatedAt: 0, validUntil: 0, source: 'llm' as const, date: '2024-01-01' },
        llmStatus: 'ready' as const,
        downloadProgress: { bytesDownloaded: 100, totalBytes: 200, percentage: 50 },
        isGenerating: true,
        lastGenerationTime: 12345,
        generationError: 'some error',
        llmEnabled: false,
      };

      const partialized = options.partialize(fullState);

      // Should only contain cachedInsights and llmEnabled
      expect(partialized).toEqual({
        cachedInsights: fullState.cachedInsights,
        llmEnabled: false,
      });

      // Should NOT contain transient state
      expect(partialized).not.toHaveProperty('llmStatus');
      expect(partialized).not.toHaveProperty('downloadProgress');
      expect(partialized).not.toHaveProperty('isGenerating');
      expect(partialized).not.toHaveProperty('lastGenerationTime');
      expect(partialized).not.toHaveProperty('generationError');
    });
  });
});
