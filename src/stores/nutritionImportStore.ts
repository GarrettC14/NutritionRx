import { create } from 'zustand';
import {
  NutritionImportSession,
  ImportSource,
  ImportType,
  ImportProgress,
} from '@/types/nutritionImport';
import {
  pickCSVFile,
  analyzeNutritionCSV,
  reparseSession,
  executeNutritionImport,
} from '@/services/nutritionImport';

interface NutritionImportState {
  // State
  currentSession: NutritionImportSession | null;
  currentFileUri: string | null;
  progress: ImportProgress | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startSession: (source: ImportSource) => void;
  pickAndAnalyzeFile: () => Promise<boolean>;
  setImportType: (importType: ImportType) => Promise<void>;
  executeImport: () => Promise<boolean>;
  cancelSession: () => void;
  clearError: () => void;
}

export const useNutritionImportStore = create<NutritionImportState>((set, get) => ({
  currentSession: null,
  currentFileUri: null,
  progress: null,
  isLoading: false,
  error: null,

  startSession: (source) => {
    set({
      currentSession: null,
      currentFileUri: null,
      progress: null,
      isLoading: false,
      error: null,
    });
  },

  pickAndAnalyzeFile: async () => {
    set({ isLoading: true, error: null });

    try {
      const file = await pickCSVFile();
      if (!file) {
        set({ isLoading: false });
        return false;
      }

      const result = await analyzeNutritionCSV(file.uri, file.name);

      if (!result.success || !result.session) {
        set({
          isLoading: false,
          error: result.error || 'Failed to analyze file',
        });
        return false;
      }

      set({
        currentSession: result.session,
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

  executeImport: async () => {
    const { currentSession } = get();
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
        },
      });

      return true;
    } catch (error) {
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
      progress: null,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
