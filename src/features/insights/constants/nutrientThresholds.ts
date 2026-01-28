/**
 * Nutrient Thresholds and RDA Values
 * Used for deficiency alert calculations
 */

export interface NutrientConfig {
  id: string;
  name: string;
  unit: string;
  rdaDefault: number; // Default RDA (can be overridden by user settings)
  tier: 1 | 2 | 3; // Alert priority tier
  warningThresholdPercent: number; // Below this triggers warning
  concernThresholdPercent: number; // Below this triggers concern
}

// Severity thresholds as percentages of RDA
export const SEVERITY_THRESHOLDS = {
  notice: { min: 50, max: 70 },
  warning: { min: 30, max: 50 },
  concern: { min: 0, max: 30 },
} as const;

// Minimum requirements for triggering alerts
export const ALERT_REQUIREMENTS = {
  minDaysWithData: 5, // At least 5 of last 7 days must have logged foods
  minDaysUsingApp: 7, // Don't trigger alerts in first week
  maxDaysSinceLastLog: 3, // Don't trigger if user hasn't logged in 3+ days
} as const;

/**
 * Nutrient configurations
 * Tier 1: Always alert (high health impact)
 * Tier 2: Alert if significantly low
 * Tier 3: Informational only (show in micronutrients section, no alerts)
 */
export const NUTRIENT_CONFIGS: NutrientConfig[] = [
  // Tier 1 - Always Alert
  { id: 'vitamin_d', name: 'Vitamin D', unit: 'mcg', rdaDefault: 15, tier: 1, warningThresholdPercent: 50, concernThresholdPercent: 30 },
  { id: 'vitamin_b12', name: 'Vitamin B12', unit: 'mcg', rdaDefault: 2.4, tier: 1, warningThresholdPercent: 50, concernThresholdPercent: 30 },
  { id: 'iron', name: 'Iron', unit: 'mg', rdaDefault: 18, tier: 1, warningThresholdPercent: 50, concernThresholdPercent: 30 },
  { id: 'calcium', name: 'Calcium', unit: 'mg', rdaDefault: 1000, tier: 1, warningThresholdPercent: 50, concernThresholdPercent: 30 },
  { id: 'magnesium', name: 'Magnesium', unit: 'mg', rdaDefault: 400, tier: 1, warningThresholdPercent: 50, concernThresholdPercent: 30 },
  { id: 'omega_3', name: 'Omega-3', unit: 'g', rdaDefault: 1.6, tier: 1, warningThresholdPercent: 50, concernThresholdPercent: 30 },

  // Tier 2 - Alert if significantly low
  { id: 'vitamin_c', name: 'Vitamin C', unit: 'mg', rdaDefault: 90, tier: 2, warningThresholdPercent: 40, concernThresholdPercent: 25 },
  { id: 'zinc', name: 'Zinc', unit: 'mg', rdaDefault: 11, tier: 2, warningThresholdPercent: 40, concernThresholdPercent: 25 },
  { id: 'potassium', name: 'Potassium', unit: 'mg', rdaDefault: 2600, tier: 2, warningThresholdPercent: 40, concernThresholdPercent: 25 },
  { id: 'folate', name: 'Folate', unit: 'mcg', rdaDefault: 400, tier: 2, warningThresholdPercent: 40, concernThresholdPercent: 25 },
  { id: 'vitamin_a', name: 'Vitamin A', unit: 'mcg', rdaDefault: 900, tier: 2, warningThresholdPercent: 40, concernThresholdPercent: 25 },
  { id: 'fiber', name: 'Fiber', unit: 'g', rdaDefault: 28, tier: 2, warningThresholdPercent: 40, concernThresholdPercent: 25 },

  // Tier 3 - Informational only
  { id: 'vitamin_e', name: 'Vitamin E', unit: 'mg', rdaDefault: 15, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'vitamin_k', name: 'Vitamin K', unit: 'mcg', rdaDefault: 120, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'thiamine', name: 'Thiamine (B1)', unit: 'mg', rdaDefault: 1.2, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'riboflavin', name: 'Riboflavin (B2)', unit: 'mg', rdaDefault: 1.3, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'niacin', name: 'Niacin (B3)', unit: 'mg', rdaDefault: 16, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'vitamin_b6', name: 'Vitamin B6', unit: 'mg', rdaDefault: 1.7, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'phosphorus', name: 'Phosphorus', unit: 'mg', rdaDefault: 700, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'selenium', name: 'Selenium', unit: 'mcg', rdaDefault: 55, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'copper', name: 'Copper', unit: 'mg', rdaDefault: 0.9, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
  { id: 'manganese', name: 'Manganese', unit: 'mg', rdaDefault: 2.3, tier: 3, warningThresholdPercent: 0, concernThresholdPercent: 0 },
];

export function getNutrientConfig(id: string): NutrientConfig | undefined {
  return NUTRIENT_CONFIGS.find((n) => n.id === id);
}

export function getAlertableNutrients(): NutrientConfig[] {
  return NUTRIENT_CONFIGS.filter((n) => n.tier <= 2);
}

export function getNutrientsByTier(tier: 1 | 2 | 3): NutrientConfig[] {
  return NUTRIENT_CONFIGS.filter((n) => n.tier === tier);
}
