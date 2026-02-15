jest.mock('@/repositories', () => ({}));

import { getProgressMessage, checkSentimentPatterns } from '../reflectionMessages';

// ── getProgressMessage ─────────────────────────────────────────

describe('getProgressMessage', () => {
  // Default args helper — lose goal, normal scenario
  const defaults = {
    isFirstReflection: false,
    weightChangeKg: -0.5,
    goalType: 'lose' as const,
    currentWeightKg: 80,
    daysSinceLastReflection: 7,
    targetWeightKg: 70 as number | null,
    estimatedCompletionDate: '2026-06-15' as string | null,
    unitPreference: 'kg' as const,
  };

  function callWith(overrides: Partial<typeof defaults> = {}): string {
    const args = { ...defaults, ...overrides };
    return getProgressMessage(
      args.isFirstReflection,
      args.weightChangeKg,
      args.goalType,
      args.currentWeightKg,
      args.daysSinceLastReflection,
      args.targetWeightKg,
      args.estimatedCompletionDate,
      args.unitPreference,
    );
  }

  // ── Priority 1: First reflection ──────────────────────────────

  describe('Priority 1: first reflection', () => {
    it('returns welcome message on first reflection', () => {
      const result = callWith({ isFirstReflection: true });
      expect(result).toBe(
        "Welcome to your first weekly reflection! Going forward, we'll check in like this each week to keep your plan tuned to you.",
      );
    });

    it('first reflection overrides overdue days', () => {
      const result = callWith({ isFirstReflection: true, daysSinceLastReflection: 30 });
      expect(result).toContain('first weekly reflection');
    });

    it('first reflection overrides lose + loss scenario', () => {
      const result = callWith({
        isFirstReflection: true,
        goalType: 'lose',
        weightChangeKg: -0.5,
      });
      expect(result).toContain('first weekly reflection');
    });
  });

  // ── Priority 8: Very overdue (>= 14 days) ────────────────────

  describe('Priority 8: very overdue', () => {
    it('returns overdue message when daysSinceLastReflection is exactly 14', () => {
      const result = callWith({ daysSinceLastReflection: 14 });
      expect(result).toContain("It's been a little while!");
      expect(result).toContain('2 weeks');
    });

    it('calculates weeks correctly for 21 days', () => {
      const result = callWith({ daysSinceLastReflection: 21 });
      expect(result).toContain('3 weeks');
    });

    it('rounds weeks for non-exact multiples of 7', () => {
      // 18 days / 7 ≈ 2.57 → rounds to 3
      const result = callWith({ daysSinceLastReflection: 18 });
      expect(result).toContain('3 weeks');
    });

    it('overdue overrides lose + loss scenario', () => {
      const result = callWith({
        daysSinceLastReflection: 14,
        goalType: 'lose',
        weightChangeKg: -0.5,
      });
      expect(result).toContain("It's been a little while!");
    });

    it('does not trigger for 13 days', () => {
      const result = callWith({ daysSinceLastReflection: 13, goalType: 'lose', weightChangeKg: -0.5 });
      expect(result).not.toContain("It's been a little while!");
    });
  });

  // ── Maintain goal / null weight change ────────────────────────

  describe('maintain goal or null weight change', () => {
    it('returns "plan is looking good" for maintain goal', () => {
      const result = callWith({ goalType: 'maintain' });
      expect(result).toBe('Your plan is looking good.');
    });

    it('returns "plan is looking good" when weight change is null', () => {
      const result = callWith({ weightChangeKg: null });
      expect(result).toBe('Your plan is looking good.');
    });

    it('returns "plan is looking good" for maintain even with non-null weight change', () => {
      const result = callWith({ goalType: 'maintain', weightChangeKg: -1.5 });
      expect(result).toBe('Your plan is looking good.');
    });
  });

  // ── Priority 6: Lose + lost too fast (>1.0% of body weight) ──

  describe('Priority 6: lose + lost too fast', () => {
    it('returns sustainable message when loss exceeds 1% of body weight', () => {
      // -2kg at 80kg = 2.5% — exceeds 1.0% threshold
      const result = callWith({ goalType: 'lose', weightChangeKg: -2, currentWeightKg: 80 });
      expect(result).toContain('sustainable');
      expect(result).toContain('nudged your calories up');
    });

    it('does not trigger at exactly 1% boundary', () => {
      // -0.8kg at 80kg = 1.0% — not strictly > 1.0%
      const result = callWith({ goalType: 'lose', weightChangeKg: -0.8, currentWeightKg: 80 });
      expect(result).not.toContain('sustainable');
    });

    it('triggers just above 1% boundary', () => {
      // -0.81kg at 80kg = 1.0125% — strictly > 1.0%
      const result = callWith({ goalType: 'lose', weightChangeKg: -0.81, currentWeightKg: 80 });
      expect(result).toContain('sustainable');
    });
  });

  // ── Priority 7: Gain + gained too fast (>0.5% of body weight) ─

  describe('Priority 7: gain + gained too fast', () => {
    it('returns surplus adjustment message when gain exceeds 0.5% of body weight', () => {
      // +1kg at 80kg = 1.25% — exceeds 0.5% threshold
      const result = callWith({ goalType: 'gain', weightChangeKg: 1, currentWeightKg: 80 });
      expect(result).toContain('adjusted your surplus down');
    });

    it('does not trigger at exactly 0.5% boundary', () => {
      // +0.4kg at 80kg = 0.5% — not strictly > 0.5%
      const result = callWith({ goalType: 'gain', weightChangeKg: 0.4, currentWeightKg: 80 });
      expect(result).not.toContain('adjusted your surplus down');
    });

    it('triggers just above 0.5% boundary', () => {
      // +0.41kg at 80kg = 0.5125% — strictly > 0.5%
      const result = callWith({ goalType: 'gain', weightChangeKg: 0.41, currentWeightKg: 80 });
      expect(result).toContain('adjusted your surplus down');
    });
  });

  // ── Priority 2: Lose + normal loss ────────────────────────────

  describe('Priority 2: lose + normal loss', () => {
    it('includes formatted weight change in kg', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        unitPreference: 'kg',
        estimatedCompletionDate: null,
        targetWeightKg: null,
      });
      expect(result).toBe("You've lost about 0.5 kg this week.");
    });

    it('includes formatted weight change in lbs', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        unitPreference: 'lbs',
        estimatedCompletionDate: null,
        targetWeightKg: null,
      });
      // 0.5 * 2.20462 = 1.10231 → rounded to 1.1
      expect(result).toBe("You've lost about 1.1 lbs this week.");
    });

    it('includes estimated completion date and target weight when both provided', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        unitPreference: 'kg',
        targetWeightKg: 70,
        estimatedCompletionDate: '2026-06-15',
      });
      expect(result).toContain("You've lost about 0.5 kg this week.");
      expect(result).toContain('Aiming for 70 kg around Jun 15.');
    });

    it('omits completion info when estimatedCompletionDate is null', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        targetWeightKg: 70,
        estimatedCompletionDate: null,
      });
      expect(result).not.toContain('Aiming for');
    });

    it('omits completion info when targetWeightKg is null', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        targetWeightKg: null,
        estimatedCompletionDate: '2026-06-15',
      });
      expect(result).not.toContain('Aiming for');
    });

    it('formats target weight in lbs as rounded integer', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        unitPreference: 'lbs',
        targetWeightKg: 70,
        estimatedCompletionDate: '2026-06-15',
      });
      // 70 * 2.20462 = 154.3234 → rounded to 154
      expect(result).toContain('Aiming for 154 lbs');
    });
  });

  // ── Priority 3: Gain + normal gain ────────────────────────────

  describe('Priority 3: gain + normal gain', () => {
    it('includes formatted weight change in kg', () => {
      const result = callWith({
        goalType: 'gain',
        weightChangeKg: 0.3,
        unitPreference: 'kg',
        estimatedCompletionDate: null,
        targetWeightKg: null,
      });
      expect(result).toBe("You've gained about 0.3 kg this week — nice work.");
    });

    it('includes formatted weight change in lbs', () => {
      const result = callWith({
        goalType: 'gain',
        weightChangeKg: 0.3,
        unitPreference: 'lbs',
        estimatedCompletionDate: null,
        targetWeightKg: null,
      });
      // 0.3 * 2.20462 = 0.661386 → rounded to 0.7
      expect(result).toBe("You've gained about 0.7 lbs this week — nice work.");
    });

    it('includes estimated completion date and target weight when both provided', () => {
      const result = callWith({
        goalType: 'gain',
        weightChangeKg: 0.3,
        unitPreference: 'kg',
        targetWeightKg: 90,
        estimatedCompletionDate: '2026-12-01',
      });
      expect(result).toContain("You've gained about 0.3 kg this week — nice work.");
      expect(result).toContain('Aiming for 90 kg around Dec 1.');
    });

    it('omits completion info when estimatedCompletionDate is null', () => {
      const result = callWith({
        goalType: 'gain',
        weightChangeKg: 0.3,
        targetWeightKg: 90,
        estimatedCompletionDate: null,
      });
      expect(result).not.toContain('Aiming for');
    });

    it('omits completion info when targetWeightKg is null', () => {
      const result = callWith({
        goalType: 'gain',
        weightChangeKg: 0.3,
        targetWeightKg: null,
        estimatedCompletionDate: '2026-12-01',
      });
      expect(result).not.toContain('Aiming for');
    });
  });

  // ── Priority 4: Stable (<0.1kg change) ───────────────────────

  describe('Priority 4: stable weight (plateau)', () => {
    it('returns plateau message when absChange is 0', () => {
      // goalType=lose, weightChangeKg=0 → won't hit lose+negative branch, will hit plateau
      // Actually weightChangeKg=0 doesn't match lose+negative or gain+positive, so it falls through
      const result = callWith({ goalType: 'lose', weightChangeKg: 0 });
      expect(result).toContain('held steady');
      expect(result).toContain('Plateaus are a normal part');
    });

    it('returns plateau message when absChange is 0.09', () => {
      const result = callWith({ goalType: 'lose', weightChangeKg: 0.09 });
      expect(result).toContain('held steady');
    });

    it('does not trigger plateau at exactly 0.1', () => {
      // absChange = 0.1 is NOT < 0.1, so should fall to wrong direction
      const result = callWith({ goalType: 'lose', weightChangeKg: 0.1 });
      expect(result).not.toContain('held steady');
    });
  });

  // ── Priority 5: Wrong direction ──────────────────────────────

  describe('Priority 5: wrong direction', () => {
    it('returns fluctuation message when losing goal but gained weight', () => {
      const result = callWith({ goalType: 'lose', weightChangeKg: 0.3 });
      expect(result).toContain('shifted a bit');
      expect(result).toContain('completely normal');
      expect(result).toContain('stays the course');
    });

    it('returns fluctuation message when gain goal but lost weight', () => {
      const result = callWith({ goalType: 'gain', weightChangeKg: -0.3 });
      expect(result).toContain('shifted a bit');
    });
  });

  // ── formatWeightChange internals ──────────────────────────────

  describe('weight formatting (via getProgressMessage output)', () => {
    it('formats kg loss to 1 decimal place', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.75,
        unitPreference: 'kg',
        estimatedCompletionDate: null,
        targetWeightKg: null,
      });
      // Math.round(0.75 * 10) / 10 = 0.8
      expect(result).toContain('0.8 kg');
    });

    it('formats lbs loss to 1 decimal place', () => {
      // Use -0.5kg at 80kg = 0.625% (below 1% threshold, so hits normal loss path)
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        unitPreference: 'lbs',
        estimatedCompletionDate: null,
        targetWeightKg: null,
      });
      // 0.5 * 2.20462 = 1.10231 → round to 1 decimal → 1.1
      expect(result).toContain('1.1 lbs');
    });

    it('uses absolute value for weight change display', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        unitPreference: 'kg',
        estimatedCompletionDate: null,
        targetWeightKg: null,
      });
      expect(result).toContain('0.5 kg');
      expect(result).not.toContain('-0.5');
    });

    it('formats target weight in kg to 1 decimal place', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        unitPreference: 'kg',
        targetWeightKg: 72.5,
        estimatedCompletionDate: '2026-06-15',
      });
      expect(result).toContain('72.5 kg');
    });

    it('formats target weight in lbs as rounded integer', () => {
      const result = callWith({
        goalType: 'gain',
        weightChangeKg: 0.3,
        unitPreference: 'lbs',
        targetWeightKg: 90,
        estimatedCompletionDate: '2026-06-15',
      });
      // 90 * 2.20462 = 198.4158 → Math.round → 198
      expect(result).toContain('198 lbs');
    });
  });

  // ── formatDate internals ──────────────────────────────────────

  describe('date formatting (via getProgressMessage output)', () => {
    it('formats date as Mon DD', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        targetWeightKg: 70,
        estimatedCompletionDate: '2026-01-05',
      });
      expect(result).toContain('Jan 5');
    });

    it('formats date in December', () => {
      const result = callWith({
        goalType: 'lose',
        weightChangeKg: -0.5,
        targetWeightKg: 70,
        estimatedCompletionDate: '2026-12-25',
      });
      expect(result).toContain('Dec 25');
    });
  });
});

