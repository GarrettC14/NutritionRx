/**
 * weightTrendAdapters utility tests
 *
 * Tests for adaptWeightEntries, adaptFromGymCheckIns,
 * and internal adapter logic (toKg, asDate, dedup, sorting).
 */

import { computeTrendSeries } from '@/utils/trendWeight';

jest.mock('@/utils/trendWeight', () => ({
  computeTrendSeries: jest.fn((entries: Array<{ date: string; weightKg: number }>) =>
    entries.map((e) => ({ ...e, trendWeightKg: e.weightKg * 0.99 })),
  ),
}));

jest.mock('@/types/weightTrend', () => ({}));

import {
  adaptWeightEntries,
  adaptFromGymCheckIns,
  WeightAdapterConfig,
} from '@/utils/weightTrendAdapters';

const LBS_PER_KG = 2.20462;

const mockedComputeTrendSeries = computeTrendSeries as jest.Mock;

beforeEach(() => {
  mockedComputeTrendSeries.mockClear();
});

// ---------------------------------------------------------------------------
// Helper: minimal config factory
// ---------------------------------------------------------------------------
interface SimpleItem {
  id: string;
  date: string | number | Date;
  weight: number;
  unit: 'kg' | 'lbs';
  trend?: number | null;
  trendUnit?: 'kg' | 'lbs';
}

