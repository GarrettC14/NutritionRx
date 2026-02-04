/**
 * Daily Insight Store Tests
 * Tests the Zustand store logic that powers both hooks
 */

import { useDailyInsightStore } from '../stores/dailyInsightStore';

// Mock all external dependencies
jest.mock('../services/daily/DailyDataCollector', () => ({
  collectDailyInsightData: jest.fn(),
}));

jest.mock('../services/daily/WidgetHeadlineEngine', () => ({
  computeWidgetHeadline: jest.fn(),
}));

jest.mock('../services/daily/analyzers', () => ({
  questionAnalyzers: {
    macro_overview: jest.fn(),
    calorie_pacing: jest.fn(),
  },
}));

jest.mock('../constants/dailyQuestionRegistry', () => ({
  questionRegistry: [
    {
      id: 'macro_overview',
      category: 'macro_balance',
      text: 'How are my macros today?',
      icon: 'flag-outline',
      isAvailable: jest.fn(() => true),
      computeRelevance: jest.fn(() => 80),
      fetcherKey: 'macro_overview',
    },
    {
      id: 'calorie_pacing',
      category: 'macro_balance',
      text: 'Am I on pace?',
      icon: 'speedometer-outline',
      isAvailable: jest.fn(() => true),
      computeRelevance: jest.fn(() => 60),
      fetcherKey: 'calorie_pacing',
    },
  ],
}));

jest.mock('../services/daily/DailyInsightPromptBuilder', () => ({
  buildSystemPrompt: jest.fn(() => 'system prompt'),
  buildQuestionPrompt: jest.fn(() => 'question prompt'),
  DAILY_INSIGHT_LLM_CONFIG: { maxTokens: 120, temperature: 0.6, stopSequences: ['\n\n'] },
}));

jest.mock('../services/daily/DailyInsightResponseParser', () => ({
  parseInsightResponse: jest.fn((text: string) => ({
    icon: 'leaf-outline',
    narrative: text,
    isValid: true,
    validationIssues: [],
  })),
}));

jest.mock('../services/LLMService', () => ({
  LLMService: {
    generate: jest.fn(),
    getStatus: jest.fn(),
  },
}));

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

const { collectDailyInsightData } = require('../services/daily/DailyDataCollector');
const { computeWidgetHeadline } = require('../services/daily/WidgetHeadlineEngine');
const { questionAnalyzers } = require('../services/daily/analyzers');
const { LLMService } = require('../services/LLMService');

const mockData = {
  todayCalories: 1500,
  todayProtein: 100,
  todayCarbs: 180,
  todayFat: 55,
  todayFiber: 20,
  calorieTarget: 2000,
  proteinTarget: 150,
  carbTarget: 250,
  fatTarget: 70,
  waterTarget: 2000,
  todayWater: 1200,
  todayMealCount: 3,
  todayFoods: [],
  mealsWithTimestamps: [],
  avgCalories7d: 1800,
  avgProtein7d: 120,
  loggingStreak: 5,
  calorieStreak: 3,
  userGoal: 'lose',
  daysUsingApp: 14,
  caloriePercent: 75,
  proteinPercent: 67,
  carbPercent: 72,
  fatPercent: 79,
  waterPercent: 60,
  currentHour: 14,
  dayProgress: 0.5,
  activeAlerts: [],
  weeklyDailyTotals: [],
};

const mockHeadline = {
  text: 'You are 75% to your calorie target.',
  icon: 'flag-outline',
  priority: 5,
  computedAt: Date.now(),
};

