import { restaurantDataService } from '@/services/restaurants/restaurantDataService';

// ── Mocks ──

const mockDb = {
  getFirstAsync: jest.fn(),
  runAsync: jest.fn().mockResolvedValue(undefined),
  execAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-id'),
}));

jest.mock('@/services/restaurants/restaurantData', () => ({
  BUNDLED_RESTAURANTS: [
    {
      restaurant: {
        id: 'test-restaurant',
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        logoAsset: 'test-logo',
        categories: [
          { id: 'cat1', name: 'Category 1', displayOrder: 1, icon: 'icon1' },
        ],
        metadata: {
          lastUpdated: '2025-01-15',
          source: 'bundled',
          isVerified: true,
        },
      },
      menu: {
        items: [
          {
            id: 'item-1',
            categoryId: 'cat1',
            name: 'Test Item',
            description: 'Test desc',
            nutrition: {
              calories: 500,
              protein: 25,
              carbohydrates: 50,
              fat: 20,
              fiber: 5,
              sugar: 10,
              sodium: 800,
              saturatedFat: 8,
            },
            serving: { size: '1 item', sizeGrams: 200 },
            metadata: {
              source: 'restaurant',
              lastVerified: '2025-01-15',
              isVerified: true,
            },
          },
        ],
      },
    },
  ],
}));

// ── Setup ──

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.getFirstAsync.mockResolvedValue(null);
  mockDb.runAsync.mockResolvedValue(undefined);
  mockDb.execAsync.mockResolvedValue(undefined);
  mockDb.getAllAsync.mockResolvedValue([]);
});

// ── Tests ──

describe('restaurantDataService', () => {
  // ────────────────────────────────────────────────────────────
  // initializeData
  // ────────────────────────────────────────────────────────────
  describe('initializeData', () => {
    it('skips loading when restaurants already exist (count > 0)', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 5 });

      await restaurantDataService.initializeData();

      // execAsync should NOT have been called with BEGIN TRANSACTION
      expect(mockDb.execAsync).not.toHaveBeenCalledWith('BEGIN TRANSACTION');
    });

    it('loads data when no restaurants exist (count = 0)', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 });

      await restaurantDataService.initializeData();

      // Should have started a transaction for loading bundled data
      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');
    });

    it('prevents concurrent initialization (TOCTOU guard)', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      // Launch two concurrent calls
      const p1 = restaurantDataService.initializeData();
      const p2 = restaurantDataService.initializeData();

      await Promise.all([p1, p2]);

      // The SELECT COUNT query should only run once (not twice),
      // because the second call reuses the in-flight promise.
      const countQueries = mockDb.getFirstAsync.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('COUNT') &&
          call[0].includes('restaurants'),
      );
      expect(countQueries.length).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────
  // loadBundledData
  // ────────────────────────────────────────────────────────────
  describe('loadBundledData', () => {
    it('wraps operations in transaction (BEGIN/COMMIT)', async () => {
      await restaurantDataService.loadBundledData();

      const execCalls = mockDb.execAsync.mock.calls.map((c: any[]) => c[0]);
      expect(execCalls[0]).toBe('BEGIN TRANSACTION');
      expect(execCalls[execCalls.length - 1]).toBe('COMMIT');
    });

    it('rolls back on error', async () => {
      // Make the restaurant INSERT fail
      mockDb.runAsync.mockRejectedValueOnce(new Error('INSERT failed'));

      await expect(restaurantDataService.loadBundledData()).rejects.toThrow(
        'INSERT failed',
      );

      expect(mockDb.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ────────────────────────────────────────────────────────────
  // loadRestaurant
  // ────────────────────────────────────────────────────────────
  describe('loadRestaurant', () => {
    it('inserts restaurant, categories, and food items', async () => {
      const { BUNDLED_RESTAURANTS } = require('@/services/restaurants/restaurantData');
      const data = BUNDLED_RESTAURANTS[0];

      await restaurantDataService.loadRestaurant(data.restaurant, data.menu);

      const sqlStatements = mockDb.runAsync.mock.calls.map((c: any[]) => c[0]);

      // Should have an INSERT INTO restaurants
      expect(sqlStatements.some((s: string) => s.includes('INSERT INTO restaurants'))).toBe(
        true,
      );

      // Should have an INSERT INTO menu_categories
      expect(
        sqlStatements.some((s: string) => s.includes('INSERT INTO menu_categories')),
      ).toBe(true);

      // Should have an INSERT INTO restaurant_foods
      expect(
        sqlStatements.some((s: string) => s.includes('INSERT INTO restaurant_foods')),
      ).toBe(true);

      // Verify restaurant params include the test data
      const restaurantInsert = mockDb.runAsync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO restaurants'),
      );
      expect(restaurantInsert![1]).toContain('test-restaurant');
      expect(restaurantInsert![1]).toContain('Test Restaurant');
    });
  });

  // ────────────────────────────────────────────────────────────
  // rebuildSearchIndex
  // ────────────────────────────────────────────────────────────
  describe('rebuildSearchIndex', () => {
    it('clears and rebuilds FTS index', async () => {
      await restaurantDataService.rebuildSearchIndex();

      const sqlStatements = mockDb.runAsync.mock.calls.map((c: any[]) => c[0]);

      // Should delete existing FTS entries
      expect(
        sqlStatements.some((s: string) => s.includes('DELETE FROM restaurant_foods_fts')),
      ).toBe(true);

      // Should rebuild from restaurant_foods joined with restaurants
      expect(
        sqlStatements.some(
          (s: string) =>
            s.includes('INSERT INTO restaurant_foods_fts') &&
            s.includes('restaurant_foods') &&
            s.includes('restaurants'),
        ),
      ).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────
  // checkForUpdates (stub)
  // ────────────────────────────────────────────────────────────
  describe('checkForUpdates', () => {
    it('returns false (stub)', async () => {
      const result = await restaurantDataService.checkForUpdates();
      expect(result).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // applyUpdates (stub)
  // ────────────────────────────────────────────────────────────
  describe('applyUpdates', () => {
    it('resolves without error (stub)', async () => {
      await expect(
        restaurantDataService.applyUpdates(),
      ).resolves.toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────────
  // getDataVersion
  // ────────────────────────────────────────────────────────────
  describe('getDataVersion', () => {
    it('returns restaurant count, food count, and lastUpdated', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 3 }) // restaurant count
        .mockResolvedValueOnce({ count: 150 }) // food count
        .mockResolvedValueOnce({ last_updated: '2025-01-15' }); // lastUpdated

      const result = await restaurantDataService.getDataVersion();

      expect(result).toEqual({
        restaurantCount: 3,
        foodCount: 150,
        lastUpdated: '2025-01-15',
      });

      // Verify the three queries
      const queries = mockDb.getFirstAsync.mock.calls.map((c: any[]) => c[0]);
      expect(queries[0]).toContain('COUNT');
      expect(queries[0]).toContain('restaurants');
      expect(queries[1]).toContain('COUNT');
      expect(queries[1]).toContain('restaurant_foods');
      expect(queries[2]).toContain('MAX(last_updated)');
    });
  });
});
