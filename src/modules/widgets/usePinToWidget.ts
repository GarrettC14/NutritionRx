/**
 * usePinToWidget Hook
 * React hook for pinning foods to widgets
 */

import { useState, useEffect, useCallback } from 'react';
import {
  pinToWidgetService,
  PinnedItem,
  PinResult,
  MAX_PINNED_ITEMS,
  createPinnableItem,
} from './pinToWidget';

interface UsePinToWidgetReturn {
  /**
   * List of pinned items
   */
  pinnedItems: PinnedItem[];

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Pin a food item
   */
  pinItem: (item: Omit<PinnedItem, 'pinnedAt'>) => Promise<PinResult>;

  /**
   * Unpin a food item
   */
  unpinItem: (itemId: string) => Promise<PinResult>;

  /**
   * Toggle pin status
   */
  togglePin: (item: Omit<PinnedItem, 'pinnedAt'>) => Promise<PinResult>;

  /**
   * Check if an item is pinned
   */
  isPinned: (itemId: string) => boolean;

  /**
   * Reorder pinned items
   */
  reorderItems: (itemIds: string[]) => Promise<void>;

  /**
   * Clear all pinned items
   */
  clearAll: () => Promise<void>;

  /**
   * Refresh the list
   */
  refresh: () => Promise<void>;

  /**
   * Maximum allowed pinned items
   */
  maxItems: number;

  /**
   * Whether max items limit has been reached
   */
  isMaxReached: boolean;
}

/**
 * Hook for managing pinned widget items
 */
export function usePinToWidget(): UsePinToWidgetReturn {
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pinned items on mount
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const items = await pinToWidgetService.getPinnedItems();
      setPinnedItems(items);
    } catch (err) {
      setError('Failed to load pinned items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pinItem = useCallback(
    async (item: Omit<PinnedItem, 'pinnedAt'>): Promise<PinResult> => {
      const result = await pinToWidgetService.pinItem(item);

      if (result.success) {
        setPinnedItems((prev) => [...prev, result.item!]);
      }

      return result;
    },
    []
  );

  const unpinItem = useCallback(async (itemId: string): Promise<PinResult> => {
    const result = await pinToWidgetService.unpinItem(itemId);

    if (result.success) {
      setPinnedItems((prev) => prev.filter((i) => i.id !== itemId));
    }

    return result;
  }, []);

  const togglePin = useCallback(
    async (item: Omit<PinnedItem, 'pinnedAt'>): Promise<PinResult> => {
      const result = await pinToWidgetService.togglePin(item);

      if (result.success) {
        // Refresh the list to reflect the change
        await loadItems();
      }

      return result;
    },
    [loadItems]
  );

  const isPinned = useCallback(
    (itemId: string): boolean => {
      return pinnedItems.some((i) => i.id === itemId);
    },
    [pinnedItems]
  );

  const reorderItems = useCallback(async (itemIds: string[]): Promise<void> => {
    await pinToWidgetService.reorderItems(itemIds);

    // Optimistically update the order locally
    const itemMap = new Map(pinnedItems.map((item) => [item.id, item]));
    const reordered = itemIds
      .map((id) => itemMap.get(id))
      .filter((item): item is PinnedItem => item !== undefined);

    setPinnedItems(reordered);
  }, [pinnedItems]);

  const clearAll = useCallback(async (): Promise<void> => {
    await pinToWidgetService.clearAll();
    setPinnedItems([]);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await loadItems();
  }, [loadItems]);

  return {
    pinnedItems,
    isLoading,
    error,
    pinItem,
    unpinItem,
    togglePin,
    isPinned,
    reorderItems,
    clearAll,
    refresh,
    maxItems: MAX_PINNED_ITEMS,
    isMaxReached: pinnedItems.length >= MAX_PINNED_ITEMS,
  };
}

/**
 * Hook for checking pin status of a single item
 * Lighter weight than usePinToWidget when you only need to check/toggle
 */
export function usePinStatus(itemId: string) {
  const [isPinned, setIsPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, [itemId]);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const pinned = await pinToWidgetService.isPinned(itemId);
      setIsPinned(pinned);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  const toggle = useCallback(
    async (item: Omit<PinnedItem, 'pinnedAt'>): Promise<PinResult> => {
      const result = await pinToWidgetService.togglePin(item);
      if (result.success) {
        setIsPinned(!isPinned);
      }
      return result;
    },
    [isPinned]
  );

  return {
    isPinned,
    isLoading,
    toggle,
    refresh: checkStatus,
  };
}

// Re-export for convenience
export { createPinnableItem, MAX_PINNED_ITEMS };
export type { PinnedItem, PinResult };
