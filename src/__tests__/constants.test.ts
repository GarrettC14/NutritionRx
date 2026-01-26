import { colors, chartColors } from '@/constants/colors';
import { typography, fontFamily } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius, shadows } from '@/constants/spacing';
import {
  MealType,
  MEAL_TYPE_ORDER,
  MEAL_TYPE_LABELS,
  getSuggestedMealType,
} from '@/constants/mealTypes';
import {
  DEFAULT_SETTINGS,
  ACTIVITY_MULTIPLIERS,
  CALORIES_PER_KG,
  CALORIES_PER_LB,
  CALORIES_PER_GRAM,
  CALORIE_FLOORS,
} from '@/constants/defaults';

describe('Design Tokens', () => {
  describe('Colors', () => {
    it('should have dark and light color schemes', () => {
      expect(colors).toHaveProperty('dark');
      expect(colors).toHaveProperty('light');
    });

    it('should have all required color tokens in dark mode', () => {
      expect(colors.dark).toHaveProperty('bgPrimary');
      expect(colors.dark).toHaveProperty('bgSecondary');
      expect(colors.dark).toHaveProperty('textPrimary');
      expect(colors.dark).toHaveProperty('accent');
      expect(colors.dark).toHaveProperty('protein');
      expect(colors.dark).toHaveProperty('carbs');
      expect(colors.dark).toHaveProperty('fat');
      expect(colors.dark).toHaveProperty('ringTrack');
      expect(colors.dark).toHaveProperty('ringFill');
    });

    it('should have all required color tokens in light mode', () => {
      expect(colors.light).toHaveProperty('bgPrimary');
      expect(colors.light).toHaveProperty('textPrimary');
      expect(colors.light).toHaveProperty('accent');
    });

    it('should have chart colors for both modes', () => {
      expect(chartColors).toHaveProperty('dark');
      expect(chartColors).toHaveProperty('light');
      expect(chartColors.dark).toHaveProperty('protein');
      expect(chartColors.dark).toHaveProperty('carbs');
      expect(chartColors.dark).toHaveProperty('fat');
    });
  });

  describe('Typography', () => {
    it('should have font families defined', () => {
      expect(fontFamily).toHaveProperty('primary');
      expect(fontFamily).toHaveProperty('mono');
    });

    it('should have all typography variants', () => {
      expect(typography).toHaveProperty('display');
      expect(typography).toHaveProperty('title');
      expect(typography).toHaveProperty('body');
      expect(typography).toHaveProperty('caption');
      expect(typography).toHaveProperty('overline');
      expect(typography).toHaveProperty('metric');
    });

    it('should have correct structure for display typography', () => {
      expect(typography.display.large).toHaveProperty('fontSize');
      expect(typography.display.large).toHaveProperty('lineHeight');
      expect(typography.display.large).toHaveProperty('fontWeight');
      expect(typography.display.large.fontSize).toBe(34);
    });

    it('should have metric typography for numbers', () => {
      expect(typography.metric.large.fontSize).toBe(48);
      expect(typography.metric.large).toHaveProperty('fontFamily');
    });
  });

  describe('Spacing', () => {
    it('should have base spacing values', () => {
      expect(spacing[0]).toBe(0);
      expect(spacing[1]).toBe(4);
      expect(spacing[2]).toBe(8);
      expect(spacing[4]).toBe(16);
    });

    it('should have component-specific spacing', () => {
      expect(componentSpacing.cardPadding).toBe(16);
      expect(componentSpacing.screenEdgePadding).toBe(16);
      expect(componentSpacing.listItemHeight).toBe(56);
    });

    it('should have border radius values', () => {
      expect(borderRadius.none).toBe(0);
      expect(borderRadius.sm).toBe(4);
      expect(borderRadius.md).toBe(8);
      expect(borderRadius.lg).toBe(12);
      expect(borderRadius.full).toBe(9999);
    });

    it('should have shadows for both modes', () => {
      expect(shadows).toHaveProperty('dark');
      expect(shadows).toHaveProperty('light');
      expect(shadows.dark.md).toHaveProperty('shadowColor');
      expect(shadows.dark.md).toHaveProperty('elevation');
    });
  });
});

describe('Meal Types', () => {
  it('should have all meal types defined', () => {
    expect(MealType.Breakfast).toBe('breakfast');
    expect(MealType.Lunch).toBe('lunch');
    expect(MealType.Dinner).toBe('dinner');
    expect(MealType.Snack).toBe('snack');
  });

  it('should have correct meal type order', () => {
    expect(MEAL_TYPE_ORDER).toHaveLength(4);
    expect(MEAL_TYPE_ORDER[0]).toBe(MealType.Breakfast);
    expect(MEAL_TYPE_ORDER[3]).toBe(MealType.Snack);
  });

  it('should have labels for all meal types', () => {
    expect(MEAL_TYPE_LABELS[MealType.Breakfast]).toBe('Breakfast');
    expect(MEAL_TYPE_LABELS[MealType.Lunch]).toBe('Lunch');
    expect(MEAL_TYPE_LABELS[MealType.Dinner]).toBe('Dinner');
    expect(MEAL_TYPE_LABELS[MealType.Snack]).toBe('Snack');
  });

  it('should suggest appropriate meal type based on time', () => {
    const mealType = getSuggestedMealType();
    expect(Object.values(MealType)).toContain(mealType);
  });
});

describe('Default Settings', () => {
  it('should have valid default calorie and macro goals', () => {
    expect(DEFAULT_SETTINGS.dailyCalorieGoal).toBe(2000);
    expect(DEFAULT_SETTINGS.dailyProteinGoal).toBe(150);
    expect(DEFAULT_SETTINGS.dailyCarbsGoal).toBe(200);
    expect(DEFAULT_SETTINGS.dailyFatGoal).toBe(65);
  });

  it('should have default weight unit', () => {
    expect(DEFAULT_SETTINGS.weightUnit).toBe('lbs');
  });

  it('should have activity multipliers', () => {
    expect(ACTIVITY_MULTIPLIERS.sedentary).toBe(1.2);
    expect(ACTIVITY_MULTIPLIERS.moderately_active).toBe(1.55);
  });

  it('should have calorie conversion constants', () => {
    expect(CALORIES_PER_KG).toBe(7700);
    expect(CALORIES_PER_LB).toBe(3500);
  });

  it('should have macro calorie values', () => {
    expect(CALORIES_PER_GRAM.protein).toBe(4);
    expect(CALORIES_PER_GRAM.carbs).toBe(4);
    expect(CALORIES_PER_GRAM.fat).toBe(9);
  });

  it('should have calorie floor safety limits', () => {
    expect(CALORIE_FLOORS.male).toBe(1500);
    expect(CALORIE_FLOORS.female).toBe(1200);
  });
});
