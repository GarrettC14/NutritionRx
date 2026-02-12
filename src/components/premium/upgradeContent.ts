import { PaywallCategory } from './analyticsEnums';

export interface CategoryContent {
  headline: string;
  subtitle: string;
  benefits: { icon: string; text: string }[];
}

export const UPGRADE_CONTENT: Record<PaywallCategory, CategoryContent> = {
  [PaywallCategory.AI_INSIGHTS]: {
    headline: 'Understand Your Nutrition with AI',
    subtitle: 'Personalized insights that learn from your eating patterns.',
    benefits: [
      { icon: '\u{1F9E0}', text: 'Weekly recaps that highlight your wins and patterns' },
      { icon: '\u{1F4AC}', text: 'Chat with an AI nutritionist about your meals' },
      { icon: '\u{1F4A1}', text: 'Personalized suggestions that fit your lifestyle' },
    ],
  },
  [PaywallCategory.SMART_LOGGING]: {
    headline: 'Log Meals in Seconds',
    subtitle: 'Photo recognition and restaurant menus make tracking effortless.',
    benefits: [
      { icon: '\u{1F4F8}', text: 'Snap a photo \u{2014} AI identifies your food instantly' },
      { icon: '\u{1F37D}\u{FE0F}', text: 'Search restaurant menus with full nutrition info' },
      { icon: '\u{26A1}', text: 'Spend less time logging, more time enjoying meals' },
    ],
  },
  [PaywallCategory.ADVANCED_NUTRITION]: {
    headline: 'Go Beyond Macros',
    subtitle: 'Deeper insights into what you\u{2019}re eating and how it supports your goals.',
    benefits: [
      { icon: '\u{1F52C}', text: 'Track 80+ micronutrients to spot nutrient gaps' },
      { icon: '\u{1F504}', text: 'Set different macro targets for different days' },
      { icon: '\u{1F4CA}', text: 'Advanced charts and trends over unlimited history' },
    ],
  },
  [PaywallCategory.DATA_EXPORT]: {
    headline: 'Your Data, Your Way',
    subtitle: 'Full control over your nutrition history and dashboard.',
    benefits: [
      { icon: '\u{1F4C1}', text: 'Export your logs to CSV for analysis anywhere' },
      { icon: '\u{1F4C5}', text: 'Unlimited history \u{2014} see your full nutrition journey' },
      { icon: '\u{1F3E0}', text: 'Customize your dashboard with the widgets you care about' },
    ],
  },
};

export interface FeatureChip {
  label: string;
  icon: string;
  category: PaywallCategory;
}

export const FEATURE_CHIPS: FeatureChip[] = [
  { label: 'AI Insights', icon: '\u{1F9E0}', category: PaywallCategory.AI_INSIGHTS },
  { label: 'Photo Logging', icon: '\u{1F4F8}', category: PaywallCategory.SMART_LOGGING },
  { label: 'Restaurant Menus', icon: '\u{1F37D}\u{FE0F}', category: PaywallCategory.SMART_LOGGING },
  { label: 'Micronutrients', icon: '\u{1F52C}', category: PaywallCategory.ADVANCED_NUTRITION },
  { label: 'Macro Cycling', icon: '\u{1F504}', category: PaywallCategory.ADVANCED_NUTRITION },
  { label: 'Nutrition Chat', icon: '\u{1F4AC}', category: PaywallCategory.AI_INSIGHTS },
  { label: 'Advanced Analytics', icon: '\u{1F4CA}', category: PaywallCategory.ADVANCED_NUTRITION },
  { label: 'Data Export', icon: '\u{1F4C1}', category: PaywallCategory.DATA_EXPORT },
];

/**
 * Maps feature names and legacy context strings to PaywallCategory.
 * Used by LockedContentArea, LockedOverlay, and PremiumGate to determine
 * which category content to show in the premium sheet.
 */
export const FEATURE_TO_CATEGORY: Record<string, PaywallCategory> = {
  // Spec feature names
  ai_insights_widget: PaywallCategory.AI_INSIGHTS,
  weekly_recap: PaywallCategory.AI_INSIGHTS,
  gpt_chat: PaywallCategory.AI_INSIGHTS,
  photo_recognition: PaywallCategory.SMART_LOGGING,
  restaurant_database: PaywallCategory.SMART_LOGGING,
  micronutrient_tracking: PaywallCategory.ADVANCED_NUTRITION,
  macro_cycling: PaywallCategory.ADVANCED_NUTRITION,
  advanced_analytics: PaywallCategory.ADVANCED_NUTRITION,
  extended_history: PaywallCategory.DATA_EXPORT,
  csv_export: PaywallCategory.DATA_EXPORT,
  customizable_dashboard: PaywallCategory.DATA_EXPORT,

  // Legacy context values from existing components
  insights: PaywallCategory.AI_INSIGHTS,
  ai_photo: PaywallCategory.SMART_LOGGING,
  restaurant: PaywallCategory.SMART_LOGGING,
  analytics: PaywallCategory.ADVANCED_NUTRITION,
  planning: PaywallCategory.ADVANCED_NUTRITION,
  coaching: PaywallCategory.AI_INSIGHTS,
  general: PaywallCategory.AI_INSIGHTS,
  micronutrients: PaywallCategory.ADVANCED_NUTRITION,
};

/** Resolve a context/feature string to a PaywallCategory, defaulting to AI_INSIGHTS. */
export function resolveCategory(context: string): PaywallCategory {
  return FEATURE_TO_CATEGORY[context] ?? PaywallCategory.AI_INSIGHTS;
}
