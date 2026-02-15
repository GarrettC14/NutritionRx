/**
 * useResolvedTargets Hook Tests
 *
 * Tests the resolution order for macro targets:
 *   1. User override for a specific date
 *   2. Macro cycling target (if cycling active + premium)
 *   3. Base targets from goalStore (fallback)
 *
 * Also covers range computation, error handling, and cleanup.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import type { DayTargets, MacroCycleConfig, MacroCycleOverride } from '@/types/planning';

// ---- Mutable mock state ----

let mockCalorieGoal: number | null = 2500;
let mockProteinGoal: number | null = 180;
let mockCarbGoal: number | null = 300;
let mockFatGoal: number | null = 80;

let mockConfig: MacroCycleConfig | null = null;
let mockTodayOverride: MacroCycleOverride | null = null;
let mockIsPremium = true;

// ---- Mocks ----

jest.mock('@/stores/goalStore', () => ({
  useGoalStore: jest.fn((selector: (s: any) => any) =>
    selector({
      calorieGoal: mockCalorieGoal,
      proteinGoal: mockProteinGoal,
      carbGoal: mockCarbGoal,
      fatGoal: mockFatGoal,
    })
  ),
}));

jest.mock('@/stores/macroCycleStore', () => ({
  useMacroCycleStore: jest.fn((selector: (s: any) => any) =>
    selector({
      config: mockConfig,
      todayOverride: mockTodayOverride,
    })
  ),
}));

jest.mock('@/stores/subscriptionStore', () => ({
  useSubscriptionStore: jest.fn((selector: (s: any) => any) =>
    selector({
      isPremium: mockIsPremium,
    })
  ),
}));

const mockGetTargetsForDate = jest.fn<Promise<DayTargets>, [string, DayTargets]>();

jest.mock('@/repositories', () => ({
  macroCycleRepository: {
    getTargetsForDate: (...args: [string, DayTargets]) => mockGetTargetsForDate(...args),
  },
}));

// Import after all mocks are in place
import { useResolvedTargets } from '../useResolvedTargets';

// ---- Helpers ----

/** Creates a MacroCycleConfig stub with enabled=true by default. */
function makeConfig(overrides: Partial<MacroCycleConfig> = {}): MacroCycleConfig {
  return {
    enabled: true,
    patternType: 'training_rest',
    markedDays: [1, 3, 5],
    dayTargets: {},
    lockedDays: [],
    redistributionStartDay: 0,
    createdAt: '2025-01-01',
    lastModified: '2025-01-01',
    ...overrides,
  };
}

/** Creates a MacroCycleOverride stub. */
function makeOverride(targets: DayTargets): MacroCycleOverride {
  return {
    id: 'override-1',
    date: new Date().toISOString().split('T')[0],
    ...targets,
    createdAt: '2025-01-01T00:00:00.000Z',
  };
}

/** Computes the expected +-5% range for a target value. */
function expectedRange(target: number) {
  return { min: Math.round(target * 0.95), max: Math.round(target * 1.05) };
}

// ============================================================
// Tests
// ============================================================