// ── checkSentimentPatterns ──────────────────────────────────────

describe('checkSentimentPatterns', () => {
  function makeSentiment(
    sentiment: 'positive' | 'neutral' | 'negative' | null,
    reflectedAt: string,
  ) {
    return { sentiment, reflectedAt };
  }

  describe('insufficient data', () => {
    it('returns null for empty array', () => {
      expect(checkSentimentPatterns([])).toBeNull();
    });

    it('returns null for 1 entry', () => {
      expect(
        checkSentimentPatterns([makeSentiment('negative', '2026-02-01')]),
      ).toBeNull();
    });

    it('returns null for 2 entries', () => {
      expect(
        checkSentimentPatterns([
          makeSentiment('negative', '2026-02-01'),
          makeSentiment('negative', '2026-01-25'),
        ]),
      ).toBeNull();
    });
  });

  describe('tough_streak', () => {
    it('returns tough_streak when all 3 most recent are negative', () => {
      const result = checkSentimentPatterns([
        makeSentiment('negative', '2026-02-15'),
        makeSentiment('negative', '2026-02-08'),
        makeSentiment('negative', '2026-02-01'),
      ]);
      expect(result).toBe('tough_streak');
    });

    it('returns tough_streak with more than 3 entries (only first 3 checked)', () => {
      const result = checkSentimentPatterns([
        makeSentiment('negative', '2026-02-15'),
        makeSentiment('negative', '2026-02-08'),
        makeSentiment('negative', '2026-02-01'),
        makeSentiment('positive', '2026-01-25'),
        makeSentiment('positive', '2026-01-18'),
      ]);
      expect(result).toBe('tough_streak');
    });
  });

  describe('recovery', () => {
    it('returns recovery when first is positive and last two are negative', () => {
      const result = checkSentimentPatterns([
        makeSentiment('positive', '2026-02-15'),
        makeSentiment('negative', '2026-02-08'),
        makeSentiment('negative', '2026-02-01'),
      ]);
      expect(result).toBe('recovery');
    });

    it('returns recovery when first is positive and 2 of 3 are negative (including neutral)', () => {
      // first positive, second negative, third negative → negativeCount=2, first is positive
      const result = checkSentimentPatterns([
        makeSentiment('positive', '2026-02-15'),
        makeSentiment('negative', '2026-02-08'),
        makeSentiment('negative', '2026-02-01'),
      ]);
      expect(result).toBe('recovery');
    });
  });

  describe('positive_streak', () => {
    it('returns positive_streak when all 3 most recent are positive', () => {
      const result = checkSentimentPatterns([
        makeSentiment('positive', '2026-02-15'),
        makeSentiment('positive', '2026-02-08'),
        makeSentiment('positive', '2026-02-01'),
      ]);
      expect(result).toBe('positive_streak');
    });

    it('returns positive_streak with extra entries (only first 3 checked)', () => {
      const result = checkSentimentPatterns([
        makeSentiment('positive', '2026-02-15'),
        makeSentiment('positive', '2026-02-08'),
        makeSentiment('positive', '2026-02-01'),
        makeSentiment('negative', '2026-01-25'),
      ]);
      expect(result).toBe('positive_streak');
    });
  });

  describe('null (no pattern)', () => {
    it('returns null for mixed positive, negative, positive', () => {
      const result = checkSentimentPatterns([
        makeSentiment('positive', '2026-02-15'),
        makeSentiment('negative', '2026-02-08'),
        makeSentiment('positive', '2026-02-01'),
      ]);
      expect(result).toBeNull();
    });

    it('returns null for all neutral sentiments', () => {
      const result = checkSentimentPatterns([
        makeSentiment('neutral', '2026-02-15'),
        makeSentiment('neutral', '2026-02-08'),
        makeSentiment('neutral', '2026-02-01'),
      ]);
      expect(result).toBeNull();
    });

    it('returns null for null sentiments', () => {
      const result = checkSentimentPatterns([
        makeSentiment(null, '2026-02-15'),
        makeSentiment(null, '2026-02-08'),
        makeSentiment(null, '2026-02-01'),
      ]);
      expect(result).toBeNull();
    });

    it('returns null for negative, positive, negative', () => {
      const result = checkSentimentPatterns([
        makeSentiment('negative', '2026-02-15'),
        makeSentiment('positive', '2026-02-08'),
        makeSentiment('negative', '2026-02-01'),
      ]);
      expect(result).toBeNull();
    });

    it('returns null for negative, negative, positive', () => {
      const result = checkSentimentPatterns([
        makeSentiment('negative', '2026-02-15'),
        makeSentiment('negative', '2026-02-08'),
        makeSentiment('positive', '2026-02-01'),
      ]);
      expect(result).toBeNull();
    });

    it('returns null for positive, positive, negative', () => {
      const result = checkSentimentPatterns([
        makeSentiment('positive', '2026-02-15'),
        makeSentiment('positive', '2026-02-08'),
        makeSentiment('negative', '2026-02-01'),
      ]);
      expect(result).toBeNull();
    });
  });
});
