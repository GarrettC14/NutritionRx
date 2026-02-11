import { create } from 'zustand';
import { getDatabase } from '@/db/database';
import * as FileSystem from 'expo-file-system';
import {
  ProgressPhoto,
  PhotoCategory,
  PhotoTimelineEntry,
  PhotoTimelineFilter,
  PhotoStats,
  ComparisonType,
} from '@/types/progressPhotos';

// ============================================================
// Types
// ============================================================

interface ProgressPhotoState {
  // Photo data
  photos: ProgressPhoto[];
  timeline: PhotoTimelineEntry[];

  // Selection state
  selectedPhotoId: string | null;
  comparisonPhoto1Id: string | null;
  comparisonPhoto2Id: string | null;
  comparisonMode: ComparisonType;

  // Filter state
  filter: PhotoTimelineFilter;

  // Loading states
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Stats
  stats: PhotoStats;

  // Actions
  loadPhotos: () => Promise<void>;
  addPhoto: (photo: Omit<ProgressPhoto, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePhoto: (id: string, updates: Partial<ProgressPhoto>) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  deleteAllPhotos: () => Promise<void>;

  // Selection actions
  selectPhoto: (id: string | null) => void;
  setComparisonPhoto1: (id: string | null) => void;
  setComparisonPhoto2: (id: string | null) => void;
  setComparisonMode: (mode: ComparisonType) => void;
  clearComparison: () => void;

  // Filter actions
  setFilter: (filter: Partial<PhotoTimelineFilter>) => void;
  clearFilter: () => void;

  // Getters
  getPhotoById: (id: string) => ProgressPhoto | undefined;
  getPhotosByDate: (date: string) => ProgressPhoto[];
  getPhotosByCategory: (category: PhotoCategory) => ProgressPhoto[];
  getFirstPhoto: () => ProgressPhoto | undefined;
  getLatestPhoto: () => ProgressPhoto | undefined;
  getPublicPhotos: () => ProgressPhoto[];
  getFilteredPhotos: () => ProgressPhoto[];
}

// ============================================================
// Helper Functions
// ============================================================

const generateId = (): string => {
  return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const buildTimeline = (photos: ProgressPhoto[]): PhotoTimelineEntry[] => {
  const byDate = new Map<string, ProgressPhoto[]>();

  for (const photo of photos) {
    const existing = byDate.get(photo.date) || [];
    existing.push(photo);
    byDate.set(photo.date, existing);
  }

  // Sort dates descending
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  // Find first date for calculating days
  const firstDate = sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1]) : null;

