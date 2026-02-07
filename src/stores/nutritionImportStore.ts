import { create } from 'zustand';
import {
  NutritionImportSession,
  ImportSource,
  ImportType,
  ImportProgress,
  ConflictResolution,
} from '@/types/nutritionImport';
import {
  pickCSVFile,
  analyzeNutritionCSV,
  reparseSession,
  executeNutritionImport,
  findExistingImportDates,
  cleanupCachedFile,
} from '@/services/nutritionImport';

interface NutritionImportState {
  // State
  currentSession: NutritionImportSession | null;
  currentFileUri: string | null;
  selectedSource: ImportSource | null;
  progress: ImportProgress | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startSession: (source: ImportSource) => void;
  pickAndAnalyzeFile: (source?: ImportSource) => Promise<boolean>;
  setImportType: (importType: ImportType) => Promise<void>;
  setConflictResolution: (resolution: ConflictResolution) => void;
  executeImport: () => Promise<boolean>;
  cancelSession: () => void;
  clearError: () => void;
}

export const useNutritionImportStore = create<NutritionImportState>((set, get) => ({
  currentSession: null,
  currentFileUri: null,
  selectedSource: null,
  progress: null,
  isLoading: false,
  error: null,

  startSession: (source) => {
    set({
      currentSession: null,
      currentFileUri: null,
      selectedSource: source,
      progress: null,
      isLoading: false,
      error: null,
    });
  },

  pickAndAnalyzeFile: async (source) => {
    set({ isLoading: true, error: null });

    try {
      const file = await pickCSVFile();
      if (!file) {
        set({ isLoading: false });
        return false;
      }

      const selectedSource = source || get().selectedSource;
      const result = await analyzeNutritionCSV(file.uri, file.name, selectedSource ?? undefined);

      if (!result.success || !result.session) {
        set({
          isLoading: false,
          error: result.error || 'Failed to analyze file',
        });
        return false;
      }

      // Check for duplicate dates
      const session = result.session;
      const allDates = session.parsedDays.map((d) => {
        const year = d.date.getFullYear();
        const month = String(d.date.getMonth() + 1).padStart(2, '0');
        const day = String(d.date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });
      const duplicateDates = await findExistingImportDates(allDates);
      session.duplicateDates = duplicateDates;

      set({
        currentSession: session,
        currentFileUri: file.uri,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
      return false;
    }
  },

  setImportType: async (importType) => {
    const { currentSession, currentFileUri } = get();
    if (!currentSession || !currentFileUri) return;

    set({ isLoading: true, error: null });

    try {
      const updatedSession = await reparseSession(currentFileUri, currentSession, importType);
      set({
        currentSession: updatedSession,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update import type',
      });
    }
  },

  setConflictResolution: (resolution) => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({
      currentSession: { ...currentSession, conflictResolution: resolution },
    });
  },

  executeImport: async () => {
    const { currentSession, currentFileUri } = get();
    if (!currentSession) return false;

    set({
      isLoading: true,
      error: null,
      currentSession: { ...currentSession, status: 'importing' },
    });

    try {
      const result = await executeNutritionImport(currentSession, (progress) => {
        set({ progress });
      });

      // Clean up cached file regardless of success/failure
      await cleanupCachedFile(currentFileUri);

      if (!result.success) {
        set({
          isLoading: false,
          error: result.error || 'Failed to import data',
          currentSession: { ...currentSession, status: 'error', error: result.error },
        });
        return false;
      }

      set({
        isLoading: false,
        currentSession: {
          ...currentSession,
          status: 'completed',
          importedDays: result.importedDays,
          skippedDays: result.skippedDays,
        },
      });

      return true;
    } catch (error) {
      await cleanupCachedFile(currentFileUri);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set({
        isLoading: false,
        error: errorMessage,
        currentSession: { ...currentSession, status: 'error', error: errorMessage },
      });
      return false;
    }
  },

  cancelSession: () => {
    set({
      currentSession: null,
      currentFileUri: null,
      selectedSource: null,
      progress: null,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
