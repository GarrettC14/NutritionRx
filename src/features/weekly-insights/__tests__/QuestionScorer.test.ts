/**
 * Question Scorer Tests
 */

import { QuestionScorer } from '../services/QuestionScorer';
import {
  PERFECT_WEEK,
  SPARSE_WEEK,
  WEEKEND_HEAVY,
  EMPTY_WEEK,
  LOW_PROTEIN,
  makeWeekData,
} from './fixtures';

describe('QuestionScorer', () => {
  describe('scoreAllQuestions', () => {
    it('scores 15 questions (excludes Q-MAC-03, Q-NUT-01 which have no analyzer)', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      // 17 in QUESTION_LIBRARY - 2 with no analyzer (Q-MAC-03, Q-NUT-01) = 15
      expect(scored.length).toBe(15);
    });

    it('each scored question has required fields', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      for (const q of scored) {
        expect(q.questionId).toBeTruthy();
        expect(q.definition).toBeDefined();
        expect(typeof q.score).toBe('number');
        expect(typeof q.isAvailable).toBe('boolean');
        expect(typeof q.isPinned).toBe('boolean');
        expect(q.analysisResult).toBeDefined();
      }
    });

    it('does not include Q-MAC-03 (fiber, no analyzer)', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const fiber = scored.find((q) => q.questionId === 'Q-MAC-03');
      // Q-MAC-03 has no analyzer, so it's skipped entirely
      expect(fiber).toBeUndefined();
    });

    it('does not include Q-NUT-01 (nutrients, no analyzer)', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const nutrient = scored.find((q) => q.questionId === 'Q-NUT-01');
      // Q-NUT-01 has no analyzer, so it's skipped entirely
      expect(nutrient).toBeUndefined();
    });

    it('Q-HI-01 is always available with score 1.0', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const hi01 = scored.find((q) => q.questionId === 'Q-HI-01');
      expect(hi01?.isAvailable).toBe(true);
      expect(hi01?.score).toBe(1.0);
    });

    it('Q-HI-02 is always available with score 0.9', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const hi02 = scored.find((q) => q.questionId === 'Q-HI-02');
      expect(hi02?.isAvailable).toBe(true);
      expect(hi02?.score).toBe(0.9);
    });

    it('gates questions requiring prior week when no prior data', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const cmp01 = scored.find((q) => q.questionId === 'Q-CMP-01');
      expect(cmp01?.isAvailable).toBe(false);
    });

    it('gates Q-TIM-02 without both weekday and weekend data', () => {
      // Sparse week has only Mon + Thu logged - no weekend data
      const scored = QuestionScorer.scoreAllQuestions(SPARSE_WEEK);
      const tim02 = scored.find((q) => q.questionId === 'Q-TIM-02');
      expect(tim02?.isAvailable).toBe(false);
    });

    it('makes Q-TIM-02 available with weekday + weekend data', () => {
      const scored = QuestionScorer.scoreAllQuestions(WEEKEND_HEAVY);
      const tim02 = scored.find((q) => q.questionId === 'Q-TIM-02');
      expect(tim02?.isAvailable).toBe(true);
    });

    it('gates Q-CMP-02 without 3 weeks of data', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const cmp02 = scored.find((q) => q.questionId === 'Q-CMP-02');
      expect(cmp02?.isAvailable).toBe(false);
    });

    it('makes Q-CMP-02 available with 3 weeks of data', () => {
      const data = makeWeekData({
        ...PERFECT_WEEK,
        priorWeek: makeWeekData({
          weekStartDate: '2025-01-12',
          avgProtein: 140,
          loggedDayCount: 5,
        }),
        twoWeeksAgo: makeWeekData({
          weekStartDate: '2025-01-05',
          avgProtein: 130,
          loggedDayCount: 5,
        }),
      });
      const scored = QuestionScorer.scoreAllQuestions(data);
      const cmp02 = scored.find((q) => q.questionId === 'Q-CMP-02');
      expect(cmp02?.isAvailable).toBe(true);
    });
  });

  describe('selectTopQuestions', () => {
    it('always includes Q-HI-01 first', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const selected = QuestionScorer.selectTopQuestions(scored);
      expect(selected[0].questionId).toBe('Q-HI-01');
    });

    it('always includes Q-HI-02 last', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const selected = QuestionScorer.selectTopQuestions(scored);
      expect(selected[selected.length - 1].questionId).toBe('Q-HI-02');
    });

    it('respects maxQuestions limit', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const selected = QuestionScorer.selectTopQuestions(scored, 4);
      expect(selected.length).toBeLessThanOrEqual(4);
    });

    it('limits to 2 per category', () => {
      const scored = QuestionScorer.scoreAllQuestions(WEEKEND_HEAVY);
      const selected = QuestionScorer.selectTopQuestions(scored);

      const categoryCounts: Record<string, number> = {};
      for (const q of selected) {
        const cat = q.definition.category;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }

      for (const count of Object.values(categoryCounts)) {
        expect(count).toBeLessThanOrEqual(2);
      }
    });

    it('excludes questions with score below 0.3', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const selected = QuestionScorer.selectTopQuestions(scored);

      // All non-pinned questions should have score >= 0.3
      const nonPinned = selected.filter((q) => !q.isPinned);
      for (const q of nonPinned) {
        expect(q.score).toBeGreaterThanOrEqual(0.3);
      }
    });

    it('does not include gated questions', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const selected = QuestionScorer.selectTopQuestions(scored);

      const selectedIds = selected.map((q) => q.questionId);
      expect(selectedIds).not.toContain('Q-MAC-03');
      expect(selectedIds).not.toContain('Q-NUT-01');
    });

    it('returns at least pinned questions for valid data', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const selected = QuestionScorer.selectTopQuestions(scored);
      expect(selected.length).toBeGreaterThanOrEqual(2);
    });
  });
});
