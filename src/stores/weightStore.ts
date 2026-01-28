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
  isLoading: boolean;
  error: string | null;

  // Actions
  loadEntries: (limit?: number) => Promise<void>;
  loadEntriesForRange: (startDate: string, endDate: string) => Promise<void>;
  loadLatest: () => Promise<void>;
  loadTrendWeight: (date?: string) => Promise<void>;
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
  isLoading: false,
  error: null,

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
    set({ isLoading: true, error: null });
    try {
      const entries = await weightRepository.findByDateRange(startDate, endDate);
      set({ entries, isLoading: false });
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

  loadTrendWeight: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const trendWeight = await weightRepository.getTrendWeight(targetDate);
      set({ trendWeight, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate trend weight',
        isLoading: false,
      });
    }
  },

  addEntry: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const entry = await weightRepository.create(input);

      // Refresh entries and trend
      await Promise.all([
        get().loadEntries(),
        get().loadLatest(),
        get().loadTrendWeight(),
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
    set({ isLoading: true, error: null });
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
    set({ isLoading: true, error: null });
    try {
      await weightRepository.delete(id);

      // Refresh entries and trend
      await Promise.all([
        get().loadEntries(),
        get().loadLatest(),
        get().loadTrendWeight(),
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
