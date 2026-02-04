/**
 * useWeeklyQuestions Hook
 * Runs the QuestionScorer on collected data and returns scored questions + headline + unavailable
 */

import { useMemo } from 'react';
import type { WeeklyCollectedData, ScoredQuestion } from '../types/weeklyInsights.types';
import { QuestionScorer } from '../services/QuestionScorer';
import { generateHeadline, DEFAULT_HEADLINE } from '../constants/headlineTemplates';

interface UseWeeklyQuestionsResult {
  questions: ScoredQuestion[];
  unavailableQuestions: ScoredQuestion[];
  headline: string;
}

export function useWeeklyQuestions(
  data: WeeklyCollectedData | null
): UseWeeklyQuestionsResult {
  return useMemo(() => {
    if (!data || data.loggedDayCount < 2) {
      console.log(`[LLM:WeeklyQuestions] useMemo — insufficient data (loggedDays=${data?.loggedDayCount ?? 0}), returning defaults`);
      return {
        questions: [],
        unavailableQuestions: [],
        headline: DEFAULT_HEADLINE,
      };
    }

    console.log(`[LLM:WeeklyQuestions] useMemo — scoring questions for ${data.loggedDayCount} logged days`);
    const allScored = QuestionScorer.scoreAllQuestions(data);
    const questions = QuestionScorer.selectTopQuestions(allScored);

    // Unavailable questions: scored but didn't pass data gates (excluding permanently gated)
    const unavailableQuestions = allScored.filter(
      (q) =>
        !q.isAvailable &&
        !q.definition.requiresFiberData &&
        !q.definition.requiresDeficiencyData
    );

    // Generate headline from the top non-pinned question (or first pinned)
    let headline = DEFAULT_HEADLINE;
    const headlineQuestion =
      questions.find((q) => q.definition.category !== 'highlights') ?? questions[0];
    if (headlineQuestion) {
      headline = generateHeadline(headlineQuestion.questionId, headlineQuestion.analysisResult);
    }

    console.log(`[LLM:WeeklyQuestions] Result — ${questions.length} questions selected, ${unavailableQuestions.length} unavailable, headline="${headline.substring(0, 80)}..."`);
    return { questions, unavailableQuestions, headline };
  }, [data]);
}
