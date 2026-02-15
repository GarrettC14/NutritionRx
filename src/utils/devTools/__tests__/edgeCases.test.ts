import {
  EDGE_CASE_STRINGS,
  EDGE_CASE_FOOD_NOTES,
  EDGE_CASE_QUICK_ADD_DESCRIPTIONS,
  EDGE_CASE_SERVINGS,
  EDGE_CASE_WEIGHTS_KG,
  EDGE_CASE_DATES,
} from '../mockData/edgeCases';

describe('EDGE_CASE_STRINGS', () => {
  it('has a unicode array with strings', () => {
    expect(Array.isArray(EDGE_CASE_STRINGS.unicode)).toBe(true);
    expect(EDGE_CASE_STRINGS.unicode.length).toBeGreaterThan(0);
    for (const s of EDGE_CASE_STRINGS.unicode) {
      expect(typeof s).toBe('string');
    }
  });

  it('has an emoji array with strings', () => {
    expect(Array.isArray(EDGE_CASE_STRINGS.emoji)).toBe(true);
    expect(EDGE_CASE_STRINGS.emoji.length).toBeGreaterThan(0);
    for (const s of EDGE_CASE_STRINGS.emoji) {
      expect(typeof s).toBe('string');
    }
  });

  it('has a special array with strings containing special characters', () => {
    expect(Array.isArray(EDGE_CASE_STRINGS.special)).toBe(true);
    expect(EDGE_CASE_STRINGS.special.length).toBeGreaterThan(0);
    for (const s of EDGE_CASE_STRINGS.special) {
      expect(typeof s).toBe('string');
    }
  });

  it('has a long array with at least one long string', () => {
    expect(Array.isArray(EDGE_CASE_STRINGS.long)).toBe(true);
    expect(EDGE_CASE_STRINGS.long.length).toBeGreaterThan(0);
    expect(EDGE_CASE_STRINGS.long[0].length).toBeGreaterThanOrEqual(500);
  });

  it('has a whitespace array with strings', () => {
    expect(Array.isArray(EDGE_CASE_STRINGS.whitespace)).toBe(true);
    expect(EDGE_CASE_STRINGS.whitespace.length).toBeGreaterThan(0);
    for (const s of EDGE_CASE_STRINGS.whitespace) {
      expect(typeof s).toBe('string');
    }
  });
});

describe('EDGE_CASE_FOOD_NOTES', () => {
  it('is an array of strings', () => {
    expect(Array.isArray(EDGE_CASE_FOOD_NOTES)).toBe(true);
    expect(EDGE_CASE_FOOD_NOTES.length).toBeGreaterThan(0);
    for (const note of EDGE_CASE_FOOD_NOTES) {
      expect(typeof note).toBe('string');
    }
  });
});

describe('EDGE_CASE_QUICK_ADD_DESCRIPTIONS', () => {
  it('is an array of strings', () => {
    expect(Array.isArray(EDGE_CASE_QUICK_ADD_DESCRIPTIONS)).toBe(true);
    expect(EDGE_CASE_QUICK_ADD_DESCRIPTIONS.length).toBeGreaterThan(0);
    for (const desc of EDGE_CASE_QUICK_ADD_DESCRIPTIONS) {
      expect(typeof desc).toBe('string');
    }
  });
});

describe('EDGE_CASE_SERVINGS', () => {
  it('is an array of numbers', () => {
    expect(Array.isArray(EDGE_CASE_SERVINGS)).toBe(true);
    expect(EDGE_CASE_SERVINGS.length).toBeGreaterThan(0);
    for (const s of EDGE_CASE_SERVINGS) {
      expect(typeof s).toBe('number');
    }
  });
});

describe('EDGE_CASE_WEIGHTS_KG', () => {
  it('is an array of numbers', () => {
    expect(Array.isArray(EDGE_CASE_WEIGHTS_KG)).toBe(true);
    expect(EDGE_CASE_WEIGHTS_KG.length).toBeGreaterThan(0);
    for (const w of EDGE_CASE_WEIGHTS_KG) {
      expect(typeof w).toBe('number');
    }
  });
});

describe('EDGE_CASE_DATES', () => {
  it('has yearBoundary as an array of date strings', () => {
    expect(Array.isArray(EDGE_CASE_DATES.yearBoundary)).toBe(true);
    expect(EDGE_CASE_DATES.yearBoundary.length).toBeGreaterThan(0);
    for (const d of EDGE_CASE_DATES.yearBoundary) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('has leapDay as an array of date strings', () => {
    expect(Array.isArray(EDGE_CASE_DATES.leapDay)).toBe(true);
    expect(EDGE_CASE_DATES.leapDay.length).toBeGreaterThan(0);
    for (const d of EDGE_CASE_DATES.leapDay) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('has monthEnds as an array of date strings', () => {
    expect(Array.isArray(EDGE_CASE_DATES.monthEnds)).toBe(true);
    expect(EDGE_CASE_DATES.monthEnds.length).toBeGreaterThan(0);
    for (const d of EDGE_CASE_DATES.monthEnds) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
