/**
 * Deficiency Calculator
 * Calculates nutrient deficiencies based on 7-day rolling averages
 */

import { NUTRIENT_CONFIGS, ALERT_REQUIREMENTS, getNutrientConfig, getAlertableNutrients } from '../constants/nutrientThresholds';
import { getFormattedFoodSuggestions } from '../constants/foodSources';
import type { DeficiencyCheck, DeficiencySeverity, NutrientDailyData } from '../types/insights.types';

export interface DeficiencyCalculatorInput {
  dailyNutrientData: NutrientDailyData[];
  daysUsingApp: number;
  daysSinceLastLog: number;
  dismissedAlerts: Set<string>;
}

export interface DeficiencyResult {
  checks: DeficiencyCheck[];
  hasAlerts: boolean;
  alertCount: number;
}

function calculateSeverity(percentOfRDA: number): DeficiencySeverity | null {
  if (percentOfRDA >= 70) return null; // No alert needed
  if (percentOfRDA >= 50) return 'notice';
  if (percentOfRDA >= 30) return 'warning';
  return 'concern';
}

function formatDeficiencyMessage(
  nutrientName: string,
  percentOfRDA: number,
  severity: DeficiencySeverity,
  foodSuggestions: string
): string {
  const pct = Math.round(percentOfRDA);

  if (severity === 'concern') {
    return `Your ${nutrientName} intake has averaged only ${pct}% of the recommended daily amount this week. ${foodSuggestions ? `Consider adding ${foodSuggestions} to your meals.` : ''}`;
  }

  if (severity === 'warning') {
    return `Your ${nutrientName} levels have been running low—averaging ${pct}% of your daily target. ${foodSuggestions ? `Foods like ${foodSuggestions} can help.` : ''}`;
  }

  // notice
  return `You're getting about ${pct}% of your ${nutrientName} target. ${foodSuggestions ? `A bit more ${foodSuggestions.split(',')[0]} could help you reach 100%.` : 'A small boost could help.'}`;
}

export function calculateDeficiencies(input: DeficiencyCalculatorInput): DeficiencyResult {
  const { dailyNutrientData, daysUsingApp, daysSinceLastLog, dismissedAlerts } = input;
  console.log(`[LLM:Deficiency] calculateDeficiencies() — daysUsingApp=${daysUsingApp}, daysSinceLastLog=${daysSinceLastLog}, nutrientDays=${dailyNutrientData.length}, dismissed=${dismissedAlerts.size}`);

  // Check minimum requirements
  if (daysUsingApp < ALERT_REQUIREMENTS.minDaysUsingApp) {
    console.log(`[LLM:Deficiency] → skipped: daysUsingApp ${daysUsingApp} < ${ALERT_REQUIREMENTS.minDaysUsingApp}`);
    return { checks: [], hasAlerts: false, alertCount: 0 };
  }

  if (daysSinceLastLog > ALERT_REQUIREMENTS.maxDaysSinceLastLog) {
    console.log(`[LLM:Deficiency] → skipped: daysSinceLastLog ${daysSinceLastLog} > ${ALERT_REQUIREMENTS.maxDaysSinceLastLog}`);
    return { checks: [], hasAlerts: false, alertCount: 0 };
  }

  const daysWithData = dailyNutrientData.filter((d) => d.hasData).length;
  if (daysWithData < ALERT_REQUIREMENTS.minDaysWithData) {
    console.log(`[LLM:Deficiency] → skipped: daysWithData ${daysWithData} < ${ALERT_REQUIREMENTS.minDaysWithData}`);
    return { checks: [], hasAlerts: false, alertCount: 0 };
  }

  const checks: DeficiencyCheck[] = [];
  const alertableNutrients = getAlertableNutrients();

  for (const nutrientConfig of alertableNutrients) {
    const { id, name, rdaDefault, tier } = nutrientConfig;

    // Calculate 7-day average for this nutrient
    const dailyAmounts = dailyNutrientData
      .filter((d) => d.hasData && d.nutrients[id] !== undefined)
      .map((d) => d.nutrients[id] || 0);

    if (dailyAmounts.length < ALERT_REQUIREMENTS.minDaysWithData) {
      continue; // Not enough data for this nutrient
    }

    const avgAmount = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length;
    const percentOfRDA = (avgAmount / rdaDefault) * 100;
    const severity = calculateSeverity(percentOfRDA);

    if (!severity) continue; // No deficiency

    console.log(`[LLM:Deficiency] ${name} (${id}): avg=${avgAmount.toFixed(1)}, rda=${rdaDefault}, %=${percentOfRDA.toFixed(1)}%, severity=${severity}`);

    // Check if alert is dismissed
    const alertId = `${id}_${severity}`;
    if (dismissedAlerts.has(alertId)) {
      console.log(`[LLM:Deficiency] ${id}_${severity} dismissed, skipping`);
      continue;
    }

    // Tier 2 nutrients only alert at warning or concern level
    if (tier === 2 && severity === 'notice') continue;

    const foodSuggestions = getFormattedFoodSuggestions(id);
    const message = formatDeficiencyMessage(name, percentOfRDA, severity, foodSuggestions);

    checks.push({
      nutrientId: id,
      nutrientName: name,
      averageIntake: avgAmount,
      rdaTarget: rdaDefault,
      percentOfRDA,
      severity,
      message,
      foodSuggestions: foodSuggestions.split(', ').filter(Boolean),
      tier,
    });
  }

  // Sort by severity (concern > warning > notice) and tier (1 > 2)
  const severityOrder: Record<DeficiencySeverity, number> = { concern: 0, warning: 1, notice: 2 };
  checks.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.tier - b.tier;
  });

  // Limit to top 3 most important alerts
  const topChecks = checks.slice(0, 3);

  console.log(`[LLM:Deficiency] Result — ${checks.length} total deficiencies found, returning top ${topChecks.length}: [${topChecks.map((c) => `${c.nutrientId}(${c.severity})`).join(', ')}]`);
  return {
    checks: topChecks,
    hasAlerts: topChecks.length > 0,
    alertCount: topChecks.length,
  };
}

export function getSeverityColor(severity: DeficiencySeverity): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'concern':
      return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
    case 'warning':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
    case 'notice':
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' };
  }
}

export function getSeverityIcon(severity: DeficiencySeverity): string {
  switch (severity) {
    case 'concern':
      return '⚠️';
    case 'warning':
      return '📉';
    case 'notice':
      return '💡';
  }
}
