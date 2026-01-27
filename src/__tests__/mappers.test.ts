import {
  mapFoodItemRowToDomain,
  mapLogEntryRowToDomain,
  mapQuickAddRowToDomain,
  mapWeightEntryRowToDomain,
  mapUserProfileRowToDomain,
  mapGoalRowToDomain,
} from '@/types/mappers';
import {
  FoodItemRow,
  LogEntryWithFoodRow,
  QuickAddEntryRow,
  WeightEntryRow,
  UserProfileRow,
  GoalRow,
} from '@/types/database';

describe('Type Mappers', () => {
  describe('mapFoodItemRowToDomain', () => {
    const mockFoodRow: FoodItemRow = {
      id: 'food-1',
      name: 'Chicken Breast',
      brand: 'Generic',
      barcode: '123456789',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      sugar: null,
      sodium: 74,
      serving_size: 100,
      serving_unit: 'g',
      serving_size_grams: 100,
      source: 'usda',
      source_id: 'usda-123',
      is_verified: 1,
      is_user_created: 0,
      last_used_at: '2026-01-25T12:00:00.000Z',
      usage_count: 5,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-25T00:00:00.000Z',
    };

    it('should map all fields correctly', () => {
      const result = mapFoodItemRowToDomain(mockFoodRow);

      expect(result.id).toBe('food-1');
      expect(result.name).toBe('Chicken Breast');
      expect(result.brand).toBe('Generic');
      expect(result.barcode).toBe('123456789');
      expect(result.calories).toBe(165);
      expect(result.protein).toBe(31);
      expect(result.servingSize).toBe(100);
      expect(result.servingUnit).toBe('g');
      expect(result.source).toBe('usda');
    });

    it('should convert boolean fields correctly', () => {
      const result = mapFoodItemRowToDomain(mockFoodRow);

      expect(result.isVerified).toBe(true);
      expect(result.isUserCreated).toBe(false);
    });

    it('should convert date fields to Date objects', () => {
      const result = mapFoodItemRowToDomain(mockFoodRow);

      expect(result.lastUsedAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle null values correctly', () => {
      const rowWithNulls: FoodItemRow = {
        ...mockFoodRow,
        brand: null,
        barcode: null,
        sugar: null,
        last_used_at: null,
      };

      const result = mapFoodItemRowToDomain(rowWithNulls);

      expect(result.brand).toBeUndefined();
      expect(result.barcode).toBeUndefined();
      expect(result.sugar).toBeUndefined();
      expect(result.lastUsedAt).toBeUndefined();
    });
  });

  describe('mapLogEntryRowToDomain', () => {
    const mockLogRow: LogEntryWithFoodRow = {
      id: 'log-1',
      food_item_id: 'food-1',
      date: '2026-01-25',
      meal_type: 'breakfast',
      servings: 1.5,
      calories: 247,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      notes: 'Post workout',
      created_at: '2026-01-25T08:00:00.000Z',
      updated_at: '2026-01-25T08:00:00.000Z',
      food_name: 'Chicken Breast',
      food_brand: 'Generic',
    };

    it('should map all fields correctly', () => {
      const result = mapLogEntryRowToDomain(mockLogRow);

      expect(result.id).toBe('log-1');
      expect(result.foodItemId).toBe('food-1');
      expect(result.foodName).toBe('Chicken Breast');
      expect(result.date).toBe('2026-01-25');
      expect(result.mealType).toBe('breakfast');
      expect(result.servings).toBe(1.5);
      expect(result.calories).toBe(247);
    });

    it('should handle null notes', () => {
      const rowWithoutNotes: LogEntryWithFoodRow = {
        ...mockLogRow,
        notes: null,
      };

      const result = mapLogEntryRowToDomain(rowWithoutNotes);

      expect(result.notes).toBeUndefined();
    });
  });

  describe('mapQuickAddRowToDomain', () => {
    const mockQuickAddRow: QuickAddEntryRow = {
      id: 'quick-1',
      date: '2026-01-25',
      meal_type: 'lunch',
      calories: 500,
      protein: 25,
      carbs: 50,
      fat: 20,
      description: 'Restaurant meal',
      created_at: '2026-01-25T12:00:00.000Z',
      updated_at: '2026-01-25T12:00:00.000Z',
    };

    it('should map all fields correctly', () => {
      const result = mapQuickAddRowToDomain(mockQuickAddRow);

      expect(result.id).toBe('quick-1');
      expect(result.date).toBe('2026-01-25');
      expect(result.mealType).toBe('lunch');
      expect(result.calories).toBe(500);
      expect(result.protein).toBe(25);
      expect(result.description).toBe('Restaurant meal');
    });

    it('should handle null optional fields', () => {
      const rowWithNulls: QuickAddEntryRow = {
        ...mockQuickAddRow,
        protein: null,
        carbs: null,
        fat: null,
        description: null,
      };

      const result = mapQuickAddRowToDomain(rowWithNulls);

      expect(result.protein).toBeUndefined();
      expect(result.carbs).toBeUndefined();
      expect(result.fat).toBeUndefined();
      expect(result.description).toBeUndefined();
    });
  });

  describe('mapWeightEntryRowToDomain', () => {
    const mockWeightRow: WeightEntryRow = {
      id: 'weight-1',
      date: '2026-01-25',
      weight_kg: 80.5,
      notes: 'Morning weight',
      created_at: '2026-01-25T07:00:00.000Z',
      updated_at: '2026-01-25T07:00:00.000Z',
    };

    it('should map all fields correctly', () => {
      const result = mapWeightEntryRowToDomain(mockWeightRow);

      expect(result.id).toBe('weight-1');
      expect(result.date).toBe('2026-01-25');
      expect(result.weightKg).toBe(80.5);
      expect(result.notes).toBe('Morning weight');
    });
  });

  describe('mapUserProfileRowToDomain', () => {
    const mockProfileRow: UserProfileRow = {
      id: 'singleton',
      sex: 'male',
      date_of_birth: '1990-05-15',
      height_cm: 180,
      activity_level: 'moderately_active',
      eating_style: 'flexible',
      protein_priority: 'active',
      has_completed_onboarding: 1,
      onboarding_skipped: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-25T00:00:00.000Z',
    };

    it('should map all fields correctly', () => {
      const result = mapUserProfileRowToDomain(mockProfileRow);

      expect(result.id).toBe('singleton');
      expect(result.sex).toBe('male');
      expect(result.heightCm).toBe(180);
      expect(result.activityLevel).toBe('moderately_active');
      expect(result.hasCompletedOnboarding).toBe(true);
      expect(result.onboardingSkipped).toBe(false);
    });

    it('should convert date of birth to Date object', () => {
      const result = mapUserProfileRowToDomain(mockProfileRow);

      expect(result.dateOfBirth).toBeInstanceOf(Date);
    });

    it('should handle null profile data', () => {
      const emptyProfile: UserProfileRow = {
        ...mockProfileRow,
        sex: null,
        date_of_birth: null,
        height_cm: null,
        activity_level: null,
      };

      const result = mapUserProfileRowToDomain(emptyProfile);

      expect(result.sex).toBeUndefined();
      expect(result.dateOfBirth).toBeUndefined();
      expect(result.heightCm).toBeUndefined();
      expect(result.activityLevel).toBeUndefined();
    });
  });

  describe('mapGoalRowToDomain', () => {
    const mockGoalRow: GoalRow = {
      id: 'goal-1',
      type: 'lose',
      target_weight_kg: 75,
      target_rate_percent: 0.5,
      start_date: '2026-01-01',
      start_weight_kg: 85,
      initial_tdee_estimate: 2500,
      initial_target_calories: 2000,
      initial_protein_g: 170,
      initial_carbs_g: 175,
      initial_fat_g: 67,
      current_tdee_estimate: 2450,
      current_target_calories: 1950,
      current_protein_g: 165,
      current_carbs_g: 170,
      current_fat_g: 65,
      eating_style: 'flexible',
      protein_priority: 'active',
      is_active: 1,
      completed_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-25T00:00:00.000Z',
    };

    it('should map all fields correctly', () => {
      const result = mapGoalRowToDomain(mockGoalRow);

      expect(result.id).toBe('goal-1');
      expect(result.type).toBe('lose');
      expect(result.targetWeightKg).toBe(75);
      expect(result.targetRatePercent).toBe(0.5);
      expect(result.startWeightKg).toBe(85);
      expect(result.currentTargetCalories).toBe(1950);
      expect(result.isActive).toBe(true);
    });

    it('should handle null target weight for maintain goals', () => {
      const maintainGoal: GoalRow = {
        ...mockGoalRow,
        type: 'maintain',
        target_weight_kg: null,
      };

      const result = mapGoalRowToDomain(maintainGoal);

      expect(result.targetWeightKg).toBeUndefined();
    });

    it('should handle completed_at date', () => {
      const completedGoal: GoalRow = {
        ...mockGoalRow,
        is_active: 0,
        completed_at: '2026-03-01T00:00:00.000Z',
      };

      const result = mapGoalRowToDomain(completedGoal);

      expect(result.isActive).toBe(false);
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });
});
