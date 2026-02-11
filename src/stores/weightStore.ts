import { create } from 'zustand';
import { weightRepository, CreateWeightInput } from '@/repositories';
import { WeightEntry } from '@/types/domain';
import {
  syncWeightToHealthKit,
  getWeightFromHealthKit,
} from '@/services/healthkit/healthKitNutritionSync';
import { useHealthKitStore } from './healthKitStore';

interface WeightState {
  // State
  entries: WeightEntry[];
  latestEntry: WeightEntry | null;
  trendWeight: number | null;
  earliestDate: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadEntries: (limit?: number) => Promise<void>;
  loadEntriesForRange: (startDate: string, endDate: string) => Promise<void>;
  loadLatest: () => Promise<void>;
  loadTrendWeight: () => Promise<void>;
  getLatestTrendWeight: () => number | null;
  loadEarliestDate: () => Promise<void>;
  addEntry: (input: CreateWeightInput) => Promise<WeightEntry>;
  updateEntry: (id: string, weightKg: number, notes?: string) => Promise<WeightEntry>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryByDate: (date: string) => Promise<WeightEntry | null>;

  // HealthKit integration
  importFromHealthKit: () => Promise<{ imported: boolean; weight?: number }>;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],
  latestEntry: null,
  trendWeight: null,
  earliestDate: null,
  isLoading: false,
  error: null,
  _cachedRangeKey: null as string | null,

  loadEntries: async (limit = 30) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await weightRepository.getRecent(limit);
      set({ entries, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load weight entries',
        isLoading: false,
      });
    }
  },

  loadEntriesForRange: async (startDate, endDate) => {
    const rangeKey = `${startDate}_${endDate}`;
    const state = get() as any;
    if (state._cachedRangeKey === rangeKey && state.entries.length > 0) {
      return; // Already loaded this range
    }
    set({ isLoading: true, error: null });
    try {
      const entries = await weightRepository.findByDateRange(startDate, endDate);
      set({ entries, isLoading: false, _cachedRangeKey: rangeKey } as any);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load weight entries',
        isLoading: false,
      });
    }
  },

  loadLatest: async () => {
    set({ isLoading: true, error: null });
    try {
      const latestEntry = await weightRepository.getLatest();
      set({ latestEntry, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load latest weight',
        isLoading: false,
      });
    }
  },

  loadTrendWeight: async () => {
    set({ isLoading: true, error: null });
    try {
      const latestEntry = get().latestEntry ?? await weightRepository.getLatest();
      if (latestEntry?.trendWeightKg != null) {
        set({ trendWeight: Math.round(latestEntry.trendWeightKg * 10) / 10, isLoading: false });
      } else {
        set({ trendWeight: null, isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load trend weight',
        isLoading: false,
      });
    }
  },

  loadEarliestDate: async () => {
    try {
      const earliestDate = await weightRepository.getEarliestDate();
      set({ earliestDate });
    } catch (error) {
      // Non-critical, silently ignore
    }
  },

  getLatestTrendWeight: () => {
    return get().trendWeight;
  },

  addEntry: async (input) => {
    set({ isLoading: true, error: null, _cachedRangeKey: null } as any);
    try {
      const entry = await weightRepository.create(input);

      // Refresh entries and trend
      await Promise.all([
        get().loadEntries(),
        get().loadLatest(),
        get().loadTrendWeight(),
        get().loadEarliestDate(),
      ]);

      set({ isLoading: false });

      // Sync to HealthKit if enabled (non-blocking)
      const { writeWeight, isConnected } = useHealthKitStore.getState();
      if (writeWeight && isConnected) {
        syncWeightToHealthKit(entry.weightKg, new Date(entry.date)).catch((error) => {
          console.error('Failed to sync weight to HealthKit:', error);
        });
      }

      return entry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add weight entry',
        isLoading: false,
      });
      throw error;
    }
  },

  updateEntry: async (id, weightKg, notes) => {
    set({ isLoading: true, error: null, _cachedRangeKey: null } as any);
    try {
      const entry = await weightRepository.update(id, { weightKg, notes });

      // Update entries in state
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? entry : e)),
        latestEntry: state.latestEntry?.id === id ? entry : state.latestEntry,
        isLoading: false,
      }));

      // Refresh trend weight
      get().loadTrendWeight();

      // Sync to HealthKit if enabled (non-blocking)
      const { writeWeight, isConnected } = useHealthKitStore.getState();
      if (writeWeight && isConnected) {
        syncWeightToHealthKit(entry.weightKg, new Date(entry.date)).catch((error) => {
          console.error('Failed to sync weight to HealthKit:', error);
        });
      }

      return entry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update weight entry',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteEntry: async (id) => {
    set({ isLoading: true, error: null, _cachedRangeKey: null } as any);
    try {
      await weightRepository.delete(id);

      // Refresh entries and trend
      await Promise.all([
        get().loadEntries(),
        get().loadLatest(),
        get().loadTrendWeight(),
        get().loadEarliestDate(),
      ]);

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete weight entry',
        isLoading: false,
      });
      throw error;
    }
  },

  getEntryByDate: async (date) => {
    try {
      return await weightRepository.findByDate(date);
    } catch (error) {
      return null;
    }
  },

  /**
   * Import the latest weight from HealthKit if it's newer than local data
   * This is useful for importing weight from smart scales synced to Apple Health
   */
  importFromHealthKit: async () => {
    const { readWeight, isConnected } = useHealthKitStore.getState();

    if (!readWeight || !isConnected) {
      return { imported: false };
    }

    try {
      const healthWeight = await getWeightFromHealthKit();

      if (!healthWeight) {
        return { imported: false };
      }

      // Get latest local entry
      const latestLocal = await weightRepository.getLatest();

      // Import if Health has newer data or no local data exists
      const shouldImport =
        !latestLocal || new Date(healthWeight.date) > new Date(latestLocal.date);

      if (shouldImport) {
        const dateKey = healthWeight.date.toISOString().split('T')[0];

        // Check if we already have an entry for this date
        const existingForDate = await weightRepository.findByDate(dateKey);

        if (existingForDate) {
          // Update existing entry
          await weightRepository.update(existingForDate.id, {
            weightKg: healthWeight.kg,
            notes: 'Imported from Apple Health',
          });
        } else {
          // Create new entry
          await weightRepository.create({
            weightKg: healthWeight.kg,
            date: dateKey,
            notes: 'Imported from Apple Health',
          });
        }

        // Refresh data
        await Promise.all([
          get().loadEntries(),
          get().loadLatest(),
          get().loadTrendWeight(),
          get().loadEarliestDate(),
        ]);

        return { imported: true, weight: healthWeight.kg };
      }

      return { imported: false };
    } catch (error) {
      console.error('Failed to import weight from HealthKit:', error);
      return { imported: false };
    }
  },
}));
