/**
 * Weekly Insights Feature
 * Barrel export for all public APIs
 */

// Types
export type {
  WeeklyQuestionCategory,
  WeeklyQuestionDefinition,
  DayData,
  WeeklyCollectedData,
  ScoredQuestion,
  QuestionAnalysisResult,
  WeeklyInsightResponse,
  WeeklyInsightsCache,
  DayStatus,
  InsightSentiment,
  KeyMetric,
  InsightToastData,
  ConsistencyAnalysis,
  OutlierAnalysis,
  TargetHitAnalysis,
  ProteinAnalysis,
  MacroBalanceAnalysis,
  SurplusDeficitAnalysis,
  CalorieTrendAnalysis,
  DayByDayAnalysis,
  HydrationAnalysis,
  MealCountAnalysis,
  WeekdayWeekendAnalysis,
  WeekComparisonAnalysis,
  ProteinTrendAnalysis,
  HighlightsAnalysis,
  FocusSuggestionAnalysis,
} from './types/weeklyInsights.types';

// Utils
export {
  getWeekStart,
  getWeekEnd,
  addDays,
  formatWeekRange,
  isCurrentWeek,
  getDayName,
  getDayOfWeek,
  DAY_NAMES,
  DAY_ABBREVIATIONS,
} from './utils/weekUtils';

export {
  mean,
  standardDeviation,
  coefficientOfVariation,
  linearRegression,
  clamp,
} from './utils/statisticsUtils';

// Constants
export {
  QUESTION_LIBRARY,
  getQuestionById,
  getQuestionsByCategory,
  getActiveQuestionIds,
} from './constants/questionLibrary';

export {
  generateHeadline,
  generatePreview,
  DEFAULT_HEADLINE,
} from './constants/headlineTemplates';

// Services
export { WeeklyDataCollector } from './services/WeeklyDataCollector';
export { QuestionScorer } from './services/QuestionScorer';
export { WeeklyPromptBuilder } from './services/WeeklyPromptBuilder';
export { WeeklyInsightGenerator } from './services/WeeklyInsightGenerator';
export { KeyMetricsExtractor } from './services/KeyMetricsExtractor';
export { SentimentDeriver } from './services/SentimentDeriver';
export {
  ConsistencyAnalyzer,
  MacroBalanceAnalyzer,
  CalorieTrendAnalyzer,
  HydrationAnalyzer,
  TimingAnalyzer,
  ComparisonAnalyzer,
  HighlightsAnalyzer,
} from './services/analyzers';

// Stores
export { useWeeklyInsightsStore } from './stores/weeklyInsightsStore';

// Hooks
export { useWeeklyData } from './hooks/useWeeklyData';
export { useWeeklyQuestions } from './hooks/useWeeklyQuestions';
export { useWeeklyInsightGeneration } from './hooks/useWeeklyInsightGeneration';

// Components
export { WeeklyInsightsScreen } from './components/WeeklyInsightsScreen';
export { MiniCalendar } from './components/MiniCalendar';
export { WeeklyStatsGrid } from './components/WeeklyStatsGrid';
export { WeekNavigation } from './components/WeekNavigation';
export { QuestionCard } from './components/QuestionCard';
export { HeadlineInsightCard } from './components/HeadlineInsightCard';
export { CategoryChips } from './components/CategoryChips';
export { InsightShimmer } from './components/InsightShimmer';
export { InsightToast } from './components/InsightToast';
export { FollowUpChips } from './components/FollowUpChips';
export { NeedsMoreDataSection } from './components/NeedsMoreDataSection';
