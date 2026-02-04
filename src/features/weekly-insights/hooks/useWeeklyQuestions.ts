/**
 * useWeeklyQuestions Hook
 * Runs the QuestionScorer on collected data and returns scored questions + headline
 */

import { useMemo } from 'react';
import type { WeeklyCollectedData, ScoredQuestion } from '../types/weeklyInsights.types';
import { QuestionScorer } from '../services/QuestionScorer';
import { generateHeadline, DEFAULT_HEADLINE } from '../constants/headlineTemplates';

interface UseWeeklyQuestionsResult {
  questions: ScoredQuestion[];
  headline: string;
}

export function useWeeklyQuestions(
  data: WeeklyCollectedData | null
): UseWeeklyQuestionsResult {
  return useMemo(() => {
    if (!data || data.loggedDayCount < 2) {
      return {
        questions: [],
        headline: DEFAULT_HEADLINE,
      };
    }

    const allScored = QuestionScorer.scoreAllQuestions(data);
    const questions = QuestionScorer.selectTopQuestions(allScored);

    // Generate headline from the top non-pinned question (or first pinned)
    let headline = DEFAULT_HEADLINE;
    // Use the first non-highlights question for headline, or first question
    const headlineQuestion =
      questions.find((q) => q.definition.category !== 'highlights') ?? questions[0];
    if (headlineQuestion) {
      headline = generateHeadline(headlineQuestion.questionId, headlineQuestion.analysisResult);
    }

    return { questions, headline };
  }, [data]);
}
