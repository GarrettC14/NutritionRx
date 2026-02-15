import {
  HALF_LIFE_DAYS,
  computeEffectiveAlpha,
  computeTrendSeries,
  recomputeEWMAFromDate,
} from '../trendWeight';

// ── HALF_LIFE_DAYS constant ──────────────────────────────────────

describe('HALF_LIFE_DAYS', () => {
  it('equals 7', () => {
    expect(HALF_LIFE_DAYS).toBe(7);
  });
});

// ── computeEffectiveAlpha ────────────────────────────────────────

describe('computeEffectiveAlpha', () => {
  it('returns 0 when dayGap is 0', () => {
    expect(computeEffectiveAlpha(0)).toBe(0);
  });

  it('returns ~0.5 when dayGap equals HALF_LIFE_DAYS (7)', () => {
    expect(computeEffectiveAlpha(7)).toBeCloseTo(0.5, 10);
  });

  it('returns ~0.75 when dayGap is two half-lives (14)', () => {
    expect(computeEffectiveAlpha(14)).toBeCloseTo(0.75, 10);
  });

  it('returns a small positive value for dayGap of 1', () => {
    const alpha = computeEffectiveAlpha(1);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(0.5);
    // 1 - 2^(-1/7) ~ 0.09427
    expect(alpha).toBeCloseTo(1 - Math.pow(2, -1 / 7), 10);
  });

  it('approaches 1 for a very large dayGap', () => {
    const alpha = computeEffectiveAlpha(1000);
    expect(alpha).toBeGreaterThan(0.999);
    expect(alpha).toBeLessThanOrEqual(1);
  });

  it('handles a fractional dayGap (0.5)', () => {
    const alpha = computeEffectiveAlpha(0.5);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(computeEffectiveAlpha(1));
    expect(alpha).toBeCloseTo(1 - Math.pow(2, -0.5 / 7), 10);
  });
});

// ── computeTrendSeries ───────────────────────────────────────────

