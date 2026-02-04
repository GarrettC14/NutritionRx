/**
 * LLM Widget Integration Tests (Feature 3)
 * Tests that:
 * 1. AIDailyInsightWidget uses useDailyInsightData/useDailyInsightStore (template headlines, no direct LLM)
 * 2. AIDailyInsightWidget navigates to /daily-insights for the full AI experience
 * 3. AIDailyInsightWidget shows skeleton loading, empty state, headline display
 * 4. AIDailyInsightWidget maintains premium gating and refresh
 * 5. WeeklyRecapWidget uses LLMService when model is ready
 * 6. WeeklyRecapWidget shows "Enable AI" prompt when model not downloaded
 * 7. WeeklyRecapWidget falls back to templates if LLM fails
 * 8. WeeklyRecapWidget caches recap (weekly TTL)
 * 9. Both widgets maintain premium gating
 * 10. No cloud LLM references
 */

import * as fs from 'fs';
import * as path from 'path';

describe('LLM Widget Integration (Feature 3)', () => {
  let dailyWidgetSource: string;
  let weeklyWidgetSource: string;

  beforeAll(() => {
    dailyWidgetSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/dashboard/widgets/AIDailyInsightWidget.tsx'),
      'utf-8'
    );
    weeklyWidgetSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/dashboard/widgets/WeeklyRecapWidget.tsx'),
      'utf-8'
    );
  });

  describe('AIDailyInsightWidget - Data Layer', () => {
    it('should import useDailyInsightData hook', () => {
      expect(dailyWidgetSource).toContain('useDailyInsightData');
      expect(dailyWidgetSource).toContain('@/features/insights/hooks/useDailyInsightData');
    });

    it('should import useDailyInsightStore', () => {
      expect(dailyWidgetSource).toContain('useDailyInsightStore');
      expect(dailyWidgetSource).toContain('@/features/insights/stores/dailyInsightStore');
    });

    it('should destructure data, headline, and isLoaded from hook', () => {
      expect(dailyWidgetSource).toContain('headline');
      expect(dailyWidgetSource).toContain('isLoaded');
      expect(dailyWidgetSource).toContain('data');
      expect(dailyWidgetSource).toContain('useDailyInsightData()');
    });

    it('should not import LLMService directly (delegated to store/screen)', () => {
      expect(dailyWidgetSource).not.toContain("import { LLMService }");
    });

    it('should not import AsyncStorage directly (delegated to store)', () => {
      expect(dailyWidgetSource).not.toContain('AsyncStorage');
    });
  });

  describe('AIDailyInsightWidget - Template Headlines', () => {
    it('should display headline emoji', () => {
      expect(dailyWidgetSource).toContain('headline.emoji');
    });

    it('should display headline text', () => {
      expect(dailyWidgetSource).toContain('headline.text');
    });

    it('should not contain inline prompt building (moved to DailyInsightPromptBuilder)', () => {
      expect(dailyWidgetSource).not.toContain('function buildDailyWidgetPrompt');
      expect(dailyWidgetSource).not.toContain('Nourished Calm');
    });

    it('should not contain inline fallback templates (moved to WidgetHeadlineEngine)', () => {
      expect(dailyWidgetSource).not.toContain('INSIGHT_TEMPLATES');
      expect(dailyWidgetSource).not.toContain('function generateFallbackInsight');
    });
  });

  describe('AIDailyInsightWidget - Navigation', () => {
    it('should import useRouter from expo-router', () => {
      expect(dailyWidgetSource).toContain('useRouter');
      expect(dailyWidgetSource).toContain('expo-router');
    });

    it('should navigate to /daily-insights on press', () => {
      expect(dailyWidgetSource).toContain("'/daily-insights'");
      expect(dailyWidgetSource).toContain('router.push');
    });

    it('should show explore CTA', () => {
      expect(dailyWidgetSource).toContain("Explore Today's Insights");
    });

    it('should disable navigation in edit mode', () => {
      expect(dailyWidgetSource).toContain('isEditMode');
    });
  });

  describe('AIDailyInsightWidget - Loading & Empty States', () => {
    it('should show skeleton loading when not loaded', () => {
      expect(dailyWidgetSource).toContain('!isLoaded');
      expect(dailyWidgetSource).toContain('skeletonLine');
    });

    it('should show empty state when no meals logged', () => {
      expect(dailyWidgetSource).toContain('todayMealCount === 0');
      expect(dailyWidgetSource).toContain('Log your first meal');
    });

    it('should not contain old loading text', () => {
      expect(dailyWidgetSource).not.toContain('Generating insight...');
      expect(dailyWidgetSource).not.toContain('No insight available');
    });
  });

  describe('AIDailyInsightWidget - Premium & Refresh', () => {
    it('should maintain premium gating', () => {
      expect(dailyWidgetSource).toContain('isPremium');
      expect(dailyWidgetSource).toContain('LockedContentArea');
    });

    it('should support refresh functionality', () => {
      expect(dailyWidgetSource).toContain('handleRefresh');
      expect(dailyWidgetSource).toContain('refresh-outline');
    });

    it('should refresh via dailyInsightStore', () => {
      expect(dailyWidgetSource).toContain('useDailyInsightStore.getState().refreshData()');
    });

    it('should not contain cloud LLM references', () => {
      expect(dailyWidgetSource).not.toContain('cloud LLM');
    });

    it('should use sparkles icon', () => {
      expect(dailyWidgetSource).toContain('sparkles');
    });

    it('should display Daily Insight title', () => {
      expect(dailyWidgetSource).toContain('Daily Insight');
    });
  });

  // ========================================
  // WEEKLY RECAP WIDGET (Redesigned)
  // ========================================

  describe('WeeklyRecapWidget - Data Layer', () => {
    it('should import food log and goal stores', () => {
      expect(weeklyWidgetSource).toContain('useFoodLogStore');
      expect(weeklyWidgetSource).toContain('useGoalStore');
    });

    it('should import QuestionScorer for headline generation', () => {
      expect(weeklyWidgetSource).toContain('QuestionScorer');
      expect(weeklyWidgetSource).toContain('@/features/weekly-insights/services/QuestionScorer');
    });

    it('should import generateHeadline from headline templates', () => {
      expect(weeklyWidgetSource).toContain('generateHeadline');
      expect(weeklyWidgetSource).toContain('headlineTemplates');
    });

    it('should import MiniCalendar component', () => {
      expect(weeklyWidgetSource).toContain('MiniCalendar');
      expect(weeklyWidgetSource).toContain('@/features/weekly-insights/components/MiniCalendar');
    });

    it('should import week utility functions', () => {
      expect(weeklyWidgetSource).toContain('getWeekStart');
      expect(weeklyWidgetSource).toContain('addDays');
    });

    it('should not import LLMService directly (delegated to screen)', () => {
      expect(weeklyWidgetSource).not.toContain("import { LLMService }");
    });

    it('should not import AsyncStorage directly', () => {
      expect(weeklyWidgetSource).not.toContain('AsyncStorage');
    });
  });

  describe('WeeklyRecapWidget - Week Data Computation', () => {
    it('should build week data with useMemo', () => {
      expect(weeklyWidgetSource).toContain('useMemo');
    });

    it('should compute days from store entries', () => {
      expect(weeklyWidgetSource).toContain('entries.forEach');
      expect(weeklyWidgetSource).toContain('dayMap');
    });

    it('should track calories and protein per day', () => {
      expect(weeklyWidgetSource).toContain('calories');
      expect(weeklyWidgetSource).toContain('protein');
    });

    it('should use calorie and protein goals from store', () => {
      expect(weeklyWidgetSource).toContain('calorieGoal');
      expect(weeklyWidgetSource).toContain('proteinGoal');
    });

    it('should score questions for headline generation', () => {
      expect(weeklyWidgetSource).toContain('QuestionScorer.scoreAllQuestions');
      expect(weeklyWidgetSource).toContain('QuestionScorer.selectTopQuestions');
    });

    it('should generate headline from top question', () => {
      expect(weeklyWidgetSource).toContain('generateHeadline');
      expect(weeklyWidgetSource).toContain('DEFAULT_HEADLINE');
    });

    it('should require at least 2 logged days for question scoring', () => {
      expect(weeklyWidgetSource).toContain('loggedCount >= 2');
    });
  });

  describe('WeeklyRecapWidget - Navigation', () => {
    it('should import useRouter from expo-router', () => {
      expect(weeklyWidgetSource).toContain('useRouter');
      expect(weeklyWidgetSource).toContain('expo-router');
    });

    it('should navigate to /weekly-insights on CTA press', () => {
      expect(weeklyWidgetSource).toContain("'/weekly-insights'");
      expect(weeklyWidgetSource).toContain('router.push');
    });

    it('should show explore CTA', () => {
      expect(weeklyWidgetSource).toContain('Explore your week');
    });

    it('should disable navigation in edit mode', () => {
      expect(weeklyWidgetSource).toContain('isEditMode');
    });
  });

  describe('WeeklyRecapWidget - UI States', () => {
    it('should show empty state when no data logged', () => {
      expect(weeklyWidgetSource).toContain('No data logged this week yet');
    });

    it('should maintain premium gating', () => {
      expect(weeklyWidgetSource).toContain('isPremium');
      expect(weeklyWidgetSource).toContain('LockedContentArea');
    });

    it('should use MiniCalendar component', () => {
      expect(weeklyWidgetSource).toContain('<MiniCalendar');
      expect(weeklyWidgetSource).toContain('days={days}');
    });

    it('should display headline text', () => {
      expect(weeklyWidgetSource).toContain('{headline}');
      expect(weeklyWidgetSource).toContain('headlineText');
    });

    it('should show streak badge when streak >= 3', () => {
      expect(weeklyWidgetSource).toContain('streak');
      expect(weeklyWidgetSource).toContain('flame');
      expect(weeklyWidgetSource).toContain('>= 3');
    });

    it('should use calendar-outline icon in header', () => {
      expect(weeklyWidgetSource).toContain('calendar-outline');
    });

    it('should display Weekly Insights title', () => {
      expect(weeklyWidgetSource).toContain('Weekly Insights');
    });
  });
});

