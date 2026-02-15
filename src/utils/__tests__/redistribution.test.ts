import { DayBudget } from '@/types/planning';
import {
  redistributeCalories,
  recalculateMacros,
  generateInitialBudget,
  getDayWarning,
  getDeviationPercent,
} from '@/utils/redistribution';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeDayBudget(overrides: Partial<DayBudget> = {}): DayBudget {
  return {
    date: '2025-06-15',
    dayOfWeek: 0,
    dayLabel: 'Sun',
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 67,
    locked: false,
    isToday: false,
    isPast: false,
    ...overrides,
  };
}

function makeWeek(overrides?: Partial<DayBudget>[]): DayBudget[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) =>
    makeDayBudget({
      date: `2025-06-${String(15 + i).padStart(2, '0')}`,
      dayOfWeek: i,
      dayLabel: labels[i],
      ...(overrides?.[i] ?? {}),
    })
  );
}

function weeklySum(days: DayBudget[]): number {
  return days.reduce((s, d) => s + d.calories, 0);
}

// ---------------------------------------------------------------------------
// redistributeCalories
// ---------------------------------------------------------------------------

describe('redistributeCalories', () => {
  const PROTEIN_FLOOR = 120;

  it('returns a shallow copy when delta is 0', () => {
    const days = makeWeek();
    const result = redistributeCalories(days, 0, 2000, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(7);
    // Values identical
    result!.forEach((d, i) => {
      expect(d.calories).toBe(days[i].calories);
    });
    // But different references
    result!.forEach((d, i) => {
      expect(d).not.toBe(days[i]);
    });
  });

  it('preserves weekly total when increasing one day', () => {
    const days = makeWeek();
    const totalBefore = weeklySum(days);
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    const totalAfter = weeklySum(result!);
    expect(Math.abs(totalAfter - totalBefore)).toBeLessThanOrEqual(1);
  });

  it('preserves weekly total when decreasing one day', () => {
    const days = makeWeek();
    const totalBefore = weeklySum(days);
    const result = redistributeCalories(days, 3, 1500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    const totalAfter = weeklySum(result!);
    expect(Math.abs(totalAfter - totalBefore)).toBeLessThanOrEqual(1);
  });

  it('increases other days proportionally when one day decreases', () => {
    const days = makeWeek();
    const result = redistributeCalories(days, 0, 1500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    // Changed day has new value
    expect(result![0].calories).toBe(1500);
    // Other days should have increased (delta of -500 redistributed as +500 across 6 days)
    for (let i = 1; i < 7; i++) {
      expect(result![i].calories).toBeGreaterThan(days[i].calories);
    }
  });

  it('decreases other days proportionally when one day increases', () => {
    const days = makeWeek();
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    expect(result![0].calories).toBe(2500);
    for (let i = 1; i < 7; i++) {
      expect(result![i].calories).toBeLessThan(days[i].calories);
    }
  });

  it('does not adjust locked days', () => {
    const days = makeWeek();
    days[1].locked = true;
    days[2].locked = true;
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    expect(result![1].calories).toBe(days[1].calories);
    expect(result![2].calories).toBe(days[2].calories);
  });

  it('does not adjust past days', () => {
    const days = makeWeek();
    days[1].isPast = true;
    days[2].isPast = true;
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    expect(result![1].calories).toBe(days[1].calories);
    expect(result![2].calories).toBe(days[2].calories);
  });

  it('returns null when all other days are locked', () => {
    const days = makeWeek();
    for (let i = 1; i < 7; i++) {
      days[i].locked = true;
    }
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).toBeNull();
  });

  it('returns null when all other days are past', () => {
    const days = makeWeek();
    for (let i = 1; i < 7; i++) {
      days[i].isPast = true;
    }
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).toBeNull();
  });

  it('returns null when all other days are locked or past', () => {
    const days = makeWeek();
    days[1].locked = true;
    days[2].isPast = true;
    days[3].locked = true;
    days[4].isPast = true;
    days[5].locked = true;
    days[6].isPast = true;
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).toBeNull();
  });

  it('gives all delta to the single adjustable day', () => {
    const days = makeWeek();
    // Lock all except index 0 (changed) and index 3
    for (let i = 1; i < 7; i++) {
      if (i !== 3) days[i].locked = true;
    }
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    // Index 3 should absorb the full -500 delta
    expect(result![3].calories).toBe(days[3].calories - 500);
  });

  it('respects the minimum calorie floor of 800', () => {
    const days = makeWeek();
    // Set one very large increase so others must drop heavily
    const result = redistributeCalories(days, 0, 8000, PROTEIN_FLOOR);
    if (result !== null) {
      for (let i = 1; i < 7; i++) {
        expect(result[i].calories).toBeGreaterThanOrEqual(800);
      }
    }
  });

  it('returns null when clamping makes redistribution impossible', () => {
    // Each day at 900 cal (just above floor). Trying to raise one by a lot
    // should fail because others are already near the floor.
    const days = makeWeek().map((d) => ({ ...d, calories: 900 }));
    const result = redistributeCalories(days, 0, 5000, PROTEIN_FLOOR);
    // Either null (impossible) or all days >= 800
    if (result !== null) {
      for (let i = 1; i < 7; i++) {
        expect(result[i].calories).toBeGreaterThanOrEqual(800);
      }
    }
  });

  it('recalculates macros for changed days', () => {
    const days = makeWeek();
    const result = redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    expect(result).not.toBeNull();
    // The changed day should have updated macros
    expect(result![0].protein).toBeGreaterThanOrEqual(PROTEIN_FLOOR);
    // Check that macros add up roughly to calories
    const d = result![0];
    const macroCalories = d.protein * 4 + d.carbs * 4 + d.fat * 9;
    // Allow some rounding tolerance
    expect(Math.abs(macroCalories - d.calories)).toBeLessThanOrEqual(10);
  });

  it('does not mutate the original array', () => {
    const days = makeWeek();
    const originalCalories = days.map((d) => d.calories);
    redistributeCalories(days, 0, 2500, PROTEIN_FLOOR);
    days.forEach((d, i) => {
      expect(d.calories).toBe(originalCalories[i]);
    });
  });
});

