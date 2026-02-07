/**
 * Daily Question Registry
 * All 18 curated questions with availability gates and relevance scoring
 */

import type {
  DailyQuestionDefinition,
  DailyInsightData,
} from '../types/dailyInsights.types';

function safePercent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}

function average<T>(items: T[], key: keyof T): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) / items.length;
}

export const questionRegistry: DailyQuestionDefinition[] = [
  // === MACRO BALANCE ===
  {
    id: 'macro_overview',
    category: 'macro_balance',
    text: 'Am I on track with my macros today?',
    icon: 'flag-outline',
    isAvailable: (d) => d.todayMealCount >= 1,
    computeRelevance: (d) => {
      let score = 30;
      if (d.currentHour >= 17) score += 20;
      if (Math.abs(d.caloriePercent - d.proteinPercent) > 15) score += 25;
      if (d.caloriePercent >= 80) score += 15;
      return Math.min(100, score);
    },
    fetcherKey: 'macro_overview',
  },
  {
    id: 'calorie_pacing',
    category: 'macro_balance',
    text: 'How am I pacing toward my calorie target?',
    icon: 'speedometer-outline',
    isAvailable: (d) => d.todayMealCount >= 1,
    computeRelevance: (d) => {
      let score = 20;
      const expectedPercent = d.dayProgress * 100;
      const deviation = Math.abs(d.caloriePercent - expectedPercent);
      if (deviation > 20) score += 35;
      if (d.currentHour >= 12 && d.currentHour <= 18) score += 15;
      return Math.min(100, score);
    },
    fetcherKey: 'calorie_pacing',
  },
  {
    id: 'macro_ratio',
    category: 'macro_balance',
    text: 'What does my macro split look like today?',
    icon: 'pie-chart-outline',
    isAvailable: (d) => d.todayCalories >= 500,
    computeRelevance: (d) => {
      let score = 20;
      const totalCal = Math.max(1, d.todayCalories);
      const proteinCalPct = ((d.todayProtein * 4) / totalCal) * 100;
      const fatCalPct = ((d.todayFat * 9) / totalCal) * 100;
      if (proteinCalPct < 20 || proteinCalPct > 40) score += 25;
      if (fatCalPct > 40) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: 'macro_ratio',
  },
  {
    id: 'remaining_budget',
    category: 'macro_balance',
    text: 'What can I fit in my remaining calories?',
    icon: 'calculator-outline',
    isAvailable: (d) => d.calorieTarget - d.todayCalories > 200,
    computeRelevance: (d) => {
      let score = 25;
      const remaining = d.calorieTarget - d.todayCalories;
      const proteinGap = d.proteinTarget - d.todayProtein;
      if (proteinGap > 30 && remaining < 600) score += 35;
      if (d.currentHour >= 16) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: 'remaining_budget',
  },

  // === PROTEIN FOCUS ===
  {
    id: 'protein_status',
    category: 'protein_focus',
    text: 'Am I getting enough protein today?',
    icon: 'barbell-outline',
    isAvailable: (d) => d.todayMealCount >= 1,
    computeRelevance: (d) => {
      let score = 25;
      if (d.proteinPercent < d.caloriePercent - 15) score += 40;
      if (d.userGoal === 'gain') score += 15;
      return Math.min(100, score);
    },
    fetcherKey: 'protein_status',
  },
  {
    id: 'protein_per_meal',
    category: 'protein_focus',
    text: 'How is my protein distributed across meals?',
    icon: 'restaurant-outline',
    isAvailable: (d) => d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 20;
      const mealProteins = d.mealsWithTimestamps.map((m) => m.totalProtein);
      if (mealProteins.length > 0) {
        if (mealProteins.some((p) => p < 20)) score += 30;
        const maxProtein = Math.max(...mealProteins);
        const minProtein = Math.min(...mealProteins);
        if (maxProtein > minProtein * 3) score += 20;
      }
      return Math.min(100, score);
    },
    fetcherKey: 'protein_per_meal',
  },
  {
    id: 'protein_remaining',
    category: 'protein_focus',
    text: 'How much protein do I still need today?',
    icon: 'fitness-outline',
    isAvailable: (d) => d.todayProtein < d.proteinTarget,
    computeRelevance: (d) => {
      let score = 20;
      const remaining = d.proteinTarget - d.todayProtein;
      if (remaining > 40) score += 30;
      if (d.currentHour >= 16) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: 'protein_remaining',
  },

  // === MEAL BALANCE ===
  {
    id: 'meal_distribution',
    category: 'meal_balance',
    text: 'How balanced are my meals today?',
    icon: 'scale-outline',
    isAvailable: (d) => d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 20;
      const mealCals = d.mealsWithTimestamps.map((m) => m.totalCalories);
      if (mealCals.length > 0) {
        const maxMeal = Math.max(...mealCals);
        if (maxMeal > d.todayCalories * 0.5) score += 35;
      }
      return Math.min(100, score);
    },
    fetcherKey: 'meal_distribution',
  },
  {
    id: 'meal_timing',
    category: 'meal_balance',
    text: 'Am I spacing my meals well?',
    icon: 'time-outline',
    isAvailable: (d) =>
      d.mealsWithTimestamps.length >= 2 &&
      d.mealsWithTimestamps.every((m) => !!m.firstLogTime),
    computeRelevance: (d) => {
      let score = 15;
      const times = d.mealsWithTimestamps
        .map((m) => new Date(m.firstLogTime).getHours())
        .sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        if (times[i] - times[i - 1] > 6) score += 30;
      }
      return Math.min(100, score);
    },
    fetcherKey: 'meal_timing',
  },
  {
    id: 'meal_variety',
    category: 'meal_balance',
    text: 'How varied are my food choices today?',
    icon: 'color-palette-outline',
    isAvailable: (d) => d.todayFoods.length >= 3,
    computeRelevance: (d) => {
      let score = 15;
      const uniqueNames = new Set(d.todayFoods.map((f) => f.name.toLowerCase()));
      if (uniqueNames.size < d.todayFoods.length * 0.5) score += 30;
      return Math.min(100, score);
    },
    fetcherKey: 'meal_variety',
  },

  // === HYDRATION ===
  {
    id: 'hydration_status',
    category: 'hydration',
    text: "How's my hydration today?",
    icon: 'water-outline',
    isAvailable: (d) => d.waterTarget > 0,
    computeRelevance: (d) => {
      let score = 20;
      if (d.waterPercent < 50 && d.currentHour >= 12) score += 40;
      if (d.waterPercent < 30) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: 'hydration_status',
  },
  {
    id: 'hydration_pacing',
    category: 'hydration',
    text: 'Am I drinking enough water for this time of day?',
    icon: 'water',
    isAvailable: (d) => d.waterTarget > 0 && d.currentHour >= 10,
    computeRelevance: (d) => {
      let score = 15;
      const expectedWaterPercent = d.dayProgress * 100;
      if (d.waterPercent < expectedWaterPercent - 20) score += 35;
      return Math.min(100, score);
    },
    fetcherKey: 'hydration_pacing',
  },

  // === TRENDS ===
  {
    id: 'vs_weekly_avg',
    category: 'trends',
    text: 'How does today compare to my weekly average?',
    icon: 'trending-up-outline',
    isAvailable: (d) => d.avgCalories7d > 0 && d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 20;
      const deviation =
        (Math.abs(d.todayCalories - d.avgCalories7d) / Math.max(1, d.avgCalories7d)) * 100;
      if (deviation > 20) score += 35;
      if (d.currentHour >= 18) score += 15;
      return Math.min(100, score);
    },
    fetcherKey: 'vs_weekly_avg',
  },
  {
    id: 'consistency_check',
    category: 'trends',
    text: 'How consistent has my tracking been this week?',
    icon: 'checkmark-circle-outline',
    isAvailable: (d) => d.daysUsingApp >= 3,
    computeRelevance: (d) => {
      let score = 15;
      if (d.loggingStreak >= 7) score += 30;
      const loggedDays = d.weeklyDailyTotals.filter((t) => t.logged).length;
      if (loggedDays < 4) score += 25;
      return Math.min(100, score);
    },
    fetcherKey: 'consistency_check',
  },
  {
    id: 'trend_direction',
    category: 'trends',
    text: 'Am I trending in the right direction this week?',
    icon: 'compass-outline',
    isAvailable: (d) => d.weeklyDailyTotals.filter((t) => t.logged).length >= 5,
    computeRelevance: (d) => {
      let score = 20;
      const loggedDays = d.weeklyDailyTotals.filter((t) => t.logged);
      if (loggedDays.length >= 5) {
        const recentSlice = loggedDays.slice(-3);
        const earlierSlice = loggedDays.slice(0, 3);
        const recentAvg = average(recentSlice, 'calories');
        const earlierAvg = average(earlierSlice, 'calories');
        const trendPct = ((recentAvg - earlierAvg) / Math.max(1, earlierAvg)) * 100;
        if (Math.abs(trendPct) > 10) score += 30;
      }
      return Math.min(100, score);
    },
    fetcherKey: 'trend_direction',
  },

  // === NUTRIENT GAPS ===
  {
    id: 'nutrient_overview',
    category: 'nutrient_gaps',
    text: 'Are there any nutrients I should pay attention to?',
    icon: 'nutrition-outline',
    isAvailable: (d) => d.activeAlerts.length > 0,
    computeRelevance: (d) => {
      let score = 25;
      const concerns = d.activeAlerts.filter((a) => a.severity === 'concern');
      if (concerns.length > 0) score += 40;
      const tier1Alerts = d.activeAlerts.filter((a) => a.tier === 1);
      if (tier1Alerts.length > 0) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: 'nutrient_overview',
  },
  {
    id: 'fiber_check',
    category: 'nutrient_gaps',
    text: 'Am I getting enough fiber today?',
    icon: 'leaf-outline',
    isAvailable: (d) => d.todayFiber > 0 || d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 15;
      const fiberTarget = 28;
      const fiberPercent = safePercent(d.todayFiber, fiberTarget);
      if (fiberPercent < 50) score += 35;
      return Math.min(100, score);
    },
    fetcherKey: 'fiber_check',
  },
  {
    id: 'micronutrient_status',
    category: 'nutrient_gaps',
    text: 'What does my micronutrient picture look like?',
    icon: 'flask-outline',
    isAvailable: (d) => d.activeAlerts.length > 0 && d.daysUsingApp >= 7,
    computeRelevance: (d) => {
      let score = 15;
      if (d.activeAlerts.length >= 2) score += 25;
      if (d.activeAlerts.some((a) => a.severity === 'concern')) score += 25;
      return Math.min(100, score);
    },
    fetcherKey: 'micronutrient_status',
  },
];
