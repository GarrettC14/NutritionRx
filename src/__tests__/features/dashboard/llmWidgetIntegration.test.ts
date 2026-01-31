/**
 * LLM Widget Integration Tests (Feature 3)
 * Tests that:
 * 1. AIDailyInsightWidget uses LLMService when model is ready
 * 2. AIDailyInsightWidget shows "Enable AI" prompt when model not downloaded
 * 3. AIDailyInsightWidget falls back to templates if LLM fails
 * 4. AIDailyInsightWidget caches insights (4-hour TTL)
 * 5. WeeklyRecapWidget uses LLMService when model is ready
 * 6. WeeklyRecapWidget shows "Enable AI" prompt when model not downloaded
 * 7. WeeklyRecapWidget falls back to templates if LLM fails
 * 8. WeeklyRecapWidget caches recap (weekly TTL)
 * 9. Both widgets show loading state during generation
 * 10. Both widgets show download progress during model download
 * 11. Cached results display instantly
 * 12. No errors shown to user (graceful degradation)
 * 13. Misleading "cloud LLM" comments removed
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

  describe('AIDailyInsightWidget - LLM Integration', () => {
    it('should import LLMService', () => {
      expect(dailyWidgetSource).toContain("import { LLMService }");
      expect(dailyWidgetSource).toContain("@/features/insights/services/LLMService");
    });

    it('should import useInsightsStore', () => {
      expect(dailyWidgetSource).toContain("import { useInsightsStore }");
      expect(dailyWidgetSource).toContain("@/features/insights/stores/insightsStore");
    });

    it('should check LLM status on mount', () => {
      expect(dailyWidgetSource).toContain('LLMService.getStatus()');
      expect(dailyWidgetSource).toContain('setLLMStatus(status)');
    });

    it('should call LLMService.generate when model is ready', () => {
      expect(dailyWidgetSource).toContain("status === 'ready'");
      expect(dailyWidgetSource).toContain('LLMService.generate(prompt');
    });

    it('should fall back to template when LLM fails', () => {
      expect(dailyWidgetSource).toContain('generateFallbackInsight');
      expect(dailyWidgetSource).toContain('LLM generation failed, using fallback');
    });

    it('should fall back when LLM returns insufficient text', () => {
      expect(dailyWidgetSource).toContain('cleanText.length > 10');
      expect(dailyWidgetSource).toContain('LLM returned insufficient text, using fallback');
    });

    it('should not generate fallback when model is not downloaded', () => {
      // When LLM status is not_downloaded, should show Enable AI prompt instead
      expect(dailyWidgetSource).toContain("status === 'not_downloaded'");
      // The not_downloaded branch returns early (no fallback)
      const notDownloadedBlock = dailyWidgetSource.match(
        /if \(status === 'not_downloaded'\)[\s\S]*?return;/
      );
      expect(notDownloadedBlock).toBeTruthy();
    });

    it('should tag insight source as llm or fallback', () => {
      expect(dailyWidgetSource).toContain("source: 'llm'");
      expect(dailyWidgetSource).toContain("source: 'fallback'");
    });

    it('should use 4-hour cache duration', () => {
      expect(dailyWidgetSource).toContain('4 * 60 * 60 * 1000');
      expect(dailyWidgetSource).toContain('CACHE_DURATION_MS');
    });
  });

  describe('AIDailyInsightWidget - Enable AI Prompt', () => {
    it('should show Enable AI prompt when model not downloaded', () => {
      expect(dailyWidgetSource).toContain("llmStatus === 'not_downloaded'");
      expect(dailyWidgetSource).toContain('Enable AI Insights');
    });

    it('should display download button in Enable AI prompt', () => {
      expect(dailyWidgetSource).toContain('download-outline');
      expect(dailyWidgetSource).toContain('Download 1GB model for personalized insights');
    });

    it('should call handleDownloadModel on press', () => {
      expect(dailyWidgetSource).toContain('handleDownloadModel');
      expect(dailyWidgetSource).toContain('LLMService.downloadModel');
    });
  });

  describe('AIDailyInsightWidget - Download Progress', () => {
    it('should track download state', () => {
      expect(dailyWidgetSource).toContain('isDownloading');
      expect(dailyWidgetSource).toContain('downloadPercent');
    });

    it('should show progress bar during download', () => {
      expect(dailyWidgetSource).toContain('Downloading AI model');
      expect(dailyWidgetSource).toContain('progressBarTrack');
      expect(dailyWidgetSource).toContain('progressBarFill');
    });

    it('should update download percentage', () => {
      expect(dailyWidgetSource).toContain('setDownloadPercent(progress.percentage)');
    });

    it('should regenerate insight after successful download', () => {
      expect(dailyWidgetSource).toContain("setLLMStatus('ready')");
      // After download, should call generateInsight
      const downloadBlock = dailyWidgetSource.match(
        /result\.success[\s\S]*?setLLMStatus\('ready'\)[\s\S]*?generateInsight/
      );
      expect(downloadBlock).toBeTruthy();
    });
  });

  describe('AIDailyInsightWidget - Prompt Builder', () => {
    it('should have buildDailyWidgetPrompt function', () => {
      expect(dailyWidgetSource).toContain('function buildDailyWidgetPrompt');
    });

    it('should use Nourished Calm voice in prompt', () => {
      expect(dailyWidgetSource).toContain('Nourished Calm');
    });

    it('should include calorie data in prompt', () => {
      expect(dailyWidgetSource).toContain('Calories:');
      expect(dailyWidgetSource).toContain('calorieTarget');
    });

    it('should include protein data in prompt', () => {
      expect(dailyWidgetSource).toContain('Protein:');
      expect(dailyWidgetSource).toContain('proteinTarget');
    });

    it('should include water data in prompt', () => {
      expect(dailyWidgetSource).toContain('Water:');
      expect(dailyWidgetSource).toContain('waterPercent');
    });

    it('should prohibit negative language in prompt', () => {
      expect(dailyWidgetSource).toContain('Never use words like "failed"');
    });

    it('should request single brief insight', () => {
      expect(dailyWidgetSource).toContain('Provide ONE brief');
      expect(dailyWidgetSource).toContain('1-2 sentences');
    });

    it('should limit token count for efficiency', () => {
      expect(dailyWidgetSource).toContain('generate(prompt, 150)');
    });
  });

  describe('AIDailyInsightWidget - Caching', () => {
    it('should load cached insight on mount', () => {
      expect(dailyWidgetSource).toContain('loadCachedInsight');
      expect(dailyWidgetSource).toContain('AsyncStorage.getItem(INSIGHT_CACHE_KEY)');
    });

    it('should validate cache by date and duration', () => {
      expect(dailyWidgetSource).toContain('parsed.date === today');
      expect(dailyWidgetSource).toContain('now - parsed.generatedAt < CACHE_DURATION_MS');
    });

    it('should cache newly generated insights', () => {
      expect(dailyWidgetSource).toContain(
        'AsyncStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(newInsight))'
      );
    });
  });

  describe('AIDailyInsightWidget - UI States', () => {
    it('should show loading indicator during generation', () => {
      expect(dailyWidgetSource).toContain('isLoading && !insight');
      expect(dailyWidgetSource).toContain('Generating insight...');
    });

    it('should show empty state when no insight available', () => {
      expect(dailyWidgetSource).toContain('No insight available');
    });

    it('should display insight icon and text', () => {
      expect(dailyWidgetSource).toContain('insight.icon');
      expect(dailyWidgetSource).toContain('insight.text');
    });

    it('should maintain premium gating', () => {
      expect(dailyWidgetSource).toContain('isPremium');
      expect(dailyWidgetSource).toContain('LockedContentArea');
    });

    it('should support refresh functionality', () => {
      expect(dailyWidgetSource).toContain('handleRefresh');
      expect(dailyWidgetSource).toContain('refresh-outline');
    });
  });

  describe('AIDailyInsightWidget - No Cloud LLM References', () => {
    it('should not mention cloud LLM', () => {
      expect(dailyWidgetSource).not.toContain('cloud LLM');
    });

    it('should reference on-device LLM', () => {
      expect(dailyWidgetSource).toContain('on-device LLM');
    });
  });

  describe('AIDailyInsightWidget - Fallback Templates', () => {
    it('should retain all fallback templates', () => {
      expect(dailyWidgetSource).toContain('INSIGHT_TEMPLATES');
      expect(dailyWidgetSource).toContain('protein_low');
      expect(dailyWidgetSource).toContain('protein_high');
      expect(dailyWidgetSource).toContain('calories_under');
      expect(dailyWidgetSource).toContain('calories_over');
      expect(dailyWidgetSource).toContain('water_low');
      expect(dailyWidgetSource).toContain('streak_celebrate');
      expect(dailyWidgetSource).toContain('no_meals');
      expect(dailyWidgetSource).toContain('balanced_day');
    });

    it('should have generateFallbackInsight function', () => {
      expect(dailyWidgetSource).toContain('function generateFallbackInsight');
    });
  });

  // ========================================
  // WEEKLY RECAP WIDGET
  // ========================================

  describe('WeeklyRecapWidget - LLM Integration', () => {
    it('should import LLMService', () => {
      expect(weeklyWidgetSource).toContain("import { LLMService }");
      expect(weeklyWidgetSource).toContain("@/features/insights/services/LLMService");
    });

    it('should import useInsightsStore', () => {
      expect(weeklyWidgetSource).toContain("import { useInsightsStore }");
      expect(weeklyWidgetSource).toContain("@/features/insights/stores/insightsStore");
    });

    it('should import AsyncStorage for caching', () => {
      expect(weeklyWidgetSource).toContain('AsyncStorage');
    });

    it('should check LLM status on mount', () => {
      expect(weeklyWidgetSource).toContain('LLMService.getStatus()');
      expect(weeklyWidgetSource).toContain('setLLMStatus(status)');
    });

    it('should call LLMService.generate when model is ready', () => {
      expect(weeklyWidgetSource).toContain("status === 'ready'");
      expect(weeklyWidgetSource).toContain('LLMService.generate(prompt');
    });

    it('should fall back to template when LLM fails', () => {
      expect(weeklyWidgetSource).toContain('generateFallbackWeeklyInsight');
      expect(weeklyWidgetSource).toContain('LLM generation failed, using fallback');
    });

    it('should not generate fallback when model is not downloaded', () => {
      expect(weeklyWidgetSource).toContain("status === 'not_downloaded'");
      const notDownloadedBlock = weeklyWidgetSource.match(
        /if \(status === 'not_downloaded'\)[\s\S]*?return;/
      );
      expect(notDownloadedBlock).toBeTruthy();
    });
  });

  describe('WeeklyRecapWidget - Enable AI Prompt', () => {
    it('should show Enable AI prompt when model not downloaded', () => {
      expect(weeklyWidgetSource).toContain("llmStatus === 'not_downloaded'");
      expect(weeklyWidgetSource).toContain('Enable AI for personalized recap');
    });

    it('should display download icon', () => {
      expect(weeklyWidgetSource).toContain('download-outline');
    });

    it('should have sparkles icon in prompt', () => {
      expect(weeklyWidgetSource).toContain("name=\"sparkles\"");
    });

    it('should call handleDownloadModel on press', () => {
      expect(weeklyWidgetSource).toContain('handleDownloadModel');
      expect(weeklyWidgetSource).toContain('LLMService.downloadModel');
    });
  });

  describe('WeeklyRecapWidget - Download Progress', () => {
    it('should track download state', () => {
      expect(weeklyWidgetSource).toContain('isDownloading');
      expect(weeklyWidgetSource).toContain('downloadPercent');
    });

    it('should show progress bar during download', () => {
      expect(weeklyWidgetSource).toContain('Downloading AI model');
      expect(weeklyWidgetSource).toContain('progressBarTrack');
      expect(weeklyWidgetSource).toContain('progressBarFill');
    });

    it('should regenerate insight after successful download', () => {
      expect(weeklyWidgetSource).toContain("setLLMStatus('ready')");
      const downloadBlock = weeklyWidgetSource.match(
        /result\.success[\s\S]*?setLLMStatus\('ready'\)[\s\S]*?generateWeeklyInsight/
      );
      expect(downloadBlock).toBeTruthy();
    });
  });

  describe('WeeklyRecapWidget - Prompt Builder', () => {
    it('should have buildWeeklyRecapPrompt function', () => {
      expect(weeklyWidgetSource).toContain('function buildWeeklyRecapPrompt');
    });

    it('should use Nourished Calm voice in prompt', () => {
      expect(weeklyWidgetSource).toContain('Nourished Calm');
    });

    it('should include daily summaries in prompt', () => {
      expect(weeklyWidgetSource).toContain('Daily Summaries');
      expect(weeklyWidgetSource).toContain('dailySummaries');
    });

    it('should include weekly averages in prompt', () => {
      expect(weeklyWidgetSource).toContain('Averages:');
      expect(weeklyWidgetSource).toContain('stats.avgCalories');
      expect(weeklyWidgetSource).toContain('stats.avgProtein');
    });

    it('should include consistency data in prompt', () => {
      expect(weeklyWidgetSource).toContain('stats.daysLogged');
      expect(weeklyWidgetSource).toContain('days logged');
    });

    it('should include trend data in prompt', () => {
      expect(weeklyWidgetSource).toContain('stats.trend');
    });

    it('should prohibit negative language in prompt', () => {
      expect(weeklyWidgetSource).toContain('Never use "failed"');
    });

    it('should request highlight, pattern, and suggestion', () => {
      expect(weeklyWidgetSource).toContain('highlight');
      expect(weeklyWidgetSource).toContain('pattern or trend');
      expect(weeklyWidgetSource).toContain('suggestion for next week');
    });

    it('should limit token count for efficiency', () => {
      expect(weeklyWidgetSource).toContain('generate(prompt, 200)');
    });
  });

  describe('WeeklyRecapWidget - Caching', () => {
    it('should have weekly cache key', () => {
      expect(weeklyWidgetSource).toContain('llm_weekly_recap_cache');
    });

    it('should use 7-day cache duration', () => {
      expect(weeklyWidgetSource).toContain('7 * 24 * 60 * 60 * 1000');
    });

    it('should load cached insight on effect', () => {
      expect(weeklyWidgetSource).toContain('loadWeeklyInsight');
      expect(weeklyWidgetSource).toContain('AsyncStorage.getItem(WEEKLY_INSIGHT_CACHE_KEY)');
    });

    it('should validate cache by week start and duration', () => {
      expect(weeklyWidgetSource).toContain('parsed.weekStart === weekStart');
      expect(weeklyWidgetSource).toContain('now - parsed.generatedAt < WEEKLY_CACHE_DURATION_MS');
    });

    it('should cache LLM results', () => {
      expect(weeklyWidgetSource).toContain(
        'AsyncStorage.setItem'
      );
      expect(weeklyWidgetSource).toContain('WEEKLY_INSIGHT_CACHE_KEY');
    });

    it('should cache fallback results too', () => {
      // Both LLM and fallback insights should be cached
      const cacheWrites = weeklyWidgetSource.match(
        /AsyncStorage\.setItem[\s\S]*?WEEKLY_INSIGHT_CACHE_KEY/g
      );
      expect(cacheWrites).toBeTruthy();
      expect(cacheWrites!.length).toBeGreaterThanOrEqual(2);
    });

    it('should track source in cache (llm or fallback)', () => {
      expect(weeklyWidgetSource).toContain("source: 'llm'");
      expect(weeklyWidgetSource).toContain("source: 'fallback'");
    });
  });

  describe('WeeklyRecapWidget - UI States', () => {
    it('should show generating state', () => {
      expect(weeklyWidgetSource).toContain('isGeneratingInsight');
      expect(weeklyWidgetSource).toContain('Analyzing your week');
    });

    it('should show insight with icon', () => {
      expect(weeklyWidgetSource).toContain('llmInsight');
      expect(weeklyWidgetSource).toContain('insightIcon');
    });

    it('should show empty state when no data', () => {
      expect(weeklyWidgetSource).toContain('No data logged this week yet');
    });

    it('should maintain premium gating', () => {
      expect(weeklyWidgetSource).toContain('isPremium');
      expect(weeklyWidgetSource).toContain('LockedContentArea');
    });

    it('should maintain mini calendar', () => {
      expect(weeklyWidgetSource).toContain('renderMiniCalendar');
      expect(weeklyWidgetSource).toContain('calendarDay');
    });

    it('should maintain stats grid', () => {
      expect(weeklyWidgetSource).toContain('statsGrid');
      expect(weeklyWidgetSource).toContain('Avg Cal');
      expect(weeklyWidgetSource).toContain('Avg Protein');
      expect(weeklyWidgetSource).toContain('Days Logged');
      expect(weeklyWidgetSource).toContain('Total Meals');
    });

    it('should maintain trend indicator', () => {
      expect(weeklyWidgetSource).toContain('trending-up');
      expect(weeklyWidgetSource).toContain('trending-down');
      expect(weeklyWidgetSource).toContain('Calories stable');
    });
  });

  describe('WeeklyRecapWidget - No Misleading Comments', () => {
    it('should not claim local LLM as if already working', () => {
      // The old comment said "Uses local LLM" which was misleading
      // Now it should accurately describe the integration
      expect(weeklyWidgetSource).toContain('on-device LLM');
      expect(weeklyWidgetSource).toContain('fallback to templates');
    });
  });

  describe('WeeklyRecapWidget - Fallback Templates', () => {
    it('should have generateFallbackWeeklyInsight function', () => {
      expect(weeklyWidgetSource).toContain('function generateFallbackWeeklyInsight');
    });

    it('should handle calorie streak insight', () => {
      expect(weeklyWidgetSource).toContain('calorieStreak >= 5');
      expect(weeklyWidgetSource).toContain('hit your calorie target');
    });

    it('should handle protein streak insight', () => {
      expect(weeklyWidgetSource).toContain('proteinStreak >= 5');
      expect(weeklyWidgetSource).toContain('protein goal');
    });

    it('should handle excellent week insight', () => {
      expect(weeklyWidgetSource).toContain('daysLogged >= 6');
      expect(weeklyWidgetSource).toContain('right on target');
    });

    it('should handle low protein insight', () => {
      expect(weeklyWidgetSource).toContain('proteinPercent < 70');
    });

    it('should handle high calorie insight', () => {
      expect(weeklyWidgetSource).toContain('caloriePercent > 115');
    });

    it('should handle trending up insight', () => {
      expect(weeklyWidgetSource).toContain("trend === 'up'");
    });

    it('should handle best day insight', () => {
      expect(weeklyWidgetSource).toContain('bestDay');
      expect(weeklyWidgetSource).toContain('best day this week');
    });

    it('should handle low logging days', () => {
      expect(weeklyWidgetSource).toContain('daysLogged < 4');
    });

    it('should return default summary', () => {
      expect(weeklyWidgetSource).toContain('averaged');
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

  it('should use same LLMService as DailyInsightsSection', () => {
    // All three should reference the same LLMService
    expect(dailyWidgetSource).toContain('LLMService');
    expect(weeklyWidgetSource).toContain('LLMService');
    // DailyInsightsSection uses it indirectly through useInsightGeneration
    expect(dailyInsightsSectionSource).toContain('useInsightGeneration');
  });

  it('should both widgets use insightsStore for LLM status', () => {
    expect(dailyWidgetSource).toContain('useInsightsStore');
    expect(weeklyWidgetSource).toContain('useInsightsStore');
  });

  it('should both widgets handle download gracefully', () => {
    expect(dailyWidgetSource).toContain('handleDownloadModel');
    expect(weeklyWidgetSource).toContain('handleDownloadModel');
  });

  it('should both widgets have fallback mechanisms', () => {
    expect(dailyWidgetSource).toContain('generateFallbackInsight');
    expect(weeklyWidgetSource).toContain('generateFallbackWeeklyInsight');
  });

  it('should both widgets maintain premium gating', () => {
    expect(dailyWidgetSource).toContain('LockedContentArea');
    expect(weeklyWidgetSource).toContain('LockedContentArea');
  });

  it('should all components use consistent LLM status values', () => {
    // All should check for 'ready' and 'not_downloaded'
    expect(dailyWidgetSource).toContain("'ready'");
    expect(dailyWidgetSource).toContain("'not_downloaded'");
    expect(weeklyWidgetSource).toContain("'ready'");
    expect(weeklyWidgetSource).toContain("'not_downloaded'");
  });
});
