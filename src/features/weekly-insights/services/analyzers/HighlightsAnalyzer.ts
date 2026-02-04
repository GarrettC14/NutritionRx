/**
 * Highlights Analyzer
 * Q-HI-01: What went well this week?
 * Q-HI-02: Focus suggestion for next week
 */

import { clamp } from '../../utils/statisticsUtils';
import type {
  WeeklyCollectedData,
  HighlightsAnalysis,
  FocusSuggestionAnalysis,
} from '../../types/weeklyInsights.types';

export class HighlightsAnalyzer {
  /**
   * Q-HI-01: What went well this week? (always pinned first)
   */
  static analyzeHighlights(data: WeeklyCollectedData): HighlightsAnalysis {
    console.log(`[LLM:Analyzer:HI-01] analyzeHighlights() — loggedDays=${data.loggedDayCount}, streak=${data.loggingStreak}`);
    const logged = data.days.filter((d) => d.isLogged);
    const highlights: string[] = [];

    if (logged.length === 0) {
      return {
        questionId: 'Q-HI-01',
        highlights: ['Starting a new week of tracking!'],
        highlightCount: 1,
        interestingnessScore: 1.0,
      };
    }

    // Check logging consistency
    if (logged.length >= 6) {
      highlights.push(`Logged ${logged.length} out of 7 days - great consistency!`);
    } else if (logged.length >= 4) {
      highlights.push(`Logged ${logged.length} days this week`);
    }

    // Check calorie target hits
    const onTargetDays = logged.filter(
      (d) =>
        d.calories >= data.calorieTarget * 0.85 &&
        d.calories <= data.calorieTarget * 1.15
    );
    if (onTargetDays.length >= 5) {
      highlights.push(`Hit calorie target ${onTargetDays.length} days - outstanding!`);
    } else if (onTargetDays.length >= 3) {
      highlights.push(`Hit calorie target ${onTargetDays.length} of ${logged.length} days`);
    }

    // Check protein target hits
    const proteinHitDays = logged.filter((d) => d.protein >= data.proteinTarget - 10);
    if (proteinHitDays.length >= 4) {
      highlights.push(`Met protein goal ${proteinHitDays.length} days`);
    }

    // Check streak
    if (data.loggingStreak >= 7) {
      highlights.push(`${data.loggingStreak}-day logging streak maintained!`);
    }

    // Check improvement vs prior week
    if (data.priorWeek) {
      if (data.loggedDayCount > data.priorWeek.loggedDayCount) {
        highlights.push('Logged more days than last week');
      }
      if (data.avgProtein > data.priorWeek.avgProtein + 5) {
        highlights.push('Protein intake improved from last week');
      }
    }

    // Check water
    const waterDays = data.days.filter((d) => d.water >= data.waterTarget);
    if (waterDays.length >= 4 && data.waterTarget > 0) {
      highlights.push(`Met water goal ${waterDays.length} days`);
    }

    // Best day
    if (logged.length >= 3) {
      const bestDay = logged.reduce((best, d) => {
        const calPct = data.calorieTarget > 0 ? Math.abs(1 - d.calories / data.calorieTarget) : 1;
        const proPct = data.proteinTarget > 0 ? Math.abs(1 - d.protein / data.proteinTarget) : 1;
        const bestCalPct = data.calorieTarget > 0 ? Math.abs(1 - best.calories / data.calorieTarget) : 1;
        const bestProPct = data.proteinTarget > 0 ? Math.abs(1 - best.protein / data.proteinTarget) : 1;
        return calPct + proPct < bestCalPct + bestProPct ? d : best;
      });
      if (onTargetDays.includes(bestDay)) {
        highlights.push(`${bestDay.dayName} was a standout day`);
      }
    }

    // Ensure at least 1 highlight
    if (highlights.length === 0) {
      highlights.push("You showed up and tracked - that's the foundation");
    }

    // Cap at 3 highlights
    const topHighlights = highlights.slice(0, 3);

    console.log(`[LLM:Analyzer:HI-01] Result — ${topHighlights.length} highlights: ${JSON.stringify(topHighlights)}`);
    return {
      questionId: 'Q-HI-01',
      highlights: topHighlights,
      highlightCount: topHighlights.length,
      interestingnessScore: 1.0, // Always pinned
    };
  }

