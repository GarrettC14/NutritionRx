import { useNutritionImportStore } from '@/stores/nutritionImportStore';

// Mock the import service
jest.mock('@/services/nutritionImport', () => ({
  pickCSVFile: jest.fn(),
  analyzeNutritionCSV: jest.fn(),
  reparseSession: jest.fn(),
  executeNutritionImport: jest.fn(),
}));

import {
  pickCSVFile,
  analyzeNutritionCSV,
  reparseSession,
  executeNutritionImport,
} from '@/services/nutritionImport';

const mockPickCSVFile = pickCSVFile as jest.MockedFunction<typeof pickCSVFile>;
const mockAnalyzeNutritionCSV = analyzeNutritionCSV as jest.MockedFunction<typeof analyzeNutritionCSV>;
const mockReparseSession = reparseSession as jest.MockedFunction<typeof reparseSession>;
const mockExecuteNutritionImport = executeNutritionImport as jest.MockedFunction<typeof executeNutritionImport>;

describe('useNutritionImportStore', () => {
  beforeEach(() => {
    // Reset the store state
    useNutritionImportStore.setState({
      currentSession: null,
      currentFileUri: null,
      progress: null,
      isLoading: false,
      error: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null currentSession', () => {
      expect(useNutritionImportStore.getState().currentSession).toBeNull();
    });

    it('should have null currentFileUri', () => {
      expect(useNutritionImportStore.getState().currentFileUri).toBeNull();
    });

    it('should have null progress', () => {
      expect(useNutritionImportStore.getState().progress).toBeNull();
    });

    it('should not be loading', () => {
      expect(useNutritionImportStore.getState().isLoading).toBe(false);
    });

    it('should have no error', () => {
      expect(useNutritionImportStore.getState().error).toBeNull();
    });
  });

  describe('startSession', () => {
    it('should reset all state', () => {
      useNutritionImportStore.setState({
        error: 'Some error',
        isLoading: true,
      });

      useNutritionImportStore.getState().startSession('myfitnesspal');

      expect(useNutritionImportStore.getState().currentSession).toBeNull();
      expect(useNutritionImportStore.getState().currentFileUri).toBeNull();
      expect(useNutritionImportStore.getState().progress).toBeNull();
      expect(useNutritionImportStore.getState().isLoading).toBe(false);
      expect(useNutritionImportStore.getState().error).toBeNull();
    });
  });

  describe('pickAndAnalyzeFile', () => {
    it('should return false when user cancels file picker', async () => {
      mockPickCSVFile.mockResolvedValue(null);

      const success = await useNutritionImportStore.getState().pickAndAnalyzeFile();

      expect(success).toBe(false);
      expect(useNutritionImportStore.getState().currentSession).toBeNull();
    });

    it('should set error when analysis fails', async () => {
      mockPickCSVFile.mockResolvedValue({ uri: 'file://test.csv', name: 'test.csv' });
      mockAnalyzeNutritionCSV.mockResolvedValue({
        success: false,
        error: 'Could not detect format',
      });

      await useNutritionImportStore.getState().pickAndAnalyzeFile();

      expect(useNutritionImportStore.getState().error).toBe('Could not detect format');
      expect(useNutritionImportStore.getState().currentSession).toBeNull();
    });

    it('should set session when analysis succeeds', async () => {
      const mockSession = {
        id: 'test-id',
        source: 'myfitnesspal' as const,
        importType: 'daily_totals' as const,
        status: 'ready' as const,
        fileName: 'test.csv',
        parsedDays: [],
        totalDays: 5,
        importedDays: 0,
        createdAt: new Date(),
      };

      mockPickCSVFile.mockResolvedValue({ uri: 'file://test.csv', name: 'test.csv' });
      mockAnalyzeNutritionCSV.mockResolvedValue({
        success: true,
        session: mockSession,
      });

      const success = await useNutritionImportStore.getState().pickAndAnalyzeFile();

      expect(success).toBe(true);
      expect(useNutritionImportStore.getState().currentSession).toEqual(mockSession);
      expect(useNutritionImportStore.getState().currentFileUri).toBe('file://test.csv');
    });

    it('should set isLoading during analysis', async () => {
      mockPickCSVFile.mockResolvedValue({ uri: 'file://test.csv', name: 'test.csv' });
      mockAnalyzeNutritionCSV.mockImplementation(async () => {
        // Check loading state during analysis
        expect(useNutritionImportStore.getState().isLoading).toBe(true);
        return { success: false, error: 'Error' };
      });

      await useNutritionImportStore.getState().pickAndAnalyzeFile();

      expect(useNutritionImportStore.getState().isLoading).toBe(false);
    });
  });

  describe('setImportType', () => {
    it('should do nothing when no session exists', async () => {
      await useNutritionImportStore.getState().setImportType('individual_foods');

      expect(mockReparseSession).not.toHaveBeenCalled();
    });

    it('should update session with new import type', async () => {
      const mockSession = {
        id: 'test-id',
        source: 'cronometer' as const,
        importType: 'daily_totals' as const,
        status: 'ready' as const,
        fileName: 'test.csv',
        parsedDays: [],
        totalDays: 5,
        importedDays: 0,
        createdAt: new Date(),
      };

      const updatedSession = {
        ...mockSession,
        importType: 'individual_foods' as const,
      };

      // Set up initial state
      useNutritionImportStore.setState({
        currentSession: mockSession,
        currentFileUri: 'file://test.csv',
      });

      mockReparseSession.mockResolvedValue(updatedSession);

      await useNutritionImportStore.getState().setImportType('individual_foods');

      expect(useNutritionImportStore.getState().currentSession?.importType).toBe('individual_foods');
    });
  });

  describe('executeImport', () => {
    it('should return false when no session exists', async () => {
      const success = await useNutritionImportStore.getState().executeImport();

      expect(success).toBe(false);
    });

    it('should update session to completed on success', async () => {
      const mockSession = {
        id: 'test-id',
        source: 'myfitnesspal' as const,
        importType: 'daily_totals' as const,
        status: 'ready' as const,
        fileName: 'test.csv',
        parsedDays: [],
        totalDays: 5,
        importedDays: 0,
        createdAt: new Date(),
      };

      useNutritionImportStore.setState({ currentSession: mockSession });
      mockExecuteNutritionImport.mockResolvedValue({ success: true, importedDays: 5 });

      const success = await useNutritionImportStore.getState().executeImport();

      expect(success).toBe(true);
      expect(useNutritionImportStore.getState().currentSession?.status).toBe('completed');
      expect(useNutritionImportStore.getState().currentSession?.importedDays).toBe(5);
    });

    it('should update session to error on failure', async () => {
      const mockSession = {
        id: 'test-id',
        source: 'myfitnesspal' as const,
        importType: 'daily_totals' as const,
        status: 'ready' as const,
        fileName: 'test.csv',
        parsedDays: [],
        totalDays: 5,
        importedDays: 0,
        createdAt: new Date(),
      };

      useNutritionImportStore.setState({ currentSession: mockSession });
      mockExecuteNutritionImport.mockResolvedValue({
        success: false,
        importedDays: 0,
        error: 'Database error',
      });

      await useNutritionImportStore.getState().executeImport();

      expect(useNutritionImportStore.getState().currentSession?.status).toBe('error');
      expect(useNutritionImportStore.getState().error).toBe('Database error');
    });

    it('should call onProgress callback during import', async () => {
      const mockSession = {
        id: 'test-id',
        source: 'myfitnesspal' as const,
        importType: 'daily_totals' as const,
        status: 'ready' as const,
        fileName: 'test.csv',
        parsedDays: [],
        totalDays: 5,
        importedDays: 0,
        createdAt: new Date(),
      };

      useNutritionImportStore.setState({ currentSession: mockSession });
      mockExecuteNutritionImport.mockImplementation(async (session, onProgress) => {
        // Simulate progress callback
        if (onProgress) {
          onProgress({ current: 3, total: 5, currentDate: 'Jan 15, 2024' });
        }
        return { success: true, importedDays: 5 };
      });

      await useNutritionImportStore.getState().executeImport();

      expect(useNutritionImportStore.getState().progress).toEqual({
        current: 3,
        total: 5,
        currentDate: 'Jan 15, 2024',
      });
    });
  });

  describe('cancelSession', () => {
    it('should reset all state', () => {
      const mockSession = {
        id: 'test-id',
        source: 'myfitnesspal' as const,
        importType: 'daily_totals' as const,
        status: 'ready' as const,
        fileName: 'test.csv',
        parsedDays: [],
        totalDays: 5,
        importedDays: 0,
        createdAt: new Date(),
      };

      useNutritionImportStore.setState({
        currentSession: mockSession,
        currentFileUri: 'file://test.csv',
        progress: { current: 1, total: 5 },
        error: 'Some error',
      });

      useNutritionImportStore.getState().cancelSession();

      expect(useNutritionImportStore.getState().currentSession).toBeNull();
      expect(useNutritionImportStore.getState().currentFileUri).toBeNull();
      expect(useNutritionImportStore.getState().progress).toBeNull();
      expect(useNutritionImportStore.getState().error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error', () => {
      useNutritionImportStore.setState({ error: 'Some error' });

      useNutritionImportStore.getState().clearError();

      expect(useNutritionImportStore.getState().error).toBeNull();
    });
  });
});
