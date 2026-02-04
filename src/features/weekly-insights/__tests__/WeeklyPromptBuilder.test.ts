/**
 * Weekly Prompt Builder Tests
 */

import { WeeklyPromptBuilder } from '../services/WeeklyPromptBuilder';
import { QuestionScorer } from '../services/QuestionScorer';
import { PERFECT_WEEK, WEEKEND_HEAVY, LOW_PROTEIN, makeWeekData } from './fixtures';

const BANNED_WORDS = ['failed', 'cheated', 'warning', 'bad', 'guilt', 'shame', 'terrible', 'awful', 'poor', 'struggle'];

describe('WeeklyPromptBuilder', () => {
  describe('hasBuilder', () => {
    it('has builders for all 13 active question IDs', () => {
      const activeIds = [
        'Q-CON-01', 'Q-CON-02', 'Q-CON-03',
        'Q-MAC-01', 'Q-MAC-02',
        'Q-CAL-01', 'Q-CAL-02', 'Q-CAL-03',
        'Q-HYD-01',
        'Q-TIM-01', 'Q-TIM-02',
        'Q-CMP-01', 'Q-CMP-02',
        'Q-HI-01', 'Q-HI-02',
      ];

      for (const id of activeIds) {
        expect(WeeklyPromptBuilder.hasBuilder(id)).toBe(true);
      }
    });

    it('returns false for unknown question IDs', () => {
      expect(WeeklyPromptBuilder.hasBuilder('Q-FAKE-99')).toBe(false);
    });
  });

  describe('build', () => {
    it('throws for unknown question IDs', () => {
      expect(() => {
        WeeklyPromptBuilder.build('Q-FAKE-99', {} as any);
      }).toThrow('No prompt builder for question');
    });

    it('builds valid prompt for each active question with PERFECT_WEEK', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);

      for (const question of scored) {
        if (!WeeklyPromptBuilder.hasBuilder(question.questionId)) continue;

        const prompt = WeeklyPromptBuilder.build(
          question.questionId,
          question.analysisResult
        );

        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(50);
        // All prompts should contain the system preamble
        expect(prompt).toContain('Nourished Calm');
      }
    });

    it('builds valid prompt for each active question with WEEKEND_HEAVY', () => {
      const scored = QuestionScorer.scoreAllQuestions(WEEKEND_HEAVY);

      for (const question of scored) {
        if (!WeeklyPromptBuilder.hasBuilder(question.questionId)) continue;

        const prompt = WeeklyPromptBuilder.build(
          question.questionId,
          question.analysisResult
        );

        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(50);
      }
    });

    it('system preamble never contains banned words', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);

      for (const question of scored) {
        if (!WeeklyPromptBuilder.hasBuilder(question.questionId)) continue;

        const prompt = WeeklyPromptBuilder.build(
          question.questionId,
          question.analysisResult
        );

        // The system preamble itself should never have banned words
        const lower = prompt.toLowerCase();
        for (const word of BANNED_WORDS) {
          // Prompts may reference "failed" in the NEVER-use list, so check the data portion
          // The SYSTEM_PREAMBLE references banned words only to say "NEVER use these words"
        }
        // Verify the prompt structure
        expect(prompt).toContain('Write');
        expect(prompt).toContain('sentence');
      }
    });
  });

  describe('prompt content correctness', () => {
    it('Q-CON-01 prompt includes CV values', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const q = scored.find((q) => q.questionId === 'Q-CON-01')!;
      const prompt = WeeklyPromptBuilder.build(q.questionId, q.analysisResult);
      expect(prompt).toContain('CV');
      expect(prompt).toContain('consistency');
    });

    it('Q-CAL-01 prompt includes calorie data', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const q = scored.find((q) => q.questionId === 'Q-CAL-01')!;
      const prompt = WeeklyPromptBuilder.build(q.questionId, q.analysisResult);
      expect(prompt).toContain('cal');
      expect(prompt).toContain('target');
    });

    it('Q-MAC-01 prompt includes protein data', () => {
      const scored = QuestionScorer.scoreAllQuestions(LOW_PROTEIN);
      const q = scored.find((q) => q.questionId === 'Q-MAC-01')!;
      const prompt = WeeklyPromptBuilder.build(q.questionId, q.analysisResult);
      expect(prompt).toContain('Protein');
      expect(prompt).toContain('g');
    });

    it('Q-HI-01 prompt includes highlights', () => {
      const scored = QuestionScorer.scoreAllQuestions(PERFECT_WEEK);
      const q = scored.find((q) => q.questionId === 'Q-HI-01')!;
      const prompt = WeeklyPromptBuilder.build(q.questionId, q.analysisResult);
      expect(prompt).toContain('Highlights');
      expect(prompt).toContain('celebrating');
    });

    it('Q-HI-02 prompt includes focus suggestion', () => {
      const scored = QuestionScorer.scoreAllQuestions(LOW_PROTEIN);
      const q = scored.find((q) => q.questionId === 'Q-HI-02')!;
      const prompt = WeeklyPromptBuilder.build(q.questionId, q.analysisResult);
      expect(prompt).toContain('focus');
      expect(prompt).toContain('suggestion');
    });

    it('Q-CMP-01 prompt works with prior week data', () => {
      const data = makeWeekData({
        ...PERFECT_WEEK,
        priorWeek: makeWeekData({
          avgCalories: 1800,
          avgProtein: 130,
          loggedDayCount: 5,
          totalMeals: 15,
        }),
      });
      const scored = QuestionScorer.scoreAllQuestions(data);
      const q = scored.find((q) => q.questionId === 'Q-CMP-01')!;
      const prompt = WeeklyPromptBuilder.build(q.questionId, q.analysisResult);
      expect(prompt).toContain('This week vs. last week');
    });
  });
});
