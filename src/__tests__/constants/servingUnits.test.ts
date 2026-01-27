/**
 * Serving Units Utility Tests
 * Tests for serving unit conversions and nutrition calculations
 */

import {
  ServingUnit,
  SERVING_UNITS,
  GRAMS_PER_OZ,
  ML_PER_CUP,
  ML_PER_TBSP,
  ML_PER_TSP,
  ML_PER_FL_OZ,
  getAvailableUnits,
  calculateNutritionForUnit,
  getDefaultAmountForUnit,
  getUnitLabel,
} from '@/constants/servingUnits';

describe('Serving Units Constants', () => {
  describe('SERVING_UNITS', () => {
    it('contains all expected unit types', () => {
      const unitIds = SERVING_UNITS.map(u => u.id);
      expect(unitIds).toContain('serving');
      expect(unitIds).toContain('g');
      expect(unitIds).toContain('oz');
      expect(unitIds).toContain('cup');
      expect(unitIds).toContain('tbsp');
      expect(unitIds).toContain('tsp');
      expect(unitIds).toContain('ml');
      expect(unitIds).toContain('fl_oz');
    });

    it('categorizes units correctly', () => {
      const servingUnits = SERVING_UNITS.filter(u => u.category === 'serving');
      const weightUnits = SERVING_UNITS.filter(u => u.category === 'weight');
      const volumeUnits = SERVING_UNITS.filter(u => u.category === 'volume');

      expect(servingUnits.map(u => u.id)).toEqual(['serving']);
      expect(weightUnits.map(u => u.id)).toEqual(['g', 'oz']);
      expect(volumeUnits.map(u => u.id)).toEqual(['cup', 'tbsp', 'tsp', 'ml', 'fl_oz']);
    });
  });

  describe('Conversion constants', () => {
    it('has accurate gram to oz conversion', () => {
      expect(GRAMS_PER_OZ).toBeCloseTo(28.3495, 2);
    });

    it('has accurate ml to cup conversion', () => {
      expect(ML_PER_CUP).toBeCloseTo(236.588, 1);
    });

    it('has accurate ml to tbsp conversion', () => {
      expect(ML_PER_TBSP).toBeCloseTo(14.787, 2);
    });

    it('has accurate ml to tsp conversion', () => {
      expect(ML_PER_TSP).toBeCloseTo(4.929, 2);
    });

    it('has accurate ml to fl oz conversion', () => {
      expect(ML_PER_FL_OZ).toBeCloseTo(29.5735, 2);
    });
  });
});

describe('getAvailableUnits', () => {
  it('returns only serving unit for foods without gram or ml data', () => {
    const units = getAvailableUnits({});
    expect(units).toEqual(['serving']);
  });

  it('returns serving, g, oz for foods with gram data', () => {
    const units = getAvailableUnits({ servingSizeGrams: 100 });
    expect(units).toEqual(['serving', 'g', 'oz']);
  });

  it('returns all units for foods with both gram and ml data', () => {
    const units = getAvailableUnits({ servingSizeGrams: 240, servingSizeMl: 240 });
    expect(units).toContain('serving');
    expect(units).toContain('g');
    expect(units).toContain('oz');
    expect(units).toContain('ml');
    expect(units).toContain('fl_oz');
    expect(units).toContain('cup');
    expect(units).toContain('tbsp');
    expect(units).toContain('tsp');
  });

  it('excludes weight units if servingSizeGrams is 0 or null', () => {
    expect(getAvailableUnits({ servingSizeGrams: 0 })).toEqual(['serving']);
    expect(getAvailableUnits({ servingSizeGrams: null })).toEqual(['serving']);
  });

  it('excludes volume units if servingSizeMl is 0 or null', () => {
    const units = getAvailableUnits({ servingSizeGrams: 100, servingSizeMl: 0 });
    expect(units).not.toContain('ml');
    expect(units).not.toContain('cup');
  });
});