  return sortedDates.map(date => {
    const datePhotos = byDate.get(date) || [];
    const daysSinceFirst = firstDate
      ? Math.floor((new Date(date).getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      date,
      photos: datePhotos.sort((a, b) => b.timestamp - a.timestamp),
      weight: datePhotos[0]?.weight,
      daysSinceFirst,
    };
  });
};

const calculateStats = (photos: ProgressPhoto[]): PhotoStats => {
  if (photos.length === 0) {
    return {
      totalPhotos: 0,
      photosByCategory: { front: 0, side: 0, back: 0, other: 0 },
      daysCovered: 0,
    };
  }

  const byCategory: Record<PhotoCategory, number> = { front: 0, side: 0, back: 0, other: 0 };
  const uniqueDates = new Set<string>();
  let firstDate: string | undefined;
  let lastDate: string | undefined;

  for (const photo of photos) {
    byCategory[photo.category]++;
    uniqueDates.add(photo.date);

    if (!firstDate || photo.date < firstDate) firstDate = photo.date;
    if (!lastDate || photo.date > lastDate) lastDate = photo.date;
  }

  return {
    totalPhotos: photos.length,
    photosByCategory: byCategory,
    firstPhotoDate: firstDate,
    lastPhotoDate: lastDate,
    daysCovered: uniqueDates.size,
  };
};

const applyFilter = (photos: ProgressPhoto[], filter: PhotoTimelineFilter): ProgressPhoto[] => {
  return photos.filter(photo => {
    if (filter.category !== 'all' && photo.category !== filter.category) {
      return false;
    }
    if (filter.startDate && photo.date < filter.startDate) {
      return false;
    }
    if (filter.endDate && photo.date > filter.endDate) {
      return false;
    }
    return true;
  });
};

/**
 * Rebuild all derived state (timeline + stats) from the canonical photos array.
 * Single place to ensure filtered/unfiltered consistency.
 */
const derivedState = (photos: ProgressPhoto[], filter: PhotoTimelineFilter) => ({
  timeline: buildTimeline(applyFilter(photos, filter)),
  stats: calculateStats(photos),
});

// ============================================================
// Store
// ============================================================

export const useProgressPhotoStore = create<ProgressPhotoState>((set, get) => ({
  photos: [],
  timeline: [],
  selectedPhotoId: null,
  comparisonPhoto1Id: null,
  comparisonPhoto2Id: null,
  comparisonMode: 'side_by_side',
  filter: { category: 'all' },
  isLoading: false,
  isLoaded: false,
  error: null,
  stats: {
    totalPhotos: 0,
    photosByCategory: { front: 0, side: 0, back: 0, other: 0 },
    daysCovered: 0,
  },

  loadPhotos: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      const db = getDatabase();

      const rows = await db.getAllAsync<{
        id: string;
        local_uri: string;
        thumbnail_uri: string | null;
        date: string;
        timestamp: number;
        category: string;
        notes: string | null;
        weight_kg: number | null;
        is_private: number;
        created_at: string;
        updated_at: string;
      }>(`
        SELECT id, local_uri, thumbnail_uri, date, timestamp, category,
               notes, weight_kg, is_private, created_at, updated_at
        FROM progress_photos
        ORDER BY timestamp DESC
      `);

      const photos: ProgressPhoto[] = rows.map(row => ({
        id: row.id,
        localUri: row.local_uri,
        thumbnailUri: row.thumbnail_uri ?? undefined,
        date: row.date,
        timestamp: row.timestamp,
        category: row.category as PhotoCategory,
        notes: row.notes ?? undefined,
        weight: row.weight_kg ?? undefined,
        isPrivate: row.is_private === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const { filter } = get();

      set({
        photos,
        ...derivedState(photos, filter),
        isLoading: false,
        isLoaded: true,
      });
    } catch (error) {
      if (__DEV__) console.warn('[ProgressPhotos] loadPhotos failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Something went wrong',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  addPhoto: async (photoData) => {
    const id = generateId();
    const now = new Date().toISOString();

    try {
      const db = getDatabase();

      await db.runAsync(
        `INSERT INTO progress_photos
         (id, local_uri, thumbnail_uri, date, timestamp, category, notes, weight_kg, is_private, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          photoData.localUri,
          photoData.thumbnailUri ?? null,
          photoData.date,
          photoData.timestamp,
          photoData.category,
          photoData.notes ?? null,
          photoData.weight ?? null,
          photoData.isPrivate ? 1 : 0,
          now,
          now,
        ]
      );

      const newPhoto: ProgressPhoto = {
        ...photoData,
        id,
        createdAt: now,
        updatedAt: now,
      };

      const { photos, filter } = get();
      const updatedPhotos = [newPhoto, ...photos];

      set({
        photos: updatedPhotos,
        ...derivedState(updatedPhotos, filter),
      });

      return id;
    } catch (error) {
      if (__DEV__) console.warn('[ProgressPhotos] addPhoto failed:', error);
      throw error;
    }
  },

  updatePhoto: async (id, updates) => {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      const updateFields: string[] = ['updated_at = ?'];
      const updateValues: (string | number | null)[] = [now];

      if (updates.notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(updates.notes ?? null);
      }
      if (updates.category !== undefined) {
        updateFields.push('category = ?');
        updateValues.push(updates.category);
      }
      if (updates.isPrivate !== undefined) {
        updateFields.push('is_private = ?');
        updateValues.push(updates.isPrivate ? 1 : 0);
      }
      if (updates.weight !== undefined) {
        updateFields.push('weight_kg = ?');
        updateValues.push(updates.weight ?? null);
      }

      updateValues.push(id);

      await db.runAsync(
        `UPDATE progress_photos SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      const { photos, filter } = get();
      const updatedPhotos = photos.map(photo =>
        photo.id === id
          ? { ...photo, ...updates, updatedAt: now }
          : photo
      );

      set({
        photos: updatedPhotos,
        ...derivedState(updatedPhotos, filter),
      });
    } catch (error) {
      if (__DEV__) console.warn('[ProgressPhotos] updatePhoto failed:', error);
      throw error;
    }
  },

  deletePhoto: async (id) => {
    try {
      const { photos } = get();
      const photo = photos.find(p => p.id === id);

      if (photo) {
        // Delete the actual file
        try {
          await FileSystem.deleteAsync(photo.localUri, { idempotent: true });
          if (photo.thumbnailUri) {
            await FileSystem.deleteAsync(photo.thumbnailUri, { idempotent: true });
          }
        } catch {
          // File might not exist, continue anyway
        }
      }

      const db = getDatabase();
      await db.runAsync('DELETE FROM progress_photos WHERE id = ?', [id]);

      const { filter, selectedPhotoId, comparisonPhoto1Id, comparisonPhoto2Id } = get();
      const updatedPhotos = photos.filter(p => p.id !== id);

      set({
        photos: updatedPhotos,
        ...derivedState(updatedPhotos, filter),
        // Clear selections if deleted photo was selected
        selectedPhotoId: selectedPhotoId === id ? null : selectedPhotoId,
        comparisonPhoto1Id: comparisonPhoto1Id === id ? null : comparisonPhoto1Id,
        comparisonPhoto2Id: comparisonPhoto2Id === id ? null : comparisonPhoto2Id,
      });
    } catch (error) {
      if (__DEV__) console.warn('[ProgressPhotos] deletePhoto failed:', error);
      throw error;
    }
  },

  deleteAllPhotos: async () => {
    try {
      const { photos } = get();

      // Delete all files
      for (const photo of photos) {
        try {
          await FileSystem.deleteAsync(photo.localUri, { idempotent: true });
          if (photo.thumbnailUri) {
            await FileSystem.deleteAsync(photo.thumbnailUri, { idempotent: true });
          }
        } catch {
          // Continue even if file deletion fails
        }
      }

      const db = getDatabase();
      await db.runAsync('DELETE FROM progress_photos');

      set({
        photos: [],
        timeline: [],
        stats: {
          totalPhotos: 0,
          photosByCategory: { front: 0, side: 0, back: 0, other: 0 },
          daysCovered: 0,
        },
        selectedPhotoId: null,
        comparisonPhoto1Id: null,
        comparisonPhoto2Id: null,
      });
    } catch (error) {
      if (__DEV__) console.warn('[ProgressPhotos] deleteAllPhotos failed:', error);
      throw error;
    }
  },

  selectPhoto: (id) => {
    set({ selectedPhotoId: id });
  },

  setComparisonPhoto1: (id) => {
    set({ comparisonPhoto1Id: id });
  },

  setComparisonPhoto2: (id) => {
    set({ comparisonPhoto2Id: id });
  },

  setComparisonMode: (mode) => {
    set({ comparisonMode: mode });
  },

  clearComparison: () => {
    set({
      comparisonPhoto1Id: null,
      comparisonPhoto2Id: null,
    });
  },

  setFilter: (filterUpdate) => {
    const { filter, photos } = get();
    const newFilter = { ...filter, ...filterUpdate };
    const filteredPhotos = applyFilter(photos, newFilter);

    set({
      filter: newFilter,
      timeline: buildTimeline(filteredPhotos),
    });
  },

  clearFilter: () => {
    const { photos } = get();
    const defaultFilter: PhotoTimelineFilter = { category: 'all' };

    set({
      filter: defaultFilter,
      timeline: buildTimeline(photos),
    });
  },

  getPhotoById: (id) => {
    return get().photos.find(p => p.id === id);
  },

  getPhotosByDate: (date) => {
    return get().photos.filter(p => p.date === date);
  },

  getPhotosByCategory: (category) => {
    return get().photos.filter(p => p.category === category);
  },

  getFirstPhoto: () => {
    const { photos } = get();
    if (photos.length === 0) return undefined;
    return photos.reduce((oldest, current) =>
      current.timestamp < oldest.timestamp ? current : oldest
    );
  },

  getLatestPhoto: () => {
    const { photos } = get();
    if (photos.length === 0) return undefined;
    return photos.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  },

  getPublicPhotos: () => {
    return get().photos.filter(p => !p.isPrivate);
  },

  getFilteredPhotos: () => {
    const { photos, filter } = get();
    return applyFilter(photos, filter);
  },
}));