describe('computeTrendSeries', () => {
  it('returns an empty array for empty input', () => {
    expect(computeTrendSeries([])).toEqual([]);
  });

  it('returns trendWeightKg equal to weightKg for a single entry', () => {
    const result = computeTrendSeries([{ date: '2025-01-01', weightKg: 80 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: '2025-01-01',
      weightKg: 80,
      trendWeightKg: 80,
    });
  });

  it('first entry always has trendWeightKg equal to weightKg', () => {
    const result = computeTrendSeries([
      { date: '2025-01-01', weightKg: 75 },
      { date: '2025-01-02', weightKg: 76 },
      { date: '2025-01-03', weightKg: 77 },
    ]);
    expect(result[0].trendWeightKg).toBe(75);
  });

  it('correctly computes EWMA for two entries 1 day apart', () => {
    const entries = [
      { date: '2025-01-01', weightKg: 80 },
      { date: '2025-01-02', weightKg: 82 },
    ];
    const result = computeTrendSeries(entries);

    const dayGap = 1;
    const alpha = computeEffectiveAlpha(dayGap);
    const expectedTrend = alpha * 82 + (1 - alpha) * 80;

    expect(result).toHaveLength(2);
    expect(result[0].trendWeightKg).toBe(80);
    expect(result[1].trendWeightKg).toBeCloseTo(expectedTrend, 10);
  });

  it('applies alpha=0.5 for a 7-day gap between entries', () => {
    const entries = [
      { date: '2025-01-01', weightKg: 80 },
      { date: '2025-01-08', weightKg: 84 },
    ];
    const result = computeTrendSeries(entries);

    // alpha = 0.5 for 7-day gap
    // trend = 0.5 * 84 + 0.5 * 80 = 82
    expect(result[1].trendWeightKg).toBeCloseTo(82, 10);
  });

  it('smooths data across multiple entries', () => {
    const entries = [
      { date: '2025-01-01', weightKg: 80 },
      { date: '2025-01-02', weightKg: 82 },
      { date: '2025-01-03', weightKg: 79 },
      { date: '2025-01-04', weightKg: 81 },
    ];
    const result = computeTrendSeries(entries);

    expect(result).toHaveLength(4);

    // Verify chain computation manually
    let prevTrend = 80;
    for (let i = 1; i < entries.length; i++) {
      const dayGap = 1; // consecutive days
      const alpha = computeEffectiveAlpha(dayGap);
      const expectedTrend = alpha * entries[i].weightKg + (1 - alpha) * prevTrend;
      expect(result[i].trendWeightKg).toBeCloseTo(expectedTrend, 10);
      prevTrend = expectedTrend;
    }

    // Trend should be smoother than raw data — verify the range is narrower
    const rawWeights = entries.map((e) => e.weightKg);
    const trendWeights = result.map((r) => r.trendWeightKg);
    const rawRange = Math.max(...rawWeights) - Math.min(...rawWeights);
    const trendRange = Math.max(...trendWeights) - Math.min(...trendWeights);
    expect(trendRange).toBeLessThan(rawRange);
  });

  it('clamps dayGap to 0.01 for same-day entries', () => {
    const entries = [
      { date: '2025-01-01', weightKg: 80 },
      { date: '2025-01-01', weightKg: 82 },
    ];
    const result = computeTrendSeries(entries);

    // dayGap = max(0, 0.01) = 0.01
    const alpha = computeEffectiveAlpha(0.01);
    const expectedTrend = alpha * 82 + (1 - alpha) * 80;

    expect(result).toHaveLength(2);
    expect(result[1].trendWeightKg).toBeCloseTo(expectedTrend, 10);
    // Alpha should be tiny, so trend barely moves from 80
    expect(result[1].trendWeightKg).toBeCloseTo(80, 1);
  });

  it('preserves original date and weightKg in output', () => {
    const entries = [
      { date: '2025-03-15', weightKg: 70.5 },
      { date: '2025-03-16', weightKg: 71.2 },
    ];
    const result = computeTrendSeries(entries);

    expect(result[0].date).toBe('2025-03-15');
    expect(result[0].weightKg).toBe(70.5);
    expect(result[1].date).toBe('2025-03-16');
    expect(result[1].weightKg).toBe(71.2);
  });
});

// ── recomputeEWMAFromDate ────────────────────────────────────────

describe('recomputeEWMAFromDate', () => {
  it('returns an empty array for empty input', () => {
    expect(recomputeEWMAFromDate([], '2025-01-01')).toEqual([]);
  });

  it('returns an empty array when changedDate is after all entries', () => {
    const entries = [
      { id: '1', date: '2025-01-01', weightKg: 80, trendWeightKg: 80 },
      { id: '2', date: '2025-01-02', weightKg: 82, trendWeightKg: 81 },
    ];
    expect(recomputeEWMAFromDate(entries, '2025-02-01')).toEqual([]);
  });

  it('recomputes all entries when changedDate is before the first entry', () => {
    const entries = [
      { id: '1', date: '2025-01-02', weightKg: 80 },
      { id: '2', date: '2025-01-03', weightKg: 82 },
      { id: '3', date: '2025-01-04', weightKg: 81 },
    ];
    const result = recomputeEWMAFromDate(entries, '2025-01-01');

    expect(result).toHaveLength(3);
    // First entry's trend = raw weight
    expect(result[0]).toEqual({ id: '1', trendWeightKg: 80 });

    // Verify subsequent entries via EWMA chain
    let prevTrend = 80;
    for (let i = 1; i < entries.length; i++) {
      const dayGap = 1; // consecutive days
      const alpha = computeEffectiveAlpha(dayGap);
      const expectedTrend = alpha * entries[i].weightKg + (1 - alpha) * prevTrend;
      expect(result[i].trendWeightKg).toBeCloseTo(expectedTrend, 10);
      expect(result[i].id).toBe(entries[i].id);
      prevTrend = expectedTrend;
    }
  });

  it('recomputes all entries when changedDate matches the first entry', () => {
    const entries = [
      { id: '1', date: '2025-01-01', weightKg: 80 },
      { id: '2', date: '2025-01-02', weightKg: 82 },
    ];
    const result = recomputeEWMAFromDate(entries, '2025-01-01');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: '1', trendWeightKg: 80 });

    const alpha = computeEffectiveAlpha(1);
    const expectedTrend = alpha * 82 + (1 - alpha) * 80;
    expect(result[1].trendWeightKg).toBeCloseTo(expectedTrend, 10);
  });

  it('recomputes from the middle using previous trendWeightKg as seed', () => {
    const entries = [
      { id: '1', date: '2025-01-01', weightKg: 80, trendWeightKg: 80 },
      { id: '2', date: '2025-01-02', weightKg: 82, trendWeightKg: 80.5 },
      { id: '3', date: '2025-01-03', weightKg: 79, trendWeightKg: 80.2 },
      { id: '4', date: '2025-01-04', weightKg: 81, trendWeightKg: 80.3 },
    ];
    // Recompute from 2025-01-03 onward, seeding from entry id '2'
    const result = recomputeEWMAFromDate(entries, '2025-01-03');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('4');

    // Seed = entry[1].trendWeightKg = 80.5
    const alpha1 = computeEffectiveAlpha(1);
    const trend3 = alpha1 * 79 + (1 - alpha1) * 80.5;
    expect(result[0].trendWeightKg).toBeCloseTo(trend3, 10);

    const trend4 = alpha1 * 81 + (1 - alpha1) * trend3;
    expect(result[1].trendWeightKg).toBeCloseTo(trend4, 10);
  });

  it('falls back to weightKg when previous entry has no trendWeightKg', () => {
    const entries = [
      { id: '1', date: '2025-01-01', weightKg: 80 },
      { id: '2', date: '2025-01-02', weightKg: 82 },
      { id: '3', date: '2025-01-03', weightKg: 79 },
    ];
    // changedDate = '2025-01-02' => startIdx = 1, prev = entries[0]
    // entries[0].trendWeightKg is undefined => falls back to weightKg = 80
    const result = recomputeEWMAFromDate(entries, '2025-01-02');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');

    // Seed from entries[0].weightKg = 80
    const alpha = computeEffectiveAlpha(1);
    const trend2 = alpha * 82 + (1 - alpha) * 80;
    expect(result[0].trendWeightKg).toBeCloseTo(trend2, 10);

    const trend3 = alpha * 79 + (1 - alpha) * trend2;
    expect(result[1].trendWeightKg).toBeCloseTo(trend3, 10);
  });

  it('handles a single entry where changedDate matches', () => {
    const entries = [{ id: '1', date: '2025-01-01', weightKg: 75 }];
    const result = recomputeEWMAFromDate(entries, '2025-01-01');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: '1', trendWeightKg: 75 });
  });

  it('handles a single entry where changedDate is before entry', () => {
    const entries = [{ id: '1', date: '2025-01-05', weightKg: 75 }];
    const result = recomputeEWMAFromDate(entries, '2025-01-01');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: '1', trendWeightKg: 75 });
  });

  it('only returns entries from changedDate onward, not prior entries', () => {
    const entries = [
      { id: '1', date: '2025-01-01', weightKg: 80, trendWeightKg: 80 },
      { id: '2', date: '2025-01-02', weightKg: 82, trendWeightKg: 80.5 },
      { id: '3', date: '2025-01-08', weightKg: 84, trendWeightKg: 82 },
    ];
    const result = recomputeEWMAFromDate(entries, '2025-01-08');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');

    // 6-day gap from 2025-01-02 to 2025-01-08; seed = entry[1].trendWeightKg = 80.5
    const alpha = computeEffectiveAlpha(6);
    const expectedTrend = alpha * 84 + (1 - alpha) * 80.5;
    expect(result[0].trendWeightKg).toBeCloseTo(expectedTrend, 10);
  });

  it('produces same results as computeTrendSeries when recomputing from the start', () => {
    const entries = [
      { id: '1', date: '2025-01-01', weightKg: 80 },
      { id: '2', date: '2025-01-02', weightKg: 82 },
      { id: '3', date: '2025-01-04', weightKg: 79 },
      { id: '4', date: '2025-01-08', weightKg: 81 },
    ];

    const trendSeries = computeTrendSeries(
      entries.map((e) => ({ date: e.date, weightKg: e.weightKg })),
    );
    const recomputed = recomputeEWMAFromDate(entries, '2025-01-01');

    expect(recomputed).toHaveLength(trendSeries.length);
    for (let i = 0; i < recomputed.length; i++) {
      expect(recomputed[i].trendWeightKg).toBeCloseTo(trendSeries[i].trendWeightKg, 10);
    }
  });
});