  /**
   * Q-HI-02: What's one thing I could focus on next week? (always pinned last)
   */
  static analyzeFocusSuggestion(data: WeeklyCollectedData): FocusSuggestionAnalysis {
    console.log(`[LLM:Analyzer:HI-02] analyzeFocusSuggestion() — loggedDays=${data.loggedDayCount}, avgProtein=${Math.round(data.avgProtein)}, waterTarget=${data.waterTarget}`);
    const logged = data.days.filter((d) => d.isLogged);

    // Priority: (1) macro shortfall, (2) hydration gap, (3) logging consistency, (4) weekend pattern

    // Check protein shortfall
    const avgProteinPct =
      data.proteinTarget > 0 ? (data.avgProtein / data.proteinTarget) * 100 : 100;
    if (avgProteinPct < 80 && logged.length >= 3) {
      return {
        questionId: 'Q-HI-02',
        focusArea: 'Protein intake',
        currentLevel: `${Math.round(data.avgProtein)}g avg (${Math.round(avgProteinPct)}% of target)`,
        suggestion: 'Try adding a protein-rich food to one meal each day',
        rationale: 'Protein was consistently below target this week',
        interestingnessScore: 0.9,
      };
    }

    // Check hydration
    if (data.waterTarget > 0) {
      const waterDaysLogged = data.days.filter((d) => d.water > 0);
      const avgWaterPct =
        waterDaysLogged.length > 0
          ? (waterDaysLogged.reduce((s, d) => s + d.water, 0) /
              waterDaysLogged.length /
              data.waterTarget) *
            100
          : 0;
      if (avgWaterPct < 70 && waterDaysLogged.length >= 2) {
        return {
          questionId: 'Q-HI-02',
          focusArea: 'Hydration',
          currentLevel: `${Math.round(avgWaterPct)}% of water target`,
          suggestion: 'Try keeping a water bottle visible as a reminder',
          rationale: 'Water intake was below target most days',
          interestingnessScore: 0.9,
        };
      }
    }

    // Check logging consistency
    if (logged.length < 5) {
      return {
        questionId: 'Q-HI-02',
        focusArea: 'Logging consistency',
        currentLevel: `${logged.length} of 7 days logged`,
        suggestion: 'Aim to log at least one meal on off-days',
        rationale: 'More complete data helps surface better insights',
        interestingnessScore: 0.9,
      };
    }

    // Check weekend pattern
    const weekdays = logged.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
    const weekends = logged.filter((d) => d.dayOfWeek === 0 || d.dayOfWeek === 6);
    if (weekdays.length > 0 && weekends.length > 0) {
      const wdAvg = weekdays.reduce((s, d) => s + d.calories, 0) / weekdays.length;
      const weAvg = weekends.reduce((s, d) => s + d.calories, 0) / weekends.length;
      const diff = ((weAvg - wdAvg) / wdAvg) * 100;
      if (diff > 20) {
        return {
          questionId: 'Q-HI-02',
          focusArea: 'Weekend eating patterns',
          currentLevel: `Weekends ${Math.round(diff)}% higher than weekdays`,
          suggestion: 'Plan a balanced weekend meal in advance',
          rationale: 'Weekend calorie intake was notably higher than weekdays',
          interestingnessScore: 0.9,
        };
      }
    }

    // Default suggestion
    return {
      questionId: 'Q-HI-02',
      focusArea: 'Maintaining momentum',
      currentLevel: 'Solid week overall',
      suggestion: 'Keep up your current routine - consistency is key',
      rationale: 'No major gaps identified this week',
      interestingnessScore: 0.9,
    };
  }
}
