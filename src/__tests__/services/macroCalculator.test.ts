/**
 * Macro Calculator Service Tests
 * Tests all 16 combinations of eating style × protein priority
 */

import { macroCalculator } from '@/services/macroCalculator';
import { EatingStyle, ProteinPriority } from '@/types/domain';

describe('macroCalculator', () => {
  // Test data: 70kg person with 2000 kcal target
  const baseInput = {
    weightKg: 70,
    targetCalories: 2000,
  };

  // Weight in lbs for protein calculations
  const weightLbs = 70 * 2.20462; // ~154 lbs

  describe('calculateMacros', () => {
    describe('protein calculation by priority', () => {
      it('calculates standard protein correctly (0.6g/lb)', () => {
        const macros = macroCalculator.calculateMacros({
          ...baseInput,
          eatingStyle: 'flexible',
          proteinPriority: 'standard',
        });
        // 70kg × 1.32g/kg = 92.4 ≈ 92g
        expect(macros.protein).toBe(92);
      });

      it('calculates active protein correctly (0.75g/lb)', () => {
        const macros = macroCalculator.calculateMacros({
          ...baseInput,
          eatingStyle: 'flexible',
          proteinPriority: 'active',
        });
        // 70kg × 1.65g/kg = 115.5 ≈ 116g
        expect(macros.protein).toBe(116);
      });

      it('calculates athletic protein correctly (0.9g/lb)', () => {
        const macros = macroCalculator.calculateMacros({
          ...baseInput,
          eatingStyle: 'flexible',
          proteinPriority: 'athletic',
        });
        // 70kg × 1.98g/kg = 138.6 ≈ 139g
        expect(macros.protein).toBe(139);
      });

      it('calculates maximum protein correctly (1.0g/lb)', () => {
        const macros = macroCalculator.calculateMacros({
          ...baseInput,
          eatingStyle: 'flexible',
          proteinPriority: 'maximum',
        });
        // 70kg × 2.2g/kg = 154g
        expect(macros.protein).toBe(154);
      });
    });

    describe('carb/fat split by eating style (with active protein)', () => {
      const activeInput = {
        ...baseInput,
        proteinPriority: 'active' as ProteinPriority,
      };

      it('flexible: splits remaining 50/50', () => {
        const macros = macroCalculator.calculateMacros({
          ...activeInput,
          eatingStyle: 'flexible',
        });
        // Protein: 116g × 4 = 464 kcal
        // Remaining: 2000 - 464 = 1536 kcal
        // Carbs: 50% of 1536 = 768 kcal / 4 = 192g
        // Fat: 50% of 1536 = 768 kcal / 9 = 85g
        expect(macros.protein).toBe(116);
        expect(macros.carbs).toBe(192);
        expect(macros.fat).toBe(85);
      });

      it('carb_focused: splits remaining 65/35', () => {
        const macros = macroCalculator.calculateMacros({
          ...activeInput,
          eatingStyle: 'carb_focused',
        });
        // Remaining: 1536 kcal
        // Carbs: 65% of 1536 = 998.4 kcal / 4 = 249.6 ≈ 250g
        // Fat: 35% of 1536 = 537.6 kcal / 9 = 59.7 ≈ 60g
        expect(macros.protein).toBe(116);
        expect(macros.carbs).toBe(250);
        expect(macros.fat).toBe(60);
      });

      it('fat_focused: splits remaining 35/65 with 150g carb cap', () => {
        const macros = macroCalculator.calculateMacros({
          ...activeInput,
          eatingStyle: 'fat_focused',
        });
        // Remaining: 1536 kcal
        // Initial Carbs: 35% of 1536 = 537.6 kcal / 4 = 134.4 ≈ 134g (under 150g cap)
        // Fat: 65% of 1536 = 998.4 kcal / 9 = 110.9 ≈ 111g
        expect(macros.protein).toBe(116);
        expect(macros.carbs).toBeLessThanOrEqual(150);
        expect(macros.fat).toBeGreaterThan(60);
      });

      it('very_low_carb: splits remaining 10/90 with 50g carb cap', () => {
        const macros = macroCalculator.calculateMacros({
          ...activeInput,
          eatingStyle: 'very_low_carb',
        });
        // Remaining: 1536 kcal
        // Initial Carbs: 10% of 1536 = 153.6 kcal / 4 = 38.4 ≈ 38g (under 50g cap, so no reallocation)
        // Fat: 90% of 1536 = 1382.4 kcal / 9 = 153.6 ≈ 154g
        expect(macros.protein).toBe(116);
        expect(macros.carbs).toBeLessThanOrEqual(50);
        expect(macros.fat).toBeGreaterThan(100);
      });
    });

    describe('carb cap enforcement', () => {
      it('applies 150g carb cap for fat_focused with high remaining calories', () => {
        const highCalorieInput = {
          weightKg: 60, // Lower weight = lower protein = more remaining
          targetCalories: 3000,
          eatingStyle: 'fat_focused' as EatingStyle,
          proteinPriority: 'standard' as ProteinPriority,
        };
        const macros = macroCalculator.calculateMacros(highCalorieInput);
        expect(macros.carbs).toBe(150);
      });

      it('applies 50g carb cap for very_low_carb with high remaining calories', () => {
        const highCalorieInput = {
          weightKg: 60,
          targetCalories: 3000,
          eatingStyle: 'very_low_carb' as EatingStyle,
          proteinPriority: 'standard' as ProteinPriority,
        };
        const macros = macroCalculator.calculateMacros(highCalorieInput);
        expect(macros.carbs).toBe(50);
      });

      it('reallocates excess carb calories to fat when cap is hit', () => {
        const highCalorieInput = {
          weightKg: 60,
          targetCalories: 3000,
          eatingStyle: 'fat_focused' as EatingStyle,
          proteinPriority: 'standard' as ProteinPriority,
        };
        const macros = macroCalculator.calculateMacros(highCalorieInput);

        // Protein: 60 × 1.32 = 79g × 4 = 316 kcal
        // Remaining: 3000 - 316 = 2684 kcal
        // Carbs capped at 150g = 600 kcal
        // Fat gets remaining: 2684 - 600 = 2084 kcal / 9 = 232g
        expect(macros.carbs).toBe(150);
        expect(macros.fat).toBeGreaterThan(200);
      });
    });

    describe('all 16 combinations', () => {
      const eatingStyles: EatingStyle[] = ['flexible', 'carb_focused', 'fat_focused', 'very_low_carb'];
      const proteinPriorities: ProteinPriority[] = ['standard', 'active', 'athletic', 'maximum'];

      eatingStyles.forEach((eatingStyle) => {
        proteinPriorities.forEach((proteinPriority) => {
          it(`${eatingStyle} + ${proteinPriority}: calculates valid macros`, () => {
            const macros = macroCalculator.calculateMacros({
              ...baseInput,
              eatingStyle,
              proteinPriority,
            });

            // All values should be non-negative
            expect(macros.protein).toBeGreaterThanOrEqual(0);
            expect(macros.carbs).toBeGreaterThanOrEqual(0);
            expect(macros.fat).toBeGreaterThanOrEqual(0);

            // Calories should match target
            expect(macros.calories).toBe(baseInput.targetCalories);

            // Carb cap should be respected
            if (eatingStyle === 'fat_focused') {
              expect(macros.carbs).toBeLessThanOrEqual(150);
            }
            if (eatingStyle === 'very_low_carb') {
              expect(macros.carbs).toBeLessThanOrEqual(50);
            }

            // Protein should scale with priority
            const proteinPerKg = {
              standard: 1.32,
              active: 1.65,
              athletic: 1.98,
              maximum: 2.2,
            };
            const expectedProtein = Math.round(baseInput.weightKg * proteinPerKg[proteinPriority]);
            expect(macros.protein).toBe(expectedProtein);
          });
        });
      });
    });

    describe('edge cases', () => {
      it('handles very low calorie target', () => {
        const macros = macroCalculator.calculateMacros({
          weightKg: 70,
          targetCalories: 1200,
          eatingStyle: 'flexible',
          proteinPriority: 'active',
        });

        expect(macros.protein).toBeGreaterThan(0);
        expect(macros.carbs).toBeGreaterThanOrEqual(0);
        expect(macros.fat).toBeGreaterThanOrEqual(0);
      });

      it('handles high protein consuming most calories', () => {
        // Maximum protein on low calories
        const macros = macroCalculator.calculateMacros({
          weightKg: 100,
          targetCalories: 1500,
          eatingStyle: 'flexible',
          proteinPriority: 'maximum',
        });

        // Protein: 100 × 2.2 = 220g × 4 = 880 kcal
        // Remaining: 1500 - 880 = 620 kcal
        expect(macros.protein).toBe(220);
        expect(macros.carbs).toBeGreaterThanOrEqual(0);
        expect(macros.fat).toBeGreaterThanOrEqual(0);
      });

      it('handles very high calorie target', () => {
        const macros = macroCalculator.calculateMacros({
          weightKg: 70,
          targetCalories: 4000,
          eatingStyle: 'flexible',
          proteinPriority: 'active',
        });

        expect(macros.calories).toBe(4000);
        expect(macros.protein).toBe(116);
        expect(macros.carbs).toBeGreaterThan(0);
        expect(macros.fat).toBeGreaterThan(0);
      });

      it('handles zero weight gracefully', () => {
        const macros = macroCalculator.calculateMacros({
          weightKg: 0,
          targetCalories: 2000,
          eatingStyle: 'flexible',
          proteinPriority: 'active',
        });

        expect(macros.protein).toBe(0);
        expect(macros.carbs).toBeGreaterThanOrEqual(0);
        expect(macros.fat).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('calculateMacrosWithBreakdown', () => {
    it('returns detailed breakdown with percentages', () => {
      const breakdown = macroCalculator.calculateMacrosWithBreakdown({
        ...baseInput,
        eatingStyle: 'flexible',
        proteinPriority: 'active',
      });

      expect(breakdown.proteinCalories).toBeGreaterThan(0);
      expect(breakdown.carbsCalories).toBeGreaterThan(0);
      expect(breakdown.fatCalories).toBeGreaterThan(0);

      expect(breakdown.proteinPercent).toBeGreaterThan(0);
      expect(breakdown.carbsPercent).toBeGreaterThan(0);
      expect(breakdown.fatPercent).toBeGreaterThan(0);

      // Percentages should roughly sum to 100
      const totalPercent = breakdown.proteinPercent + breakdown.carbsPercent + breakdown.fatPercent;
      expect(totalPercent).toBeGreaterThanOrEqual(98);
      expect(totalPercent).toBeLessThanOrEqual(102);
    });

    it('indicates when carb cap is applied', () => {
      const uncapped = macroCalculator.calculateMacrosWithBreakdown({
        ...baseInput,
        eatingStyle: 'flexible',
        proteinPriority: 'active',
      });
      expect(uncapped.carbCapApplied).toBe(false);

      const capped = macroCalculator.calculateMacrosWithBreakdown({
        weightKg: 60,
        targetCalories: 3000,
        eatingStyle: 'fat_focused',
        proteinPriority: 'standard',
      });
      expect(capped.carbCapApplied).toBe(true);
    });
  });

  describe('getProteinForWeight', () => {
    it('returns correct protein for each priority', () => {
      const weight = 70;

      expect(macroCalculator.getProteinForWeight(weight, 'standard')).toBe(92);
      expect(macroCalculator.getProteinForWeight(weight, 'active')).toBe(116);
      expect(macroCalculator.getProteinForWeight(weight, 'athletic')).toBe(139);
      expect(macroCalculator.getProteinForWeight(weight, 'maximum')).toBe(154);
    });
  });

  describe('getCarbCap', () => {
    it('returns undefined for flexible and carb_focused', () => {
      expect(macroCalculator.getCarbCap('flexible')).toBeUndefined();
      expect(macroCalculator.getCarbCap('carb_focused')).toBeUndefined();
    });

    it('returns 150 for fat_focused', () => {
      expect(macroCalculator.getCarbCap('fat_focused')).toBe(150);
    });

    it('returns 50 for very_low_carb', () => {
      expect(macroCalculator.getCarbCap('very_low_carb')).toBe(50);
    });
  });

  describe('label and description helpers', () => {
    describe('getEatingStyleLabel', () => {
      it('returns correct labels', () => {
        expect(macroCalculator.getEatingStyleLabel('flexible')).toBe('Flexible');
        expect(macroCalculator.getEatingStyleLabel('carb_focused')).toBe('Carb Focused');
        expect(macroCalculator.getEatingStyleLabel('fat_focused')).toBe('Fat Focused');
        expect(macroCalculator.getEatingStyleLabel('very_low_carb')).toBe('Very Low Carb');
      });
    });

    describe('getEatingStyleDescription', () => {
      it('returns descriptions containing key info', () => {
        expect(macroCalculator.getEatingStyleDescription('flexible')).toContain('50');
        expect(macroCalculator.getEatingStyleDescription('carb_focused')).toContain('65');
        expect(macroCalculator.getEatingStyleDescription('fat_focused')).toContain('150g');
        expect(macroCalculator.getEatingStyleDescription('very_low_carb')).toContain('50g');
      });
    });

    describe('getProteinPriorityLabel', () => {
      it('returns correct labels', () => {
        expect(macroCalculator.getProteinPriorityLabel('standard')).toBe('Standard');
        expect(macroCalculator.getProteinPriorityLabel('active')).toBe('Active');
        expect(macroCalculator.getProteinPriorityLabel('athletic')).toBe('Athletic');
        expect(macroCalculator.getProteinPriorityLabel('maximum')).toBe('Maximum');
      });
    });

    describe('getProteinPriorityDescription', () => {
      it('returns descriptions with g/lb values', () => {
        expect(macroCalculator.getProteinPriorityDescription('standard')).toContain('0.6');
        expect(macroCalculator.getProteinPriorityDescription('active')).toContain('0.75');
        expect(macroCalculator.getProteinPriorityDescription('athletic')).toContain('0.9');
        expect(macroCalculator.getProteinPriorityDescription('maximum')).toContain('1g/lb');
      });
    });

    describe('getProteinExample', () => {
      it('returns example at 150 lbs', () => {
        // Standard: 0.6 × 150 = 90g
        expect(macroCalculator.getProteinExample('standard')).toContain('90g');
        // Active: 0.75 × 150 = 112.5 ≈ 113g
        expect(macroCalculator.getProteinExample('active')).toContain('113g');
        // Athletic: 0.9 × 150 = 135g
        expect(macroCalculator.getProteinExample('athletic')).toContain('135g');
        // Maximum: 1.0 × 150 = 150g
        expect(macroCalculator.getProteinExample('maximum')).toContain('150g');
      });
    });
  });

  describe('getAllEatingStyles', () => {
    it('returns all 4 eating styles with metadata', () => {
      const styles = macroCalculator.getAllEatingStyles();

      expect(styles).toHaveLength(4);
      styles.forEach((style) => {
        expect(style.value).toBeDefined();
        expect(style.label).toBeDefined();
        expect(style.description).toBeDefined();
      });
    });
  });

  describe('getAllProteinPriorities', () => {
    it('returns all 4 protein priorities with metadata', () => {
      const priorities = macroCalculator.getAllProteinPriorities();

      expect(priorities).toHaveLength(4);
      priorities.forEach((priority) => {
        expect(priority.value).toBeDefined();
        expect(priority.label).toBeDefined();
        expect(priority.description).toBeDefined();
        expect(priority.example).toBeDefined();
      });
    });
  });

  describe('validateMacros', () => {
    it('validates healthy macros without warnings', () => {
      const macros = {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70,
      };
      const result = macroCalculator.validateMacros(macros);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns about very low protein', () => {
      const macros = {
        calories: 2000,
        protein: 30,
        carbs: 300,
        fat: 80,
      };
      const result = macroCalculator.validateMacros(macros);

      expect(result.valid).toBe(false);
      expect(result.warnings.some((w) => w.includes('protein') || w.includes('Protein'))).toBe(true);
    });

    it('warns about very low fat', () => {
      const macros = {
        calories: 2000,
        protein: 150,
        carbs: 350,
        fat: 20,
      };
      const result = macroCalculator.validateMacros(macros);

      expect(result.valid).toBe(false);
      expect(result.warnings.some((w) => w.includes('fat') || w.includes('Fat'))).toBe(true);
    });

    it('warns when macro calories differ significantly from target', () => {
      const macros = {
        calories: 2000,
        protein: 150, // 600 kcal
        carbs: 200, // 800 kcal
        fat: 50, // 450 kcal = 1850 total (150 diff)
      };
      const result = macroCalculator.validateMacros(macros);

      expect(result.warnings.some((w) => w.includes('differ') || w.includes('Macro'))).toBe(true);
    });
  });
});