function makeConfig(
  overrides: Partial<WeightAdapterConfig<SimpleItem>> = {},
): WeightAdapterConfig<SimpleItem> {
  return {
    getId: (item) => item.id,
    getDate: (item) => item.date,
    getWeight: (item) => item.weight,
    getWeightUnit: (item) => item.unit,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// adaptWeightEntries
// ---------------------------------------------------------------------------
describe('adaptWeightEntries', () => {
  // --- Empty input ---
  it('returns empty array for empty items', () => {
    const result = adaptWeightEntries([], makeConfig());
    expect(result).toEqual([]);
  });

  // --- Single kg item ---
  it('maps a single kg item correctly', () => {
    const items: SimpleItem[] = [{ id: 'a', date: '2024-06-01', weight: 80, unit: 'kg' }];
    const result = adaptWeightEntries(items, makeConfig());

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'a',
      date: '2024-06-01',
      weightKg: 80,
      trendWeightKg: undefined,
    });
  });

  // --- Single lbs item ---
  it('converts a single lbs item to kg', () => {
    const items: SimpleItem[] = [{ id: 'b', date: '2024-06-02', weight: 176, unit: 'lbs' }];
    const result = adaptWeightEntries(items, makeConfig());

    expect(result).toHaveLength(1);
    expect(result[0].weightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
  });

  // --- Trend weight provided ---
  it('preserves provided trend weight', () => {
    const items: SimpleItem[] = [
      { id: 'c', date: '2024-06-03', weight: 80, unit: 'kg', trend: 79.5 },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend,
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].trendWeightKg).toBe(79.5);
  });

  // --- Without trend weight, computeTrendIfMissing=false ---
  it('leaves trendWeightKg undefined when computeTrendIfMissing is false', () => {
    const items: SimpleItem[] = [{ id: 'd', date: '2024-06-04', weight: 85, unit: 'kg' }];
    const config = makeConfig({ computeTrendIfMissing: false });
    const result = adaptWeightEntries(items, config);

    expect(result[0].trendWeightKg).toBeUndefined();
    expect(mockedComputeTrendSeries).not.toHaveBeenCalled();
  });

  // --- computeTrendIfMissing=true triggers computation ---
  it('computes trend when computeTrendIfMissing is true and trends are missing', () => {
    const items: SimpleItem[] = [
      { id: 'e1', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: 'e2', date: '2024-06-02', weight: 81, unit: 'kg' },
    ];
    const config = makeConfig({ computeTrendIfMissing: true });
    const result = adaptWeightEntries(items, config);

    expect(mockedComputeTrendSeries).toHaveBeenCalledTimes(1);
    expect(mockedComputeTrendSeries).toHaveBeenCalledWith([
      { date: '2024-06-01', weightKg: 80 },
      { date: '2024-06-02', weightKg: 81 },
    ]);
    // Mock returns weightKg * 0.99
    expect(result[0].trendWeightKg).toBeCloseTo(80 * 0.99, 5);
    expect(result[1].trendWeightKg).toBeCloseTo(81 * 0.99, 5);
  });

  // --- computeTrendIfMissing but all trends already present ---
  it('does not recompute trend when all entries already have trendWeightKg', () => {
    const items: SimpleItem[] = [
      { id: 'f1', date: '2024-06-01', weight: 80, unit: 'kg', trend: 79 },
      { id: 'f2', date: '2024-06-02', weight: 81, unit: 'kg', trend: 80 },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend,
      computeTrendIfMissing: true,
    });
    const result = adaptWeightEntries(items, config);

    expect(mockedComputeTrendSeries).not.toHaveBeenCalled();
    expect(result[0].trendWeightKg).toBe(79);
    expect(result[1].trendWeightKg).toBe(80);
  });

  // --- computeTrendIfMissing with partial trends: uses computed for missing ---
  it('fills in only missing trends when some entries already have them', () => {
    const items: SimpleItem[] = [
      { id: 'g1', date: '2024-06-01', weight: 80, unit: 'kg', trend: 79 },
      { id: 'g2', date: '2024-06-02', weight: 81, unit: 'kg', trend: null },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend,
      computeTrendIfMissing: true,
    });
    const result = adaptWeightEntries(items, config);

    expect(mockedComputeTrendSeries).toHaveBeenCalledTimes(1);
    // First entry already has trend, should keep existing
    expect(result[0].trendWeightKg).toBe(79);
    // Second entry was null, gets computed value
    expect(result[1].trendWeightKg).toBeCloseTo(81 * 0.99, 5);
  });

  // --- Dedup 'last' (default): duplicate dates keep last ---
  it('deduplicates by date keeping last entry (default)', () => {
    const items: SimpleItem[] = [
      { id: '1', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: '2', date: '2024-06-01', weight: 82, unit: 'kg' },
    ];
    const result = adaptWeightEntries(items, makeConfig());

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
    expect(result[0].weightKg).toBe(82);
  });

  // --- Dedup 'first': duplicate dates keep first ---
  it('deduplicates by date keeping first entry when dedupeByDate is "first"', () => {
    const items: SimpleItem[] = [
      { id: '1', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: '2', date: '2024-06-01', weight: 82, unit: 'kg' },
    ];
    const config = makeConfig({ dedupeByDate: 'first' });
    const result = adaptWeightEntries(items, config);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].weightKg).toBe(80);
  });

  // --- Dedup 'none': all entries preserved ---
  it('preserves all entries when dedupeByDate is "none"', () => {
    const items: SimpleItem[] = [
      { id: '1', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: '2', date: '2024-06-01', weight: 82, unit: 'kg' },
    ];
    const config = makeConfig({ dedupeByDate: 'none' });
    const result = adaptWeightEntries(items, config);

    expect(result).toHaveLength(2);
  });

  // --- Date as string 'YYYY-MM-DD' ---
  it('handles date as YYYY-MM-DD string', () => {
    const items: SimpleItem[] = [{ id: 'ds', date: '2024-01-15', weight: 70, unit: 'kg' }];
    const result = adaptWeightEntries(items, makeConfig());

    expect(result[0].date).toBe('2024-01-15');
  });

  // --- Date as Date object ---
  it('handles date as Date object', () => {
    const items: SimpleItem[] = [
      { id: 'dd', date: new Date(2024, 5, 15), weight: 70, unit: 'kg' },
    ];
    const result = adaptWeightEntries(items, makeConfig());

    // June 15, 2024 using local date methods
    expect(result[0].date).toBe('2024-06-15');
  });

  // --- Date as timestamp number ---
  it('handles date as timestamp number', () => {
    // Date.UTC(2024, 5, 15, 12, 0, 0) = June 15, 2024 12:00 UTC
    const ts = new Date(2024, 5, 15, 12, 0, 0).getTime();
    const items: SimpleItem[] = [{ id: 'dn', date: ts, weight: 70, unit: 'kg' }];
    const result = adaptWeightEntries(items, makeConfig());

    expect(result[0].date).toBe('2024-06-15');
  });

  // --- Date as ISO string (full) ---
  it('handles date as full ISO datetime string', () => {
    const items: SimpleItem[] = [
      { id: 'di', date: '2024-06-15T14:30:00Z', weight: 70, unit: 'kg' },
    ];
    const result = adaptWeightEntries(items, makeConfig());

    // Should extract local date from the parsed Date
    expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // --- Results sorted by date ASC ---
  it('sorts results by date ascending', () => {
    const items: SimpleItem[] = [
      { id: 'c', date: '2024-06-03', weight: 78, unit: 'kg' },
      { id: 'a', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: 'b', date: '2024-06-02', weight: 79, unit: 'kg' },
    ];
    const result = adaptWeightEntries(items, makeConfig());

    expect(result.map((e) => e.date)).toEqual(['2024-06-01', '2024-06-02', '2024-06-03']);
    expect(result.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  // --- getWeightUnit as function ---
  it('resolves getWeightUnit as a function', () => {
    const items: SimpleItem[] = [{ id: 'fu', date: '2024-06-01', weight: 176, unit: 'lbs' }];
    const config = makeConfig({
      getWeightUnit: (item) => item.unit,
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].weightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
  });

  // --- getWeightUnit as static value ---
  it('resolves getWeightUnit as a static value', () => {
    const items: SimpleItem[] = [{ id: 'su', date: '2024-06-01', weight: 176, unit: 'lbs' }];
    const config = makeConfig({
      getWeightUnit: 'lbs',
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].weightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
  });

  // --- Static 'kg' unit ---
  it('resolves static kg unit correctly (no conversion)', () => {
    const items: SimpleItem[] = [{ id: 'sk', date: '2024-06-01', weight: 80, unit: 'lbs' }];
    const config = makeConfig({
      getWeightUnit: 'kg', // Static override, ignoring item.unit
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].weightKg).toBe(80); // No conversion applied
  });

  // --- getTrendUnit specified vs defaulting to getWeightUnit ---
  it('uses getTrendUnit for trend weight conversion when specified', () => {
    const items: SimpleItem[] = [
      { id: 'tu', date: '2024-06-01', weight: 80, unit: 'kg', trend: 176 },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend,
      getTrendUnit: 'lbs', // Trend is in lbs even though weight is kg
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].weightKg).toBe(80); // Weight in kg, no conversion
    expect(result[0].trendWeightKg).toBeCloseTo(176 / LBS_PER_KG, 5); // Trend converted from lbs
  });

  it('defaults getTrendUnit to getWeightUnit when not specified', () => {
    const items: SimpleItem[] = [
      { id: 'du', date: '2024-06-01', weight: 176, unit: 'lbs', trend: 174 },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend,
      // No getTrendUnit; should use getWeightUnit ('lbs' from function)
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].weightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
    expect(result[0].trendWeightKg).toBeCloseTo(174 / LBS_PER_KG, 5);
  });

  // --- getTrendUnit as function ---
  it('resolves getTrendUnit as a function', () => {
    const items: SimpleItem[] = [
      {
        id: 'tuf',
        date: '2024-06-01',
        weight: 80,
        unit: 'kg',
        trend: 176,
        trendUnit: 'lbs',
      },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend,
      getTrendUnit: (item) => item.trendUnit ?? item.unit,
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].trendWeightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
  });

  // --- getId receives index ---
  it('passes index to getId function', () => {
    const items: SimpleItem[] = [
      { id: 'x', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: 'y', date: '2024-06-02', weight: 81, unit: 'kg' },
    ];
    const config = makeConfig({
      getId: (_item, index) => `idx-${index}`,
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].id).toBe('idx-0');
    expect(result[1].id).toBe('idx-1');
  });

  // --- Trend weight null from getTrendWeight → trendWeightKg undefined ---
  it('sets trendWeightKg to undefined when getTrendWeight returns null', () => {
    const items: SimpleItem[] = [
      { id: 'n', date: '2024-06-01', weight: 80, unit: 'kg', trend: null },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend,
      computeTrendIfMissing: false,
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].trendWeightKg).toBeUndefined();
  });

  // --- Trend weight undefined from getTrendWeight → trendWeightKg undefined ---
  it('sets trendWeightKg to undefined when getTrendWeight returns undefined', () => {
    const items: SimpleItem[] = [
      { id: 'u', date: '2024-06-01', weight: 80, unit: 'kg' },
    ];
    const config = makeConfig({
      getTrendWeight: (item) => item.trend, // item.trend is undefined
      computeTrendIfMissing: false,
    });
    const result = adaptWeightEntries(items, config);

    expect(result[0].trendWeightKg).toBeUndefined();
  });

  // --- Mixed units across items ---
  it('handles mixed kg and lbs items', () => {
    const items: SimpleItem[] = [
      { id: '1', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: '2', date: '2024-06-02', weight: 176, unit: 'lbs' },
    ];
    const result = adaptWeightEntries(items, makeConfig());

    expect(result[0].weightKg).toBe(80);
    expect(result[1].weightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
  });

  // --- Dedup across multiple dates ---
  it('deduplicates correctly across multiple dates', () => {
    const items: SimpleItem[] = [
      { id: '1', date: '2024-06-01', weight: 80, unit: 'kg' },
      { id: '2', date: '2024-06-01', weight: 81, unit: 'kg' },
      { id: '3', date: '2024-06-02', weight: 82, unit: 'kg' },
      { id: '4', date: '2024-06-02', weight: 83, unit: 'kg' },
    ];
    const result = adaptWeightEntries(items, makeConfig()); // default 'last'

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: '2', date: '2024-06-01', weightKg: 81 });
    expect(result[1]).toMatchObject({ id: '4', date: '2024-06-02', weightKg: 83 });
  });

  // --- computeTrendIfMissing=false (default) does not call computeTrendSeries ---
  it('does not call computeTrendSeries when computeTrendIfMissing is not set', () => {
    const items: SimpleItem[] = [
      { id: '1', date: '2024-06-01', weight: 80, unit: 'kg' },
    ];
    adaptWeightEntries(items, makeConfig());

    expect(mockedComputeTrendSeries).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// adaptFromGymCheckIns
// ---------------------------------------------------------------------------
describe('adaptFromGymCheckIns', () => {
  interface GymCheckIn {
    id: string;
    measuredAt: string | number | Date;
    bodyWeight: number;
    unit: 'kg' | 'lbs';
    trendWeight?: number | null;
  }

  it('returns empty array for empty input', () => {
    const result = adaptFromGymCheckIns([]);
    expect(result).toEqual([]);
    expect(mockedComputeTrendSeries).not.toHaveBeenCalled();
  });

  it('maps basic gym check-in items', () => {
    const items: GymCheckIn[] = [
      { id: 'g1', measuredAt: '2024-06-01', bodyWeight: 80, unit: 'kg' },
      { id: 'g2', measuredAt: '2024-06-02', bodyWeight: 81, unit: 'kg' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'g1', date: '2024-06-01', weightKg: 80 });
    expect(result[1]).toMatchObject({ id: 'g2', date: '2024-06-02', weightKg: 81 });
  });

  it('converts lbs to kg for gym check-ins', () => {
    const items: GymCheckIn[] = [
      { id: 'g3', measuredAt: '2024-06-01', bodyWeight: 176, unit: 'lbs' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(result[0].weightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
  });

  it('handles mixed kg/lbs units', () => {
    const items: GymCheckIn[] = [
      { id: 'g4', measuredAt: '2024-06-01', bodyWeight: 80, unit: 'kg' },
      { id: 'g5', measuredAt: '2024-06-02', bodyWeight: 176, unit: 'lbs' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(result[0].weightKg).toBe(80);
    expect(result[1].weightKg).toBeCloseTo(176 / LBS_PER_KG, 5);
  });

  it('preserves trendWeight when provided', () => {
    const items: GymCheckIn[] = [
      { id: 'g6', measuredAt: '2024-06-01', bodyWeight: 80, unit: 'kg', trendWeight: 79 },
      { id: 'g7', measuredAt: '2024-06-02', bodyWeight: 81, unit: 'kg', trendWeight: 80 },
    ];
    const result = adaptFromGymCheckIns(items);

    // All trends present, computeTrendSeries should not be called
    expect(mockedComputeTrendSeries).not.toHaveBeenCalled();
    expect(result[0].trendWeightKg).toBe(79);
    expect(result[1].trendWeightKg).toBe(80);
  });

  it('computes trend for missing trendWeight (computeTrendIfMissing=true)', () => {
    const items: GymCheckIn[] = [
      { id: 'g8', measuredAt: '2024-06-01', bodyWeight: 80, unit: 'kg' },
      { id: 'g9', measuredAt: '2024-06-02', bodyWeight: 81, unit: 'kg' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(mockedComputeTrendSeries).toHaveBeenCalledTimes(1);
    expect(result[0].trendWeightKg).toBeCloseTo(80 * 0.99, 5);
    expect(result[1].trendWeightKg).toBeCloseTo(81 * 0.99, 5);
  });

  it('deduplicates by date keeping last entry', () => {
    const items: GymCheckIn[] = [
      { id: 'g10', measuredAt: '2024-06-01', bodyWeight: 80, unit: 'kg' },
      { id: 'g11', measuredAt: '2024-06-01', bodyWeight: 82, unit: 'kg' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g11');
    expect(result[0].weightKg).toBe(82);
  });

  it('sorts results by date ascending', () => {
    const items: GymCheckIn[] = [
      { id: 'g14', measuredAt: '2024-06-03', bodyWeight: 78, unit: 'kg' },
      { id: 'g12', measuredAt: '2024-06-01', bodyWeight: 80, unit: 'kg' },
      { id: 'g13', measuredAt: '2024-06-02', bodyWeight: 79, unit: 'kg' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(result.map((e) => e.date)).toEqual(['2024-06-01', '2024-06-02', '2024-06-03']);
  });

  it('handles measuredAt as Date object', () => {
    const items: GymCheckIn[] = [
      { id: 'gd', measuredAt: new Date(2024, 5, 15), bodyWeight: 80, unit: 'kg' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(result[0].date).toBe('2024-06-15');
  });

  it('handles measuredAt as timestamp number', () => {
    const ts = new Date(2024, 5, 15, 12, 0, 0).getTime();
    const items: GymCheckIn[] = [
      { id: 'gt', measuredAt: ts, bodyWeight: 80, unit: 'kg' },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(result[0].date).toBe('2024-06-15');
  });

  it('fills computed trend for entries with null trendWeight while preserving existing', () => {
    const items: GymCheckIn[] = [
      { id: 'gm1', measuredAt: '2024-06-01', bodyWeight: 80, unit: 'kg', trendWeight: 79 },
      { id: 'gm2', measuredAt: '2024-06-02', bodyWeight: 81, unit: 'kg', trendWeight: null },
    ];
    const result = adaptFromGymCheckIns(items);

    expect(mockedComputeTrendSeries).toHaveBeenCalledTimes(1);
    expect(result[0].trendWeightKg).toBe(79); // Existing preserved
    expect(result[1].trendWeightKg).toBeCloseTo(81 * 0.99, 5); // Computed
  });

  it('converts trendWeight from lbs when unit is lbs', () => {
    const items: GymCheckIn[] = [
      { id: 'gl', measuredAt: '2024-06-01', bodyWeight: 176, unit: 'lbs', trendWeight: 174 },
      { id: 'gl2', measuredAt: '2024-06-02', bodyWeight: 178, unit: 'lbs', trendWeight: 175 },
    ];
    const result = adaptFromGymCheckIns(items);

    // adaptFromGymCheckIns does NOT pass getTrendUnit, so it defaults to getWeightUnit (lbs)
    expect(result[0].trendWeightKg).toBeCloseTo(174 / LBS_PER_KG, 5);
    expect(result[1].trendWeightKg).toBeCloseTo(175 / LBS_PER_KG, 5);
    expect(mockedComputeTrendSeries).not.toHaveBeenCalled();
  });
});
