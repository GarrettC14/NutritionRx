import {
  generateId,
  daysAgo,
  datetimeAgo,
  randomTimeOfDay,
  mealTimeOfDay,
  datesBetween,
  today,
  nowISO,
  weightedPick,
  randomPick,
  randomBetween,
  randomInt,
  shouldSkip,
  shuffleArray,
  batchInsert,
  gaussianRandom,
  clamp,
  round,
} from '../generators/helpers';

// ============================================================
// generateId
// ============================================================

describe('generateId', () => {
  it('starts with the default "dev" prefix', () => {
    const id = generateId();
    expect(id.startsWith('dev-')).toBe(true);
  });

  it('starts with a custom prefix when provided', () => {
    const id = generateId('food');
    expect(id.startsWith('food-')).toBe(true);
  });

  it('contains exactly two hyphens separating three parts', () => {
    const id = generateId();
    const parts = id.split('-');
    // prefix-timestamp36-random36 => 3 parts
    expect(parts.length).toBe(3);
  });

  it('generates different ids on successive calls', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

// ============================================================
// daysAgo
// ============================================================

describe('daysAgo', () => {
  it('returns today when n=0', () => {
    const result = daysAgo(0);
    const expected = new Date().toISOString().split('T')[0];
    expect(result).toBe(expected);
  });

  it('returns yesterday when n=1', () => {
    const result = daysAgo(1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expected = yesterday.toISOString().split('T')[0];
    expect(result).toBe(expected);
  });

  it('returns a YYYY-MM-DD formatted string', () => {
    const result = daysAgo(5);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ============================================================
// datetimeAgo
// ============================================================

describe('datetimeAgo', () => {
  it('starts with today date when n=0', () => {
    const result = datetimeAgo(0);
    const todayStr = new Date().toISOString().split('T')[0];
    expect(result.startsWith(todayStr)).toBe(true);
  });

  it('returns a valid ISO date string', () => {
    const result = datetimeAgo(3);
    const parsed = new Date(result);
    expect(parsed.toISOString()).toBe(result);
  });
});

// ============================================================
// datesBetween
// ============================================================

describe('datesBetween', () => {
  it('returns 4 dates for datesBetween(3, 0)', () => {
    const dates = datesBetween(3, 0);
    expect(dates).toHaveLength(4);
  });

  it('returns 1 date for datesBetween(2, 2)', () => {
    const dates = datesBetween(2, 2);
    expect(dates).toHaveLength(1);
  });

  it('returns dates in chronological order (oldest first)', () => {
    const dates = datesBetween(3, 0);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
    }
  });

  it('all returned dates are YYYY-MM-DD formatted', () => {
    const dates = datesBetween(5, 0);
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ============================================================
// today
// ============================================================

describe('today', () => {
  it('returns YYYY-MM-DD matching the current date', () => {
    const result = today();
    const expected = new Date().toISOString().split('T')[0];
    expect(result).toBe(expected);
  });
});

// ============================================================
// nowISO
// ============================================================

describe('nowISO', () => {
  it('returns a valid ISO string close to the current time', () => {
    const before = Date.now();
    const result = nowISO();
    const after = Date.now();
    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });
});

// ============================================================
// randomBetween
// ============================================================

describe('randomBetween', () => {
  it('returns a value >= 0 and < 1 for randomBetween(0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomBetween(0, 1);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('returns a value in [5, 10) for randomBetween(5, 10)', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomBetween(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });
});

// ============================================================
// randomInt
// ============================================================

describe('randomInt', () => {
  it('returns an integer in [1, 6]', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(1, 6);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    }
  });
});

// ============================================================
// clamp
// ============================================================

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

// ============================================================
// round
// ============================================================

describe('round', () => {
  it('rounds to 1 decimal place by default', () => {
    expect(round(1.234, 1)).toBe(1.2);
  });

  it('rounds to 2 decimal places', () => {
    expect(round(1.234, 2)).toBe(1.23);
  });

  it('rounds to 0 decimal places', () => {
    expect(round(1.234, 0)).toBe(1);
  });

  it('uses default decimals=1 when not specified', () => {
    expect(round(3.456)).toBe(3.5);
  });
});

// ============================================================
// shuffleArray
// ============================================================

describe('shuffleArray', () => {
  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('contains the same elements as the original', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });
});

// ============================================================
// randomPick
// ============================================================

describe('randomPick', () => {
  it('returns an element from the given array', () => {
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(randomPick(items));
    }
  });
});

// ============================================================
// weightedPick
// ============================================================

describe('weightedPick', () => {
  it('returns an element from the items array', () => {
    const items = ['x', 'y', 'z'];
    const weights = [1, 2, 3];
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(weightedPick(items, weights));
    }
  });
});

// ============================================================
// shouldSkip
// ============================================================

describe('shouldSkip', () => {
  it('always returns false when skipProbability is 0', () => {
    for (let i = 0; i < 50; i++) {
      expect(shouldSkip(0)).toBe(false);
    }
  });

  it('always returns true when skipProbability is 1', () => {
    for (let i = 0; i < 50; i++) {
      expect(shouldSkip(1)).toBe(true);
    }
  });
});

// ============================================================
// gaussianRandom
// ============================================================

describe('gaussianRandom', () => {
  it('returns a number', () => {
    const val = gaussianRandom(100, 10);
    expect(typeof val).toBe('number');
    expect(Number.isFinite(val)).toBe(true);
  });

  it('produces values roughly centered around the mean over many samples', () => {
    const samples = Array.from({ length: 1000 }, () => gaussianRandom(50, 5));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    // With 1000 samples, mean should be within ~1 of 50
    expect(mean).toBeGreaterThan(45);
    expect(mean).toBeLessThan(55);
  });
});

// ============================================================
// mealTimeOfDay
// ============================================================

describe('mealTimeOfDay', () => {
  const testDate = '2025-01-15';

  it('returns breakfast hour in [6, 9]', () => {
    for (let i = 0; i < 20; i++) {
      const result = mealTimeOfDay(testDate, 'breakfast');
      const hour = parseInt(result.split('T')[1].split(':')[0], 10);
      expect(hour).toBeGreaterThanOrEqual(6);
      expect(hour).toBeLessThanOrEqual(9);
    }
  });

  it('returns lunch hour in [11, 13]', () => {
    for (let i = 0; i < 20; i++) {
      const result = mealTimeOfDay(testDate, 'lunch');
      const hour = parseInt(result.split('T')[1].split(':')[0], 10);
      expect(hour).toBeGreaterThanOrEqual(11);
      expect(hour).toBeLessThanOrEqual(13);
    }
  });

  it('returns dinner hour in [17, 20]', () => {
    for (let i = 0; i < 20; i++) {
      const result = mealTimeOfDay(testDate, 'dinner');
      const hour = parseInt(result.split('T')[1].split(':')[0], 10);
      expect(hour).toBeGreaterThanOrEqual(17);
      expect(hour).toBeLessThanOrEqual(20);
    }
  });

  it('returns snack hour in [14, 16]', () => {
    for (let i = 0; i < 20; i++) {
      const result = mealTimeOfDay(testDate, 'snack');
      const hour = parseInt(result.split('T')[1].split(':')[0], 10);
      expect(hour).toBeGreaterThanOrEqual(14);
      expect(hour).toBeLessThanOrEqual(16);
    }
  });

  it('falls back to [8, 20] for unknown meal types', () => {
    for (let i = 0; i < 20; i++) {
      const result = mealTimeOfDay(testDate, 'unknown');
      const hour = parseInt(result.split('T')[1].split(':')[0], 10);
      expect(hour).toBeGreaterThanOrEqual(8);
      expect(hour).toBeLessThanOrEqual(20);
    }
  });
});

// ============================================================
// randomTimeOfDay
// ============================================================

describe('randomTimeOfDay', () => {
  it('returns a valid ISO datetime string', () => {
    const result = randomTimeOfDay('2025-06-15');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
  });

  it('includes the provided date', () => {
    const result = randomTimeOfDay('2025-03-20');
    expect(result.startsWith('2025-03-20T')).toBe(true);
  });

  it('respects custom hour range', () => {
    for (let i = 0; i < 30; i++) {
      const result = randomTimeOfDay('2025-01-01', 10, 14);
      const hour = parseInt(result.split('T')[1].split(':')[0], 10);
      expect(hour).toBeGreaterThanOrEqual(10);
      expect(hour).toBeLessThanOrEqual(14);
    }
  });
});

// ============================================================
// batchInsert
// ============================================================

describe('batchInsert', () => {
  const mockDb = {
    runAsync: jest.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => {
    mockDb.runAsync.mockClear();
  });

  it('returns 0 and does not call db for empty rows', async () => {
    const result = await batchInsert(mockDb, 'foods', ['name', 'cal'], []);
    expect(result).toBe(0);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('makes a single call when rows fit within batch size', async () => {
    const rows = [
      ['Apple', 95],
      ['Banana', 105],
    ];
    const result = await batchInsert(mockDb, 'foods', ['name', 'cal'], rows);
    expect(result).toBe(2);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);

    // Verify the SQL structure
    const sql = mockDb.runAsync.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT OR REPLACE INTO foods');
    expect(sql).toContain('(name, cal)');
    expect(sql).toContain('(?, ?)');
  });

  it('makes multiple calls when rows exceed batch size', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => [`item${i}`, i]);
    const result = await batchInsert(mockDb, 'foods', ['name', 'cal'], rows, 2);
    expect(result).toBe(5);
    // 5 rows / batch of 2 = 3 calls (2+2+1)
    expect(mockDb.runAsync).toHaveBeenCalledTimes(3);
  });

  it('passes flattened values to db.runAsync', async () => {
    const rows = [['Apple', 95]];
    await batchInsert(mockDb, 'foods', ['name', 'cal'], rows);
    const values = mockDb.runAsync.mock.calls[0][1];
    expect(values).toEqual(['Apple', 95]);
  });
});
