/**
 * Question Scorer
 * Scores all questions based on data, gates by availability, selects top questions
 */

import type {
  WeeklyCollectedData,
  ScoredQuestion,
  QuestionAnalysisResult,
} from '../types/weeklyInsights.types';
import { QUESTION_LIBRARY } from '../constants/questionLibrary';
import {
  ConsistencyAnalyzer,
  MacroBalanceAnalyzer,
  CalorieTrendAnalyzer,
  HydrationAnalyzer,
  TimingAnalyzer,
  ComparisonAnalyzer,
  HighlightsAnalyzer,
} from './analyzers';

/**
 * Map of question ID to analyzer function.
 */
const analyzerMap: Record<string, (data: WeeklyCollectedData) => QuestionAnalysisResult> = {
  'Q-CON-01': (d) => ConsistencyAnalyzer.analyzeMacroConsistency(d),
  'Q-CON-02': (d) => ConsistencyAnalyzer.analyzeOutliers(d),
  'Q-CON-03': (d) => ConsistencyAnalyzer.analyzeTargetHits(d),
  'Q-MAC-01': (d) => MacroBalanceAnalyzer.analyzeProtein(d),
  'Q-MAC-02': (d) => MacroBalanceAnalyzer.analyzeMacroBalance(d),
  'Q-CAL-01': (d) => CalorieTrendAnalyzer.analyzeSurplusDeficit(d),
  'Q-CAL-02': (d) => CalorieTrendAnalyzer.analyzeCalorieTrend(d),
  'Q-CAL-03': (d) => CalorieTrendAnalyzer.analyzeDayByDay(d),
  'Q-HYD-01': (d) => HydrationAnalyzer.analyzeHydration(d),
  'Q-TIM-01': (d) => TimingAnalyzer.analyzeMealCount(d),
  'Q-TIM-02': (d) => TimingAnalyzer.analyzeWeekdayWeekend(d),
  'Q-CMP-01': (d) => ComparisonAnalyzer.analyzeWeekComparison(d),
  'Q-CMP-02': (d) => ComparisonAnalyzer.analyzeProteinTrend(d),
  'Q-HI-01': (d) => HighlightsAnalyzer.analyzeHighlights(d),
  'Q-HI-02': (d) => HighlightsAnalyzer.analyzeFocusSuggestion(d),
};

export class QuestionScorer {
  /**
   * Score all questions based on the collected data.
   * Runs all applicable analyzers and returns scored results.
   */
  static scoreAllQuestions(data: WeeklyCollectedData): ScoredQuestion[] {
    const scored: ScoredQuestion[] = [];

    for (const definition of QUESTION_LIBRARY) {
      // Check gates
      const isAvailable = QuestionScorer.checkGates(definition.id, data);

      // Run analyzer if available
      const analyzer = analyzerMap[definition.id];
      if (!analyzer) continue;

      const analysisResult = analyzer(data);

      scored.push({
        questionId: definition.id,
        definition,
        score: analysisResult.interestingnessScore,
        isAvailable,
        isPinned: definition.isPinned,
        analysisResult,
      });
    }

    return scored;
  }

  /**
   * Select the top questions to display.
   * Pinned first, then by score, max 2 per category.
   */
  static selectTopQuestions(
    scored: ScoredQuestion[],
    maxQuestions: number = 6
  ): ScoredQuestion[] {
    const pinned = scored.filter((q) => q.isPinned && q.isAvailable);
    const available = scored
      .filter((q) => !q.isPinned && q.isAvailable && q.score >= 0.3)
      .sort((a, b) => b.score - a.score);

    const selected: ScoredQuestion[] = [...pinned];
    const categoryCounts: Record<string, number> = {};

    // Count pinned categories
    for (const q of pinned) {
      categoryCounts[q.definition.category] =
        (categoryCounts[q.definition.category] || 0) + 1;
    }

    // Add non-pinned questions respecting category diversity
    for (const q of available) {
      if (selected.length >= maxQuestions) break;
      const catCount = categoryCounts[q.definition.category] || 0;
      if (catCount >= 2) continue;
      selected.push(q);
      categoryCounts[q.definition.category] = catCount + 1;
    }

    // Sort: Q-HI-01 first, Q-HI-02 last, rest by score
    return selected.sort((a, b) => {
      if (a.questionId === 'Q-HI-01') return -1;
      if (b.questionId === 'Q-HI-01') return 1;
      if (a.questionId === 'Q-HI-02') return 1;
      if (b.questionId === 'Q-HI-02') return -1;
      return b.score - a.score;
    });
  }

  /**
   * Check if a question passes all its data gates.
   */
  private static checkGates(questionId: string, data: WeeklyCollectedData): boolean {
    const def = QUESTION_LIBRARY.find((q) => q.id === questionId);
    if (!def) return false;

    // Permanently gated questions
    if (def.requiresFiberData) return false;
    if (def.requiresDeficiencyData) return false;

    // Minimum logged days
    if (data.loggedDayCount < def.minimumLoggedDays) return false;

    // Prior week requirement
    if (def.requiresPriorWeek && (!data.priorWeek || data.priorWeek.loggedDayCount < 3)) {
      return false;
    }

    // Water data requirement
    if (def.requiresWaterData) {
      const waterDays = data.days.filter((d) => d.water > 0).length;
      if (waterDays < 3) return false;
    }

    // Special gate for Q-TIM-02: needs weekday + weekend data
    if (questionId === 'Q-TIM-02') {
      const weekdays = data.days.filter((d) => d.isLogged && d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
      const weekends = data.days.filter((d) => d.isLogged && (d.dayOfWeek === 0 || d.dayOfWeek === 6));
      if (weekdays.length < 3 || weekends.length < 1) return false;
    }

    // Special gate for Q-CMP-02: needs 3+ weeks
    if (questionId === 'Q-CMP-02') {
      if (!data.priorWeek || !data.twoWeeksAgo) return false;
      if (data.twoWeeksAgo.loggedDayCount < 4) return false;
    }

    return true;
  }
}