describe('LLM Service Structure', () => {
  let llmServiceSource: string;

  beforeAll(() => {
    llmServiceSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/insights/services/LLMService.ts'),
      'utf-8'
    );
  });

  it('should export singleton LLMService instance', () => {
    expect(llmServiceSource).toContain('export const LLMService = new LLMServiceClass()');
  });

  it('should have getStatus method', () => {
    expect(llmServiceSource).toContain('async getStatus()');
  });

  it('should have generate method', () => {
    expect(llmServiceSource).toContain('async generate(');
  });

  it('should have downloadModel method', () => {
    expect(llmServiceSource).toContain('async downloadModel(');
  });

  it('should have cancelDownload method', () => {
    expect(llmServiceSource).toContain('cancelDownload()');
  });

  it('should have deleteModel method', () => {
    expect(llmServiceSource).toContain('async deleteModel()');
  });

  it('should handle Expo Go gracefully', () => {
    expect(llmServiceSource).toContain('isExpoGo');
    expect(llmServiceSource).toContain("'unsupported'");
  });

  it('should support temperature and top_p configuration', () => {
    expect(llmServiceSource).toContain('temperature: 0.7');
    expect(llmServiceSource).toContain('top_p: 0.9');
  });
});

describe('Insights Store Structure', () => {
  let storeSource: string;

  beforeAll(() => {
    storeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/insights/stores/insightsStore.ts'),
      'utf-8'
    );
  });

  it('should export useInsightsStore', () => {
    expect(storeSource).toContain('export const useInsightsStore');
  });

  it('should track LLM status', () => {
    expect(storeSource).toContain('llmStatus: LLMStatus');
  });

  it('should track download progress', () => {
    expect(storeSource).toContain('downloadProgress: LLMDownloadProgress');
  });

  it('should have setLLMStatus action', () => {
    expect(storeSource).toContain('setLLMStatus');
  });

  it('should cache insights', () => {
    expect(storeSource).toContain('cachedInsights');
    expect(storeSource).toContain('setInsights');
  });

  it('should have shouldRegenerateInsights method', () => {
    expect(storeSource).toContain('shouldRegenerateInsights');
  });

  it('should use 4-hour cache duration', () => {
    expect(storeSource).toContain('4 * 60 * 60 * 1000');
  });

  it('should persist with AsyncStorage', () => {
    expect(storeSource).toContain('persist');
    expect(storeSource).toContain('insights-storage');
  });
});

