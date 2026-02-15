/**
 * Weekly Insights Store Tests
 * Comprehensive unit tests for the Zustand store with persist middleware
 */

import { act } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../utils/weekUtils', () => ({
  getWeekStart: jest.fn(() => '2024-01-08'),
}));

import { useWeeklyInsightsStore } from '../stores/weeklyInsightsStore';
import { getWeekStart } from '../utils/weekUtils';
import type {
  WeeklyInsightsCache,
  WeeklyInsightResponse,
} from '../types/weeklyInsights.types';

// Helper to build a minimal valid cache
function makeCache(overrides: Partial<WeeklyInsightsCache> = {}): WeeklyInsightsCache {
  return {
    weekStartDate: '2024-01-08',
    questions: [],
    headline: 'Test headline',
    responses: {},
    generatedAt: Date.now(),
    validUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

// Helper to build a minimal valid response
function makeResponse(overrides: Partial<WeeklyInsightResponse> = {}): WeeklyInsightResponse {
  return {
    questionId: 'Q-CON-01',
    text: 'Test response text',
    icon: 'bar-chart-outline',
    generatedAt: Date.now(),
    source: 'template',
    weekStartDate: '2024-01-08',
    sentiment: 'neutral',
    keyMetrics: [],
    followUpIds: [],
    ...overrides,
  };
}

describe('weeklyInsightsStore', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useWeeklyInsightsStore.setState({
      cache: null,
      selectedWeekStart: null,
      selectedQuestionId: null,
      isGenerating: false,
      generationError: null,
      llmStatus: 'unsupported',
      downloadProgress: 0,
      selectedCategory: null,
      toast: { message: '', visible: false },
      perQuestionErrors: {},
    });
    jest.restoreAllMocks();
    (getWeekStart as jest.Mock).mockReturnValue('2024-01-08');
  });

  // ============================================
  // INITIAL STATE
  // ============================================
  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useWeeklyInsightsStore.getState();
      expect(state.cache).toBeNull();
      expect(state.selectedWeekStart).toBeNull();
      expect(state.selectedQuestionId).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.generationError).toBeNull();
      expect(state.llmStatus).toBe('unsupported');
      expect(state.downloadProgress).toBe(0);
      expect(state.selectedCategory).toBeNull();
      expect(state.toast).toEqual({ message: '', visible: false });
      expect(state.perQuestionErrors).toEqual({});
    });
  });

  // ============================================
  // setSelectedWeek
  // ============================================
  describe('setSelectedWeek', () => {
    it('updates selectedWeekStart', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedWeek('2024-01-15');
      });
      expect(useWeeklyInsightsStore.getState().selectedWeekStart).toBe('2024-01-15');
    });

    it('clears selectedQuestionId when week changes', () => {
      // Set a question first
      act(() => {
        useWeeklyInsightsStore.getState().selectQuestion('Q-CON-01');
      });
      expect(useWeeklyInsightsStore.getState().selectedQuestionId).toBe('Q-CON-01');

      // Change week -> question should be cleared
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedWeek('2024-01-15');
      });
      expect(useWeeklyInsightsStore.getState().selectedQuestionId).toBeNull();
    });

    it('can set week to null', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedWeek('2024-01-15');
      });
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedWeek(null);
      });
      expect(useWeeklyInsightsStore.getState().selectedWeekStart).toBeNull();
    });
  });

  // ============================================
  // selectQuestion
  // ============================================
  describe('selectQuestion', () => {
    it('updates selectedQuestionId', () => {
      act(() => {
        useWeeklyInsightsStore.getState().selectQuestion('Q-MAC-01');
      });
      expect(useWeeklyInsightsStore.getState().selectedQuestionId).toBe('Q-MAC-01');
    });

    it('can clear selectedQuestionId with null', () => {
      act(() => {
        useWeeklyInsightsStore.getState().selectQuestion('Q-MAC-01');
      });
      act(() => {
        useWeeklyInsightsStore.getState().selectQuestion(null);
      });
      expect(useWeeklyInsightsStore.getState().selectedQuestionId).toBeNull();
    });
  });

  // ============================================
  // setCache
  // ============================================
  describe('setCache', () => {
    it('sets the full cache object', () => {
      const cache = makeCache();
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });
      expect(useWeeklyInsightsStore.getState().cache).toEqual(cache);
    });
  });

  // ============================================
  // setCachedResponse
  // ============================================
  describe('setCachedResponse', () => {
    it('merges a response into existing cache', () => {
      const cache = makeCache();
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      const response = makeResponse({ questionId: 'Q-CON-01' });
      act(() => {
        useWeeklyInsightsStore.getState().setCachedResponse('Q-CON-01', response);
      });

      const updated = useWeeklyInsightsStore.getState().cache;
      expect(updated?.responses['Q-CON-01']).toEqual(response);
    });

    it('preserves existing responses when adding new ones', () => {
      const existingResponse = makeResponse({ questionId: 'Q-CON-01', text: 'First' });
      const cache = makeCache({
        responses: { 'Q-CON-01': existingResponse },
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      const newResponse = makeResponse({ questionId: 'Q-MAC-01', text: 'Second' });
      act(() => {
        useWeeklyInsightsStore.getState().setCachedResponse('Q-MAC-01', newResponse);
      });

      const updated = useWeeklyInsightsStore.getState().cache;
      expect(updated?.responses['Q-CON-01']).toEqual(existingResponse);
      expect(updated?.responses['Q-MAC-01']).toEqual(newResponse);
    });

    it('overwrites an existing response for the same questionId', () => {
      const cache = makeCache({
        responses: { 'Q-CON-01': makeResponse({ text: 'Old' }) },
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      const updatedResponse = makeResponse({ text: 'New' });
      act(() => {
        useWeeklyInsightsStore.getState().setCachedResponse('Q-CON-01', updatedResponse);
      });

      expect(useWeeklyInsightsStore.getState().cache?.responses['Q-CON-01']?.text).toBe('New');
    });

    it('does nothing when cache is null', () => {
      // No cache set
      const response = makeResponse({ questionId: 'Q-CON-01' });
      act(() => {
        useWeeklyInsightsStore.getState().setCachedResponse('Q-CON-01', response);
      });

      expect(useWeeklyInsightsStore.getState().cache).toBeNull();
    });
  });

  // ============================================
  // setIsGenerating
  // ============================================
  describe('setIsGenerating', () => {
    it('sets isGenerating to true', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setIsGenerating(true);
      });
      expect(useWeeklyInsightsStore.getState().isGenerating).toBe(true);
    });

    it('sets isGenerating to false', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setIsGenerating(true);
      });
      act(() => {
        useWeeklyInsightsStore.getState().setIsGenerating(false);
      });
      expect(useWeeklyInsightsStore.getState().isGenerating).toBe(false);
    });
  });

  // ============================================
  // setGenerationError
  // ============================================
  describe('setGenerationError', () => {
    it('sets a generation error message', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setGenerationError('Something went wrong');
      });
      expect(useWeeklyInsightsStore.getState().generationError).toBe('Something went wrong');
    });

    it('clears the error with null', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setGenerationError('Error');
      });
      act(() => {
        useWeeklyInsightsStore.getState().setGenerationError(null);
      });
      expect(useWeeklyInsightsStore.getState().generationError).toBeNull();
    });
  });

  // ============================================
  // setLLMStatus
  // ============================================
  describe('setLLMStatus', () => {
    it('updates the LLM status', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setLLMStatus('ready');
      });
      expect(useWeeklyInsightsStore.getState().llmStatus).toBe('ready');
    });

    it('can transition through status values', () => {
      const statuses = ['not_downloaded', 'downloading', 'ready', 'loading', 'generating', 'error', 'unsupported'] as const;
      for (const status of statuses) {
        act(() => {
          useWeeklyInsightsStore.getState().setLLMStatus(status);
        });
        expect(useWeeklyInsightsStore.getState().llmStatus).toBe(status);
      }
    });
  });

  // ============================================
  // setDownloadProgress
  // ============================================
  describe('setDownloadProgress', () => {
    it('updates download progress', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setDownloadProgress(0.5);
      });
      expect(useWeeklyInsightsStore.getState().downloadProgress).toBe(0.5);
    });

    it('handles progress at boundaries', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setDownloadProgress(0);
      });
      expect(useWeeklyInsightsStore.getState().downloadProgress).toBe(0);

      act(() => {
        useWeeklyInsightsStore.getState().setDownloadProgress(1);
      });
      expect(useWeeklyInsightsStore.getState().downloadProgress).toBe(1);
    });
  });

  // ============================================
  // setSelectedCategory
  // ============================================
  describe('setSelectedCategory', () => {
    it('sets a category filter', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedCategory('consistency');
      });
      expect(useWeeklyInsightsStore.getState().selectedCategory).toBe('consistency');
    });

    it('can clear category with null', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedCategory('macro_balance');
      });
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedCategory(null);
      });
      expect(useWeeklyInsightsStore.getState().selectedCategory).toBeNull();
    });
  });

  // ============================================
  // showToast / hideToast
  // ============================================
  describe('showToast / hideToast', () => {
    it('shows a toast with message and visible flag', () => {
      act(() => {
        useWeeklyInsightsStore.getState().showToast('Insight generated!');
      });
      const toast = useWeeklyInsightsStore.getState().toast;
      expect(toast.message).toBe('Insight generated!');
      expect(toast.visible).toBe(true);
    });

    it('hides the toast and clears the message', () => {
      act(() => {
        useWeeklyInsightsStore.getState().showToast('Hello');
      });
      act(() => {
        useWeeklyInsightsStore.getState().hideToast();
      });
      const toast = useWeeklyInsightsStore.getState().toast;
      expect(toast.message).toBe('');
      expect(toast.visible).toBe(false);
    });

    it('can show a new toast after hiding', () => {
      act(() => {
        useWeeklyInsightsStore.getState().showToast('First');
      });
      act(() => {
        useWeeklyInsightsStore.getState().hideToast();
      });
      act(() => {
        useWeeklyInsightsStore.getState().showToast('Second');
      });
      const toast = useWeeklyInsightsStore.getState().toast;
      expect(toast.message).toBe('Second');
      expect(toast.visible).toBe(true);
    });
  });

  // ============================================
  // setQuestionError / clearQuestionError
  // ============================================
  describe('setQuestionError / clearQuestionError', () => {
    it('sets a per-question error', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setQuestionError('Q-CON-01', 'Generation failed');
      });
      expect(useWeeklyInsightsStore.getState().perQuestionErrors['Q-CON-01']).toBe(
        'Generation failed'
      );
    });

    it('tracks errors for multiple questions independently', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setQuestionError('Q-CON-01', 'Error A');
      });
      act(() => {
        useWeeklyInsightsStore.getState().setQuestionError('Q-MAC-01', 'Error B');
      });
      const errors = useWeeklyInsightsStore.getState().perQuestionErrors;
      expect(errors['Q-CON-01']).toBe('Error A');
      expect(errors['Q-MAC-01']).toBe('Error B');
    });

    it('clears a specific question error without affecting others', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setQuestionError('Q-CON-01', 'Error A');
      });
      act(() => {
        useWeeklyInsightsStore.getState().setQuestionError('Q-MAC-01', 'Error B');
      });
      act(() => {
        useWeeklyInsightsStore.getState().clearQuestionError('Q-CON-01');
      });

      const errors = useWeeklyInsightsStore.getState().perQuestionErrors;
      expect(errors['Q-CON-01']).toBeUndefined();
      expect(errors['Q-MAC-01']).toBe('Error B');
    });

    it('overwrites an existing error for the same question', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setQuestionError('Q-CON-01', 'First error');
      });
      act(() => {
        useWeeklyInsightsStore.getState().setQuestionError('Q-CON-01', 'Second error');
      });
      expect(useWeeklyInsightsStore.getState().perQuestionErrors['Q-CON-01']).toBe('Second error');
    });

    it('clearing a non-existent error is safe', () => {
      act(() => {
        useWeeklyInsightsStore.getState().clearQuestionError('Q-NONEXISTENT');
      });
      expect(useWeeklyInsightsStore.getState().perQuestionErrors).toEqual({});
    });
  });

  // ============================================
  // shouldRecomputeQuestions
  // ============================================
  describe('shouldRecomputeQuestions', () => {
    it('returns true when cache is null', () => {
      const result = useWeeklyInsightsStore.getState().shouldRecomputeQuestions();
      expect(result).toBe(true);
    });

    it('returns true when cache week does not match selected week', () => {
      const cache = makeCache({ weekStartDate: '2024-01-01' });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
        useWeeklyInsightsStore.getState().setSelectedWeek('2024-01-15');
      });

      const result = useWeeklyInsightsStore.getState().shouldRecomputeQuestions();
      expect(result).toBe(true);
    });

    it('returns true when cache week does not match getWeekStart() default', () => {
      const cache = makeCache({ weekStartDate: '2024-01-01' });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });
      // selectedWeekStart is null, so it falls back to getWeekStart() -> '2024-01-08'
      const result = useWeeklyInsightsStore.getState().shouldRecomputeQuestions();
      expect(result).toBe(true);
    });

    it('returns true when cache is expired', () => {
      const now = 1704700800000; // Fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const cache = makeCache({
        weekStartDate: '2024-01-08',
        validUntil: now - 1, // expired 1ms ago
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });
      // selectedWeekStart is null -> falls back to '2024-01-08' which matches cache

      const result = useWeeklyInsightsStore.getState().shouldRecomputeQuestions();
      expect(result).toBe(true);
    });

    it('returns false when cache is valid and week matches', () => {
      const now = 1704700800000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const cache = makeCache({
        weekStartDate: '2024-01-08',
        validUntil: now + 60000, // valid for another minute
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      const result = useWeeklyInsightsStore.getState().shouldRecomputeQuestions();
      expect(result).toBe(false);
    });

    it('returns false when cache matches selectedWeekStart', () => {
      const now = 1704700800000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const cache = makeCache({
        weekStartDate: '2024-01-15',
        validUntil: now + 60000,
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
        useWeeklyInsightsStore.getState().setSelectedWeek('2024-01-15');
      });

      const result = useWeeklyInsightsStore.getState().shouldRecomputeQuestions();
      expect(result).toBe(false);
    });

    it('returns true when validUntil equals Date.now() (boundary case)', () => {
      const now = 1704700800000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const cache = makeCache({
        weekStartDate: '2024-01-08',
        validUntil: now, // exactly at boundary: Date.now() > cache.validUntil is false
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      // Date.now() === validUntil -> NOT expired (strict >)
      const result = useWeeklyInsightsStore.getState().shouldRecomputeQuestions();
      expect(result).toBe(false);
    });
  });

  // ============================================
  // getCachedResponse
  // ============================================
  describe('getCachedResponse', () => {
    it('returns null when cache is null', () => {
      const result = useWeeklyInsightsStore.getState().getCachedResponse('Q-CON-01');
      expect(result).toBeNull();
    });

    it('returns null when question is not in cache responses', () => {
      const cache = makeCache({ responses: {} });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      const result = useWeeklyInsightsStore.getState().getCachedResponse('Q-CON-01');
      expect(result).toBeNull();
    });

    it('returns the cached response when it exists', () => {
      const response = makeResponse({ questionId: 'Q-CON-01', text: 'Cached text' });
      const cache = makeCache({
        responses: { 'Q-CON-01': response },
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      const result = useWeeklyInsightsStore.getState().getCachedResponse('Q-CON-01');
      expect(result).toEqual(response);
    });

    it('returns null for an uncached question even when other questions are cached', () => {
      const cache = makeCache({
        responses: { 'Q-CON-01': makeResponse({ questionId: 'Q-CON-01' }) },
      });
      act(() => {
        useWeeklyInsightsStore.getState().setCache(cache);
      });

      const result = useWeeklyInsightsStore.getState().getCachedResponse('Q-MAC-01');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // getEffectiveWeekStart
  // ============================================
  describe('getEffectiveWeekStart', () => {
    it('returns selectedWeekStart when set', () => {
      act(() => {
        useWeeklyInsightsStore.getState().setSelectedWeek('2024-02-05');
      });
      const result = useWeeklyInsightsStore.getState().getEffectiveWeekStart();
      expect(result).toBe('2024-02-05');
    });

    it('falls back to getWeekStart() when selectedWeekStart is null', () => {
      const result = useWeeklyInsightsStore.getState().getEffectiveWeekStart();
      expect(result).toBe('2024-01-08');
      expect(getWeekStart).toHaveBeenCalled();
    });

    it('uses the current mock return value of getWeekStart', () => {
      (getWeekStart as jest.Mock).mockReturnValue('2024-03-04');
      const result = useWeeklyInsightsStore.getState().getEffectiveWeekStart();
      expect(result).toBe('2024-03-04');
    });
  });

  // ============================================
  // Persist middleware partialize
  // ============================================
  describe('persist partialize', () => {
    it('only persists the cache field', () => {
      // The partialize function in the store is: (state) => ({ cache: state.cache })
      // We verify by checking the persist options
      const persistOptions = (useWeeklyInsightsStore as any).persist;
      // Zustand persist stores getOptions on the persist API
      if (persistOptions?.getOptions) {
        const options = persistOptions.getOptions();
        const testState = {
          cache: makeCache(),
          selectedWeekStart: '2024-01-15',
          isGenerating: true,
          toast: { message: 'test', visible: true },
          perQuestionErrors: { 'Q-CON-01': 'error' },
        };
        const partialized = options.partialize(testState);
        expect(Object.keys(partialized)).toEqual(['cache']);
        expect(partialized.cache).toEqual(testState.cache);
      }
    });
  });
});