describe('useResolvedTargets', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mutable mock state to defaults
    mockCalorieGoal = 2500;
    mockProteinGoal = 180;
    mockCarbGoal = 300;
    mockFatGoal = 80;

    mockConfig = null;
    mockTodayOverride = null;
    mockIsPremium = true;

    mockGetTargetsForDate.mockReset();
  });

  // ============================================================
  // Base targets
  // ============================================================

  describe('base targets', () => {
    it('returns base targets with source="base" when no cycling config', async () => {
      mockConfig = null;

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(2500);
      expect(result.current.protein).toBe(180);
      expect(result.current.carbs).toBe(300);
      expect(result.current.fat).toBe(80);
      expect(mockGetTargetsForDate).not.toHaveBeenCalled();
    });

    it('returns base targets when cycling config exists but is disabled', async () => {
      mockConfig = makeConfig({ enabled: false });

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(2500);
      expect(mockGetTargetsForDate).not.toHaveBeenCalled();
    });

    it('returns base targets when user is not premium', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = false;

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(2500);
      expect(mockGetTargetsForDate).not.toHaveBeenCalled();
    });

    it('uses fallback values when all goals are null', async () => {
      mockCalorieGoal = null;
      mockProteinGoal = null;
      mockCarbGoal = null;
      mockFatGoal = null;

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(2000);
      expect(result.current.protein).toBe(150);
      expect(result.current.carbs).toBe(250);
      expect(result.current.fat).toBe(65);
    });

    it('uses store values when custom goals are set', async () => {
      mockCalorieGoal = 1800;
      mockProteinGoal = 200;
      mockCarbGoal = 220;
      mockFatGoal = 55;

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(1800);
      expect(result.current.protein).toBe(200);
      expect(result.current.carbs).toBe(220);
      expect(result.current.fat).toBe(55);
    });
  });

  // ============================================================
  // Ranges
  // ============================================================

  describe('ranges', () => {
    it('computes +-5% range bands for base targets', async () => {
      mockCalorieGoal = 2000;
      mockProteinGoal = 150;
      mockCarbGoal = 250;
      mockFatGoal = 65;

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.ranges.calories).toEqual({ min: 1900, max: 2100 });
      expect(result.current.ranges.protein).toEqual({ min: 143, max: 158 });
      expect(result.current.ranges.carbs).toEqual({ min: 238, max: 263 });
      expect(result.current.ranges.fat).toEqual({ min: 62, max: 68 });
    });

    it('computes ranges for cycling targets', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const cyclingTargets: DayTargets = { calories: 2800, protein: 200, carbs: 350, fat: 70 };
      mockGetTargetsForDate.mockResolvedValue(cyclingTargets);

      const { result } = renderHook(() => useResolvedTargets('2025-06-15'));

      await waitFor(() => {
        expect(result.current.source).toBe('cycling');
      });

      expect(result.current.ranges.calories).toEqual(expectedRange(2800));
      expect(result.current.ranges.protein).toEqual(expectedRange(200));
      expect(result.current.ranges.carbs).toEqual(expectedRange(350));
      expect(result.current.ranges.fat).toEqual(expectedRange(70));
    });
  });

  // ============================================================
  // Cycling targets
  // ============================================================

  describe('cycling targets', () => {
    it('calls getTargetsForDate when cycling enabled and premium', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const cyclingTargets: DayTargets = { calories: 2800, protein: 200, carbs: 350, fat: 70 };
      mockGetTargetsForDate.mockResolvedValue(cyclingTargets);

      const { result } = renderHook(() => useResolvedTargets('2025-06-15'));

      await waitFor(() => {
        expect(result.current.source).toBe('cycling');
      });

      expect(mockGetTargetsForDate).toHaveBeenCalledTimes(1);
      expect(mockGetTargetsForDate).toHaveBeenCalledWith(
        '2025-06-15',
        { calories: 2500, protein: 180, carbs: 300, fat: 80 }
      );
    });

    it('returns cycling targets with source="cycling" when different from base', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const cyclingTargets: DayTargets = { calories: 2800, protein: 200, carbs: 350, fat: 70 };
      mockGetTargetsForDate.mockResolvedValue(cyclingTargets);

      const { result } = renderHook(() => useResolvedTargets('2025-06-15'));

      await waitFor(() => {
        expect(result.current.source).toBe('cycling');
      });

      expect(result.current.calories).toBe(2800);
      expect(result.current.protein).toBe(200);
      expect(result.current.carbs).toBe(350);
      expect(result.current.fat).toBe(70);
    });

    it('returns source="base" when cycling returns same values as base targets', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      // Repository returns the same values as base
      const sameAsBase: DayTargets = { calories: 2500, protein: 180, carbs: 300, fat: 80 };
      mockGetTargetsForDate.mockResolvedValue(sameAsBase);

      const { result } = renderHook(() => useResolvedTargets('2025-06-15'));

      await waitFor(() => {
        expect(result.current.calories).toBe(2500);
      });

      expect(result.current.source).toBe('base');
    });
  });

  // ============================================================
  // Override detection
  // ============================================================

  describe('override detection', () => {
    it('returns source="override" when todayOverride matches returned targets (no date param)', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const overrideTargets: DayTargets = { calories: 3000, protein: 220, carbs: 380, fat: 90 };
      mockTodayOverride = makeOverride(overrideTargets);
      mockGetTargetsForDate.mockResolvedValue(overrideTargets);

      // No date param -> resolves for today
      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('override');
      });

      expect(result.current.calories).toBe(3000);
      expect(result.current.protein).toBe(220);
      expect(result.current.carbs).toBe(380);
      expect(result.current.fat).toBe(90);
    });

    it('returns source="cycling" when explicit date param is provided even with todayOverride', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const overrideTargets: DayTargets = { calories: 3000, protein: 220, carbs: 380, fat: 90 };
      mockTodayOverride = makeOverride(overrideTargets);

      // Repository returns cycling (different from base)
      const cyclingTargets: DayTargets = { calories: 2700, protein: 190, carbs: 320, fat: 75 };
      mockGetTargetsForDate.mockResolvedValue(cyclingTargets);

      // Explicit date param -> does NOT use todayOverride logic
      const { result } = renderHook(() => useResolvedTargets('2025-06-15'));

      await waitFor(() => {
        expect(result.current.source).toBe('cycling');
      });

      expect(result.current.calories).toBe(2700);
    });

    it('returns source="cycling" when todayOverride does not match returned targets', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const overrideTargets: DayTargets = { calories: 3000, protein: 220, carbs: 380, fat: 90 };
      mockTodayOverride = makeOverride(overrideTargets);

      // Repository returns different targets than the override
      const cyclingTargets: DayTargets = { calories: 2700, protein: 190, carbs: 320, fat: 75 };
      mockGetTargetsForDate.mockResolvedValue(cyclingTargets);

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('cycling');
      });

      expect(result.current.calories).toBe(2700);
    });
  });

  // ============================================================
  // Date handling
  // ============================================================

  describe('date handling', () => {
    it('uses today date when no date param is provided', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const targets: DayTargets = { calories: 2500, protein: 180, carbs: 300, fat: 80 };
      mockGetTargetsForDate.mockResolvedValue(targets);

      renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(mockGetTargetsForDate).toHaveBeenCalled();
      });

      const calledDate = mockGetTargetsForDate.mock.calls[0][0];
      const todayISO = new Date().toISOString().split('T')[0];
      expect(calledDate).toBe(todayISO);
    });

    it('passes explicit date param to getTargetsForDate', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      const targets: DayTargets = { calories: 2500, protein: 180, carbs: 300, fat: 80 };
      mockGetTargetsForDate.mockResolvedValue(targets);

      renderHook(() => useResolvedTargets('2025-12-25'));

      await waitFor(() => {
        expect(mockGetTargetsForDate).toHaveBeenCalled();
      });

      expect(mockGetTargetsForDate).toHaveBeenCalledWith(
        '2025-12-25',
        expect.any(Object)
      );
    });
  });

  // ============================================================
  // Error handling
  // ============================================================

  describe('error handling', () => {
    it('falls back to base targets when getTargetsForDate throws', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      mockGetTargetsForDate.mockRejectedValue(new Error('DB corruption'));

      const { result } = renderHook(() => useResolvedTargets('2025-06-15'));

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(2500);
      expect(result.current.protein).toBe(180);
      expect(result.current.carbs).toBe(300);
      expect(result.current.fat).toBe(80);
    });

    it('falls back to fallback values on error when goals are null', async () => {
      mockCalorieGoal = null;
      mockProteinGoal = null;
      mockCarbGoal = null;
      mockFatGoal = null;
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      mockGetTargetsForDate.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useResolvedTargets('2025-06-15'));

      await waitFor(() => {
        expect(result.current.calories).toBe(2000);
      });

      expect(result.current.source).toBe('base');
      expect(result.current.protein).toBe(150);
      expect(result.current.carbs).toBe(250);
      expect(result.current.fat).toBe(65);
    });
  });

  // ============================================================
  // Cleanup / unmount
  // ============================================================

  describe('cleanup', () => {
    it('does not set state after unmount (cancelled flag)', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      // Use a deferred promise so we can control when it resolves
      let resolveTargets!: (value: DayTargets) => void;
      mockGetTargetsForDate.mockReturnValue(
        new Promise<DayTargets>((resolve) => {
          resolveTargets = resolve;
        })
      );

      const { result, unmount } = renderHook(() => useResolvedTargets('2025-06-15'));

      // Unmount before the async resolution
      unmount();

      // Now resolve after unmount
      resolveTargets({ calories: 9999, protein: 999, carbs: 999, fat: 999 });

      // Wait a tick for any potential state updates
      await new Promise((resolve) => setTimeout(resolve, 50));

      // State should remain at initial/base values, not the resolved cycling targets
      expect(result.current.calories).not.toBe(9999);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================

  describe('edge cases', () => {
    it('uses fallback for individual null goals (partial nulls)', async () => {
      mockCalorieGoal = 1800;
      mockProteinGoal = null;   // fallback to 150
      mockCarbGoal = 275;
      mockFatGoal = null;       // fallback to 65

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(1800);
      expect(result.current.protein).toBe(150);
      expect(result.current.carbs).toBe(275);
      expect(result.current.fat).toBe(65);
    });

    it('returns base when config is enabled but not premium, even with todayOverride', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = false;
      mockTodayOverride = makeOverride({ calories: 3000, protein: 220, carbs: 380, fat: 90 });

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('base');
      });

      expect(result.current.calories).toBe(2500);
      expect(mockGetTargetsForDate).not.toHaveBeenCalled();
    });

    it('returns override source when only calories differ between override and cycling', async () => {
      mockConfig = makeConfig({ enabled: true });
      mockIsPremium = true;

      // Override and returned targets are exactly the same
      const overrideTargets: DayTargets = { calories: 2500, protein: 180, carbs: 300, fat: 80 };
      mockTodayOverride = makeOverride(overrideTargets);
      mockGetTargetsForDate.mockResolvedValue(overrideTargets);

      const { result } = renderHook(() => useResolvedTargets());

      await waitFor(() => {
        expect(result.current.source).toBe('override');
      });
    });
  });
});
