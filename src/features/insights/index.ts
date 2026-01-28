/**
 * Smart Insights Feature
 * On-device LLM-powered nutrition insights and deficiency alerts
 */

// Components
export { DailyInsightsSection } from './components/DailyInsightsSection';
export { InsightCard } from './components/InsightCard';
export { DeficiencyAlertCard } from './components/DeficiencyAlertCard';
export { InsightsEmptyState } from './components/InsightsEmptyState';
export { InsightsLoadingState } from './components/InsightsLoadingState';
export { ModelDownloadProgress } from './components/ModelDownloadProgress';

// Hooks
export { useInsightsData } from './hooks/useInsightsData';
export { useInsightGeneration } from './hooks/useInsightGeneration';
export { useDeficiencyAlerts } from './hooks/useDeficiencyAlerts';

// Stores
export { useInsightsStore } from './stores/insightsStore';
export { useAlertDismissalStore } from './stores/alertDismissalStore';

// Services
export { LLMService, MODEL_CONFIG, DEVICE_REQUIREMENTS } from './services/LLMService';
export { buildInsightPrompt, parseInsightResponse, getCategoryIcon, getCategoryTitle } from './services/InsightPromptBuilder';
export { generateFallbackInsights, getEmptyStateMessage } from './services/FallbackInsights';
export { calculateDeficiencies, getSeverityColor, getSeverityIcon } from './services/DeficiencyCalculator';

// Constants
export { NUTRIENT_CONFIGS, ALERT_REQUIREMENTS, getNutrientConfig, getAlertableNutrients } from './constants/nutrientThresholds';
export { NUTRIENT_FOOD_SOURCES, getFoodSuggestions, getFormattedFoodSuggestions } from './constants/foodSources';

// Types
export type {
  Insight,
  InsightCategory,
  CachedInsights,
  InsightInputData,
  DeficiencyCheck,
  DeficiencySeverity,
  NutrientDailyData,
  AlertDismissal,
  LLMStatus,
  LLMDownloadProgress,
  LLMCapabilities,
} from './types/insights.types';
