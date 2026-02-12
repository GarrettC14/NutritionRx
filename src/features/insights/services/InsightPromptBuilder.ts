/**
 * Insight Prompt Builder
 * Constructs prompts for LLM insight generation
 */

import type { InsightInputData, Insight, InsightCategory } from '../types/insights.types';
import type { DailyQuestionCategory } from '../types/dailyInsights.types';

export function buildInsightPrompt(data: InsightInputData): string {
  if (__DEV__) console.log(`[LLM:InsightPromptBuilder] buildInsightPrompt() — cal=${data.todayCalories}, prot=${data.todayProtein}g, meals=${data.todayMealCount}, goal=${data.userGoal}`);
  const goalText = data.userGoal === 'lose' ? 'weight loss' : data.userGoal === 'gain' ? 'muscle gain' : 'maintenance';
  const foodsList = data.todayFoods.slice(0, 10).join(', ') || 'No foods logged yet';
  if (__DEV__) console.log(`[LLM:InsightPromptBuilder] Goal: ${goalText}, Foods: ${foodsList.substring(0, 100)}`);

  return `You are a supportive nutrition companion for the NutritionRx app. Generate 2-3 brief, personalized insights about the user's nutrition today.

USER DATA:
- Goal: ${goalText}
- Today: ${data.todayCalories} cal (target: ${data.calorieTarget}), ${data.todayProtein}g protein (target: ${data.proteinTarget}g)
- Protein: ${data.todayProtein}g of ${data.proteinTarget}g target
- Carbs: ${data.todayCarbs}g, Fat: ${data.todayFat}g, Fiber: ${data.todayFiber}g
- Water: ${data.todayWater}ml of ${data.waterTarget}ml target
- Meals logged: ${data.todayMealCount}
- Foods today: ${foodsList}
- 7-day averages: ${data.avgCalories7d} cal, ${data.avgProtein7d}g protein
- Current streaks: ${data.loggingStreak} days logging, ${data.calorieStreak} days meeting calorie target
- Days using app: ${data.daysUsingApp}

RULES:
1. Be specific - reference actual numbers and foods from their data
2. Be encouraging, never judgmental - one "off" day doesn't matter
3. Focus on patterns over single data points
4. Celebrate consistency and small wins
5. If suggesting changes, use "Consider..." or "You might try..." not "You should..."
6. Keep each insight to 1-2 sentences max
7. No medical advice, no supplement recommendations
8. If it's early in the day with few foods logged, acknowledge that

OUTPUT FORMAT (JSON only, no other text):
{
  "insights": [
    {"category": "macro_balance", "text": "..."},
    {"category": "protein", "text": "..."}
  ]
}

Valid categories: macro_balance, protein, consistency, pattern, trend, hydration, timing, rest

Generate insights now:`;
}

export function parseInsightResponse(responseText: string): Insight[] {
  if (__DEV__) console.log(`[LLM:InsightPromptBuilder] parseInsightResponse() — responseLength=${responseText.length}`);
  if (__DEV__) console.log(`[LLM:InsightPromptBuilder] Raw response: "${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}"`);
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      if (__DEV__) console.warn('[LLM:InsightPromptBuilder] No JSON found in response');
      return [];
    }
    if (__DEV__) console.log(`[LLM:InsightPromptBuilder] Extracted JSON (${jsonMatch[0].length} chars)`);
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.insights || !Array.isArray(parsed.insights)) {
      if (__DEV__) console.warn(`[LLM:InsightPromptBuilder] Invalid insights format — keys: ${Object.keys(parsed).join(', ')}`);
      return [];
    }
    const validCategories: InsightCategory[] = ['macro_balance', 'protein', 'consistency', 'pattern', 'trend', 'hydration', 'timing', 'rest'];
    const result = parsed.insights
      .filter((insight: any) => insight && typeof insight.text === 'string' && insight.text.length > 0 && validCategories.includes(insight.category))
      .map((insight: any) => ({ category: insight.category as InsightCategory, text: insight.text.trim(), icon: getCategoryIcon(insight.category) }));
    if (__DEV__) console.log(`[LLM:InsightPromptBuilder] Parsed ${result.length} valid insights from ${parsed.insights.length} raw: [${result.map((i: Insight) => i.category).join(', ')}]`);
    return result;
  } catch (error) {
    if (__DEV__) console.error('[LLM:InsightPromptBuilder] parseInsightResponse ERROR:', error);
    if (__DEV__) console.error(`[LLM:InsightPromptBuilder] Failed text: "${responseText.substring(0, 200)}"`);
    return [];
  }
}

export function getCategoryIcon(category: InsightCategory): string {
  const icons: Record<InsightCategory, string> = { macro_balance: 'scale-outline', protein: 'barbell-outline', consistency: 'flame-outline', pattern: 'pie-chart-outline', trend: 'trending-up-outline', hydration: 'water-outline', timing: 'time-outline', rest: 'moon-outline' };
  return icons[category] || 'bulb-outline';
}

export function getCategoryColor(category: InsightCategory): string {
  const colors: Record<InsightCategory, string> = { macro_balance: '#AB47BC', protein: '#42A5F5', consistency: '#FFA726', pattern: '#26A69A', trend: '#66BB6A', hydration: '#81D4FA', timing: '#FFCA28', rest: '#7E57C2' };
  return colors[category] || '#999999';
}

export function getDailyCategoryColor(category: DailyQuestionCategory): string {
  const colors: Record<DailyQuestionCategory, string> = { macro_balance: '#AB47BC', protein_focus: '#42A5F5', meal_balance: '#FFA726', hydration: '#81D4FA', trends: '#66BB6A', nutrient_gaps: '#26A69A' };
  return colors[category] || '#999999';
}

export function getCategoryTitle(category: InsightCategory): string {
  const titles: Record<InsightCategory, string> = { macro_balance: 'Macro Balance', protein: 'Protein Pacing', consistency: 'Consistency Win', pattern: 'Pattern Spotted', trend: 'Trend Update', hydration: 'Hydration', timing: 'Meal Timing', rest: 'Rest Day' };
  return titles[category] || 'Insight';
}
