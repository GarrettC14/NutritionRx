/**
 * API Configuration
 */

// USDA FoodData Central API
// Register for a free API key at: https://fdc.nal.usda.gov/api-key-signup.html
export const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';

export const usdaConfig = {
  baseUrl: 'https://api.nal.usda.gov/fdc/v1',
  apiKey: USDA_API_KEY,
  // Rate limits: 3,600 requests/hour per key (DEMO_KEY: 30/hour)
  rateLimitPerHour: USDA_API_KEY === 'DEMO_KEY' ? 30 : 3600,
} as const;

// Cache durations for USDA data
export const USDA_CACHE_DURATIONS = {
  searchResults: 24 * 60 * 60 * 1000,       // 24 hours
  foodDetails: 30 * 24 * 60 * 60 * 1000,    // 30 days
} as const;
