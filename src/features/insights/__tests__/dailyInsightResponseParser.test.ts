/**
 * Daily Insight Response Parser Tests
 */

import { parseInsightResponse } from '../services/daily/DailyInsightResponseParser';

describe('parseInsightResponse', () => {
  describe('emoji extraction', () => {
    it('extracts standard emoji prefix', () => {
      const result = parseInsightResponse('🎯 Your macros are tracking well today.');
      expect(result.emoji).toBe('🎯');
      expect(result.narrative).toBe('Your macros are tracking well today.');
      expect(result.isValid).toBe(true);
    });

    it('extracts emoji with variation selector', () => {
      const result = parseInsightResponse('💧 Water intake is at 60%.');
      expect(result.emoji).toBe('💧');
      expect(result.narrative).toBe('Water intake is at 60%.');
    });

    it('uses default emoji when none present', () => {
      const result = parseInsightResponse('Your macros are tracking well.');
      expect(result.emoji).toBe('🌿');
      expect(result.narrative).toBe('Your macros are tracking well.');
      expect(result.isValid).toBe(false);
      expect(result.validationIssues).toContain('No emoji prefix found, using default');
    });
  });

  describe('length validation', () => {
    it('keeps short responses as-is', () => {
      const result = parseInsightResponse('🎯 First sentence. Second sentence.');
      expect(result.narrative).toBe('First sentence. Second sentence.');
      expect(result.isValid).toBe(true);
    });

    it('truncates responses over 5 sentences', () => {
      const long = '🎯 One. Two. Three. Four. Five. Six. Seven.';
      const result = parseInsightResponse(long);
      const sentenceCount = (result.narrative.match(/[.!?]+/g) || []).length;
      expect(sentenceCount).toBeLessThanOrEqual(3);
    });
  });

  describe('banned word replacement', () => {
    it('replaces "failed"', () => {
      const result = parseInsightResponse('🎯 You failed to hit protein.');
      expect(result.narrative).not.toContain('failed');
      expect(result.narrative).toContain('fell short of');
      expect(result.validationIssues.some((i) => i.includes('failed'))).toBe(true);
    });

    it('replaces "cheated"', () => {
      const result = parseInsightResponse('🎯 You cheated on your diet.');
      expect(result.narrative).not.toContain('cheated');
      expect(result.narrative).toContain('deviated from');
    });

    it('replaces "warning"', () => {
      const result = parseInsightResponse('🎯 Warning: calories exceeded.');
      expect(result.narrative).not.toContain('Warning');
      expect(result.narrative).toContain('note');
    });

    it('replaces "bad"', () => {
      const result = parseInsightResponse('🎯 This is a bad macro split.');
      expect(result.narrative).not.toContain('bad');
      expect(result.narrative).toContain('less ideal');
    });

    it('replaces "poor"', () => {
      const result = parseInsightResponse('🎯 Poor protein distribution.');
      expect(result.narrative).not.toContain('poor');
      expect(result.narrative).toContain('limited');
    });

    it('replaces "behind"', () => {
      const result = parseInsightResponse('🎯 You are behind on protein.');
      expect(result.narrative).not.toContain('behind');
      expect(result.narrative).toContain('below');
    });

    it('replaces "falling short"', () => {
      const result = parseInsightResponse('🎯 You are falling short of your goals.');
      expect(result.narrative).not.toContain('falling short');
      expect(result.narrative).toContain('room to grow');
    });
  });

  describe('exclamation mark removal', () => {
    it('replaces exclamation marks with periods', () => {
      const result = parseInsightResponse('🎯 Great progress! Keep it up!');
      expect(result.narrative).not.toContain('!');
      expect(result.narrative).toContain('Great progress.');
      expect(result.narrative).toContain('Keep it up.');
    });
  });

  describe('edge cases', () => {
    it('handles empty response', () => {
      const result = parseInsightResponse('');
      expect(result.emoji).toBe('🌿');
      expect(result.narrative).toBe('');
      expect(result.isValid).toBe(false);
    });

    it('handles emoji-only response', () => {
      const result = parseInsightResponse('🎯');
      expect(result.emoji).toBe('🎯');
      expect(result.narrative).toBe('');
    });

    it('handles response with only whitespace', () => {
      const result = parseInsightResponse('   ');
      expect(result.emoji).toBe('🌿');
    });

    it('handles multiple validation issues', () => {
      const result = parseInsightResponse('You failed badly! One. Two. Three. Four. Five. Six.');
      expect(result.validationIssues.length).toBeGreaterThan(1);
    });

    it('handles response with no sentences', () => {
      const result = parseInsightResponse('🎯 Just some text');
      expect(result.narrative).toBe('Just some text');
    });
  });
});
