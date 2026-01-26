import { create } from 'zustand';
import { weightRepository, CreateWeightInput } from '@/repositories';
import { WeightEntry } from '@/types/domain';

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
}));
