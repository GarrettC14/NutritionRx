/**
 * Alcohol Calculations Utility Tests
 *
 * Comprehensive tests for all exports from alcoholCalculations.ts:
 * constants (DRINK_PRESETS, DRINK_LABELS, DRINK_ICONS) and pure functions
 * (calculateAlcoholCalories, estimateDrinkCarbs, calculateDrinkNutrition, allocateToMacros).
 */

import {
  DrinkType,
  DRINK_PRESETS,
  DRINK_LABELS,
  DRINK_ICONS,
  calculateAlcoholCalories,
  estimateDrinkCarbs,
  calculateDrinkNutrition,
  allocateToMacros,
} from '@/utils/alcoholCalculations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('DRINK_PRESETS', () => {
  const allTypes: DrinkType[] = ['beer', 'wine', 'spirit', 'cocktail'];

  it('contains all four drink types', () => {
    expect(Object.keys(DRINK_PRESETS).sort()).toEqual(allTypes.sort());
  });

  it('beer preset has correct values', () => {
    expect(DRINK_PRESETS.beer).toEqual({ abv: 5, volumeOz: 12, carbAllocation: 80 });
  });

  it('wine preset has correct values', () => {
    expect(DRINK_PRESETS.wine).toEqual({ abv: 13, volumeOz: 5, carbAllocation: 60 });
  });

  it('spirit preset has correct values', () => {
    expect(DRINK_PRESETS.spirit).toEqual({ abv: 40, volumeOz: 1.5, carbAllocation: 0 });
  });

  it('cocktail preset has correct values', () => {
    expect(DRINK_PRESETS.cocktail).toEqual({ abv: 15, volumeOz: 6, carbAllocation: 50 });
  });
});

describe('DRINK_LABELS', () => {
  it('has a label for every drink type', () => {
    expect(DRINK_LABELS.beer).toBe('Beer');
    expect(DRINK_LABELS.wine).toBe('Wine');
    expect(DRINK_LABELS.spirit).toBe('Spirit');
    expect(DRINK_LABELS.cocktail).toBe('Cocktail');
  });

  it('contains exactly four entries', () => {
    expect(Object.keys(DRINK_LABELS)).toHaveLength(4);
  });
});

