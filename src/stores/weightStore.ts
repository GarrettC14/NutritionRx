import { create } from 'zustand';
import { Platform } from 'react-native';
import { weightRepository, CreateWeightInput } from '@/repositories';
import { WeightEntry } from '@/types/domain';
import { useHealthKitStore } from './healthKitStore';
import { useHealthConnectStore } from './healthConnectStore';
import { getDatabase } from '@/db/database';
import { getHealthSyncService } from '@/services/healthSyncService';
import { syncWeightToHealthPlatform } from '@/services/healthSyncWriteCoordinator';
import { getLastSyncTimestamp, hasExternalId, logHealthSync } from '@/repositories/healthSyncRepository';
import * as Sentry from '@sentry/react-native';
import { isExpectedError } from '@/utils/sentryHelpers';

interface WeightState {
  // State
  entries: WeightEntry[];
  latestEntry: WeightEntry | null;
  trendWeight: number | null;
  earliestDate: string | null;
  lastModified: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadEntries: (limit?: number) => Promise<void>;
  loadEntriesForRange: (startDate: string, endDate: string) => Promise<void>;
  loadLatest: () => Promise<void>;
  loadTrendWeight: () => Promise<void>;
  getLatestTrendWeight: () => number | null;
  loadEarliestDate: () => Promise<void>;
  addEntry: (input: CreateWeightInput, options?: { skipHealthSync?: boolean }) => Promise<WeightEntry>;
  updateEntry: (id: string, weightKg: number, notes?: string, options?: { skipHealthSync?: boolean }) => Promise<WeightEntry>;
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
  lastModified: 0,
  isLoading: false,
  error: null,
  _cachedRangeKey: null as string | null,

  loadEntries: async (limit = 30) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await weightRepository.getRecent(limit);
      set({ entries, isLoading: false });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'load' } });
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
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'load-range' } });
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
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'load-latest' } });
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
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'load-trend' } });
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
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'load-earliest-date' } });
      // Non-critical, silently ignore
    }
  },

  getLatestTrendWeight: () => {
    return get().trendWeight;
  },

  addEntry: async (input, options = {}) => {
    const { skipHealthSync = false } = options;
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

      set({ isLoading: false, lastModified: Date.now() });

      // Sync to health platform via coordinator (non-blocking)
      if (!skipHealthSync) {
        void syncWeightToHealthPlatform({
          weightKg: entry.weightKg,
          timestamp: `${entry.date}T12:00:00.000Z`,
          localRecordId: entry.id,
          localRecordType: 'weight_entry',
        }).catch((error) => {
          if (__DEV__) console.warn('[HealthSync] weight addEntry write failed', error);
        });
      }

      return entry;
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'add-entry' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to add weight entry',
        isLoading: false,
      });
      throw error;
    }
  },

  updateEntry: async (id, weightKg, notes, options = {}) => {
    const { skipHealthSync = false } = options;
    set({ isLoading: true, error: null, _cachedRangeKey: null } as any);
    try {
      const entry = await weightRepository.update(id, { weightKg, notes });

      // Update entries in state
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? entry : e)),
        latestEntry: state.latestEntry?.id === id ? entry : state.latestEntry,
        isLoading: false,
        lastModified: Date.now(),
      }));

      // Refresh trend weight
      get().loadTrendWeight();

      // Sync to health platform via coordinator (non-blocking)
      if (!skipHealthSync) {
        void syncWeightToHealthPlatform({
          weightKg: entry.weightKg,
          timestamp: `${entry.date}T12:00:00.000Z`,
          localRecordId: entry.id,
          localRecordType: 'weight_entry',
        }).catch((error) => {
          if (__DEV__) console.warn('[HealthSync] weight updateEntry write failed', error);
        });
      }

      return entry;
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'update-entry' } });
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

      set({ isLoading: false, lastModified: Date.now() });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'delete-entry' } });
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
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'get-by-date' } });
      return null;
    }
  },

  /**
   * Import weight from connected health platform with 3-layer dedup:
   * Layer 1: Skip own writes (source bundle check — may be undefined)
   * Layer 2: Skip already-imported external IDs
   * Layer 3: Skip entries within +/-5 minutes of existing weight
   */
  importFromHealthKit: async () => {
    const service = getHealthSyncService();
    if (!service?.isConnected()) return { imported: false };

    const platform = service.getPlatformName();
    const APP_BUNDLE_ID = 'com.cascadesoftware.nutritionrx';

    const readEnabled = Platform.OS === 'ios'
      ? useHealthKitStore.getState().readWeight
      : useHealthConnectStore.getState().readWeightEnabled;

    if (!readEnabled) return { imported: false };

    try {
      const lastSync = await getLastSyncTimestamp(platform, 'read', 'weight');
      const since = lastSync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const samples = await service.readWeightChanges(since);

      let imported = false;
      let importedWeight: number | undefined;

      for (const sample of samples) {
        if (!Number.isFinite(sample.valueKg) || sample.valueKg <= 0) continue;

        // ═══ LAYER 1: Skip own writes (source bundle check) ═══
        if (sample.sourceBundle && sample.sourceBundle === APP_BUNDLE_ID) continue;

        // ═══ LAYER 2: Skip already-imported external IDs ═══
        if (await hasExternalId(platform, 'weight', sample.externalId)) {
          await logHealthSync({
            platform,
            direction: 'read',
            data_type: 'weight',
            local_record_type: 'weight_entry',
            external_id: sample.externalId,
            status: 'skipped_duplicate',
          });
          continue;
        }

        // ═══ LAYER 3: Skip entries within +/-5 minutes of existing weight ═══
        const sampleTs = new Date(sample.timestamp).getTime();
        const windowStart = new Date(sampleTs - 5 * 60 * 1000).toISOString();
        const windowEnd = new Date(sampleTs + 5 * 60 * 1000).toISOString();

        const db = getDatabase();
        const nearby = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM weight_entries WHERE created_at BETWEEN ? AND ?`,
          [windowStart, windowEnd]
        );

        if (nearby?.id) {
          await logHealthSync({
            platform,
            direction: 'read',
            data_type: 'weight',
            local_record_type: 'weight_entry',
            external_id: sample.externalId,
            status: 'skipped_duplicate',
          });
          continue;
        }

        // ═══ IMPORT (skipHealthSync prevents write-back loop) ═══
        const date = new Date(sample.timestamp).toISOString().split('T')[0];
        const created = await get().addEntry(
          { date, weightKg: sample.valueKg, notes: 'Imported from health platform' },
          { skipHealthSync: true }
        );

        await logHealthSync({
          platform,
          direction: 'read',
          data_type: 'weight',
          local_record_id: created.id,
          local_record_type: 'weight_entry',
          external_id: sample.externalId,
          status: 'success',
        });

        imported = true;
        importedWeight = created.weightKg;
      }

      if (imported) {
        await Promise.all([
          get().loadEntries(),
          get().loadLatest(),
          get().loadTrendWeight(),
          get().loadEarliestDate(),
        ]);
      }

      return { imported, weight: importedWeight };
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'weight', action: 'import-healthkit' } });
      if (__DEV__) console.error('Failed to import weight from health platform:', error);
      return { imported: false };
    }
  },
}));
