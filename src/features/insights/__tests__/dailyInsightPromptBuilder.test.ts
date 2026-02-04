/**
 * Daily Insight Prompt Builder Tests
 */

import {
  buildSystemPrompt,
  buildQuestionPrompt,
  DAILY_INSIGHT_LLM_CONFIG,
} from '../services/daily/DailyInsightPromptBuilder';
import type { QuestionAnalysis } from '../types/dailyInsights.types';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('includes Nourished Calm voice guidelines', () => {
    expect(prompt).toContain('Nourished Calm');
    expect(prompt).toContain('warm, knowledgeable, never judgmental');
  });

  it('lists banned words', () => {
    expect(prompt).toContain('"failed"');
    expect(prompt).toContain('"cheated"');
    expect(prompt).toContain('"warning"');
    expect(prompt).toContain('"bad"');
    expect(prompt).toContain('"poor"');
    expect(prompt).toContain('"behind"');
  });

  it('lists preferred phrases', () => {
    expect(prompt).toContain('"consider"');
    expect(prompt).toContain('"room to"');
    expect(prompt).toContain('"on track"');
  });

  it('specifies 2-3 sentence max', () => {
    expect(prompt).toContain('2-3 sentences');
  });

  it('specifies emoji response format', () => {
    expect(prompt).toContain('single emoji');
    expect(prompt).toContain('RESPONSE FORMAT');
  });

  it('instructs not to calculate numbers', () => {
    expect(prompt).toContain('Do not perform any math');
  });
});

describe('buildQuestionPrompt', () => {
  const mockAnalysis: QuestionAnalysis = {
    questionId: 'macro_overview',
    dataBlock: 'Calories: 1500 of 2000 (75%)\nProtein: 100g of 150g (67%)',
    fallbackText: 'Your macros are tracking at 75%.',
    dataCards: [],
    computedAt: Date.now(),
  };

  it('includes the question text', () => {
    const prompt = buildQuestionPrompt('macro_overview', 'Am I on track?', mockAnalysis);
    expect(prompt).toContain('Am I on track?');
  });

  it('includes the data block', () => {
    const prompt = buildQuestionPrompt('macro_overview', 'Am I on track?', mockAnalysis);
    expect(prompt).toContain('Calories: 1500 of 2000 (75%)');
    expect(prompt).toContain('Protein: 100g of 150g (67%)');
  });

  it('includes instruction for 2-3 sentence insight', () => {
    const prompt = buildQuestionPrompt('macro_overview', 'Am I on track?', mockAnalysis);
    expect(prompt).toContain('2-3 sentence');
  });
});

describe('DAILY_INSIGHT_LLM_CONFIG', () => {
  it('has maxTokens set for concise output', () => {
    expect(DAILY_INSIGHT_LLM_CONFIG.maxTokens).toBe(120);
  });

  it('has temperature below 0.7 for consistency', () => {
    expect(DAILY_INSIGHT_LLM_CONFIG.temperature).toBeLessThan(0.7);
  });

  it('has stop sequences to prevent multi-paragraph responses', () => {
    expect(DAILY_INSIGHT_LLM_CONFIG.stopSequences).toContain('\n\n');
  });
});
