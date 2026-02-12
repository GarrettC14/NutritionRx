/**
 * Pin-to-Widget Feature
 * Allows users to pin favorite foods for quick access from widgets
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { widgetDataService } from './widgetDataService';

// Storage key for pinned items
const PINNED_ITEMS_KEY = '@nutritionrx/pinned_widget_items';

// Maximum number of pinned items
export const MAX_PINNED_ITEMS = 8;

/**
 * Pinned item representing a food that can be quick-added from widget
 */
export interface PinnedItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  pinnedAt: string; // ISO date string
  iconEmoji?: string;
}

/**
 * Result of pinning operation
 */
export interface PinResult {
  success: boolean;
  message: string;
  item?: PinnedItem;
}

/**
 * Pin-to-Widget Service
 * Manages pinned items for widget quick access
 */
class PinToWidgetService {
  private cachedItems: PinnedItem[] | null = null;

  /**
   * Get all pinned items
   */
  async getPinnedItems(): Promise<PinnedItem[]> {
    if (this.cachedItems) {
      return this.cachedItems;
    }

    try {
      const data = await AsyncStorage.getItem(PINNED_ITEMS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.cachedItems = parsed;
          return this.cachedItems;
        }
      }
    } catch (error) {
      if (__DEV__) console.warn('Failed to load pinned items:', error);
    }

    return [];
  }

  /**
   * Pin a food item for widget quick access
   */
  async pinItem(item: Omit<PinnedItem, 'pinnedAt'>): Promise<PinResult> {
    const items = await this.getPinnedItems();

    // Check if already pinned
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex !== -1) {
      return {
        success: false,
        message: 'This item is already pinned',
        item: items[existingIndex],
      };
    }

    // Check max items limit
    if (items.length >= MAX_PINNED_ITEMS) {
      return {
        success: false,
        message: `Maximum ${MAX_PINNED_ITEMS} items can be pinned. Unpin an item to add another.`,
      };
    }

    // Create pinned item
    const pinnedItem: PinnedItem = {
      ...item,
      pinnedAt: new Date().toISOString(),
    };

    // Add to list
    const updatedItems = [...items, pinnedItem];
    await this.saveItems(updatedItems);

    // Sync with widgets
    await this.syncToWidgets(updatedItems);

    return {
      success: true,
      message: 'Item pinned to widget',
      item: pinnedItem,
    };
  }

  /**
   * Unpin a food item
   */
  async unpinItem(itemId: string): Promise<PinResult> {
    const items = await this.getPinnedItems();

    const existingIndex = items.findIndex((i) => i.id === itemId);
    if (existingIndex === -1) {
      return {
        success: false,
        message: 'Item is not pinned',
      };
    }

    const removedItem = items[existingIndex];
    const updatedItems = items.filter((i) => i.id !== itemId);
    await this.saveItems(updatedItems);

    // Sync with widgets
    await this.syncToWidgets(updatedItems);

    return {
      success: true,
      message: 'Item unpinned from widget',
      item: removedItem,
    };
  }

  /**
   * Check if an item is pinned
   */
  async isPinned(itemId: string): Promise<boolean> {
    const items = await this.getPinnedItems();
    return items.some((i) => i.id === itemId);
  }

  /**
   * Toggle pin status of an item
   */
  async togglePin(item: Omit<PinnedItem, 'pinnedAt'>): Promise<PinResult> {
    const isPinned = await this.isPinned(item.id);

    if (isPinned) {
      return this.unpinItem(item.id);
    } else {
      return this.pinItem(item);
    }
  }

  /**
   * Reorder pinned items
   */
  async reorderItems(itemIds: string[]): Promise<void> {
    const items = await this.getPinnedItems();

    // Create map for O(1) lookup
    const itemMap = new Map(items.map((item) => [item.id, item]));

    // Reorder based on new order
    const reorderedItems: PinnedItem[] = [];
    for (const id of itemIds) {
      const item = itemMap.get(id);
      if (item) {
        reorderedItems.push(item);
      }
    }

    // Add any items not in the new order at the end
    for (const item of items) {
      if (!itemIds.includes(item.id)) {
        reorderedItems.push(item);
      }
    }

    await this.saveItems(reorderedItems);
    await this.syncToWidgets(reorderedItems);
  }

  /**
   * Clear all pinned items
   */
  async clearAll(): Promise<void> {
    this.cachedItems = [];
    await AsyncStorage.removeItem(PINNED_ITEMS_KEY);
    await widgetDataService.reloadWidgets();
  }

  /**
   * Save items to storage
   */
  private async saveItems(items: PinnedItem[]): Promise<void> {
    this.cachedItems = items;

    try {
      await AsyncStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify(items));
    } catch (error) {
      if (__DEV__) console.warn('Failed to save pinned items:', error);
    }
  }

  /**
   * Sync pinned items to native widgets
   */
  private async syncToWidgets(items: PinnedItem[]): Promise<void> {
    // Widgets will read pinned items from SharedPreferences/App Groups
    // This triggers a reload so they can fetch the latest data
    await widgetDataService.reloadWidgets();
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cachedItems = null;
  }
}

// Export singleton instance
export const pinToWidgetService = new PinToWidgetService();

/**
 * Helper to create a pinnable item from a food entry
 */
export function createPinnableItem(food: {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: number;
  servingUnit?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}): Omit<PinnedItem, 'pinnedAt'> {
  return {
    id: food.id,
    name: food.name,
    calories: food.calories,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0,
    servingSize: food.servingSize || 1,
    servingUnit: food.servingUnit || 'serving',
    mealType: food.mealType,
    iconEmoji: getMealEmoji(food.mealType),
  };
}

/**
 * Get emoji for meal type
 */
function getMealEmoji(mealType?: string): string {
  switch (mealType) {
    case 'breakfast':
      return '🌅';
    case 'lunch':
      return '☀️';
    case 'dinner':
      return '🌙';
    case 'snack':
      return '🍃';
    default:
      return '🍽️';
  }
}
