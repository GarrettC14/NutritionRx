import { getScreenOrder, getNextStep, ALL_ONBOARDING_SCREENS } from '../onboarding';

// ── getScreenOrder ─────────────────────────────────────────────

describe('getScreenOrder', () => {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'experience'];

  describe('beginner experience level', () => {
    it('returns 7 screens with target for beginner + lose', () => {
      const order = getScreenOrder('lose', 'beginner');
      expect(order).toEqual([...base, 'target', 'your-plan']);
      expect(order).toHaveLength(7);
    });

    it('returns 7 screens with target for beginner + gain', () => {
      const order = getScreenOrder('gain', 'beginner');
      expect(order).toEqual([...base, 'target', 'your-plan']);
      expect(order).toHaveLength(7);
    });

    it('returns 6 screens without target, eating-style, or protein for beginner + maintain', () => {
      const order = getScreenOrder('maintain', 'beginner');
      expect(order).toEqual([...base, 'your-plan']);
      expect(order).toHaveLength(6);
      expect(order).not.toContain('target');
      expect(order).not.toContain('eating-style');
      expect(order).not.toContain('protein');
    });

    it('returns 6 screens for beginner + null goalPath', () => {
      const order = getScreenOrder(null, 'beginner');
      expect(order).toEqual([...base, 'your-plan']);
      expect(order).toHaveLength(6);
      expect(order).not.toContain('target');
    });
  });

  describe('intermediate experience level', () => {
    it('returns 9 screens with eating-style, protein, and target for intermediate + lose', () => {
      const order = getScreenOrder('lose', 'intermediate');
      expect(order).toEqual([...base, 'eating-style', 'protein', 'target', 'your-plan']);
      expect(order).toHaveLength(9);
    });

    it('returns 9 screens with eating-style, protein, and target for intermediate + gain', () => {
      const order = getScreenOrder('gain', 'intermediate');
      expect(order).toEqual([...base, 'eating-style', 'protein', 'target', 'your-plan']);
      expect(order).toHaveLength(9);
    });

    it('returns 8 screens with eating-style and protein but no target for intermediate + maintain', () => {
      const order = getScreenOrder('maintain', 'intermediate');
      expect(order).toEqual([...base, 'eating-style', 'protein', 'your-plan']);
      expect(order).toHaveLength(8);
      expect(order).not.toContain('target');
    });
  });

  describe('advanced experience level', () => {
    it('returns 9 screens for advanced + lose', () => {
      const order = getScreenOrder('lose', 'advanced');
      expect(order).toEqual([...base, 'eating-style', 'protein', 'target', 'your-plan']);
      expect(order).toHaveLength(9);
    });

    it('returns 8 screens with eating-style and protein but no target for advanced + maintain', () => {
      const order = getScreenOrder('maintain', 'advanced');
      expect(order).toEqual([...base, 'eating-style', 'protein', 'your-plan']);
      expect(order).toHaveLength(8);
      expect(order).not.toContain('target');
    });
  });

  describe('null/undefined experience level (non-beginner default)', () => {
    it('returns full flow with eating-style and protein for null experienceLevel + lose', () => {
      const order = getScreenOrder('lose', null);
      expect(order).toEqual([...base, 'eating-style', 'protein', 'target', 'your-plan']);
      expect(order).toHaveLength(9);
    });

    it('returns full flow for undefined experienceLevel + gain', () => {
      const order = getScreenOrder('gain');
      expect(order).toEqual([...base, 'eating-style', 'protein', 'target', 'your-plan']);
      expect(order).toHaveLength(9);
    });

    it('returns 8 screens without target for null experienceLevel + maintain', () => {
      const order = getScreenOrder('maintain', null);
      expect(order).toEqual([...base, 'eating-style', 'protein', 'your-plan']);
      expect(order).toHaveLength(8);
    });

    it('returns flow without target for null goalPath and null experienceLevel', () => {
      const order = getScreenOrder(null, null);
      expect(order).toEqual([...base, 'eating-style', 'protein', 'your-plan']);
      expect(order).not.toContain('target');
    });
  });

  describe('always starts with base and ends with your-plan', () => {
    const cases: [string | null, string | null][] = [
      ['lose', 'beginner'],
      ['gain', 'intermediate'],
      ['maintain', 'advanced'],
      [null, null],
    ];

    it.each(cases)('goalPath=%s, experienceLevel=%s starts with base and ends with your-plan', (goalPath, exp) => {
      const order = getScreenOrder(goalPath, exp);
      expect(order.slice(0, 5)).toEqual(base);
      expect(order[order.length - 1]).toBe('your-plan');
    });
  });
});

// ── getNextStep ────────────────────────────────────────────────

describe('getNextStep', () => {
  it('returns the second screen from the first screen', () => {
    expect(getNextStep('goal', 'lose', 'beginner')).toBe('about-you');
  });

  it('returns null from the last screen (your-plan)', () => {
    expect(getNextStep('your-plan', 'lose', 'beginner')).toBeNull();
  });

  it('returns null for an unknown screen', () => {
    expect(getNextStep('nonexistent', 'lose', 'beginner')).toBeNull();
  });

  it('navigates correctly in the middle of a beginner + lose flow', () => {
    expect(getNextStep('experience', 'lose', 'beginner')).toBe('target');
    expect(getNextStep('target', 'lose', 'beginner')).toBe('your-plan');
  });

  it('navigates correctly in the middle of an intermediate + gain flow', () => {
    expect(getNextStep('experience', 'gain', 'intermediate')).toBe('eating-style');
    expect(getNextStep('eating-style', 'gain', 'intermediate')).toBe('protein');
    expect(getNextStep('protein', 'gain', 'intermediate')).toBe('target');
    expect(getNextStep('target', 'gain', 'intermediate')).toBe('your-plan');
  });

  it('skips eating-style and protein for beginner', () => {
    // For beginner + maintain, experience -> your-plan (no eating-style/protein/target)
    expect(getNextStep('experience', 'maintain', 'beginner')).toBe('your-plan');
  });

  it('skips target for maintain goals', () => {
    // For intermediate + maintain, protein -> your-plan (no target)
    expect(getNextStep('protein', 'maintain', 'intermediate')).toBe('your-plan');
  });

  it('returns correct next step with null experienceLevel', () => {
    // null experience -> non-beginner flow
    expect(getNextStep('experience', 'lose', null)).toBe('eating-style');
  });
});

// ── ALL_ONBOARDING_SCREENS ─────────────────────────────────────

describe('ALL_ONBOARDING_SCREENS', () => {
  it('contains exactly 9 elements', () => {
    expect(ALL_ONBOARDING_SCREENS).toHaveLength(9);
  });

  it('contains all expected screen names', () => {
    const expected = [
      'goal',
      'about-you',
      'body-stats',
      'activity',
      'experience',
      'eating-style',
      'protein',
      'target',
      'your-plan',
    ];
    expect([...ALL_ONBOARDING_SCREENS]).toEqual(expected);
  });

  it('includes every screen that can appear in any flow', () => {
    // Collect all unique screens from various flows
    const allFlowScreens = new Set<string>();
    const goalPaths = ['lose', 'gain', 'maintain', null];
    const levels = ['beginner', 'intermediate', 'advanced', null];

    for (const goal of goalPaths) {
      for (const level of levels) {
        for (const screen of getScreenOrder(goal, level)) {
          allFlowScreens.add(screen);
        }
      }
    }

    for (const screen of allFlowScreens) {
      expect(ALL_ONBOARDING_SCREENS).toContain(screen);
    }
  });
});
