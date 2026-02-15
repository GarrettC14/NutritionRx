/**
 * USDAFoodService Unit Tests
 *
 * Tests search, detail fetching, nutrient mapping, caching, rate limiting,
 * and graceful degradation of the USDA FoodData Central API service.
 */

// --- Mocks must be declared before imports ---

const mockUsdaConfig = {
  baseUrl: 'https://api.nal.usda.gov/fdc/v1',
  apiKey: 'TEST_KEY',
  rateLimitPerHour: 30,
};

const mockCacheDurations = {
  searchResults: 24 * 60 * 60 * 1000, // 24h
  foodDetails: 30 * 24 * 60 * 60 * 1000, // 30d
};

jest.mock('@/config/api', () => ({
  usdaConfig: mockUsdaConfig,
  USDA_CACHE_DURATIONS: mockCacheDurations,
}));

const mockNutrientMap: Record<number, string> = {
  401: 'vitamin_c',
  303: 'iron',
  301: 'calcium',
  304: 'magnesium',
  307: 'sodium',
};

jest.mock('@/services/usda/nutrientMap', () => ({
  USDA_NUTRIENT_MAP: mockNutrientMap,
  MAPPED_NUTRIENT_COUNT: Object.keys(mockNutrientMap).length,
}));

// --- Imports ---

import type {
  USDASearchResult,
  USDAFoodDetail,
  USDANutrient,
  USDASearchResponse,
} from '@/services/usda/types';

// --- Helpers ---

function createMockSearchResult(overrides: Partial<USDASearchResult> = {}): USDASearchResult {
  return {
    fdcId: 12345,
    description: 'Test Food',
    dataType: 'Foundation',
    foodNutrients: [
      { nutrientId: 401, nutrientName: 'Vitamin C', nutrientNumber: '401', value: 10, unitName: 'mg' },
      { nutrientId: 303, nutrientName: 'Iron', nutrientNumber: '303', value: 2.5, unitName: 'mg' },
      { nutrientId: 301, nutrientName: 'Calcium', nutrientNumber: '301', value: 50, unitName: 'mg' },
    ],
    ...overrides,
  };
}

function createMockFoodDetail(overrides: Partial<USDAFoodDetail> = {}): USDAFoodDetail {
  return {
    fdcId: 12345,
    description: 'Test Food Detail',
    dataType: 'Foundation',
    foodNutrients: [
      { nutrient: { id: 401, name: 'Vitamin C', number: '401', unitName: 'mg' }, amount: 15 },
      { nutrient: { id: 303, name: 'Iron', number: '303', unitName: 'mg' }, amount: 3 },
    ],
    ...overrides,
  };
}

function createMockSearchResponse(foods: USDASearchResult[] = []): USDASearchResponse {
  return {
    totalHits: foods.length,
    currentPage: 1,
    totalPages: 1,
    foods,
  };
}

function mockFetchResponse(body: unknown, status = 200, ok = true) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

// --- Test Suite ---