describe('DRINK_ICONS', () => {
  it('has an icon for every drink type', () => {
    expect(typeof DRINK_ICONS.beer).toBe('string');
    expect(typeof DRINK_ICONS.wine).toBe('string');
    expect(typeof DRINK_ICONS.spirit).toBe('string');
    expect(typeof DRINK_ICONS.cocktail).toBe('string');
  });

  it('contains exactly four entries', () => {
    expect(Object.keys(DRINK_ICONS)).toHaveLength(4);
  });

  it('icons are non-empty strings', () => {
    for (const icon of Object.values(DRINK_ICONS)) {
      expect(icon.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// calculateAlcoholCalories
// ---------------------------------------------------------------------------

describe('calculateAlcoholCalories', () => {
  it('calculates correctly for a standard beer (5% ABV, 12 oz)', () => {
    // 12 * 5 * 1.6 = 96
    expect(calculateAlcoholCalories(5, 12)).toBe(96);
  });

  it('calculates correctly for a standard spirit (40% ABV, 1.5 oz)', () => {
    // 1.5 * 40 * 1.6 = 96
    expect(calculateAlcoholCalories(40, 1.5)).toBe(96);
  });

  it('calculates correctly for wine (13% ABV, 5 oz)', () => {
    // 5 * 13 * 1.6 = 104
    expect(calculateAlcoholCalories(13, 5)).toBe(104);
  });

  it('calculates correctly for a cocktail (15% ABV, 6 oz)', () => {
    // 6 * 15 * 1.6 = 144
    expect(calculateAlcoholCalories(15, 6)).toBe(144);
  });

  it('returns 0 when ABV is 0', () => {
    expect(calculateAlcoholCalories(0, 12)).toBe(0);
  });

  it('returns 0 when volume is 0', () => {
    expect(calculateAlcoholCalories(5, 0)).toBe(0);
  });

  it('returns 0 when both inputs are 0', () => {
    expect(calculateAlcoholCalories(0, 0)).toBe(0);
  });

  it('handles large ABV values', () => {
    // 100% ABV, 1 oz: 1 * 100 * 1.6 = 160
    expect(calculateAlcoholCalories(100, 1)).toBe(160);
  });

  it('handles large volume values', () => {
    // 5% ABV, 64 oz: 64 * 5 * 1.6 = 512
    expect(calculateAlcoholCalories(5, 64)).toBe(512);
  });

  it('handles fractional ABV', () => {
    // 4.2% ABV, 12 oz: 12 * 4.2 * 1.6 = 80.64
    expect(calculateAlcoholCalories(4.2, 12)).toBeCloseTo(80.64, 10);
  });

  it('returns negative value for negative ABV (no clamping)', () => {
    expect(calculateAlcoholCalories(-5, 12)).toBe(-96);
  });

  it('returns negative value for negative volume (no clamping)', () => {
    expect(calculateAlcoholCalories(5, -12)).toBe(-96);
  });

  it('returns positive value when both inputs are negative', () => {
    // -12 * -5 * 1.6 = 96
    expect(calculateAlcoholCalories(-5, -12)).toBe(96);
  });
});

// ---------------------------------------------------------------------------
// estimateDrinkCarbs
// ---------------------------------------------------------------------------

describe('estimateDrinkCarbs', () => {
  describe('beer', () => {
    it('returns volumeOz * 1.1', () => {
      expect(estimateDrinkCarbs('beer', 12)).toBeCloseTo(13.2, 10);
    });

    it('returns 0 for zero volume', () => {
      expect(estimateDrinkCarbs('beer', 0)).toBe(0);
    });
  });

  describe('wine', () => {
    it('returns volumeOz * 0.7', () => {
      expect(estimateDrinkCarbs('wine', 5)).toBeCloseTo(3.5, 10);
    });

    it('returns 0 for zero volume', () => {
      expect(estimateDrinkCarbs('wine', 0)).toBe(0);
    });
  });

  describe('cocktail', () => {
    it('returns volumeOz * 1.5', () => {
      expect(estimateDrinkCarbs('cocktail', 6)).toBe(9);
    });

    it('returns 0 for zero volume', () => {
      expect(estimateDrinkCarbs('cocktail', 0)).toBe(0);
    });
  });

  describe('spirit', () => {
    it('returns 0 regardless of volume', () => {
      expect(estimateDrinkCarbs('spirit', 1.5)).toBe(0);
    });

    it('returns 0 for large volume', () => {
      expect(estimateDrinkCarbs('spirit', 100)).toBe(0);
    });
  });

  describe('null drinkType', () => {
    it('returns 0 (falls into default case)', () => {
      expect(estimateDrinkCarbs(null, 12)).toBe(0);
    });

    it('returns 0 regardless of volume', () => {
      expect(estimateDrinkCarbs(null, 100)).toBe(0);
    });
  });

  describe('negative volume', () => {
    it('returns negative carbs for beer with negative volume', () => {
      expect(estimateDrinkCarbs('beer', -12)).toBeCloseTo(-13.2, 10);
    });

    it('returns 0 for spirit with negative volume', () => {
      expect(estimateDrinkCarbs('spirit', -5)).toBe(0);
    });

    it('returns 0 for null type with negative volume', () => {
      expect(estimateDrinkCarbs(null, -5)).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateDrinkNutrition
// ---------------------------------------------------------------------------

describe('calculateDrinkNutrition', () => {
  it('calculates full nutrition for beer', () => {
    const result = calculateDrinkNutrition(5, 12, 'beer');

    // alcoholCalories = 12 * 5 * 1.6 = 96
    expect(result.alcoholCalories).toBe(96);
    // carbEstimate = 12 * 1.1 = 13.2
    expect(result.carbEstimate).toBeCloseTo(13.2, 10);
    // carbCalories = 13.2 * 4 = 52.8
    expect(result.carbCalories).toBeCloseTo(52.8, 10);
    // totalCalories = 96 + 52.8 = 148.8
    expect(result.totalCalories).toBeCloseTo(148.8, 10);
  });

  it('calculates full nutrition for wine', () => {
    const result = calculateDrinkNutrition(13, 5, 'wine');

    // alcoholCalories = 5 * 13 * 1.6 = 104
    expect(result.alcoholCalories).toBe(104);
    // carbEstimate = 5 * 0.7 = 3.5
    expect(result.carbEstimate).toBeCloseTo(3.5, 10);
    // carbCalories = 3.5 * 4 = 14
    expect(result.carbCalories).toBe(14);
    // totalCalories = 104 + 14 = 118
    expect(result.totalCalories).toBe(118);
  });

  it('calculates full nutrition for spirit', () => {
    const result = calculateDrinkNutrition(40, 1.5, 'spirit');

    // alcoholCalories = 1.5 * 40 * 1.6 = 96
    expect(result.alcoholCalories).toBe(96);
    // carbEstimate = 0
    expect(result.carbEstimate).toBe(0);
    // carbCalories = 0
    expect(result.carbCalories).toBe(0);
    // totalCalories = 96 + 0 = 96
    expect(result.totalCalories).toBe(96);
  });

  it('calculates full nutrition for cocktail', () => {
    const result = calculateDrinkNutrition(15, 6, 'cocktail');

    // alcoholCalories = 6 * 15 * 1.6 = 144
    expect(result.alcoholCalories).toBe(144);
    // carbEstimate = 6 * 1.5 = 9
    expect(result.carbEstimate).toBe(9);
    // carbCalories = 9 * 4 = 36
    expect(result.carbCalories).toBe(36);
    // totalCalories = 144 + 36 = 180
    expect(result.totalCalories).toBe(180);
  });

  it('calculates nutrition with null drinkType (no carbs)', () => {
    const result = calculateDrinkNutrition(5, 12, null);

    expect(result.alcoholCalories).toBe(96);
    expect(result.carbEstimate).toBe(0);
    expect(result.carbCalories).toBe(0);
    expect(result.totalCalories).toBe(96);
  });

  it('totalCalories always equals alcoholCalories + carbCalories', () => {
    const types: (DrinkType | null)[] = ['beer', 'wine', 'spirit', 'cocktail', null];

    for (const type of types) {
      const result = calculateDrinkNutrition(10, 8, type);

      expect(result.totalCalories).toBeCloseTo(
        result.alcoholCalories + result.carbCalories,
        10,
      );
    }
  });

  it('carbCalories always equals carbEstimate * 4', () => {
    const types: (DrinkType | null)[] = ['beer', 'wine', 'spirit', 'cocktail', null];

    for (const type of types) {
      const result = calculateDrinkNutrition(10, 8, type);

      expect(result.carbCalories).toBeCloseTo(result.carbEstimate * 4, 10);
    }
  });

  it('returns all zeros for zero volume and zero ABV', () => {
    const result = calculateDrinkNutrition(0, 0, 'beer');

    expect(result.alcoholCalories).toBe(0);
    expect(result.carbEstimate).toBe(0);
    expect(result.carbCalories).toBe(0);
    expect(result.totalCalories).toBe(0);
  });

  it('returns the correct shape with all four properties', () => {
    const result = calculateDrinkNutrition(5, 12, 'beer');

    expect(result).toHaveProperty('alcoholCalories');
    expect(result).toHaveProperty('carbEstimate');
    expect(result).toHaveProperty('carbCalories');
    expect(result).toHaveProperty('totalCalories');
    expect(Object.keys(result)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// allocateToMacros
// ---------------------------------------------------------------------------

describe('allocateToMacros', () => {
  it('protein is always 0', () => {
    expect(allocateToMacros(200, 50).protein).toBe(0);
    expect(allocateToMacros(0, 0).protein).toBe(0);
    expect(allocateToMacros(500, 100).protein).toBe(0);
  });

  it('allocates 100% to carbs', () => {
    // 200 cals at 100% carbs: carbs = Math.round(200/4) = 50, fat = Math.round(0/9) = 0
    const result = allocateToMacros(200, 100);

    expect(result.carbs).toBe(50);
    expect(result.fat).toBe(0);
    expect(result.protein).toBe(0);
  });

  it('allocates 0% to carbs (all fat)', () => {
    // 200 cals at 0% carbs: carbs = Math.round(0/4) = 0, fat = Math.round(200/9) = 22
    const result = allocateToMacros(200, 0);

    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(Math.round(200 / 9)); // 22
    expect(result.protein).toBe(0);
  });

  it('splits 50/50 between carbs and fat', () => {
    // 200 cals at 50%: carbs = Math.round(100/4) = 25, fat = Math.round(100/9) = 11
    const result = allocateToMacros(200, 50);

    expect(result.carbs).toBe(25);
    expect(result.fat).toBe(11);
  });

  it('handles zero calories', () => {
    const result = allocateToMacros(0, 50);

    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
  });

  it('rounds carbs and fat correctly', () => {
    // 100 cals at 80%: carbCals=80, fatCals=20
    // carbs = Math.round(80/4) = 20, fat = Math.round(20/9) = Math.round(2.222) = 2
    const result = allocateToMacros(100, 80);

    expect(result.carbs).toBe(20);
    expect(result.fat).toBe(2);
  });

  it('rounds up when fraction is >= 0.5', () => {
    // 150 cals at 0% carbs: fat = Math.round(150/9) = Math.round(16.667) = 17
    const result = allocateToMacros(150, 0);

    expect(result.fat).toBe(17);
  });

  it('rounds down when fraction is < 0.5', () => {
    // 100 cals at 0% carbs: fat = Math.round(100/9) = Math.round(11.111) = 11
    const result = allocateToMacros(100, 0);

    expect(result.fat).toBe(11);
  });

  it('handles preset-based allocation for beer (carbAllocation=80)', () => {
    // Using beer preset values: totalCalories for a standard beer via calculateDrinkNutrition
    const nutrition = calculateDrinkNutrition(5, 12, 'beer');
    const macros = allocateToMacros(nutrition.totalCalories, DRINK_PRESETS.beer.carbAllocation);

    // totalCalories ~ 148.8, carbPercent = 80
    // carbCals = 148.8 * 0.8 = 119.04, fatCals = 148.8 - 119.04 = 29.76
    // carbs = Math.round(119.04/4) = Math.round(29.76) = 30
    // fat = Math.round(29.76/9) = Math.round(3.307) = 3
    expect(macros.carbs).toBe(30);
    expect(macros.fat).toBe(3);
    expect(macros.protein).toBe(0);
  });

  it('handles preset-based allocation for spirit (carbAllocation=0)', () => {
    const nutrition = calculateDrinkNutrition(40, 1.5, 'spirit');
    const macros = allocateToMacros(nutrition.totalCalories, DRINK_PRESETS.spirit.carbAllocation);

    // totalCalories = 96, carbPercent = 0
    // carbs = 0, fat = Math.round(96/9) = Math.round(10.667) = 11
    expect(macros.carbs).toBe(0);
    expect(macros.fat).toBe(11);
    expect(macros.protein).toBe(0);
  });

  it('returns correct shape with exactly three properties', () => {
    const result = allocateToMacros(200, 50);

    expect(result).toHaveProperty('protein');
    expect(result).toHaveProperty('carbs');
    expect(result).toHaveProperty('fat');
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('handles large calorie values', () => {
    // 1000 cals at 60%: carbCals=600, fatCals=400
    // carbs = Math.round(600/4) = 150, fat = Math.round(400/9) = Math.round(44.444) = 44
    const result = allocateToMacros(1000, 60);

    expect(result.carbs).toBe(150);
    expect(result.fat).toBe(44);
  });
});
