import {
  seedDatabase,
  clearAllData,
  clearSeedProgressPhotos,
  DEFAULT_SEED_OPTIONS,
} from '../index';
import type { SeedOptions, SeedProgress, SeedResult } from '../index';

describe('devTools barrel exports', () => {
  it('exports seedDatabase as a function', () => {
    expect(typeof seedDatabase).toBe('function');
  });

  it('exports clearAllData as a function', () => {
    expect(typeof clearAllData).toBe('function');
  });

  it('exports clearSeedProgressPhotos as a function', () => {
    expect(typeof clearSeedProgressPhotos).toBe('function');
  });

  it('exports DEFAULT_SEED_OPTIONS with expected shape', () => {
    expect(DEFAULT_SEED_OPTIONS).toBeDefined();
    expect(typeof DEFAULT_SEED_OPTIONS.clearExisting).toBe('boolean');
    expect(typeof DEFAULT_SEED_OPTIONS.includeEdgeCases).toBe('boolean');
    expect(typeof DEFAULT_SEED_OPTIONS.monthsOfHistory).toBe('number');
    expect(typeof DEFAULT_SEED_OPTIONS.verboseLogging).toBe('boolean');
  });

  it('type exports are accessible (compile-time check)', () => {
    // These verify that the type re-exports work at compile time.
    // If this file compiles, the type exports are valid.
    const opts: SeedOptions = DEFAULT_SEED_OPTIONS;
    expect(opts).toBeDefined();

    const progress: SeedProgress = {
      currentEntity: 'test',
      currentCount: 0,
      totalCount: 0,
      phase: 'test',
      startedAt: Date.now(),
    };
    expect(progress).toBeDefined();

    const result: SeedResult = {
      success: true,
      duration: 0,
      counts: {},
      errors: [],
      warnings: [],
    };
    expect(result).toBeDefined();
  });
});
