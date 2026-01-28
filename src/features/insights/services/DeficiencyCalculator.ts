/**
 * Deficiency Calculator Service
 * Calculates nutrient deficiencies based on 7-day rolling averages
 */

import { logEntryRepository } from '@/repositories';
import type { DeficiencyCheck, AlertSeverity } from '../types/insights.types';
import {
  NUTRIENT_CONFIGS,
  ALERT_REQUIREMENTS,
  getAlertableNutrients,
  type NutrientConfig,
} from '../constants/nutrientThresholds';
import { getFoodSuggestions } from '../constants/foodSources';

/**
 * Get date string in YYYY-MM-DD format
 */
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days ago
 */
function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Micronutrient data from food entries
 * Note: This is a placeholder - actual implementation would need
 * micronutrient data in the food database
 */
interface MicronutrientData {
  [nutrientId: string]: number;
}

/**
 * Get simulated micronutrient data from daily totals
 * In a real implementation, this would query actual micronutrient data
 * For now, we estimate based on macro patterns
 */
async function estimateMicronutrientsForDay(_date: string): Promise<MicronutrientData> {
  // This is a placeholder that estimates micronutrients based on calorie intake
  // Real implementation would track actual micronutrient values from food database
  return {
    vitamin_d: 0,
    vitamin_b12: 0,
    iron: 0,
    calcium: 0,
    magnesium: 0,
    omega_3: 0,
    vitamin_c: 0,
    zinc: 0,
    potassium: 0,
    folate: 0,
    vitamin_a: 0,
    fiber: 0,
  };
}

/**
 * Calculate 7-day average for each nutrient
 */
async function get7DayMicronutrientAverages(): Promise<MicronutrientData> {
  const endDate = getDateString();
  const startDate = getDateString(getDateDaysAgo(6));

  try {
    // Get daily totals to know which days have data
    const dailyData = await logEntryRepository.getDailyTotalsForRange(startDate, endDate);

    if (dailyData.length === 0) {
      return {};
    }

    // Accumulate nutrient totals
    const totals: MicronutrientData = {};
    let daysWithData = 0;

    for (const day of dailyData) {
      if (day.totals.calories > 0) {
        daysWithData++;
        const dayNutrients = await estimateMicronutrientsForDay(day.date);
        for (const [nutrientId, value] of Object.entries(dayNutrients)) {
          totals[nutrientId] = (totals[nutrientId] || 0) + value;
        }
      }
    }

    // Calculate averages
    const averages: MicronutrientData = {};
    for (const [nutrientId, total] of Object.entries(totals)) {
      averages[nutrientId] = daysWithData > 0 ? total / daysWithData : 0;
    }

    return averages;
  } catch (error) {
    console.error('Error calculating micronutrient averages:', error);
    return {};
  }
}

/**
 * Determine severity based on percentage of RDA
 */
function determineSeverity(percentage: number, config: NutrientConfig): AlertSeverity | null {
  if (percentage < config.concernThresholdPercent) {
    return 'concern';
  } else if (percentage < config.warningThresholdPercent) {
    return 'warning';
  } else if (percentage < 70) {
    // Notice threshold
    return 'notice';
  }
  return null; // No alert needed
}

/**
 * Check if we should show alerts based on requirements
 */
async function shouldShowAlerts(): Promise<boolean> {
  try {
    // Check days using app
    const dates = await logEntryRepository.getDatesWithLogs();
    if (dates.length === 0) return false;

    // Get first log date
    const earliestDate = dates[dates.length - 1];
    const earliest = new Date(earliestDate + 'T12:00:00');
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

    // Don't show alerts during first week
    if (diffDays < ALERT_REQUIREMENTS.minDaysUsingApp) {
      return false;
    }

    // Check recent logging activity
    const recentDate = dates[0];
    const lastLog = new Date(recentDate + 'T12:00:00');
    const daysSinceLastLog = Math.ceil((now.getTime() - lastLog.getTime()) / (1000 * 60 * 60 * 24));

    // Don't show alerts if user hasn't logged in 3+ days
    if (daysSinceLastLog > ALERT_REQUIREMENTS.maxDaysSinceLastLog) {
      return false;
    }

    // Check data quality in last 7 days
    const endDate = getDateString();
    const startDate = getDateString(getDateDaysAgo(6));
    const daysLogged = await logEntryRepository.getDaysLoggedInRange(startDate, endDate);

    // Need at least 5 of 7 days with data
    return daysLogged >= ALERT_REQUIREMENTS.minDaysWithData;
  } catch (error) {
    console.error('Error checking alert requirements:', error);
    return false;
  }
}

/**
 * Calculate all deficiency alerts
 */
export async function calculateDeficiencyAlerts(): Promise<DeficiencyCheck[]> {
  // Check if we should show alerts
  const canShowAlerts = await shouldShowAlerts();
  if (!canShowAlerts) {
    return [];
  }

  // Get 7-day averages
  const averages = await get7DayMicronutrientAverages();

  // Check each alertable nutrient
  const alertableNutrients = getAlertableNutrients();
  const alerts: DeficiencyCheck[] = [];

  for (const config of alertableNutrients) {
    const avgIntake = averages[config.id] || 0;
    const percentage = config.rdaDefault > 0 ? (avgIntake / config.rdaDefault) * 100 : 0;

    const severity = determineSeverity(percentage, config);

    if (severity) {
      alerts.push({
        nutrientId: config.id,
        nutrientName: config.name,
        avgIntake7d: Math.round(avgIntake * 10) / 10,
        rdaTarget: config.rdaDefault,
        percentage: Math.round(percentage),
        severity,
        foodSuggestions: getFoodSuggestions(config.id, 4),
      });
    }
  }

  // Sort by severity (concern > warning > notice) and then by percentage
  const severityOrder: Record<AlertSeverity, number> = {
    concern: 0,
    warning: 1,
    notice: 2,
  };

  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.percentage - b.percentage; // Lower percentage first within same severity
  });

  return alerts;
}

/**
 * Get all micronutrient data for display (not just alerts)
 */
export async function getMicronutrientSummary(): Promise<
  Array<{
    nutrientId: string;
    nutrientName: string;
    avgIntake7d: number;
    rdaTarget: number;
    percentage: number;
    unit: string;
  }>
> {
  const averages = await get7DayMicronutrientAverages();

  return NUTRIENT_CONFIGS.map((config) => {
    const avgIntake = averages[config.id] || 0;
    const percentage = config.rdaDefault > 0 ? (avgIntake / config.rdaDefault) * 100 : 0;

    return {
      nutrientId: config.id,
      nutrientName: config.name,
      avgIntake7d: Math.round(avgIntake * 10) / 10,
      rdaTarget: config.rdaDefault,
      percentage: Math.round(percentage),
      unit: config.unit,
    };
  });
}
