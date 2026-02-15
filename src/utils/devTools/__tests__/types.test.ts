import { DEFAULT_SEED_OPTIONS } from '../types';

describe('DEFAULT_SEED_OPTIONS', () => {
  it('has clearExisting set to true', () => {
    expect(DEFAULT_SEED_OPTIONS.clearExisting).toBe(true);
  });

  it('has includeEdgeCases set to false', () => {
    expect(DEFAULT_SEED_OPTIONS.includeEdgeCases).toBe(false);
  });

  it('has monthsOfHistory set to 6', () => {
    expect(DEFAULT_SEED_OPTIONS.monthsOfHistory).toBe(6);
  });

  it('has verboseLogging set to false', () => {
    expect(DEFAULT_SEED_OPTIONS.verboseLogging).toBe(false);
  });

  it('matches the expected full shape', () => {
    expect(DEFAULT_SEED_OPTIONS).toEqual({
      clearExisting: true,
      includeEdgeCases: false,
      monthsOfHistory: 6,
      verboseLogging: false,
    });
  });
});
