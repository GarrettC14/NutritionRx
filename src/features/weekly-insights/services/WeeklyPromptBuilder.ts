/**
 * Weekly Prompt Builder
 * Constructs LLM prompts for each question using pre-computed analysis data
 */

import type {
  QuestionAnalysisResult,
  ConsistencyAnalysis,
  OutlierAnalysis,
  TargetHitAnalysis,
  ProteinAnalysis,
  MacroBalanceAnalysis,
  SurplusDeficitAnalysis,
  CalorieTrendAnalysis,
  DayByDayAnalysis,
  HydrationAnalysis,
  MealCountAnalysis,
  WeekdayWeekendAnalysis,
  WeekComparisonAnalysis,
  ProteinTrendAnalysis,
  HighlightsAnalysis,
  FocusSuggestionAnalysis,
} from '../types/weeklyInsights.types';

const SYSTEM_PREAMBLE = `You are a warm, supportive nutrition companion. Use the "Nourished Calm" voice \u2014 warm, encouraging, never judgmental. NEVER use these words: "failed", "cheated", "warning", "bad", "guilt", "shame", "terrible", "awful", "poor", "struggle". Keep your response to 2-3 concise sentences. Use a conversational tone. Start with an observation, add an insight.`;

type PromptBuilder = (analysis: any) => string;