describe('calculateNutritionForUnit', () => {
  const mockFood = {
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    servingSize: 1,
    servingSizeGrams: 100,
    servingSizeMl: null,
  };

  describe('serving unit calculations', () => {
    it('calculates nutrition for 1 serving correctly', () => {
      const result = calculateNutritionForUnit(mockFood, 1, 'serving');
      expect(result.calories).toBe(165);
      expect(result.protein).toBe(31);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(3.6);
      expect(result.grams).toBe(100);
    });

    it('calculates nutrition for 0.5 servings correctly', () => {
      const result = calculateNutritionForUnit(mockFood, 0.5, 'serving');
      expect(result.calories).toBe(83); // 165 * 0.5 rounded
      expect(result.protein).toBe(15.5);
      expect(result.grams).toBe(50);
    });

    it('calculates nutrition for 2 servings correctly', () => {
      const result = calculateNutritionForUnit(mockFood, 2, 'serving');
      expect(result.calories).toBe(330);
      expect(result.protein).toBe(62);
      expect(result.grams).toBe(200);
    });
  });

  describe('gram unit calculations', () => {
    it('calculates nutrition for 100g correctly (equals 1 serving)', () => {
      const result = calculateNutritionForUnit(mockFood, 100, 'g');
      expect(result.calories).toBe(165);
      expect(result.protein).toBe(31);
      expect(result.grams).toBe(100);
    });

    it('calculates nutrition for 50g correctly (half serving)', () => {
      const result = calculateNutritionForUnit(mockFood, 50, 'g');
      expect(result.calories).toBe(83);
      expect(result.protein).toBe(15.5);
      expect(result.grams).toBe(50);
    });

    it('calculates nutrition for 150g correctly (1.5 servings)', () => {
      const result = calculateNutritionForUnit(mockFood, 150, 'g');
      expect(result.calories).toBe(248); // 165 * 1.5 rounded
      expect(result.protein).toBe(46.5);
      expect(result.grams).toBe(150);
    });
  });

  describe('ounce unit calculations', () => {
    it('calculates nutrition for 1 oz correctly', () => {
      const result = calculateNutritionForUnit(mockFood, 1, 'oz');
      // 1 oz = 28.35g, servingSizeGrams = 100
      // multiplier = 28.35 / 100 = 0.2835
      expect(result.calories).toBe(47); // 165 * 0.2835 rounded
      expect(result.grams).toBe(28); // 28.35 rounded
    });

    it('calculates nutrition for 3.5 oz correctly (approx 100g)', () => {
      const result = calculateNutritionForUnit(mockFood, 3.5, 'oz');
      // 3.5 oz = ~99.2g
      expect(result.grams).toBe(99);
      expect(result.calories).toBeCloseTo(165, -1);
    });
  });

  describe('volume unit calculations', () => {
    const liquidFood = {
      calories: 60,
      protein: 3,
      carbs: 12,
      fat: 0,
      servingSize: 1,
      servingSizeGrams: 240,
      servingSizeMl: 240,
    };

    it('calculates nutrition for ml correctly', () => {
      const result = calculateNutritionForUnit(liquidFood, 240, 'ml');
      expect(result.calories).toBe(60);
      expect(result.protein).toBe(3);
    });

    it('calculates nutrition for cup correctly', () => {
      const result = calculateNutritionForUnit(liquidFood, 1, 'cup');
      // 1 cup = 236.588ml, servingSizeMl = 240
      // multiplier = 236.588 / 240 = 0.9858
      expect(result.calories).toBe(59); // 60 * 0.9858 rounded
    });

    it('calculates nutrition for tbsp correctly', () => {
      const result = calculateNutritionForUnit(liquidFood, 1, 'tbsp');
      // 1 tbsp = 14.787ml, servingSizeMl = 240
      // multiplier = 14.787 / 240 = 0.0616
      expect(result.calories).toBe(4); // 60 * 0.0616 rounded
    });

    it('calculates nutrition for fl oz correctly', () => {
      const result = calculateNutritionForUnit(liquidFood, 8, 'fl_oz');
      // 8 fl oz = 236.588ml, servingSizeMl = 240
      // multiplier = 236.588 / 240 = 0.9858
      expect(result.calories).toBe(59);
    });
  });

  describe('edge cases', () => {
    it('handles food with no servingSizeGrams by defaulting to 100', () => {
      const foodNoGrams = { ...mockFood, servingSizeGrams: undefined };
      const result = calculateNutritionForUnit(foodNoGrams, 1, 'serving');
      expect(result.grams).toBe(100);
    });

    it('handles amount of 0', () => {
      const result = calculateNutritionForUnit(mockFood, 0, 'serving');
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
    });

    it('handles very small amounts', () => {
      const result = calculateNutritionForUnit(mockFood, 0.1, 'serving');
      expect(result.calories).toBe(17); // 165 * 0.1 rounded
    });

    it('handles volume units without servingSizeMl data', () => {
      const result = calculateNutritionForUnit(mockFood, 1, 'cup');
      // Without servingSizeMl, multiplier stays at amount (1)
      expect(result.calories).toBe(165);
    });
  });
});

describe('getDefaultAmountForUnit', () => {
  const food = { servingSizeGrams: 85 };

  it('returns "1" for serving unit', () => {
    expect(getDefaultAmountForUnit('serving', food)).toBe('1');
  });

  it('returns gram weight for g unit', () => {
    expect(getDefaultAmountForUnit('g', food)).toBe('85');
  });

  it('returns converted oz for oz unit', () => {
    const result = getDefaultAmountForUnit('oz', food);
    // 85g / 28.35 = ~3.0
    expect(parseFloat(result)).toBeCloseTo(3.0, 0);
  });

  it('returns "1" for cup unit', () => {
    expect(getDefaultAmountForUnit('cup', food)).toBe('1');
  });

  it('returns "1" for tbsp unit', () => {
    expect(getDefaultAmountForUnit('tbsp', food)).toBe('1');
  });

  it('returns "1" for tsp unit', () => {
    expect(getDefaultAmountForUnit('tsp', food)).toBe('1');
  });

  it('returns "100" for ml unit', () => {
    expect(getDefaultAmountForUnit('ml', food)).toBe('100');
  });

  it('returns "1" for fl_oz unit', () => {
    expect(getDefaultAmountForUnit('fl_oz', food)).toBe('1');
  });

  it('defaults to 100g when servingSizeGrams is not provided', () => {
    expect(getDefaultAmountForUnit('g', {})).toBe('100');
  });
});

describe('getUnitLabel', () => {
  it('returns correct label for serving', () => {
    expect(getUnitLabel('serving')).toBe('serving');
  });

  it('returns correct label for grams', () => {
    expect(getUnitLabel('g')).toBe('g');
  });

  it('returns correct label for ounces', () => {
    expect(getUnitLabel('oz')).toBe('oz');
  });

  it('returns correct label for cup', () => {
    expect(getUnitLabel('cup')).toBe('cup');
  });

  it('returns correct label for tablespoon', () => {
    expect(getUnitLabel('tbsp')).toBe('tbsp');
  });

  it('returns correct label for teaspoon', () => {
    expect(getUnitLabel('tsp')).toBe('tsp');
  });

  it('returns correct label for milliliters', () => {
    expect(getUnitLabel('ml')).toBe('ml');
  });

  it('returns correct label for fluid ounces', () => {
    expect(getUnitLabel('fl_oz')).toBe('fl oz');
  });

  it('returns the unit itself for unknown units', () => {
    expect(getUnitLabel('unknown' as ServingUnit)).toBe('unknown');
  });
});
