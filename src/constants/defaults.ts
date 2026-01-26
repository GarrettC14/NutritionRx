// Default settings for users who skip onboarding
export const DEFAULT_SETTINGS = {
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 150,  // ~30%
  dailyCarbsGoal: 200,    // ~40%
  dailyFatGoal: 65,       // ~30%
  weightUnit: 'lbs' as const,
  theme: 'dark' as const,
  hasSeenOnboarding: false,
  onboardingSkipped: false,
  notificationsEnabled: false,
  reminderTime: null as string | null,
} as const;

// Activity level multipliers for TDEE calculation
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
} as const;

// Calorie conversion constants
export const CALORIES_PER_KG = 7700;
export const CALORIES_PER_LB = 3500;

// Macro calories per gram
export const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

// Safety guardrails
export const CALORIE_FLOORS = {
  male: 1500,
  female: 1200,
} as const;

// Maximum weight loss/gain rates (% of bodyweight per week)
export const MAX_RATE_PERCENT = {
  loss: 1.0,
  gain: 0.5,
} as const;

// Weight trend smoothing factor (exponential moving average)
export const WEIGHT_SMOOTHING_FACTOR = 0.1;

// Data quality thresholds
export const DATA_QUALITY_THRESHOLDS = {
  good: 5,     // 5+ days logged
  partial: 3,  // 3-4 days logged
} as const;

// Maximum weekly adjustment limits
export const MAX_WEEKLY_ADJUSTMENTS = {
  burnEstimate: 150,    // kcal
  calorieTarget: 200,   // kcal
} as const;

// Database version
export const DATABASE_VERSION = 1;
export const DATABASE_NAME = 'nutritionrx.db';

// API endpoints
export const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v0/product';

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
  foodItem: 7 * 24 * 60 * 60 * 1000,  // 7 days
  searchResults: 24 * 60 * 60 * 1000,  // 24 hours
} as const;

// Search settings
export const SEARCH_SETTINGS = {
  debounceMs: 300,
  minQueryLength: 2,
  maxResults: 50,
  recentLimit: 10,
  frequentLimit: 10,
} as const;

// Rate options for goal setting
export const RATE_OPTIONS = [
  { value: 0.25, label: 'Gentle', description: '~0.5 lbs/week', sublabel: 'Easiest to sustain' },
  { value: 0.5, label: 'Steady', description: '~1 lb/week', sublabel: 'Works for most people', recommended: true },
  { value: 0.75, label: 'Ambitious', description: '~1.5 lbs/week', sublabel: 'Requires more discipline' },
  { value: 1.0, label: 'Aggressive', description: '~2 lbs/week', sublabel: 'Harder to maintain' },
] as const;

// Activity level options
export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Not very active', description: 'Desk job, not much movement' },
  { value: 'lightly_active', label: 'A little active', description: 'Some walking, light exercise 1-2x/week' },
  { value: 'moderately_active', label: 'Fairly active', description: 'Regular exercise 3-4x/week', default: true },
  { value: 'very_active', label: 'Very active', description: 'Hard workouts 5-6x/week' },
  { value: 'extremely_active', label: 'Extremely active', description: 'Intense daily training or physical job' },
] as const;

export type WeightUnit = 'kg' | 'lbs';
export type Theme = 'dark' | 'light' | 'auto';
export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;