const promptBuilders: Record<string, PromptBuilder> = {
  'Q-CON-01': (a: ConsistencyAnalysis) =>
    `${SYSTEM_PREAMBLE}

The user tracked ${a.loggedDays} days this week.
Macro consistency (coefficient of variation \u2014 lower = more consistent):
- Calories: ${a.calorieCV.toFixed(1)}% CV (${a.overallConsistency.replace('_', ' ')})
- Protein: ${a.proteinCV.toFixed(1)}% CV
- Carbs: ${a.carbCV.toFixed(1)}% CV
- Fat: ${a.fatCV.toFixed(1)}% CV
Most consistent macro: ${a.mostConsistentMacro}
Most variable macro: ${a.leastConsistentMacro}

Write a 2-3 sentence observation about their macro consistency. Highlight what was steady. If something varied, frame it neutrally as a pattern to be aware of.`,

  'Q-CON-02': (a: OutlierAnalysis) =>
    `${SYSTEM_PREAMBLE}

The user's average calorie intake this week was ${a.weekMean} cal/day.
${
  a.outlierDays.length === 0
    ? 'No days stood out as particularly different from the average.'
    : `These days stood out:\n${a.outlierDays
        .map(
          (d) =>
            `- ${d.dayName}: ${d.calories} cal (${d.deviationPct > 0 ? '+' : ''}${d.deviationPct}% from average, ${d.direction})`
        )
        .join('\n')}
Without those days, the average would be ${a.adjustedMean} cal/day.`
}

Write 2-3 sentences about which days shifted their weekly picture. Be observational, not critical. If outlier days were higher, note them matter-of-factly.`,

  'Q-CON-03': (a: TargetHitAnalysis) =>
    `${SYSTEM_PREAMBLE}

This week, out of ${a.loggedDays} logged days:
- ${a.calorieHitDays} days were within range of their calorie target (${a.calorieHitPct}%)
- ${a.proteinHitDays} days met their protein target (${a.proteinHitPct}%)

Write 2-3 sentences celebrating their on-target days. If they hit targets most days, acknowledge the consistency. If fewer days hit targets, focus on the days that did work well.`,

  'Q-MAC-01': (a: ProteinAnalysis) =>
    `${SYSTEM_PREAMBLE}

Protein this week:
- Average: ${a.avgProtein}g/day (target: ${a.proteinTarget}g)
- That's ${a.avgProteinPct}% of their target
- ${a.daysMetTarget} of ${a.loggedDays} days met the protein target
- As % of calories: ${a.proteinCalPct}%
${a.trend ? `- Trend vs. last week: ${a.trend}` : ''}

Write 2-3 sentences about their protein intake. For fitness enthusiasts, protein is important \u2014 acknowledge where they are relative to their target without being preachy.`,

  'Q-MAC-02': (a: MacroBalanceAnalysis) =>
    `${SYSTEM_PREAMBLE}

Average macro split this week:
- Protein: ${a.proteinPct}% of calories (${a.avgProtein}g)
- Carbs: ${a.carbsPct}% of calories (${a.avgCarbs}g)
- Fat: ${a.fatPct}% of calories (${a.avgFat}g)
Most variable macro day-to-day: ${a.mostVariableMacro}
${a.skewedMacro ? `Note: ${a.skewedMacro} makes up a notably ${a.skewDirection} share of calories.` : 'The split is fairly balanced.'}

Write 2-3 sentences about their macro balance. Note the overall pattern and any day-to-day variability.`,

  'Q-CAL-01': (a: SurplusDeficitAnalysis) =>
    `${SYSTEM_PREAMBLE}

Calorie summary for the week:
- Average daily intake: ${Math.round(a.dailyAvgIntake)} cal
- Daily target: ${a.dailyAvgTarget} cal
- Daily ${a.isDeficit ? 'deficit' : a.isSurplus ? 'surplus' : 'balance'}: ~${Math.abs(Math.round(a.dailyDelta))} cal (${a.deltaPct > 0 ? '+' : ''}${a.deltaPct}%)
- ${a.loggedDays} days logged
${a.alignsWithGoal ? '- This aligns with their stated goal.' : '- This is different from their stated goal direction.'}

Write 2-3 sentences summarizing their energy balance for the week. Be factual. If it aligns with their goal, acknowledge that. If not, frame it as information rather than a problem.`,

  'Q-CAL-02': (a: CalorieTrendAnalysis) =>
    `${SYSTEM_PREAMBLE}

Calorie trend over recent weeks:
- Current week average: ${a.currentWeekAvg} cal/day
- Prior week average: ${a.priorWeekAvg} cal/day
${a.twoWeeksAgoAvg ? `- Two weeks ago average: ${a.twoWeeksAgoAvg} cal/day` : ''}
- Trend direction: ${a.trendDirection} (${a.trendMagnitude} cal/week)
- Trend strength: ${a.trendStrength}

Write 2-3 sentences about the direction their calorie intake is moving. Frame trends as information.`,

  'Q-CAL-03': (a: DayByDayAnalysis) =>
    `${SYSTEM_PREAMBLE}

Day-by-day calorie breakdown (target: ${a.calorieTarget} cal):
${a.days
  .map(
    (d) =>
      `- ${d.dayName}: ${d.classification === 'no_data' ? 'No data' : `${d.calories} cal (${d.percent}% of target, ${d.classification.replace('_', ' ')})`}`
  )
  .join('\n')}
${a.pattern ? `Pattern detected: ${a.pattern}` : 'No clear pattern detected.'}

Write 2-3 sentences walking through the week's calorie shape. Reference specific days. Be descriptive, not evaluative.`,

  'Q-HYD-01': (a: HydrationAnalysis) =>
    `${SYSTEM_PREAMBLE}

Water intake this week:
- Average: ${a.avgWater}ml/day (target: ${a.waterTarget}ml)
- That's ${a.avgWaterPct}% of target
- ${a.daysMetTarget} of ${a.loggedDays} days met the water target
- Most hydrated day: ${a.bestDay} (${a.bestDayAmount}ml)
- Least hydrated day: ${a.worstDay} (${a.worstDayAmount}ml)

Write 2-3 sentences about their hydration pattern. Be encouraging about good days.`,

  'Q-TIM-01': (a: MealCountAnalysis) =>
    `${SYSTEM_PREAMBLE}

Meal frequency this week:
- Average: ${a.avgMeals} meals/day
- Range: ${a.minMeals} to ${a.maxMeals} meals/day
- Total meals logged: ${a.totalMeals}
${a.mealCalCorrelation ? `- Pattern: Days with more meals tended to have ${a.mealCalCorrelation} calories` : ''}

Write 2-3 sentences about their meal frequency pattern. Note any days that stood out.`,

  'Q-TIM-02': (a: WeekdayWeekendAnalysis) =>
    `${SYSTEM_PREAMBLE}

Weekday vs. weekend comparison:
- Weekday avg calories: ${a.weekdayAvgCal} cal
- Weekend avg calories: ${a.weekendAvgCal} cal
- Weekend effect: ${a.weekendEffect > 0 ? '+' : ''}${a.weekendEffect}% calories
- Weekday avg protein: ${a.weekdayAvgProtein}g
- Weekend avg protein: ${a.weekendAvgProtein}g
- Weekday avg meals: ${a.weekdayAvgMeals}
- Weekend avg meals: ${a.weekendAvgMeals}

Write 2-3 sentences comparing their weekday and weekend eating patterns. Frame differences as observations.`,

  'Q-CMP-01': (a: WeekComparisonAnalysis) =>
    `${SYSTEM_PREAMBLE}

This week vs. last week:
${a.comparisons
  .map(
    (c) =>
      `- ${c.metric}: ${c.thisWeek} \u2192 ${c.direction === 'up' ? '\u2191' : c.direction === 'down' ? '\u2193' : '\u2192'} (${c.changePct > 0 ? '+' : ''}${c.changePct}%)`
  )
  .join('\n')}
Biggest improvement: ${a.biggestImprovement || 'None standout'}
Biggest change: ${a.biggestChange}

Write 2-3 sentences comparing the two weeks. Lead with improvements.`,

  'Q-CMP-02': (a: ProteinTrendAnalysis) =>
    `${SYSTEM_PREAMBLE}

Protein trend over recent weeks:
${a.weeklyAverages.map((w) => `- ${w.weekLabel}: ${w.avgProtein}g/day`).join('\n')}
- Trend: ${a.trendDirection} (${a.trendMagnitude}g/week)
- Target: ${a.proteinTarget}g/day

Write 2-3 sentences about the protein trend direction over recent weeks.`,

  'Q-HI-01': (a: HighlightsAnalysis) =>
    `${SYSTEM_PREAMBLE}

Highlights from this week:
${a.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Write 2-3 warm sentences celebrating these wins. Be specific about what went well. This should feel like a friend high-fiving them.`,

  'Q-HI-02': (a: FocusSuggestionAnalysis) =>
    `${SYSTEM_PREAMBLE}

Based on this week's data, here's the most impactful area to focus on next week:
- Focus area: ${a.focusArea}
- Current level: ${a.currentLevel}
- Suggested direction: ${a.suggestion}
- Why it matters: ${a.rationale}

Write 2-3 sentences offering a gentle, specific suggestion for next week. Frame it as an opportunity, not a correction. Be encouraging.`,
};

export class WeeklyPromptBuilder {
  /**
   * Build an LLM prompt for a specific question using its analysis result.
   */
  static build(questionId: string, analysisResult: QuestionAnalysisResult): string {
    const builder = promptBuilders[questionId];
    if (!builder) {
      throw new Error(`No prompt builder for question: ${questionId}`);
    }
    return builder(analysisResult);
  }

  /**
   * Check if a prompt builder exists for a question.
   */
  static hasBuilder(questionId: string): boolean {
    return questionId in promptBuilders;
  }
}
