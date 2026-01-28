/**
 * Restaurant Repository Tests
 * Tests for restaurant/chain database data access
 */

import { restaurantRepository } from '@/repositories/restaurantRepository';
import { MealType } from '@/constants/mealTypes';

// Mock the database module
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

// Mock generateId
jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-uuid-restaurant'),
}));

describe('restaurantRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
  });

  // Mock data
  const mockRestaurantRow = {
    id: 'mcdonalds',
    name: "McDonald's",
    slug: 'mcdonalds',
    logo_asset_path: null,
    last_updated: '2024-01-01',
    source: 'bundled',
    is_verified: 1,
    item_count: 50,
    created_at: '2024-01-15T10:00:00.000Z',
  };

  const mockCategoryRow = {
    id: 'mcdonalds-burgers',
    restaurant_id: 'mcdonalds',
    name: 'Burgers',
    display_order: 1,
    icon_name: 'fast-food',
  };

  const mockFoodRow = {
    id: 'mcdonalds-big-mac',
    restaurant_id: 'mcdonalds',
    restaurant_name: "McDonald's",
    category_id: 'mcdonalds-burgers',
    category_name: 'Burgers',
    name: 'Big Mac',
    description: 'Two all-beef patties, special sauce, lettuce, cheese',
    image_url: null,
    calories: 590,
    protein: 25,
    carbohydrates: 46,
    fat: 34,
    fiber: 3,
    sugar: 9,
    sodium: 1050,
    saturated_fat: 11,
    serving_size: '1 sandwich (211g)',
    serving_grams: 211,
    source: 'restaurant',
    source_id: null,
    last_verified: '2024-01-01',
    is_verified: 1,
    popularity_score: 100,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  };

  const mockFoodLogRow = {
    id: 'log-1',
    restaurant_food_id: 'mcdonalds-big-mac',
    restaurant_name: "McDonald's",
    food_name: 'Big Mac',
    variant_id: null,
    logged_at: '2024-01-15T12:00:00.000Z',
    date: '2024-01-15',
    meal: 'lunch',
    quantity: 1,
    notes: null,
    calories: 590,
    protein: 25,
    carbohydrates: 46,
    fat: 34,
    created_at: '2024-01-15T12:00:00.000Z',
  };

  // ============================================================
  // Restaurants Tests
  // ============================================================

  describe('getAll', () => {
    it('returns all restaurants', async () => {
      mockGetAllAsync.mockResolvedValue([mockRestaurantRow]);

      const result = await restaurantRepository.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mcdonalds');
      expect(result[0].name).toBe("McDonald's");
      expect(result[0].metadata.isVerified).toBe(true);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM restaurants ORDER BY name')
      );
    });
  });

  describe('getById', () => {
    it('returns restaurant with categories when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockRestaurantRow);
      mockGetAllAsync.mockResolvedValue([mockCategoryRow]);

      const result = await restaurantRepository.getById('mcdonalds');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('mcdonalds');
      expect(result!.categories).toHaveLength(1);
      expect(result!.categories[0].name).toBe('Burgers');
    });

    it('returns null when restaurant not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await restaurantRepository.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('returns restaurant by slug', async () => {
      mockGetFirstAsync.mockResolvedValue(mockRestaurantRow);
      mockGetAllAsync.mockResolvedValue([]);

      const result = await restaurantRepository.getBySlug('mcdonalds');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('mcdonalds');
    });
  });

  describe('getRecent', () => {
    it('returns recently used restaurants', async () => {
      mockGetAllAsync.mockResolvedValue([mockRestaurantRow]);

      const result = await restaurantRepository.getRecent(5);

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('user_restaurant_usage'),
        [5]
      );
    });
  });

  describe('searchRestaurants', () => {
    it('returns matching restaurants', async () => {
      mockGetAllAsync.mockResolvedValue([mockRestaurantRow]);

      const result = await restaurantRepository.searchRestaurants('mcdonald');

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%mcdonald%', 20]
      );
    });

    it('returns empty array for short queries', async () => {
      const result = await restaurantRepository.searchRestaurants('m');

      expect(result).toHaveLength(0);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Restaurant Foods Tests
  // ============================================================

  describe('getFoods', () => {
    it('returns all foods for restaurant', async () => {
      mockGetAllAsync.mockResolvedValue([mockFoodRow]);

      const result = await restaurantRepository.getFoods('mcdonalds');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Big Mac');
      expect(result[0].nutrition.calories).toBe(590);
    });

    it('filters by category when provided', async () => {
      mockGetAllAsync.mockResolvedValue([mockFoodRow]);

      await restaurantRepository.getFoods('mcdonalds', 'mcdonalds-burgers');

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('AND f.category_id = ?'),
        ['mcdonalds', 'mcdonalds-burgers']
      );
    });
  });

  describe('getFoodById', () => {
    it('returns food when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockFoodRow);

      const result = await restaurantRepository.getFoodById('mcdonalds-big-mac');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('mcdonalds-big-mac');
      expect(result!.restaurantName).toBe("McDonald's");
    });

    it('returns null when not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await restaurantRepository.getFoodById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPopularFoods', () => {
    it('returns popular foods for restaurant', async () => {
      mockGetAllAsync.mockResolvedValue([mockFoodRow]);

      const result = await restaurantRepository.getPopularFoods('mcdonalds', 5);

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY f.popularity_score DESC'),
        ['mcdonalds', 5]
      );
    });
  });

  describe('searchFoods', () => {
    it('returns matching foods', async () => {
      mockGetAllAsync.mockResolvedValue([mockFoodRow]);

      const result = await restaurantRepository.searchFoods('big mac');

      expect(result).toHaveLength(1);
    });

    it('returns empty for short queries', async () => {
      const result = await restaurantRepository.searchFoods('b');

      expect(result).toHaveLength(0);
    });
  });

  describe('searchFoodsInRestaurant', () => {
    it('searches foods within specific restaurant', async () => {
      mockGetAllAsync.mockResolvedValue([mockFoodRow]);

      const result = await restaurantRepository.searchFoodsInRestaurant(
        'mcdonalds',
        'big'
      );

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE f.restaurant_id = ?'),
        ['mcdonalds', '%big%', 20]
      );
    });
  });

  describe('incrementPopularity', () => {
    it('increments food popularity score', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await restaurantRepository.incrementPopularity('mcdonalds-big-mac');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('popularity_score = popularity_score + 1'),
        expect.arrayContaining(['mcdonalds-big-mac'])
      );
    });
  });

  // ============================================================
  // Food Logging Tests
  // ============================================================

  describe('logFood', () => {
    it('creates a food log entry', async () => {
      mockRunAsync.mockResolvedValue(undefined);
      mockGetFirstAsync
        .mockResolvedValueOnce(mockFoodRow) // getFoodById
        .mockResolvedValueOnce(mockFoodLogRow); // get created log

      const result = await restaurantRepository.logFood({
        restaurantFoodId: 'mcdonalds-big-mac',
        restaurantName: "McDonald's",
        foodName: 'Big Mac',
        meal: MealType.Lunch,
        quantity: 1,
        nutritionSnapshot: {
          calories: 590,
          protein: 25,
          carbohydrates: 46,
          fat: 34,
        },
      });

      expect(result.id).toBe('log-1');
      expect(result.foodName).toBe('Big Mac');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO restaurant_food_logs'),
        expect.any(Array)
      );
    });
  });

  describe('getLogsByDate', () => {
    it('returns logs for specific date', async () => {
      mockGetAllAsync.mockResolvedValue([mockFoodLogRow]);

      const result = await restaurantRepository.getLogsByDate('2024-01-15');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });
  });

  describe('getLogsByDateAndMeal', () => {
    it('returns logs for specific date and meal', async () => {
      mockGetAllAsync.mockResolvedValue([mockFoodLogRow]);

      const result = await restaurantRepository.getLogsByDateAndMeal(
        '2024-01-15',
        MealType.Lunch
      );

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date = ? AND meal = ?'),
        ['2024-01-15', 'lunch']
      );
    });
  });

  describe('deleteLog', () => {
    it('deletes a food log', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await restaurantRepository.deleteLog('log-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM restaurant_food_logs WHERE id = ?',
        ['log-1']
      );
    });
  });

  // ============================================================
  // Daily Summary Tests
  // ============================================================

  describe('getDailyTotals', () => {
    it('returns daily nutrition totals', async () => {
      mockGetFirstAsync.mockResolvedValue({
        total_calories: 1200,
        total_protein: 60,
        total_carbs: 100,
        total_fat: 50,
      });

      const result = await restaurantRepository.getDailyTotals('2024-01-15');

      expect(result.calories).toBe(1200);
      expect(result.protein).toBe(60);
      expect(result.carbs).toBe(100);
      expect(result.fat).toBe(50);
    });

    it('returns zeros when no data', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await restaurantRepository.getDailyTotals('2024-01-15');

      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
    });
  });

  // ============================================================
  // User Restaurant Usage Tests
  // ============================================================

  describe('updateUsage', () => {
    it('updates or creates usage record', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await restaurantRepository.updateUsage('mcdonalds');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_restaurant_usage'),
        expect.arrayContaining(['mcdonalds'])
      );
    });
  });

  // ============================================================
  // Data Management Tests
  // ============================================================

  describe('getRestaurantCount', () => {
    it('returns total restaurant count', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 10 });

      const result = await restaurantRepository.getRestaurantCount();

      expect(result).toBe(10);
    });

    it('returns 0 when no restaurants', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await restaurantRepository.getRestaurantCount();

      expect(result).toBe(0);
    });
  });

  describe('clearAllData', () => {
    it('clears all restaurant-related data', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await restaurantRepository.clearAllData();

      expect(mockRunAsync).toHaveBeenCalledTimes(6);
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM restaurant_food_logs');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM restaurants');
    });
  });
});