describe('Insight Prompt Builder', () => {
  let promptBuilderSource: string;

  beforeAll(() => {
    promptBuilderSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/insights/services/InsightPromptBuilder.ts'),
      'utf-8'
    );
  });

  it('should export buildInsightPrompt function', () => {
    expect(promptBuilderSource).toContain('export function buildInsightPrompt');
  });

  it('should export parseInsightResponse function', () => {
    expect(promptBuilderSource).toContain('export function parseInsightResponse');
  });

  it('should validate insight categories', () => {
    expect(promptBuilderSource).toContain('macro_balance');
    expect(promptBuilderSource).toContain('protein');
    expect(promptBuilderSource).toContain('consistency');
    expect(promptBuilderSource).toContain('hydration');
  });

  it('should include user goal in prompt', () => {
    expect(promptBuilderSource).toContain('data.userGoal');
  });

  it('should include today food data in prompt', () => {
    expect(promptBuilderSource).toContain('data.todayCalories');
    expect(promptBuilderSource).toContain('data.todayProtein');
  });

  it('should include 7-day averages in prompt', () => {
    expect(promptBuilderSource).toContain('data.avgCalories7d');
    expect(promptBuilderSource).toContain('data.avgProtein7d');
  });

  it('should request JSON output format', () => {
    expect(promptBuilderSource).toContain('JSON only');
    expect(promptBuilderSource).toContain('"insights"');
  });

  it('should enforce Nourished Calm voice rules', () => {
    expect(promptBuilderSource).toContain('encouraging, never judgmental');
    expect(promptBuilderSource).toContain('Consider...');
  });
});

