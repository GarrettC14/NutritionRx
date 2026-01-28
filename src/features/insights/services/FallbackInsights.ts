/**
 * Fallback Insights Service
 * Rule-based insights for devices that can't run the LLM
 */

import type { InsightInputData, Insight } from '../types/insights.types';
import { getCategoryIcon } from './InsightPromptBuilder';

export function generateFallbackInsights(data: InsightInputData): Insight[] {
  const insights: Insight[] = [];

  if (data.todayCalories < 100 && data.todayMealCount === 0) {
    return [{ category: 'pattern', text: "Just getting started today? Log your first meal and you'll see insights as your day takes shape.", icon: getCategoryIcon('pattern') }];
  }

  if (data.daysUsingApp < 3) {
    return [{ category: 'pattern', text: "As you log meals over the next few days, you'll start seeing patterns and personalized insights here. Keep logging!", icon: getCategoryIcon('pattern') }];
  }

  // Protein pacing
  if (data.todayProtein > 0) {
    const proteinPercent = Math.round((data.todayProtein / data.proteinTarget) * 100);
    if (proteinPercent >= 80 && data.todayMealCount >= 3) {
      insights.push({ category: 'protein', text: `You've hit ${data.todayProtein}g protein across ${data.todayMealCount} meals—great distribution for muscle synthesis.`, icon: getCategoryIcon('protein') });
    } else if (proteinPercent < 50 && data.todayMealCount >= 2) {
      insights.push({ category: 'protein', text: `You're at ${data.todayProtein}g protein so far. Adding a protein-rich snack could help hit your ${data.proteinTarget}g target.`, icon: getCategoryIcon('protein') });
    }
  }

  // Logging streak
  if (data.loggingStreak >= 3) {
    if (data.loggingStreak >= 7) {
      insights.push({ category: 'consistency', text: `${data.loggingStreak}-day logging streak! You're building a solid habit. Consistency beats perfection every time.`, icon: getCategoryIcon('consistency') });
    } else {
      insights.push({ category: 'consistency', text: `${data.loggingStreak}-day logging streak! You're building momentum.`, icon: getCategoryIcon('consistency') });
    }
  }

  // Calorie streak
  if (data.calorieStreak >= 3 && insights.length < 3) {
    insights.push({ category: 'trend', text: `You've met your calorie target ${data.calorieStreak} of the last 7 days. That's the kind of consistency that adds up.`, icon: getCategoryIcon('trend') });
  }

  // 7-day average
  if (data.avgCalories7d > 0 && insights.length < 3) {
    const avgDiff = data.avgCalories7d - data.calorieTarget;
    const absDiff = Math.abs(avgDiff);
    const percentDiff = Math.round((absDiff / data.calorieTarget) * 100);
    if (percentDiff <= 5) {
      const goalText = data.userGoal === 'lose' ? 'steady progress' : data.userGoal === 'gain' ? 'muscle building' : 'maintenance';
      insights.push({ category: 'trend', text: `Your 7-day average is ${data.avgCalories7d.toLocaleString()} calories. That's right in your target zone for ${goalText}.`, icon: getCategoryIcon('trend') });
    } else if (avgDiff > 0 && percentDiff > 10) {
      insights.push({ category: 'trend', text: `Calories have averaged ${absDiff} above target this week. Small adjustment territory—nothing drastic needed.`, icon: getCategoryIcon('trend') });
    } else if (avgDiff < 0 && percentDiff > 10) {
      insights.push({ category: 'trend', text: `Your 7-day average is ${absDiff} calories below target. Consider adding a snack if you're feeling low energy.`, icon: getCategoryIcon('trend') });
    }
  }

  // Hydration
  if (data.todayWater > 0 && data.waterTarget > 0 && insights.length < 3) {
    const waterPercent = Math.round((data.todayWater / data.waterTarget) * 100);
    if (waterPercent >= 100) {
      insights.push({ category: 'hydration', text: `You've logged ${(data.todayWater / 1000).toFixed(1)}L of water today. Nicely hydrated!`, icon: getCategoryIcon('hydration') });
    } else if (waterPercent >= 70) {
      insights.push({ category: 'hydration', text: `${waterPercent}% of your water goal. You're on track!`, icon: getCategoryIcon('hydration') });
    }
  }

  // Macro balance
  if (data.todayCalories > 500 && insights.length < 3) {
    const totalMacroCalories = data.todayProtein * 4 + data.todayCarbs * 4 + data.todayFat * 9;
    if (totalMacroCalories > 0) {
      const proteinPct = Math.round(((data.todayProtein * 4) / totalMacroCalories) * 100);
      const carbsPct = Math.round(((data.todayCarbs * 4) / totalMacroCalories) * 100);
      const fatPct = Math.round(((data.todayFat * 9) / totalMacroCalories) * 100);
      if (proteinPct >= 20 && proteinPct <= 40 && fatPct >= 20 && fatPct <= 40) {
        const goalText = data.userGoal === 'maintain' ? 'maintenance' : data.userGoal === 'lose' ? 'fat loss' : 'muscle gain';
        insights.push({ category: 'macro_balance', text: `Today's macros: ${carbsPct}% carbs, ${proteinPct}% protein, ${fatPct}% fat—nicely balanced for your ${goalText} goal.`, icon: getCategoryIcon('macro_balance') });
      }
    }
  }

  // Light eating day
  if (data.todayCalories > 0 && data.todayCalories < data.calorieTarget * 0.5 && data.todayMealCount <= 2 && insights.length < 3) {
    const hour = new Date().getHours();
    if (hour >= 14) {
      insights.push({ category: 'rest', text: "Lighter eating day today—sometimes that's what the body asks for.", icon: getCategoryIcon('rest') });
    }
  }

  return insights.slice(0, 3);
}

export function getEmptyStateMessage(data: InsightInputData): { title: string; message: string } {
  if (data.daysUsingApp < 3) {
    return { title: 'Building your profile...', message: "As you log meals over the next few days, I'll start noticing patterns and can offer personalized insights. Keep logging—it usually takes about a week for the good stuff to appear!" };
  }
  if (data.todayMealCount === 0) {
    return { title: 'Nothing logged yet today', message: "Log your first meal and I'll share insights as your day takes shape." };
  }
  return { title: 'Gathering insights...', message: 'Continue logging to see personalized nutrition insights.' };
}