describe('USDAFoodService', () => {
  let USDAFoodService: typeof import('@/services/usda/USDAFoodService').USDAFoodService;

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset fetch mock
    global.fetch = jest.fn();
    // Use isolateModules to get a fresh singleton for each test
    jest.isolateModules(() => {
      USDAFoodService = require('@/services/usda/USDAFoodService').USDAFoodService;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ================================================================
  // searchFoods
  // ================================================================
  describe('searchFoods', () => {
    it('returns results from API and caches them', async () => {
      const mockResults = [createMockSearchResult()];
      global.fetch = mockFetchResponse(createMockSearchResponse(mockResults));

      const results = await USDAFoodService.searchFoods('broccoli');

      expect(results).toEqual(mockResults);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=TEST_KEY');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        query: 'broccoli',
        dataType: ['Foundation', 'SR Legacy'],
        pageSize: 10,
        pageNumber: 1,
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
      });
    });

    it('returns cached results without fetching when cache is fresh', async () => {
      const mockResults = [createMockSearchResult()];
      global.fetch = mockFetchResponse(createMockSearchResponse(mockResults));

      // First call populates cache
      await USDAFoodService.searchFoods('broccoli');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const results = await USDAFoodService.searchFoods('broccoli');
      expect(results).toEqual(mockResults);
      expect(global.fetch).toHaveBeenCalledTimes(1); // no additional fetch
    });

    it('re-fetches when cache is stale', async () => {
      const staleResults = [createMockSearchResult({ description: 'Stale' })];
      const freshResults = [createMockSearchResult({ description: 'Fresh' })];

      global.fetch = mockFetchResponse(createMockSearchResponse(staleResults));
      await USDAFoodService.searchFoods('broccoli');

      // Advance time past cache duration (24h)
      jest.advanceTimersByTime(mockCacheDurations.searchResults + 1);

      global.fetch = mockFetchResponse(createMockSearchResponse(freshResults));
      const results = await USDAFoodService.searchFoods('broccoli');

      expect(results).toEqual(freshResults);
    });

    it('returns cached data on 429 rate limit response', async () => {
      const cachedResults = [createMockSearchResult()];
      global.fetch = mockFetchResponse(createMockSearchResponse(cachedResults));
      await USDAFoodService.searchFoods('broccoli');

      // Expire cache so it tries to re-fetch
      jest.advanceTimersByTime(mockCacheDurations.searchResults + 1);

      // Now fetch returns 429
      global.fetch = mockFetchResponse(null, 429, false);
      const results = await USDAFoodService.searchFoods('broccoli');

      // Should fall back to stale cached data
      expect(results).toEqual(cachedResults);
    });

    it('returns empty array on 429 with no cache', async () => {
      global.fetch = mockFetchResponse(null, 429, false);
      const results = await USDAFoodService.searchFoods('unknown');
      expect(results).toEqual([]);
    });

    it('returns cached data on 403 invalid API key response', async () => {
      const cachedResults = [createMockSearchResult()];
      global.fetch = mockFetchResponse(createMockSearchResponse(cachedResults));
      await USDAFoodService.searchFoods('broccoli');

      jest.advanceTimersByTime(mockCacheDurations.searchResults + 1);

      global.fetch = mockFetchResponse(null, 403, false);
      const results = await USDAFoodService.searchFoods('broccoli');
      expect(results).toEqual(cachedResults);
    });

    it('returns empty array on 403 with no cache', async () => {
      global.fetch = mockFetchResponse(null, 403, false);
      const results = await USDAFoodService.searchFoods('unknown');
      expect(results).toEqual([]);
    });

    it('returns cached data on network error', async () => {
      const cachedResults = [createMockSearchResult()];
      global.fetch = mockFetchResponse(createMockSearchResponse(cachedResults));
      await USDAFoodService.searchFoods('broccoli');

      jest.advanceTimersByTime(mockCacheDurations.searchResults + 1);

      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
      const results = await USDAFoodService.searchFoods('broccoli');
      expect(results).toEqual(cachedResults);
    });

    it('returns empty array on network error with no cache', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
      const results = await USDAFoodService.searchFoods('unknown');
      expect(results).toEqual([]);
    });

    it('deduplicates inflight requests for the same query', async () => {
      const mockResults = [createMockSearchResult()];
      let resolveResponse!: (value: unknown) => void;
      global.fetch = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveResponse = resolve;
        })
      );

      // Fire two concurrent requests
      const promise1 = USDAFoodService.searchFoods('broccoli');
      const promise2 = USDAFoodService.searchFoods('broccoli');

      // Resolve the single fetch
      resolveResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockSearchResponse(mockResults)),
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toEqual(mockResults);
      expect(result2).toEqual(mockResults);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('uses custom options for pageSize, pageNumber, and dataTypes', async () => {
      global.fetch = mockFetchResponse(createMockSearchResponse([]));

      await USDAFoodService.searchFoods('chicken', {
        dataTypes: ['Branded'],
        pageSize: 25,
        pageNumber: 3,
      });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.dataType).toEqual(['Branded']);
      expect(body.pageSize).toBe(25);
      expect(body.pageNumber).toBe(3);
    });

    it('returns cached/empty when rate limit is exceeded without fetching', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < mockUsdaConfig.rateLimitPerHour; i++) {
        global.fetch = mockFetchResponse(
          createMockSearchResponse([createMockSearchResult({ fdcId: i })])
        );
        await USDAFoodService.searchFoods(`query-${i}`);
      }

      // Reset fetch mock to track the next call
      (global.fetch as jest.Mock).mockClear();

      // This should be blocked by rate limit
      const results = await USDAFoodService.searchFoods('blocked-query');
      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('uses different cache keys for different options', async () => {
      const results1 = [createMockSearchResult({ description: 'Page2' })];
      const results2 = [createMockSearchResult({ description: 'Page3' })];

      // Use a single mock that returns different results per call
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockSearchResponse(results1)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockSearchResponse(results2)),
        });
      global.fetch = fetchMock;

      await USDAFoodService.searchFoods('broccoli', { pageNumber: 2 });
      await USDAFoodService.searchFoods('broccoli', { pageNumber: 3 });

      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Verify each is independently cached
      fetchMock.mockClear();
      const cachedPage2 = await USDAFoodService.searchFoods('broccoli', { pageNumber: 2 });
      const cachedPage3 = await USDAFoodService.searchFoods('broccoli', { pageNumber: 3 });

      expect(cachedPage2[0].description).toBe('Page2');
      expect(cachedPage3[0].description).toBe('Page3');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns empty results when API returns no foods', async () => {
      global.fetch = mockFetchResponse(createMockSearchResponse([]));
      const results = await USDAFoodService.searchFoods('xyznonexistent');
      expect(results).toEqual([]);
    });
  });

  // ================================================================
  // getFoodDetails
  // ================================================================
  describe('getFoodDetails', () => {
    it('returns food detail from API and caches it', async () => {
      const mockDetail = createMockFoodDetail();
      global.fetch = mockFetchResponse(mockDetail);

      const result = await USDAFoodService.getFoodDetails(12345);

      expect(result).toEqual(mockDetail);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toBe('https://api.nal.usda.gov/fdc/v1/food/12345?api_key=TEST_KEY');
    });

    it('returns cached detail without fetching when cache is fresh', async () => {
      const mockDetail = createMockFoodDetail();
      global.fetch = mockFetchResponse(mockDetail);

      await USDAFoodService.getFoodDetails(12345);
      const result = await USDAFoodService.getFoodDetails(12345);

      expect(result).toEqual(mockDetail);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches when cache is stale', async () => {
      const staleDetail = createMockFoodDetail({ description: 'Stale' });
      const freshDetail = createMockFoodDetail({ description: 'Fresh' });

      global.fetch = mockFetchResponse(staleDetail);
      await USDAFoodService.getFoodDetails(12345);

      jest.advanceTimersByTime(mockCacheDurations.foodDetails + 1);

      global.fetch = mockFetchResponse(freshDetail);
      const result = await USDAFoodService.getFoodDetails(12345);

      expect(result).toEqual(freshDetail);
    });

    it('returns null on 404', async () => {
      global.fetch = mockFetchResponse(null, 404, false);
      const result = await USDAFoodService.getFoodDetails(99999);
      expect(result).toBeNull();
    });

    it('returns cached data on 429 rate limit response', async () => {
      const mockDetail = createMockFoodDetail();
      global.fetch = mockFetchResponse(mockDetail);
      await USDAFoodService.getFoodDetails(12345);

      jest.advanceTimersByTime(mockCacheDurations.foodDetails + 1);

      global.fetch = mockFetchResponse(null, 429, false);
      const result = await USDAFoodService.getFoodDetails(12345);
      expect(result).toEqual(mockDetail);
    });

    it('returns null on 429 with no cache', async () => {
      global.fetch = mockFetchResponse(null, 429, false);
      const result = await USDAFoodService.getFoodDetails(99999);
      expect(result).toBeNull();
    });

    it('returns cached data on network error', async () => {
      const mockDetail = createMockFoodDetail();
      global.fetch = mockFetchResponse(mockDetail);
      await USDAFoodService.getFoodDetails(12345);

      jest.advanceTimersByTime(mockCacheDurations.foodDetails + 1);

      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
      const result = await USDAFoodService.getFoodDetails(12345);
      expect(result).toEqual(mockDetail);
    });

    it('returns null on network error with no cache', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
      const result = await USDAFoodService.getFoodDetails(99999);
      expect(result).toBeNull();
    });

    it('deduplicates inflight requests for the same fdcId', async () => {
      const mockDetail = createMockFoodDetail();
      let resolveResponse!: (value: unknown) => void;
      global.fetch = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveResponse = resolve;
        })
      );

      const promise1 = USDAFoodService.getFoodDetails(12345);
      const promise2 = USDAFoodService.getFoodDetails(12345);

      resolveResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDetail),
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toEqual(mockDetail);
      expect(result2).toEqual(mockDetail);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns cached/null when rate limit is exceeded', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < mockUsdaConfig.rateLimitPerHour; i++) {
        global.fetch = mockFetchResponse(createMockFoodDetail({ fdcId: i }));
        await USDAFoodService.getFoodDetails(i);
      }

      (global.fetch as jest.Mock).mockClear();

      const result = await USDAFoodService.getFoodDetails(99999);
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // getFoodDetailsBatch
  // ================================================================
  describe('getFoodDetailsBatch', () => {
    it('returns all cached items without fetching when all are cached', async () => {
      const detail1 = createMockFoodDetail({ fdcId: 1 });
      const detail2 = createMockFoodDetail({ fdcId: 2 });

      // Populate cache
      global.fetch = mockFetchResponse(detail1);
      await USDAFoodService.getFoodDetails(1);
      global.fetch = mockFetchResponse(detail2);
      await USDAFoodService.getFoodDetails(2);

      (global.fetch as jest.Mock).mockClear();

      const results = await USDAFoodService.getFoodDetailsBatch([1, 2]);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.fdcId).sort()).toEqual([1, 2]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches only uncached items in a batch', async () => {
      const cachedDetail = createMockFoodDetail({ fdcId: 1 });
      const uncachedDetail = createMockFoodDetail({ fdcId: 2 });

      // Cache one item
      global.fetch = mockFetchResponse(cachedDetail);
      await USDAFoodService.getFoodDetails(1);

      // Setup batch fetch for uncached
      global.fetch = mockFetchResponse([uncachedDetail]);

      const results = await USDAFoodService.getFoodDetailsBatch([1, 2]);
      expect(results).toHaveLength(2);

      // Verify only uncached IDs were fetched
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.fdcIds).toEqual([2]);
    });

    it('returns only cached results on error', async () => {
      const cachedDetail = createMockFoodDetail({ fdcId: 1 });

      global.fetch = mockFetchResponse(cachedDetail);
      await USDAFoodService.getFoodDetails(1);

      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

      const results = await USDAFoodService.getFoodDetailsBatch([1, 2]);
      expect(results).toHaveLength(1);
      expect(results[0].fdcId).toBe(1);
    });

    it('returns only cached results when rate limited', async () => {
      const cachedDetail = createMockFoodDetail({ fdcId: 1 });
      global.fetch = mockFetchResponse(cachedDetail);
      await USDAFoodService.getFoodDetails(1);

      // Exhaust rate limit
      for (let i = 10; i < 10 + mockUsdaConfig.rateLimitPerHour; i++) {
        global.fetch = mockFetchResponse(createMockFoodDetail({ fdcId: i }));
        await USDAFoodService.getFoodDetails(i);
      }

      (global.fetch as jest.Mock).mockClear();

      const results = await USDAFoodService.getFoodDetailsBatch([1, 999]);
      expect(results).toHaveLength(1);
      expect(results[0].fdcId).toBe(1);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns only cached results on non-ok response', async () => {
      const cachedDetail = createMockFoodDetail({ fdcId: 1 });
      global.fetch = mockFetchResponse(cachedDetail);
      await USDAFoodService.getFoodDetails(1);

      global.fetch = mockFetchResponse(null, 500, false);

      const results = await USDAFoodService.getFoodDetailsBatch([1, 2]);
      expect(results).toHaveLength(1);
      expect(results[0].fdcId).toBe(1);
    });

    it('caches each item from batch response individually', async () => {
      const detail1 = createMockFoodDetail({ fdcId: 1 });
      const detail2 = createMockFoodDetail({ fdcId: 2 });

      global.fetch = mockFetchResponse([detail1, detail2]);
      await USDAFoodService.getFoodDetailsBatch([1, 2]);

      // Now individual lookups should use cache
      (global.fetch as jest.Mock).mockClear();

      const result = await USDAFoodService.getFoodDetails(1);
      expect(result).toEqual(detail1);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns empty array when all ids are uncached and fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
      const results = await USDAFoodService.getFoodDetailsBatch([1, 2, 3]);
      expect(results).toEqual([]);
    });
  });

  // ================================================================
  // mapNutrients
  // ================================================================
  describe('mapNutrients', () => {
    it('maps known USDA nutrient IDs to app nutrient IDs', () => {
      const usdaNutrients: USDANutrient[] = [
        { nutrient: { id: 401, name: 'Vitamin C', number: '401', unitName: 'mg' }, amount: 10 },
        { nutrient: { id: 303, name: 'Iron', number: '303', unitName: 'mg' }, amount: 2.5 },
        { nutrient: { id: 301, name: 'Calcium', number: '301', unitName: 'mg' }, amount: 50 },
      ];

      const mapped = USDAFoodService.mapNutrients(usdaNutrients);

      expect(mapped).toEqual({
        vitamin_c: 10,
        iron: 2.5,
        calcium: 50,
      });
    });

    it('skips unknown USDA nutrient IDs', () => {
      const usdaNutrients: USDANutrient[] = [
        { nutrient: { id: 401, name: 'Vitamin C', number: '401', unitName: 'mg' }, amount: 10 },
        { nutrient: { id: 9999, name: 'Unknown', number: '9999', unitName: 'mg' }, amount: 5 },
      ];

      const mapped = USDAFoodService.mapNutrients(usdaNutrients);

      expect(mapped).toEqual({ vitamin_c: 10 });
      expect(mapped).not.toHaveProperty('9999');
    });

    it('skips nutrients with zero amount', () => {
      const usdaNutrients: USDANutrient[] = [
        { nutrient: { id: 401, name: 'Vitamin C', number: '401', unitName: 'mg' }, amount: 0 },
        { nutrient: { id: 303, name: 'Iron', number: '303', unitName: 'mg' }, amount: 2.5 },
      ];

      const mapped = USDAFoodService.mapNutrients(usdaNutrients);

      expect(mapped).toEqual({ iron: 2.5 });
      expect(mapped).not.toHaveProperty('vitamin_c');
    });

    it('skips nutrients with undefined amount', () => {
      const usdaNutrients: USDANutrient[] = [
        { nutrient: { id: 401, name: 'Vitamin C', number: '401', unitName: 'mg' }, amount: undefined as unknown as number },
        { nutrient: { id: 303, name: 'Iron', number: '303', unitName: 'mg' }, amount: 3 },
      ];

      const mapped = USDAFoodService.mapNutrients(usdaNutrients);

      expect(mapped).toEqual({ iron: 3 });
    });

    it('returns empty object for empty array', () => {
      const mapped = USDAFoodService.mapNutrients([]);
      expect(mapped).toEqual({});
    });

    it('handles nutrients with missing nutrient.id gracefully', () => {
      const usdaNutrients = [
        { nutrient: { id: undefined, name: 'No ID', number: '000', unitName: 'mg' }, amount: 5 },
        { nutrient: { id: 303, name: 'Iron', number: '303', unitName: 'mg' }, amount: 2 },
      ] as unknown as USDANutrient[];

      const mapped = USDAFoodService.mapNutrients(usdaNutrients);
      expect(mapped).toEqual({ iron: 2 });
    });
  });

  // ================================================================
  // countAvailableNutrients
  // ================================================================
  describe('countAvailableNutrients', () => {
    it('counts nutrients that are in the map and have value > 0', () => {
      const food = createMockSearchResult({
        foodNutrients: [
          { nutrientId: 401, nutrientName: 'Vitamin C', nutrientNumber: '401', value: 10, unitName: 'mg' },
          { nutrientId: 303, nutrientName: 'Iron', nutrientNumber: '303', value: 2.5, unitName: 'mg' },
          { nutrientId: 9999, nutrientName: 'Unknown', nutrientNumber: '9999', value: 5, unitName: 'mg' },
        ],
      });

      const count = USDAFoodService.countAvailableNutrients(food);
      expect(count).toBe(2); // vitamin_c and iron, not unknown
    });

    it('returns 0 when foodNutrients is undefined', () => {
      const food = createMockSearchResult({ foodNutrients: undefined });
      const count = USDAFoodService.countAvailableNutrients(food);
      expect(count).toBe(0);
    });

    it('does not count nutrients with value 0', () => {
      const food = createMockSearchResult({
        foodNutrients: [
          { nutrientId: 401, nutrientName: 'Vitamin C', nutrientNumber: '401', value: 0, unitName: 'mg' },
          { nutrientId: 303, nutrientName: 'Iron', nutrientNumber: '303', value: 5, unitName: 'mg' },
        ],
      });

      const count = USDAFoodService.countAvailableNutrients(food);
      expect(count).toBe(1);
    });

    it('returns 0 when all nutrients are unmapped', () => {
      const food = createMockSearchResult({
        foodNutrients: [
          { nutrientId: 9999, nutrientName: 'Unknown', nutrientNumber: '9999', value: 10, unitName: 'mg' },
        ],
      });

      const count = USDAFoodService.countAvailableNutrients(food);
      expect(count).toBe(0);
    });

    it('returns 0 when foodNutrients is empty', () => {
      const food = createMockSearchResult({ foodNutrients: [] });
      const count = USDAFoodService.countAvailableNutrients(food);
      expect(count).toBe(0);
    });
  });

  // ================================================================
  // getMaxNutrientCount
  // ================================================================
  describe('getMaxNutrientCount', () => {
    it('returns MAPPED_NUTRIENT_COUNT', () => {
      const count = USDAFoodService.getMaxNutrientCount();
      expect(count).toBe(Object.keys(mockNutrientMap).length);
    });
  });

  // ================================================================
  // scaleNutrientsToServing
  // ================================================================
  describe('scaleNutrientsToServing', () => {
    it('scales nutrients from per-100g to serving size', () => {
      const nutrients = { vitamin_c: 10, iron: 2 };
      const scaled = USDAFoodService.scaleNutrientsToServing(nutrients, 50);

      expect(scaled).toEqual({
        vitamin_c: 5,
        iron: 1,
      });
    });

    it('returns same values for 100g serving', () => {
      const nutrients = { vitamin_c: 10, iron: 2, calcium: 50 };
      const scaled = USDAFoodService.scaleNutrientsToServing(nutrients, 100);

      expect(scaled).toEqual({
        vitamin_c: 10,
        iron: 2,
        calcium: 50,
      });
    });

    it('doubles values for 200g serving', () => {
      const nutrients = { vitamin_c: 10, iron: 2 };
      const scaled = USDAFoodService.scaleNutrientsToServing(nutrients, 200);

      expect(scaled).toEqual({
        vitamin_c: 20,
        iron: 4,
      });
    });

    it('returns empty object for empty nutrients', () => {
      const scaled = USDAFoodService.scaleNutrientsToServing({}, 150);
      expect(scaled).toEqual({});
    });

    it('handles zero serving size', () => {
      const nutrients = { vitamin_c: 10 };
      const scaled = USDAFoodService.scaleNutrientsToServing(nutrients, 0);
      expect(scaled).toEqual({ vitamin_c: 0 });
    });
  });

  // ================================================================
  // clearCache
  // ================================================================
  describe('clearCache', () => {
    it('clears both search and details caches', async () => {
      // Populate search cache
      global.fetch = mockFetchResponse(createMockSearchResponse([createMockSearchResult()]));
      await USDAFoodService.searchFoods('broccoli');

      // Populate details cache
      global.fetch = mockFetchResponse(createMockFoodDetail());
      await USDAFoodService.getFoodDetails(12345);

      // Clear caches
      USDAFoodService.clearCache();

      // Next calls should re-fetch
      global.fetch = mockFetchResponse(createMockSearchResponse([createMockSearchResult({ description: 'New' })]));
      const searchResults = await USDAFoodService.searchFoods('broccoli');
      expect(searchResults[0].description).toBe('New');

      global.fetch = mockFetchResponse(createMockFoodDetail({ description: 'New Detail' }));
      const detail = await USDAFoodService.getFoodDetails(12345);
      expect(detail?.description).toBe('New Detail');
    });
  });

  // ================================================================
  // checkRateLimit (tested indirectly through public methods)
  // ================================================================
  describe('rate limiting', () => {
    it('allows requests within the rate limit', async () => {
      for (let i = 0; i < 5; i++) {
        global.fetch = mockFetchResponse(createMockSearchResponse([createMockSearchResult({ fdcId: i })]));
        const results = await USDAFoodService.searchFoods(`query-${i}`);
        expect(results).toHaveLength(1);
      }
    });

    it('blocks requests at the rate limit', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < mockUsdaConfig.rateLimitPerHour; i++) {
        global.fetch = mockFetchResponse(createMockSearchResponse([createMockSearchResult({ fdcId: i })]));
        await USDAFoodService.searchFoods(`query-${i}`);
      }

      // Next request should be blocked
      (global.fetch as jest.Mock).mockClear();
      const results = await USDAFoodService.searchFoods('blocked');
      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('resets the rate limit after the window expires', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < mockUsdaConfig.rateLimitPerHour; i++) {
        global.fetch = mockFetchResponse(createMockSearchResponse([createMockSearchResult({ fdcId: i })]));
        await USDAFoodService.searchFoods(`query-${i}`);
      }

      // Verify blocked
      (global.fetch as jest.Mock).mockClear();
      const blockedResults = await USDAFoodService.searchFoods('blocked');
      expect(blockedResults).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();

      // Advance past the 1-hour window
      jest.advanceTimersByTime(60 * 60 * 1000);

      // Should be allowed again
      global.fetch = mockFetchResponse(createMockSearchResponse([createMockSearchResult({ description: 'After Reset' })]));
      const results = await USDAFoodService.searchFoods('after-reset');
      expect(results).toHaveLength(1);
      expect(results[0].description).toBe('After Reset');
    });

    it('rate limit applies across searchFoods and getFoodDetails', async () => {
      // Use up rate limit with a mix of search and detail calls
      for (let i = 0; i < mockUsdaConfig.rateLimitPerHour; i++) {
        if (i % 2 === 0) {
          global.fetch = mockFetchResponse(createMockSearchResponse([createMockSearchResult({ fdcId: i })]));
          await USDAFoodService.searchFoods(`query-${i}`);
        } else {
          global.fetch = mockFetchResponse(createMockFoodDetail({ fdcId: i }));
          await USDAFoodService.getFoodDetails(i);
        }
      }

      (global.fetch as jest.Mock).mockClear();

      // Both should be blocked
      const searchResult = await USDAFoodService.searchFoods('blocked');
      expect(searchResult).toEqual([]);

      const detailResult = await USDAFoodService.getFoodDetails(99999);
      expect(detailResult).toBeNull();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // Edge cases
  // ================================================================
  describe('edge cases', () => {
    it('handles API returning foods: undefined gracefully', async () => {
      global.fetch = mockFetchResponse({ totalHits: 0, currentPage: 1, totalPages: 0 });
      const results = await USDAFoodService.searchFoods('empty');
      expect(results).toEqual([]);
    });

    it('handles non-ok status other than 429/403/404', async () => {
      global.fetch = mockFetchResponse(null, 500, false);
      const results = await USDAFoodService.searchFoods('server-error');
      expect(results).toEqual([]);
    });

    it('different queries use separate cache entries', async () => {
      const results1 = [createMockSearchResult({ description: 'Broccoli' })];
      const results2 = [createMockSearchResult({ description: 'Chicken' })];

      global.fetch = mockFetchResponse(createMockSearchResponse(results1));
      await USDAFoodService.searchFoods('broccoli');

      global.fetch = mockFetchResponse(createMockSearchResponse(results2));
      await USDAFoodService.searchFoods('chicken');

      // Both should be independently cached
      (global.fetch as jest.Mock).mockClear();

      const cachedBroccoli = await USDAFoodService.searchFoods('broccoli');
      const cachedChicken = await USDAFoodService.searchFoods('chicken');

      expect(cachedBroccoli[0].description).toBe('Broccoli');
      expect(cachedChicken[0].description).toBe('Chicken');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
