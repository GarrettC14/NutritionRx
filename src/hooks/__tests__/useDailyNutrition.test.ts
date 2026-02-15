/**
 * Tests for useDailyNutrition and useAdjustedDailyNutrition hooks.
 *
 * useDailyNutrition: thin wrapper that reads from foodLogStore.
 * useAdjustedDailyNutrition: wraps useDailyNutrition with optional
 * calorie recalculation based on the Atwater macro formula (4/4/9).
 */

import { renderHook } from '@testing-library/react-native';
import type { DailyTotals, LogEntry } from '@/types/domain';
import type { MealType } from '@/constants/mealTypes';

// ============================================================
// Mock state — mutated by tests, read by mock selectors
// ============================================================

let mockDailyTotals: DailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
let mockEntriesByMeal: Record<MealType, LogEntry[]> = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
};
let mockIsLoading = false;
let mockIsLoaded = false;
let mockCalorieCalculationMethod: 'label' | 'macro' = 'label';

// ============================================================
// Mocks
// ============================================================

jest.mock('@/stores', () => ({
  useFoodLogStore: jest.fn((selector: (s: any) => any) =>
    selector({
      dailyTotals: mockDailyTotals,
      getEntriesByMeal: () => mockEntriesByMeal,
      isLoading: mockIsLoading,
      isLoaded: mockIsLoaded,
    })
  ),
}));

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: jest.fn((selector: (s: any) => any) =>
    selector({
      settings: {
        calorieCalculationMethod: mockCalorieCalculationMethod,
      },
    })
  ),
}));

// Use the real calculateMacroCalories — it is a pure function with no dependencies
jest.mock('@/utils/calculateMacroCalories', () => {
  const actual = jest.requireActual('@/utils/calculateMacroCalories');
  return actual;
});

// ============================================================
// Import hooks AFTER mocks are defined
// ============================================================

import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useAdjustedDailyNutrition } from '@/hooks/useAdjustedDailyNutrition';

// ============================================================
// Helpers
// ============================================================

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'entry-1',
    foodItemId: 'food-1',
    foodName: 'Test Food',
    date: '2026-02-15',
    mealType: 'breakfast',
    servings: 1,
    calories: 200,
    protein: 20,
    carbs: 25,
    fat: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================
// Reset
// ============================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockDailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  mockEntriesByMeal = { breakfast: [], lunch: [], dinner: [], snack: [] };
  mockIsLoading = false;
  mockIsLoaded = false;
  mockCalorieCalculationMethod = 'label';
});

// ============================================================
// useDailyNutrition
// ============================================================

describe('useDailyNutrition', () => {
  it('returns totals from the food log store', () => {
    mockDailyTotals = { calories: 1500, protein: 120, carbs: 180, fat: 50 };

    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.totals).toEqual({
      calories: 1500,
      protein: 120,
      carbs: 180,
      fat: 50,
    });
  });

  it('returns entriesByMeal grouped by meal type', () => {
    const breakfastEntry = makeEntry({ id: 'b1', mealType: 'breakfast' });
    const dinnerEntry = makeEntry({ id: 'd1', mealType: 'dinner' });
    mockEntriesByMeal = {
      breakfast: [breakfastEntry],
      lunch: [],
      dinner: [dinnerEntry],
      snack: [],
    };

    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.entriesByMeal.breakfast).toHaveLength(1);
    expect(result.current.entriesByMeal.breakfast[0].id).toBe('b1');
    expect(result.current.entriesByMeal.dinner).toHaveLength(1);
    expect(result.current.entriesByMeal.dinner[0].id).toBe('d1');
    expect(result.current.entriesByMeal.lunch).toHaveLength(0);
    expect(result.current.entriesByMeal.snack).toHaveLength(0);
  });

  it('returns isLoading = true when store is loading', () => {
    mockIsLoading = true;

    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading = false when store is idle', () => {
    mockIsLoading = false;

    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.isLoading).toBe(false);
  });

  it('returns isLoaded = true when data has been loaded', () => {
    mockIsLoaded = true;

    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.isLoaded).toBe(true);
  });

  it('returns isLoaded = false before first load', () => {
    mockIsLoaded = false;

    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.isLoaded).toBe(false);
  });

  it('returns zero totals when no food has been logged', () => {
    mockDailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.totals).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('returns empty arrays in entriesByMeal when no entries exist', () => {
    const { result } = renderHook(() => useDailyNutrition());

    expect(result.current.entriesByMeal.breakfast).toEqual([]);
    expect(result.current.entriesByMeal.lunch).toEqual([]);
    expect(result.current.entriesByMeal.dinner).toEqual([]);
    expect(result.current.entriesByMeal.snack).toEqual([]);
  });
});