// ---------------------------------------------------------------------------
// recalculateMacros
// ---------------------------------------------------------------------------

describe('recalculateMacros', () => {
  it('preserves protein at or above the floor', () => {
    const day = makeDayBudget({ protein: 130 });
    const result = recalculateMacros(2200, day, 120);
    expect(result.protein).toBe(130); // original > floor
  });

  it('raises protein to floor when original is below', () => {
    const day = makeDayBudget({ protein: 100 });
    const result = recalculateMacros(2200, day, 120);
    expect(result.protein).toBe(120);
  });

  it('uses 0.3 fat percentage when original calories is 0', () => {
    const day = makeDayBudget({ calories: 0, fat: 0 });
    const result = recalculateMacros(2000, day, 120);
    // fatCal = max(round(2000 * 0.3), round(2000 * 0.15)) = max(600, 300) = 600
    const expectedFat = Math.round(600 / 9);
    expect(result.fat).toBe(expectedFat);
  });

  it('enforces minimum 15% fat', () => {
    // Set up a day with very low fat percentage
    const day = makeDayBudget({ calories: 2000, fat: 5 }); // fat is ~2.25% of cal
    const result = recalculateMacros(2000, day, 120);
    const minFatCal = Math.round(2000 * 0.15);
    const minFat = Math.round(minFatCal / 9);
    expect(result.fat).toBeGreaterThanOrEqual(minFat);
  });

  it('calculates carbs as remainder', () => {
    const day = makeDayBudget({ calories: 2000, protein: 150, fat: 67 });
    const result = recalculateMacros(2000, day, 120);
    const proteinCal = result.protein * 4;
    const origFatPct = (67 * 9) / 2000;
    const fatCal = Math.max(
      Math.round(2000 * origFatPct),
      Math.round(2000 * 0.15)
    );
    const expectedCarbs = Math.round(Math.max(0, 2000 - proteinCal - fatCal) / 4);
    expect(result.carbs).toBe(expectedCarbs);
  });

  it('does not produce negative carbs', () => {
    // Very high protein + fat relative to calories
    const day = makeDayBudget({ calories: 2000, protein: 200, fat: 100 });
    const result = recalculateMacros(800, day, 200);
    expect(result.carbs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// generateInitialBudget
// ---------------------------------------------------------------------------

describe('generateInitialBudget', () => {
  // Use a fixed "today" by mocking Date to make isToday/isPast deterministic
  const REAL_DATE = global.Date;

  beforeAll(() => {
    // Mock Date so "today" is 2025-06-18 (Wednesday)
    const mockNow = new REAL_DATE('2025-06-18T12:00:00Z').getTime();
    const MockDate = class extends REAL_DATE {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockNow);
        } else {
          // @ts-ignore
          super(...args);
        }
      }
      static now() {
        return mockNow;
      }
    } as DateConstructor;
    global.Date = MockDate;
  });

  afterAll(() => {
    global.Date = REAL_DATE;
  });

  it('returns exactly 7 days', () => {
    const days = generateInitialBudget(2000, 150, 200, 67, '2025-06-15', 0);
    expect(days).toHaveLength(7);
  });

  it('assigns base values to every day', () => {
    const days = generateInitialBudget(2000, 150, 200, 67, '2025-06-15', 0);
    for (const d of days) {
      expect(d.calories).toBe(2000);
      expect(d.protein).toBe(150);
      expect(d.carbs).toBe(200);
      expect(d.fat).toBe(67);
      expect(d.locked).toBe(false);
    }
  });

  it('increments dates correctly from the start date', () => {
    const days = generateInitialBudget(2000, 150, 200, 67, '2025-06-15', 0);
    expect(days[0].date).toBe('2025-06-15');
    expect(days[1].date).toBe('2025-06-16');
    expect(days[2].date).toBe('2025-06-17');
    expect(days[3].date).toBe('2025-06-18');
    expect(days[4].date).toBe('2025-06-19');
    expect(days[5].date).toBe('2025-06-20');
    expect(days[6].date).toBe('2025-06-21');
  });

  it('assigns correct day labels matching day of week', () => {
    // 2025-06-15 is a Sunday
    const days = generateInitialBudget(2000, 150, 200, 67, '2025-06-15', 0);
    const expectedLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach((d, i) => {
      expect(d.dayLabel).toBe(expectedLabels[i]);
    });
  });

  it('assigns correct dayOfWeek values', () => {
    const days = generateInitialBudget(2000, 150, 200, 67, '2025-06-15', 0);
    // 2025-06-15 is Sunday (0), through Saturday (6)
    days.forEach((d, i) => {
      expect(d.dayOfWeek).toBe(i);
    });
  });

  it('marks isToday correctly', () => {
    // With our mock, today is 2025-06-18 which is index 3
    const days = generateInitialBudget(2000, 150, 200, 67, '2025-06-15', 0);
    days.forEach((d, i) => {
      if (i === 3) {
        expect(d.isToday).toBe(true);
      } else {
        expect(d.isToday).toBe(false);
      }
    });
  });

  it('marks isPast correctly', () => {
    // Days before 2025-06-18 are past
    const days = generateInitialBudget(2000, 150, 200, 67, '2025-06-15', 0);
    expect(days[0].isPast).toBe(true);  // Jun 15
    expect(days[1].isPast).toBe(true);  // Jun 16
    expect(days[2].isPast).toBe(true);  // Jun 17
    expect(days[3].isPast).toBe(false); // Jun 18 (today)
    expect(days[4].isPast).toBe(false); // Jun 19
    expect(days[5].isPast).toBe(false); // Jun 20
    expect(days[6].isPast).toBe(false); // Jun 21
  });

  it('works when week starts mid-week', () => {
    // Start on Wednesday 2025-06-18
    const days = generateInitialBudget(1800, 130, 180, 60, '2025-06-18', 3);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2025-06-18');
    expect(days[0].dayLabel).toBe('Wed');
    expect(days[6].date).toBe('2025-06-24');
    expect(days[6].dayLabel).toBe('Tue');
  });
});

// ---------------------------------------------------------------------------
// getDayWarning
// ---------------------------------------------------------------------------

describe('getDayWarning', () => {
  const AVERAGE = 2000;

  it('returns minimum warning at exactly 800 cal', () => {
    const warning = getDayWarning(800, AVERAGE);
    expect(warning).not.toBeNull();
    expect(warning).toContain('minimum');
  });

  it('returns minimum warning below 800 cal', () => {
    const warning = getDayWarning(700, AVERAGE);
    expect(warning).not.toBeNull();
    expect(warning).toContain('minimum');
  });

  it('returns very low warning between 801 and 1199 cal', () => {
    const warning = getDayWarning(1000, AVERAGE);
    expect(warning).not.toBeNull();
    expect(warning).toContain('low-calorie');
  });

  it('returns very low warning at 801 cal', () => {
    const warning = getDayWarning(801, AVERAGE);
    expect(warning).not.toBeNull();
    expect(warning).toContain('low-calorie');
  });

  it('returns very low warning at 1199 cal', () => {
    const warning = getDayWarning(1199, AVERAGE);
    expect(warning).not.toBeNull();
    expect(warning).toContain('low-calorie');
  });

  it('returns null at exactly 1200 cal (not very low)', () => {
    const warning = getDayWarning(1200, AVERAGE);
    // 1200 is not < 1200, and 1200 <= 2000*1.5 = 3000, so null
    expect(warning).toBeNull();
  });

  it('returns above-average warning when calories > 1.5x average', () => {
    const warning = getDayWarning(3100, AVERAGE);
    expect(warning).not.toBeNull();
    expect(warning).toContain('above average');
  });

  it('returns null when calories are at exactly 1.5x average', () => {
    const warning = getDayWarning(3000, AVERAGE);
    // 3000 is not > 3000, so null
    expect(warning).toBeNull();
  });

  it('returns null for normal calorie values', () => {
    expect(getDayWarning(1500, AVERAGE)).toBeNull();
    expect(getDayWarning(2000, AVERAGE)).toBeNull();
    expect(getDayWarning(2500, AVERAGE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDeviationPercent
// ---------------------------------------------------------------------------

describe('getDeviationPercent', () => {
  it('returns 0 when calories equal the daily average', () => {
    // weeklyTotal = 14000 => avg = 2000; calories = 2000
    expect(getDeviationPercent(2000, 14000)).toBe(0);
  });

  it('returns 100 when calories are double the average', () => {
    // avg = 14000/7 = 2000; calories = 4000 => (4000-2000)/2000 * 100 = 100
    expect(getDeviationPercent(4000, 14000)).toBe(100);
  });

  it('returns -50 when calories are half the average', () => {
    // avg = 2000; calories = 1000 => (1000-2000)/2000 * 100 = -50
    expect(getDeviationPercent(1000, 14000)).toBe(-50);
  });

  it('returns 0 when weekly total is 0', () => {
    expect(getDeviationPercent(500, 0)).toBe(0);
  });

  it('handles positive deviation correctly', () => {
    // avg = 10000/7 ~= 1428.57; cal = 2000 => (2000-1428.57)/1428.57*100 ~= 40
    expect(getDeviationPercent(2000, 10000)).toBe(40);
  });

  it('handles negative deviation correctly', () => {
    // avg = 14000/7 = 2000; cal = 1500 => (1500-2000)/2000*100 = -25
    expect(getDeviationPercent(1500, 14000)).toBe(-25);
  });

  it('rounds the result to the nearest integer', () => {
    // avg = 10500/7 = 1500; cal = 2000 => (2000-1500)/1500*100 = 33.333... => 33
    expect(getDeviationPercent(2000, 10500)).toBe(33);
  });
});
