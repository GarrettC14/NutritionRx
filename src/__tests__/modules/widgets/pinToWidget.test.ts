/**
 * Pin-to-Widget Tests
 * Tests for pinning foods to widgets for quick access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock widget data service
jest.mock('@/modules/widgets/widgetDataService', () => ({
  widgetDataService: {
    reloadWidgets: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

import {
  pinToWidgetService,
  MAX_PINNED_ITEMS,
  createPinnableItem,
  PinnedItem,
} from '@/modules/widgets/pinToWidget';

describe('pinToWidgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pinToWidgetService.clearCache();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('getPinnedItems', () => {
    it('returns empty array when no items pinned', async () => {
      const items = await pinToWidgetService.getPinnedItems();
      expect(items).toEqual([]);
    });

    it('returns stored items', async () => {
      const storedItems: PinnedItem[] = [
        {
          id: 'food-1',
          name: 'Chicken Breast',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
          servingUnit: 'g',
          pinnedAt: '2024-01-15T10:00:00.000Z',
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      const items = await pinToWidgetService.getPinnedItems();

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Chicken Breast');
    });

    it('caches items for subsequent calls', async () => {
      const storedItems: PinnedItem[] = [
        {
          id: 'food-1',
          name: 'Chicken Breast',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
          servingUnit: 'g',
          pinnedAt: '2024-01-15T10:00:00.000Z',
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      await pinToWidgetService.getPinnedItems();
      await pinToWidgetService.getPinnedItems();

      // Should only read from storage once
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('pinItem', () => {
    it('pins a new item successfully', async () => {
      const item = {
        id: 'food-1',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingSize: 100,
        servingUnit: 'g',
      };

      const result = await pinToWidgetService.pinItem(item);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Item pinned to widget');
      expect(result.item).toBeDefined();
      expect(result.item?.pinnedAt).toBeDefined();
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('fails when item already pinned', async () => {
      const storedItems: PinnedItem[] = [
        {
          id: 'food-1',
          name: 'Chicken Breast',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
          servingUnit: 'g',
          pinnedAt: '2024-01-15T10:00:00.000Z',
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      const result = await pinToWidgetService.pinItem({
        id: 'food-1',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingSize: 100,
        servingUnit: 'g',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('This item is already pinned');
    });

    it('fails when max items reached', async () => {
      // Create max number of items
      const storedItems: PinnedItem[] = Array.from({ length: MAX_PINNED_ITEMS }, (_, i) => ({
        id: `food-${i}`,
        name: `Food ${i}`,
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        servingSize: 1,
        servingUnit: 'serving',
        pinnedAt: '2024-01-15T10:00:00.000Z',
      }));
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      const result = await pinToWidgetService.pinItem({
        id: 'new-food',
        name: 'New Food',
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        servingSize: 1,
        servingUnit: 'serving',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum');
      expect(result.message).toContain(`${MAX_PINNED_ITEMS}`);
    });
  });

  describe('unpinItem', () => {
    it('unpins an item successfully', async () => {
      const storedItems: PinnedItem[] = [
        {
          id: 'food-1',
          name: 'Chicken Breast',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
          servingUnit: 'g',
          pinnedAt: '2024-01-15T10:00:00.000Z',
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      const result = await pinToWidgetService.unpinItem('food-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Item unpinned from widget');
      expect(result.item?.id).toBe('food-1');
    });

    it('fails when item is not pinned', async () => {
      const result = await pinToWidgetService.unpinItem('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Item is not pinned');
    });
  });

  describe('isPinned', () => {
    it('returns true for pinned item', async () => {
      const storedItems: PinnedItem[] = [
        {
          id: 'food-1',
          name: 'Chicken Breast',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
          servingUnit: 'g',
          pinnedAt: '2024-01-15T10:00:00.000Z',
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      const isPinned = await pinToWidgetService.isPinned('food-1');

      expect(isPinned).toBe(true);
    });

    it('returns false for non-pinned item', async () => {
      const isPinned = await pinToWidgetService.isPinned('non-existent');

      expect(isPinned).toBe(false);
    });
  });

  describe('togglePin', () => {
    it('pins item when not pinned', async () => {
      const item = {
        id: 'food-1',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingSize: 100,
        servingUnit: 'g',
      };

      const result = await pinToWidgetService.togglePin(item);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Item pinned to widget');
    });

    it('unpins item when already pinned', async () => {
      const storedItems: PinnedItem[] = [
        {
          id: 'food-1',
          name: 'Chicken Breast',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
          servingUnit: 'g',
          pinnedAt: '2024-01-15T10:00:00.000Z',
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      const result = await pinToWidgetService.togglePin({
        id: 'food-1',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingSize: 100,
        servingUnit: 'g',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Item unpinned from widget');
    });
  });

  describe('reorderItems', () => {
    it('reorders items based on new order', async () => {
      const storedItems: PinnedItem[] = [
        { id: 'food-1', name: 'Food 1', calories: 100, protein: 10, carbs: 10, fat: 5, servingSize: 1, servingUnit: 'serving', pinnedAt: '' },
        { id: 'food-2', name: 'Food 2', calories: 200, protein: 20, carbs: 20, fat: 10, servingSize: 1, servingUnit: 'serving', pinnedAt: '' },
        { id: 'food-3', name: 'Food 3', calories: 300, protein: 30, carbs: 30, fat: 15, servingSize: 1, servingUnit: 'serving', pinnedAt: '' },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

      await pinToWidgetService.reorderItems(['food-3', 'food-1', 'food-2']);

      // Check that setItem was called with reordered items
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].id).toBe('food-3');
      expect(savedData[1].id).toBe('food-1');
      expect(savedData[2].id).toBe('food-2');
    });
  });

  describe('clearAll', () => {
    it('removes all pinned items', async () => {
      await pinToWidgetService.clearAll();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });
  });
});

describe('createPinnableItem', () => {
  it('creates pinnable item with all fields', () => {
    const food = {
      id: 'food-1',
      name: 'Chicken Breast',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      servingSize: 100,
      servingUnit: 'g',
      mealType: 'dinner' as const,
    };

    const pinnableItem = createPinnableItem(food);

    expect(pinnableItem.id).toBe('food-1');
    expect(pinnableItem.name).toBe('Chicken Breast');
    expect(pinnableItem.calories).toBe(165);
    expect(pinnableItem.protein).toBe(31);
    expect(pinnableItem.carbs).toBe(0);
    expect(pinnableItem.fat).toBe(3.6);
    expect(pinnableItem.servingSize).toBe(100);
    expect(pinnableItem.servingUnit).toBe('g');
    expect(pinnableItem.mealType).toBe('dinner');
    expect(pinnableItem.iconEmoji).toBe('🌙');
  });

  it('provides defaults for optional fields', () => {
    const food = {
      id: 'food-1',
      name: 'Simple Food',
      calories: 100,
    };

    const pinnableItem = createPinnableItem(food);

    expect(pinnableItem.protein).toBe(0);
    expect(pinnableItem.carbs).toBe(0);
    expect(pinnableItem.fat).toBe(0);
    expect(pinnableItem.servingSize).toBe(1);
    expect(pinnableItem.servingUnit).toBe('serving');
    expect(pinnableItem.iconEmoji).toBe('🍽️');
  });

  it('assigns correct meal emoji', () => {
    const meals = [
      { mealType: 'breakfast' as const, emoji: '🌅' },
      { mealType: 'lunch' as const, emoji: '☀️' },
      { mealType: 'dinner' as const, emoji: '🌙' },
      { mealType: 'snack' as const, emoji: '🍃' },
    ];

    meals.forEach(({ mealType, emoji }) => {
      const pinnableItem = createPinnableItem({
        id: 'food-1',
        name: 'Food',
        calories: 100,
        mealType,
      });

      expect(pinnableItem.iconEmoji).toBe(emoji);
    });
  });
});

describe('MAX_PINNED_ITEMS', () => {
  it('is a reasonable limit', () => {
    expect(MAX_PINNED_ITEMS).toBeGreaterThanOrEqual(4);
    expect(MAX_PINNED_ITEMS).toBeLessThanOrEqual(12);
  });

  it('is 8 items', () => {
    expect(MAX_PINNED_ITEMS).toBe(8);
  });
});