// ============================================================
// useAdjustedDailyNutrition
// ============================================================

describe('useAdjustedDailyNutrition', () => {
  // ---- Label method (passthrough) ----

  it('returns daily data unchanged when method is label', () => {
    mockCalorieCalculationMethod = 'label';
    mockDailyTotals = { calories: 2000, protein: 150, carbs: 200, fat: 70 };
    const entry = makeEntry({ calories: 500, protein: 30, carbs: 50, fat: 20 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    expect(result.current.totals.calories).toBe(2000);
    expect(result.current.totals.protein).toBe(150);
    expect(result.current.totals.carbs).toBe(200);
    expect(result.current.totals.fat).toBe(70);
  });

  it('preserves entriesByMeal when method is label', () => {
    mockCalorieCalculationMethod = 'label';
    const entry = makeEntry({ id: 'e1' });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    expect(result.current.entriesByMeal.breakfast).toHaveLength(1);
    expect(result.current.entriesByMeal.breakfast[0].id).toBe('e1');
  });

  it('preserves isLoading and isLoaded when method is label', () => {
    mockCalorieCalculationMethod = 'label';
    mockIsLoading = true;
    mockIsLoaded = true;

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoaded).toBe(true);
  });

  // ---- Macro method (Atwater recalculation) ----

  it('recalculates calories using Atwater 4/4/9 when method is macro', () => {
    mockCalorieCalculationMethod = 'macro';
    // protein=30, carbs=50, fat=20 => 30*4 + 50*4 + 20*9 = 120+200+180 = 500
    const entry = makeEntry({
      calories: 480, // label value, should be replaced
      protein: 30,
      carbs: 50,
      fat: 20,
    });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    // totals.calories = sum of label calories from entries (no quick adds)
    mockDailyTotals = { calories: 480, protein: 30, carbs: 50, fat: 20 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories=500, labelCaloriesFromEntries=480, quickAdd=max(0,480-480)=0
    // result = 500 + 0 = 500
    expect(result.current.totals.calories).toBe(500);
  });

  it('preserves quick-add calories that are not recalculated', () => {
    mockCalorieCalculationMethod = 'macro';
    // Entry: protein=30, carbs=50, fat=20 => macroCalories = 500
    const entry = makeEntry({ calories: 500, protein: 30, carbs: 50, fat: 20 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    // totals = 700 total, but entries only account for 500 label cal
    // quickAdd = 700 - 500 = 200
    mockDailyTotals = { calories: 700, protein: 30, carbs: 50, fat: 20 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories=500, quickAdd=200 => total=700
    expect(result.current.totals.calories).toBe(700);
  });

  it('correctly calculates when macro calories differ from label: quick-add scenario', () => {
    mockCalorieCalculationMethod = 'macro';
    // Entry label says 500, but macros compute to 480 (protein=30 carbs=50 fat=17.78...)
    // Using protein=25 carbs=40 fat=15 => 25*4 + 40*4 + 15*9 = 100+160+135 = 395
    const entry = makeEntry({ calories: 500, protein: 25, carbs: 40, fat: 15 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    // Total=700, entry label=500, quickAdd = 700-500 = 200
    mockDailyTotals = { calories: 700, protein: 25, carbs: 40, fat: 15 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories=395, quickAdd=200 => 595
    expect(result.current.totals.calories).toBe(595);
  });

  it('sums multiple entries across different meals', () => {
    mockCalorieCalculationMethod = 'macro';
    // Entry 1: p=20, c=30, f=10 => 20*4+30*4+10*9 = 80+120+90 = 290
    const entry1 = makeEntry({ id: 'e1', calories: 300, protein: 20, carbs: 30, fat: 10, mealType: 'breakfast' });
    // Entry 2: p=40, c=60, f=20 => 40*4+60*4+20*9 = 160+240+180 = 580
    const entry2 = makeEntry({ id: 'e2', calories: 600, protein: 40, carbs: 60, fat: 20, mealType: 'lunch' });
    mockEntriesByMeal = { breakfast: [entry1], lunch: [entry2], dinner: [], snack: [] };
    // total label = 300+600=900, no quick add
    mockDailyTotals = { calories: 900, protein: 60, carbs: 90, fat: 30 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories = 290+580 = 870, quickAdd = max(0, 900-900) = 0
    expect(result.current.totals.calories).toBe(870);
  });

  it('treats null/undefined protein as 0', () => {
    mockCalorieCalculationMethod = 'macro';
    // protein=undefined => treated as 0, carbs=50, fat=10 => 0+50*4+10*9 = 290
    const entry = makeEntry({
      calories: 300,
      protein: undefined as any,
      carbs: 50,
      fat: 10,
    });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    mockDailyTotals = { calories: 300, protein: 0, carbs: 50, fat: 10 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories=290, quickAdd=max(0,300-300)=0 => 290
    expect(result.current.totals.calories).toBe(290);
  });

  it('treats null/undefined carbs as 0', () => {
    mockCalorieCalculationMethod = 'macro';
    // protein=25, carbs=undefined => 0, fat=15 => 25*4+0+15*9 = 100+135 = 235
    const entry = makeEntry({
      calories: 250,
      protein: 25,
      carbs: undefined as any,
      fat: 15,
    });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    mockDailyTotals = { calories: 250, protein: 25, carbs: 0, fat: 15 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories=235, quickAdd=max(0,250-250)=0 => 235
    expect(result.current.totals.calories).toBe(235);
  });

  it('treats null/undefined fat as 0', () => {
    mockCalorieCalculationMethod = 'macro';
    // protein=30, carbs=40, fat=undefined => 0 => 30*4+40*4+0 = 280
    const entry = makeEntry({
      calories: 290,
      protein: 30,
      carbs: 40,
      fat: undefined as any,
    });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    mockDailyTotals = { calories: 290, protein: 30, carbs: 40, fat: 0 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories=280, quickAdd=max(0,290-290)=0 => 280
    expect(result.current.totals.calories).toBe(280);
  });

  it('returns quickAddCalories only when no entries exist', () => {
    mockCalorieCalculationMethod = 'macro';
    // No entries, but totals has 300 quick-add calories
    mockEntriesByMeal = { breakfast: [], lunch: [], dinner: [], snack: [] };
    mockDailyTotals = { calories: 300, protein: 0, carbs: 0, fat: 0 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // macroCalories=0, labelCaloriesFromEntries=0, quickAdd=max(0,300-0)=300
    expect(result.current.totals.calories).toBe(300);
  });

  it('clamps quickAddCalories to 0 when label calories exceed totals', () => {
    mockCalorieCalculationMethod = 'macro';
    // Entries label sum > totals (edge case, e.g. after quick-add deletion)
    // protein=30, carbs=50, fat=20 => macroCalories = 500
    const entry = makeEntry({ calories: 600, protein: 30, carbs: 50, fat: 20 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    // totals < entry label sum — quickAdd would be negative without Math.max
    mockDailyTotals = { calories: 500, protein: 30, carbs: 50, fat: 20 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // quickAdd = max(0, 500-600) = 0, so result = macroCalories + 0 = 500
    expect(result.current.totals.calories).toBe(500);
  });

  it('handles null totals.calories gracefully (quickAdd defaults to 0)', () => {
    mockCalorieCalculationMethod = 'macro';
    // protein=10, carbs=20, fat=5 => 10*4+20*4+5*9 = 40+80+45 = 165
    const entry = makeEntry({ calories: 150, protein: 10, carbs: 20, fat: 5 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    // totals.calories is explicitly undefined/null
    mockDailyTotals = { calories: undefined as any, protein: 10, carbs: 20, fat: 5 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // quickAdd = max(0, (undefined ?? 0) - 150) = max(0, -150) = 0
    // result = 165 + 0 = 165
    expect(result.current.totals.calories).toBe(165);
  });

  it('does not modify non-calorie macro totals in macro mode', () => {
    mockCalorieCalculationMethod = 'macro';
    const entry = makeEntry({ calories: 400, protein: 30, carbs: 50, fat: 20 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    mockDailyTotals = { calories: 400, protein: 150, carbs: 200, fat: 65 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    // protein, carbs, fat should remain from the original totals
    expect(result.current.totals.protein).toBe(150);
    expect(result.current.totals.carbs).toBe(200);
    expect(result.current.totals.fat).toBe(65);
  });

  it('preserves entriesByMeal in macro mode', () => {
    mockCalorieCalculationMethod = 'macro';
    const entry = makeEntry({ id: 'e1', calories: 400, protein: 30, carbs: 50, fat: 20 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    mockDailyTotals = { calories: 400, protein: 30, carbs: 50, fat: 20 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    expect(result.current.entriesByMeal.breakfast).toHaveLength(1);
    expect(result.current.entriesByMeal.breakfast[0].id).toBe('e1');
  });

  it('preserves isLoading and isLoaded in macro mode', () => {
    mockCalorieCalculationMethod = 'macro';
    mockIsLoading = true;
    mockIsLoaded = true;
    mockDailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoaded).toBe(true);
  });

  it('handles entries with all zero macros (0 calories)', () => {
    mockCalorieCalculationMethod = 'macro';
    const entry = makeEntry({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    mockEntriesByMeal = { breakfast: [entry], lunch: [], dinner: [], snack: [] };
    mockDailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const { result } = renderHook(() => useAdjustedDailyNutrition());

    expect(result.current.totals.calories).toBe(0);
  });
});
