/**
 * Open Food Facts API Service Tests
 * Tests for barcode scanning and product search
 */

import { openFoodFactsApi } from '@/services/openFoodFactsApi';
import { foodRepository } from '@/repositories';

// Mock fetch globally
global.fetch = jest.fn();

// Mock foodRepository
jest.mock('@/repositories', () => ({
  foodRepository: {
    findByBarcode: jest.fn(),
    create: jest.fn(),
    search: jest.fn(),
  },
}));

describe('openFoodFactsApi', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const mockFoodRepo = foodRepository as jest.Mocked<typeof foodRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchByBarcode', () => {
    const mockBarcode = '3017620422003'; // Nutella barcode

    const mockApiResponse = {
      code: mockBarcode,
      status: 1,
      product: {
        product_name: 'Nutella',
        brands: 'Ferrero',
        serving_size: '15g',
        serving_quantity: 15,
        nutriments: {
          'energy-kcal_100g': 539,
          'energy-kcal_serving': 81,
          proteins_100g: 6.3,
          proteins_serving: 0.9,
          carbohydrates_100g: 57.5,
          carbohydrates_serving: 8.6,
          fat_100g: 30.9,
          fat_serving: 4.6,
          fiber_100g: 3.4,
          fiber_serving: 0.5,
          sugars_100g: 56.3,
          sugars_serving: 8.4,
          sodium_100g: 0.041,
          sodium_serving: 0.006,
        },
      },
    };

    it('returns cached food if already exists in database', async () => {
      const cachedFood = {
        id: 'cached-food-id',
        name: 'Nutella',
        barcode: mockBarcode,
        calories: 81,
        protein: 1,
        carbs: 9,
        fat: 5,
        servingSize: 15,
        servingUnit: 'g',
        servingSizeGrams: 15,
        source: 'open_food_facts' as const,
        isVerified: true,
        isUserCreated: false,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFoodRepo.findByBarcode.mockResolvedValue(cachedFood);

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(true);
      expect(result.food).toEqual(cachedFood);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches from API when food not in cache', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response);

      const createdFood = {
        id: 'new-food-id',
        name: 'Nutella',
        brand: 'Ferrero',
        barcode: mockBarcode,
        calories: 81,
        protein: 1,
        carbs: 9,
        fat: 5,
        servingSize: 15,
        servingUnit: 'g',
        servingSizeGrams: 15,
        source: 'open_food_facts' as const,
        isVerified: true,
        isUserCreated: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFoodRepo.create.mockResolvedValue(createdFood);

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(true);
      expect(result.food).toEqual(createdFood);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(mockBarcode),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
      expect(mockFoodRepo.create).toHaveBeenCalled();
    });

    it('returns error when API request fails', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API request failed');
    });

    it('returns error when product not found', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          code: mockBarcode,
          status: 0,
          status_verbose: 'product not found',
        }),
      } as Response);

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('handles network errors gracefully', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('calculates nutrients from per-100g values when per-serving not available', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);

      const apiResponseWithout100g = {
        code: mockBarcode,
        status: 1,
        product: {
          product_name: 'Test Product',
          serving_size: '50g',
          serving_quantity: 50,
          nutriments: {
            'energy-kcal_100g': 200,
            proteins_100g: 10,
            carbohydrates_100g: 20,
            fat_100g: 5,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponseWithout100g),
      } as Response);

      mockFoodRepo.create.mockImplementation(async (input) => ({
        id: 'new-id',
        ...input,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any));

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(true);
      // Values should be calculated as: (per100g * 50) / 100
      expect(mockFoodRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calories: 100, // 200 * 50 / 100
          protein: 5, // 10 * 50 / 100
          carbs: 10, // 20 * 50 / 100
          fat: 3, // 5 * 50 / 100 = 2.5 ≈ 3
        })
      );
    });

    it('parses serving size from complex string like "1 bar (45g)"', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);

      const apiResponseWithComplexServing = {
        code: mockBarcode,
        status: 1,
        product: {
          product_name: 'Energy Bar',
          serving_size: '1 bar (45g)',
          nutriments: {
            'energy-kcal_100g': 400,
            proteins_100g: 8,
            carbohydrates_100g: 60,
            fat_100g: 15,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponseWithComplexServing),
      } as Response);

      mockFoodRepo.create.mockImplementation(async (input) => ({
        id: 'new-id',
        ...input,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any));

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(true);
      expect(mockFoodRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          servingSize: 1,
          servingUnit: 'bar',
        })
      );
    });

    it('handles missing serving size by defaulting to 100g', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);

      const apiResponseNoServing = {
        code: mockBarcode,
        status: 1,
        product: {
          product_name: 'Generic Product',
          nutriments: {
            'energy-kcal_100g': 300,
            proteins_100g: 10,
            carbohydrates_100g: 40,
            fat_100g: 10,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponseNoServing),
      } as Response);

      mockFoodRepo.create.mockImplementation(async (input) => ({
        id: 'new-id',
        ...input,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any));

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(true);
      expect(mockFoodRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          servingSize: 100,
          servingUnit: 'g',
          servingSizeGrams: 100,
        })
      );
    });

    it('converts sodium from grams to milligrams', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);

      const apiResponseWithSodium = {
        code: mockBarcode,
        status: 1,
        product: {
          product_name: 'Salty Snack',
          serving_size: '100g',
          serving_quantity: 100,
          nutriments: {
            'energy-kcal_100g': 500,
            proteins_100g: 5,
            carbohydrates_100g: 60,
            fat_100g: 25,
            sodium_100g: 0.5, // 0.5g = 500mg per 100g
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponseWithSodium),
      } as Response);

      mockFoodRepo.create.mockImplementation(async (input) => ({
        id: 'new-id',
        ...input,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any));

      const result = await openFoodFactsApi.fetchByBarcode(mockBarcode);

      expect(result.success).toBe(true);
      // Sodium per serving = Math.round((0.5 * 100 / 100)) = 1g, then * 1000 = 1000mg
      expect(mockFoodRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sodium: 1000,
        })
      );
    });
  });

  describe('searchProducts', () => {
    const mockSearchQuery = 'chocolate';

    it('returns local results when enough found', async () => {
      const localResults = Array(10).fill(null).map((_, i) => ({
        id: `local-${i}`,
        name: `Chocolate ${i}`,
        calories: 100,
        protein: 2,
        carbs: 15,
        fat: 5,
        servingSize: 30,
        servingUnit: 'g',
        servingSizeGrams: 30,
        source: 'user' as const,
        isVerified: false,
        isUserCreated: true,
        usageCount: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockFoodRepo.search.mockResolvedValue(localResults);

      const results = await openFoodFactsApi.searchProducts(mockSearchQuery, 10);

      expect(results).toEqual(localResults);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches from API when local results are insufficient', async () => {
      const localResults = [
        {
          id: 'local-1',
          name: 'Chocolate Bar',
          barcode: '123',
          calories: 200,
          protein: 3,
          carbs: 25,
          fat: 10,
          servingSize: 40,
          servingUnit: 'g',
          servingSizeGrams: 40,
          source: 'user' as const,
          isVerified: false,
          isUserCreated: true,
          usageCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockFoodRepo.search.mockResolvedValue(localResults);

      const apiSearchResponse = {
        products: [
          {
            code: '456',
            product_name: 'Dark Chocolate',
            brands: 'Lindt',
            serving_size: '25g',
            serving_quantity: 25,
            nutriments: {
              'energy-kcal_100g': 550,
              proteins_100g: 5,
              carbohydrates_100g: 45,
              fat_100g: 35,
            },
          },
          {
            code: '789',
            product_name: 'Milk Chocolate',
            brands: 'Cadbury',
            serving_size: '30g',
            serving_quantity: 30,
            nutriments: {
              'energy-kcal_100g': 530,
              proteins_100g: 6,
              carbohydrates_100g: 55,
              fat_100g: 30,
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiSearchResponse),
      } as Response);

      const results = await openFoodFactsApi.searchProducts(mockSearchQuery, 10);

      expect(results.length).toBe(3);
      expect(results[0]).toEqual(localResults[0]);
      expect(results[1].name).toBe('Dark Chocolate');
      expect(results[2].name).toBe('Milk Chocolate');
    });

    it('filters out duplicates by barcode', async () => {
      const localResults = [
        {
          id: 'local-1',
          name: 'Chocolate',
          barcode: '456',
          calories: 200,
          protein: 3,
          carbs: 25,
          fat: 10,
          servingSize: 40,
          servingUnit: 'g',
          servingSizeGrams: 40,
          source: 'open_food_facts' as const,
          isVerified: true,
          isUserCreated: false,
          usageCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockFoodRepo.search.mockResolvedValue(localResults);

      const apiSearchResponse = {
        products: [
          {
            code: '456', // Same barcode as local
            product_name: 'Chocolate Updated',
            nutriments: { 'energy-kcal_100g': 200 },
          },
          {
            code: '789',
            product_name: 'New Chocolate',
            nutriments: { 'energy-kcal_100g': 250 },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiSearchResponse),
      } as Response);

      const results = await openFoodFactsApi.searchProducts(mockSearchQuery, 10);

      expect(results.length).toBe(2);
      expect(results[0].barcode).toBe('456');
      expect(results[1].barcode).toBe('789');
    });

    it('returns local results on API error', async () => {
      const localResults = [
        {
          id: 'local-1',
          name: 'Chocolate',
          calories: 200,
          protein: 3,
          carbs: 25,
          fat: 10,
          servingSize: 40,
          servingUnit: 'g',
          servingSizeGrams: 40,
          source: 'user' as const,
          isVerified: false,
          isUserCreated: true,
          usageCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockFoodRepo.search.mockResolvedValue(localResults);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await openFoodFactsApi.searchProducts(mockSearchQuery, 10);

      expect(results).toEqual(localResults);
    });

    it('filters out products without required fields', async () => {
      mockFoodRepo.search.mockResolvedValue([]);

      const apiSearchResponse = {
        products: [
          {
            code: '123',
            product_name: 'Valid Product',
            nutriments: { 'energy-kcal_100g': 200 },
          },
          {
            code: '456',
            // Missing product_name
            nutriments: { 'energy-kcal_100g': 300 },
          },
          {
            code: '789',
            product_name: 'No Nutriments',
            // Missing nutriments
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiSearchResponse),
      } as Response);

      const results = await openFoodFactsApi.searchProducts(mockSearchQuery, 10);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Valid Product');
    });

    it('respects limit parameter', async () => {
      mockFoodRepo.search.mockResolvedValue([]);

      const apiSearchResponse = {
        products: Array(20).fill(null).map((_, i) => ({
          code: `${i}`,
          product_name: `Product ${i}`,
          nutriments: { 'energy-kcal_100g': 100 + i },
        })),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiSearchResponse),
      } as Response);

      const results = await openFoodFactsApi.searchProducts(mockSearchQuery, 5);

      expect(results.length).toBe(5);
    });

    it('uses correct search URL with encoded query', async () => {
      mockFoodRepo.search.mockResolvedValue([]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ products: [] }),
      } as Response);

      await openFoodFactsApi.searchProducts('chocolate chip', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('chocolate%20chip'),
        expect.any(Object)
      );
    });
  });
});