describe('Fallback Insights Service', () => {
  let fallbackSource: string;

  beforeAll(() => {
    fallbackSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/insights/services/FallbackInsights.ts'),
      'utf-8'
    );
  });

  it('should export generateFallbackInsights function', () => {
    expect(fallbackSource).toContain('export function generateFallbackInsights');
  });

  it('should export getEmptyStateMessage function', () => {
    expect(fallbackSource).toContain('export function getEmptyStateMessage');
  });

  it('should handle new users (< 3 days)', () => {
    expect(fallbackSource).toContain('data.daysUsingApp < 3');
  });

  it('should handle no meals logged', () => {
    expect(fallbackSource).toContain('todayMealCount === 0');
  });

  it('should check protein pacing', () => {
    expect(fallbackSource).toContain('proteinPercent');
    expect(fallbackSource).toContain('protein');
  });

  it('should celebrate logging streaks', () => {
    expect(fallbackSource).toContain('loggingStreak >= 3');
  });

  it('should limit to 3 insights', () => {
    expect(fallbackSource).toContain('slice(0, 3)');
  });
});

describe('Widget-LLM Integration Consistency', () => {
  let dailyWidgetSource: string;
  let weeklyWidgetSource: string;
  let dailyInsightsSectionSource: string;

  beforeAll(() => {
    dailyWidgetSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/dashboard/widgets/AIDailyInsightWidget.tsx'),
      'utf-8'
    );
    weeklyWidgetSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/dashboard/widgets/WeeklyRecapWidget.tsx'),
      'utf-8'
    );
    dailyInsightsSectionSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/insights/components/DailyInsightsSection.tsx'),
      'utf-8'
    );
  });

  it('should daily widget use new daily insight system', () => {
    expect(dailyWidgetSource).toContain('useDailyInsightData');
    expect(dailyWidgetSource).toContain('useDailyInsightStore');
  });

  it('should weekly widget use QuestionScorer for headlines', () => {
    expect(weeklyWidgetSource).toContain('QuestionScorer');
    expect(weeklyWidgetSource).toContain('generateHeadline');
  });

  it('should DailyInsightsSection use insight generation hook', () => {
    expect(dailyInsightsSectionSource).toContain('useInsightGeneration');
  });

  it('should both widgets be thin gateway widgets (no direct LLM)', () => {
    expect(dailyWidgetSource).not.toContain("import { LLMService }");
    expect(weeklyWidgetSource).not.toContain("import { LLMService }");
  });

  it('should both widgets maintain premium gating', () => {
    expect(dailyWidgetSource).toContain('LockedContentArea');
    expect(weeklyWidgetSource).toContain('LockedContentArea');
  });

  it('should daily widget navigate to daily-insights screen', () => {
    expect(dailyWidgetSource).toContain("'/daily-insights'");
  });

  it('should weekly widget navigate to weekly-insights screen', () => {
    expect(weeklyWidgetSource).toContain("'/weekly-insights'");
  });

  it('should both widgets use expo-router for navigation', () => {
    expect(dailyWidgetSource).toContain('useRouter');
    expect(weeklyWidgetSource).toContain('useRouter');
  });
});