describe('useDailyInsightStore', () => {
  beforeEach(() => {
    // Reset the store between tests
    useDailyInsightStore.setState({
      cache: null,
      isGenerating: false,
      activeQuestionId: null,
      generationError: null,
      llmStatus: 'unsupported',
      downloadProgress: 0,
    });

    // Reset mocks
    jest.clearAllMocks();
    collectDailyInsightData.mockResolvedValue(mockData);
    computeWidgetHeadline.mockReturnValue(mockHeadline);
  });

  describe('shouldRefreshData', () => {
    it('returns true when cache is null', () => {
      expect(useDailyInsightStore.getState().shouldRefreshData()).toBe(true);
    });

    it('returns true when cache is stale (different date)', () => {
      useDailyInsightStore.setState({
        cache: {
          date: '2024-01-01',
          headline: mockHeadline,
          data: mockData,
          scores: [],
          responses: {},
          lastDataUpdate: Date.now(),
        },
      });
      expect(useDailyInsightStore.getState().shouldRefreshData()).toBe(true);
    });

    it('returns true when data is older than TTL', () => {
      const today = new Date().toISOString().split('T')[0];
      useDailyInsightStore.setState({
        cache: {
          date: today,
          headline: mockHeadline,
          data: mockData,
          scores: [],
          responses: {},
          lastDataUpdate: Date.now() - 20 * 60 * 1000, // 20 minutes ago
        },
      });
      expect(useDailyInsightStore.getState().shouldRefreshData()).toBe(true);
    });

    it('returns false when cache is fresh', () => {
      const today = new Date().toISOString().split('T')[0];
      useDailyInsightStore.setState({
        cache: {
          date: today,
          headline: mockHeadline,
          data: mockData,
          scores: [],
          responses: {},
          lastDataUpdate: Date.now(),
        },
      });
      expect(useDailyInsightStore.getState().shouldRefreshData()).toBe(false);
    });
  });

  describe('refreshData', () => {
    it('collects data, scores questions, computes headline', async () => {
      await useDailyInsightStore.getState().refreshData();

      expect(collectDailyInsightData).toHaveBeenCalledTimes(1);
      expect(computeWidgetHeadline).toHaveBeenCalledWith(mockData);

      const { cache } = useDailyInsightStore.getState();
      expect(cache).not.toBeNull();
      expect(cache!.data).toBe(mockData);
      expect(cache!.headline).toBe(mockHeadline);
      expect(cache!.scores).toHaveLength(2); // macro_overview + calorie_pacing
    });

    it('preserves existing responses from the same day', async () => {
      const today = new Date().toISOString().split('T')[0];
      const existingResponse = {
        questionId: 'macro_overview' as const,
        narrative: 'Cached response',
        icon: 'leaf-outline',
        generatedAt: Date.now(),
        source: 'llm' as const,
        date: today,
      };

      useDailyInsightStore.setState({
        cache: {
          date: today,
          headline: mockHeadline,
          data: mockData,
          scores: [],
          responses: { macro_overview: existingResponse },
          lastDataUpdate: 0,
        },
      });

      await useDailyInsightStore.getState().refreshData();

      const { cache } = useDailyInsightStore.getState();
      expect(cache!.responses.macro_overview).toBe(existingResponse);
    });

    it('clears responses from a different day', async () => {
      useDailyInsightStore.setState({
        cache: {
          date: '2024-01-01',
          headline: mockHeadline,
          data: mockData,
          scores: [],
          responses: {
            macro_overview: {
              questionId: 'macro_overview',
              narrative: 'Old response',
              icon: 'leaf-outline',
              generatedAt: Date.now(),
              source: 'llm',
              date: '2024-01-01',
            },
          },
          lastDataUpdate: 0,
        },
      });

      await useDailyInsightStore.getState().refreshData();

      const { cache } = useDailyInsightStore.getState();
      expect(cache!.responses).toEqual({});
    });
  });

  describe('generateInsight', () => {
    beforeEach(async () => {
      // Set up fresh cache
      await useDailyInsightStore.getState().refreshData();
    });

    it('returns fallback when LLM is not ready', async () => {
      questionAnalyzers.macro_overview.mockReturnValue({
        questionId: 'macro_overview',
        dataBlock: 'Calories: 1500/2000',
        fallbackText: 'Your macros are at 75%.',
        dataCards: [],
        computedAt: Date.now(),
      });

      useDailyInsightStore.setState({ llmStatus: 'unsupported' });

      const response = await useDailyInsightStore.getState().generateInsight('macro_overview');

      expect(response.source).toBe('fallback');
      expect(response.narrative).toBe('Your macros are at 75%.');
      expect(response.icon).toBe('leaf-outline');
    });

    it('caches fallback response in store', async () => {
      questionAnalyzers.macro_overview.mockReturnValue({
        questionId: 'macro_overview',
        dataBlock: 'Calories: 1500/2000',
        fallbackText: 'Your macros are at 75%.',
        dataCards: [],
        computedAt: Date.now(),
      });

      useDailyInsightStore.setState({ llmStatus: 'unsupported' });

      await useDailyInsightStore.getState().generateInsight('macro_overview');

      const { cache } = useDailyInsightStore.getState();
      expect(cache!.responses.macro_overview).toBeDefined();
      expect(cache!.responses.macro_overview.source).toBe('fallback');
    });

    it('uses LLM when status is ready', async () => {
      questionAnalyzers.macro_overview.mockReturnValue({
        questionId: 'macro_overview',
        dataBlock: 'Calories: 1500/2000',
        fallbackText: 'Your macros are at 75%.',
        dataCards: [],
        computedAt: Date.now(),
      });

      LLMService.generate.mockResolvedValue({
        success: true,
        text: '🎯 Your macros are tracking nicely today.',
      });

      useDailyInsightStore.setState({ llmStatus: 'ready' });

      const response = await useDailyInsightStore.getState().generateInsight('macro_overview');

      expect(response.source).toBe('llm');
      expect(LLMService.generate).toHaveBeenCalledTimes(1);
    });

    it('falls back on LLM error', async () => {
      questionAnalyzers.macro_overview.mockReturnValue({
        questionId: 'macro_overview',
        dataBlock: 'Calories: 1500/2000',
        fallbackText: 'Fallback text here.',
        dataCards: [],
        computedAt: Date.now(),
      });

      LLMService.generate.mockRejectedValue(new Error('LLM crashed'));
      useDailyInsightStore.setState({ llmStatus: 'ready' });

      const response = await useDailyInsightStore.getState().generateInsight('macro_overview');

      expect(response.source).toBe('fallback');
      expect(response.narrative).toBe('Fallback text here.');
      expect(useDailyInsightStore.getState().generationError).toBe('LLM crashed');
    });

    it('falls back when LLM returns no text', async () => {
      questionAnalyzers.macro_overview.mockReturnValue({
        questionId: 'macro_overview',
        dataBlock: 'Calories: 1500/2000',
        fallbackText: 'Fallback text.',
        dataCards: [],
        computedAt: Date.now(),
      });

      LLMService.generate.mockResolvedValue({ success: false, error: 'No text' });
      useDailyInsightStore.setState({ llmStatus: 'ready' });

      const response = await useDailyInsightStore.getState().generateInsight('macro_overview');

      expect(response.source).toBe('fallback');
    });

    it('returns cached response within TTL', async () => {
      const today = new Date().toISOString().split('T')[0];
      const cachedResponse = {
        questionId: 'macro_overview' as const,
        narrative: 'Cached insight.',
        icon: 'leaf-outline',
        generatedAt: Date.now(),
        source: 'llm' as const,
        date: today,
      };

      useDailyInsightStore.setState((state) => ({
        cache: state.cache
          ? {
              ...state.cache,
              responses: { macro_overview: cachedResponse },
            }
          : state.cache,
      }));

      const response = await useDailyInsightStore.getState().generateInsight('macro_overview');

      expect(response).toBe(cachedResponse);
      expect(questionAnalyzers.macro_overview).not.toHaveBeenCalled();
    });

    it('throws for unknown question ID', async () => {
      await expect(
        useDailyInsightStore.getState().generateInsight('nonexistent_question' as any),
      ).rejects.toThrow('No analyzer');
    });

    it('clears isGenerating on completion', async () => {
      questionAnalyzers.macro_overview.mockReturnValue({
        questionId: 'macro_overview',
        dataBlock: 'data',
        fallbackText: 'fallback',
        dataCards: [],
        computedAt: Date.now(),
      });

      LLMService.generate.mockResolvedValue({
        success: true,
        text: '🎯 Insight text.',
      });

      useDailyInsightStore.setState({ llmStatus: 'ready' });

      await useDailyInsightStore.getState().generateInsight('macro_overview');

      expect(useDailyInsightStore.getState().isGenerating).toBe(false);
      expect(useDailyInsightStore.getState().activeQuestionId).toBeNull();
    });
  });

  describe('getHeadline', () => {
    it('returns default when no cache', () => {
      const headline = useDailyInsightStore.getState().getHeadline();
      expect(headline.icon).toBe('leaf-outline');
      expect(headline.text).toContain('Log your first meal');
    });

    it('returns cached headline for today', async () => {
      await useDailyInsightStore.getState().refreshData();
      const headline = useDailyInsightStore.getState().getHeadline();
      expect(headline).toBe(mockHeadline);
    });
  });

  describe('getSuggestedQuestions', () => {
    it('returns empty when no cache', () => {
      expect(useDailyInsightStore.getState().getSuggestedQuestions()).toEqual([]);
    });

    it('returns top 3 available questions sorted by relevance', async () => {
      await useDailyInsightStore.getState().refreshData();
      const suggestions = useDailyInsightStore.getState().getSuggestedQuestions();

      expect(suggestions.length).toBeLessThanOrEqual(3);
      // macro_overview (80) should come before calorie_pacing (60)
      if (suggestions.length >= 2) {
        expect(suggestions[0].relevanceScore).toBeGreaterThanOrEqual(suggestions[1].relevanceScore);
      }
    });
  });

  describe('getAvailableQuestions', () => {
    it('returns empty map when no cache', () => {
      const grouped = useDailyInsightStore.getState().getAvailableQuestions();
      expect(grouped.size).toBe(0);
    });

    it('groups available questions by category', async () => {
      await useDailyInsightStore.getState().refreshData();
      const grouped = useDailyInsightStore.getState().getAvailableQuestions();

      expect(grouped.has('macro_balance')).toBe(true);
      expect(grouped.get('macro_balance')!.length).toBe(2);
    });
  });

  describe('invalidateCache', () => {
    it('clears lastDataUpdate and responses', async () => {
      await useDailyInsightStore.getState().refreshData();
      useDailyInsightStore.getState().invalidateCache();

      const { cache } = useDailyInsightStore.getState();
      expect(cache!.lastDataUpdate).toBe(0);
      expect(cache!.responses).toEqual({});
    });

    it('handles null cache gracefully', () => {
      useDailyInsightStore.getState().invalidateCache();
      expect(useDailyInsightStore.getState().cache).toBeNull();
    });
  });
});
