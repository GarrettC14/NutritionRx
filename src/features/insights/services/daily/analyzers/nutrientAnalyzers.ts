/**
 * Nutrient Analyzers
 * Analyzers for: nutrient_overview, fiber_check, micronutrient_status
 */

import type { DailyInsightData, QuestionAnalysis, DataCardItem } from '../../../types/dailyInsights.types';

export function analyzeNutrientOverview(data: DailyInsightData): QuestionAnalysis {
  const alerts = data.activeAlerts;
  const concerns = alerts.filter((a) => a.severity === 'concern');
  const warnings = alerts.filter((a) => a.severity === 'warning');
  const notices = alerts.filter((a) => a.severity === 'notice');

  const dataBlock = [
    `NUTRIENT ALERTS:`,
    `Total active alerts: ${alerts.length}`,
    concerns.length > 0 ? `Concerns (< 30% RDA): ${concerns.map((a) => `${a.nutrientName} at ${a.percentOfRDA}%`).join(', ')}` : '',
    warnings.length > 0 ? `Warnings (30-50% RDA): ${warnings.map((a) => `${a.nutrientName} at ${a.percentOfRDA}%`).join(', ')}` : '',
    notices.length > 0 ? `Notices (50-70% RDA): ${notices.map((a) => `${a.nutrientName} at ${a.percentOfRDA}%`).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const topAlert = concerns[0] || warnings[0] || notices[0];
  const fallbackText = topAlert
    ? `Your 7-day average for ${topAlert.nutrientName} is at ${topAlert.percentOfRDA}% of the recommended amount. ${topAlert.foodSuggestions.length > 0 ? `Consider adding ${topAlert.foodSuggestions.slice(0, 2).join(' or ')} to your meals.` : ''}`
    : `No major nutrient concerns flagged based on your recent intake.`;

  const dataCards: DataCardItem[] = alerts.slice(0, 4).map((a) => ({
    label: a.nutrientName,
    value: `${a.percentOfRDA}%`,
    subValue: `of RDA`,
    percent: a.percentOfRDA,
    status: a.severity === 'concern' ? ('behind' as const) : a.severity === 'warning' ? ('neutral' as const) : ('on_track' as const),
  }));

  return { questionId: 'nutrient_overview', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeFiberCheck(data: DailyInsightData): QuestionAnalysis {
  const fiberTarget = 28; // general RDA
  const fiberPercent = fiberTarget > 0 ? Math.round((data.todayFiber / fiberTarget) * 100) : 0;
  const remaining = Math.max(0, fiberTarget - data.todayFiber);

  const dataBlock = [
    `FIBER CHECK:`,
    `Today: ${data.todayFiber}g of ${fiberTarget}g recommended (${fiberPercent}%)`,
    `Remaining: ${remaining}g`,
    `Meals logged: ${data.todayMealCount}`,
  ].join('\n');

  const fallbackText = fiberPercent >= 80
    ? `Fiber is tracking well at ${data.todayFiber}g of the ${fiberTarget}g daily recommendation.`
    : fiberPercent > 0
      ? `Fiber is at ${data.todayFiber}g so far — about ${remaining}g to go to reach the ${fiberTarget}g recommendation. Vegetables, beans, and whole grains are great sources.`
      : `No fiber tracked yet today. Whole grains, vegetables, and legumes are easy ways to add fiber to meals.`;

  const dataCards: DataCardItem[] = [
    { label: 'Fiber', value: `${fiberPercent}%`, subValue: `${data.todayFiber}g / ${fiberTarget}g`, percent: fiberPercent, status: fiberPercent >= 80 ? 'on_track' : fiberPercent < 40 ? 'behind' : 'neutral' },
  ];

  return { questionId: 'fiber_check', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}

export function analyzeMicronutrientStatus(data: DailyInsightData): QuestionAnalysis {
  const alerts = data.activeAlerts;
  const tier1 = alerts.filter((a) => a.tier === 1);
  const tier2 = alerts.filter((a) => a.tier === 2);

  const dataBlock = [
    `MICRONUTRIENT STATUS:`,
    `Active alerts: ${alerts.length}`,
    tier1.length > 0 ? `Priority nutrients (Tier 1): ${tier1.map((a) => `${a.nutrientName} (${a.percentOfRDA}%)`).join(', ')}` : '',
    tier2.length > 0 ? `Secondary nutrients (Tier 2): ${tier2.map((a) => `${a.nutrientName} (${a.percentOfRDA}%)`).join(', ')}` : '',
    `Days tracking: ${data.daysUsingApp}`,
  ]
    .filter(Boolean)
    .join('\n');

  const fallbackText = tier1.length > 0
    ? `Based on your recent tracking, ${tier1.map((a) => a.nutrientName).join(' and ')} could use attention. ${tier1[0].foodSuggestions.length > 0 ? `Foods like ${tier1[0].foodSuggestions.slice(0, 2).join(' and ')} can help.` : ''}`
    : tier2.length > 0
      ? `A few secondary nutrients are below recommended levels: ${tier2.map((a) => a.nutrientName).join(', ')}. Varied whole foods can help cover these.`
      : `No significant micronutrient gaps detected in your recent intake.`;

  const dataCards: DataCardItem[] = [...tier1, ...tier2].slice(0, 4).map((a) => ({
    label: a.nutrientName,
    value: `${a.percentOfRDA}%`,
    subValue: a.severity,
    percent: a.percentOfRDA,
    status: a.severity === 'concern' ? ('behind' as const) : a.severity === 'warning' ? ('neutral' as const) : ('on_track' as const),
  }));

  return { questionId: 'micronutrient_status', dataBlock, fallbackText, dataCards, computedAt: Date.now() };
}
