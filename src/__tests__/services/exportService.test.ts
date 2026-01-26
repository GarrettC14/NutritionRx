/**
 * Export Service Tests
 * Tests for data export functionality
 */

import { exportService } from '@/services/exportService';
import {
  logEntryRepository,
  quickAddRepository,
  weightRepository,
  profileRepository,
  goalRepository,
  settingsRepository,
} from '@/repositories';

// Expo modules are mocked globally in jest.setup.js

// Mock repositories
jest.mock('@/repositories', () => ({
  logEntryRepository: {
    getAll: jest.fn().mockResolvedValue([]),
    findByDateRange: jest.fn().mockResolvedValue([]),
  },
  quickAddRepository: {
    getAll: jest.fn().mockResolvedValue([]),
    findByDateRange: jest.fn().mockResolvedValue([]),
  },
  weightRepository: {
    getAll: jest.fn().mockResolvedValue([]),
    findByDateRange: jest.fn().mockResolvedValue([]),
  },
  profileRepository: {
    getOrCreate: jest.fn(),
  },
  goalRepository: {
    getActiveGoal: jest.fn(),
  },
  settingsRepository: {
    getAll: jest.fn(),
  },
}));

describe('exportService', () => {
  const mockLogRepo = logEntryRepository as jest.Mocked<typeof logEntryRepository>;
  const mockQuickAddRepo = quickAddRepository as jest.Mocked<typeof quickAddRepository>;
  const mockWeightRepo = weightRepository as jest.Mocked<typeof weightRepository>;
  const mockProfileRepo = profileRepository as jest.Mocked<typeof profileRepository>;
  const mockGoalRepo = goalRepository as jest.Mocked<typeof goalRepository>;
  const mockSettingsRepo = settingsRepository as jest.Mocked<typeof settingsRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportFoodLogs', () => {
    it('exports food log entries to CSV format', async () => {
      const mockEntries = [
        {
          id: '1',
          date: '2024-01-15',
          mealType: 'breakfast',
          foodId: 'food-1',
          foodName: 'Oatmeal',
          foodBrand: 'Quaker',
          servings: 1.5,
          calories: 225,
          protein: 8,
          carbs: 40,
          fat: 4,
          notes: 'With honey',
          createdAt: new Date(),
        },
        {
          id: '2',
          date: '2024-01-15',
          mealType: 'lunch',
          foodId: 'food-2',
          foodName: 'Chicken Salad',
          servings: 1,
          calories: 350,
          protein: 30,
          carbs: 15,
          fat: 18,
          createdAt: new Date(),
        },
      ];

      mockLogRepo.getAll.mockResolvedValue(mockEntries as any);
      mockQuickAddRepo.getAll.mockResolvedValue([]);

      const csv = await exportService.exportFoodLogs();

      expect(csv).toContain('Date,Meal,Type,Food Name,Brand,Servings,Calories,Protein (g),Carbs (g),Fat (g),Notes');
      expect(csv).toContain('2024-01-15,breakfast,Food,Oatmeal,Quaker,1.5,225,8,40,4,With honey');
      expect(csv).toContain('2024-01-15,lunch,Food,Chicken Salad,,1,350,30,15,18,');
    });

    it('includes quick add entries', async () => {
      mockLogRepo.getAll.mockResolvedValue([]);
      const mockQuickAdds = [
        {
          id: 'qa-1',
          date: '2024-01-15',
          mealType: 'dinner',
          calories: 500,
          protein: 20,
          carbs: 50,
          fat: 25,
          description: 'Restaurant meal',
          createdAt: new Date(),
        },
      ];

      mockQuickAddRepo.getAll.mockResolvedValue(mockQuickAdds as any);

      const csv = await exportService.exportFoodLogs();

      expect(csv).toContain('Quick Add');
      expect(csv).toContain('Restaurant meal');
      expect(csv).toContain('500');
    });

    it('filters by date range when specified', async () => {
      const mockEntries = [
        { id: '1', date: '2024-01-10', mealType: 'breakfast', foodName: 'Early', servings: 1, calories: 100, protein: 5, carbs: 10, fat: 2, createdAt: new Date() },
        { id: '2', date: '2024-01-15', mealType: 'breakfast', foodName: 'Middle', servings: 1, calories: 200, protein: 10, carbs: 20, fat: 5, createdAt: new Date() },
        { id: '3', date: '2024-01-20', mealType: 'breakfast', foodName: 'Late', servings: 1, calories: 300, protein: 15, carbs: 30, fat: 8, createdAt: new Date() },
      ];

      mockLogRepo.getAll.mockResolvedValue(mockEntries as any);
      mockQuickAddRepo.getAll.mockResolvedValue([]);

      const csv = await exportService.exportFoodLogs('2024-01-12', '2024-01-18');

      expect(csv).toContain('Middle');
      expect(csv).not.toContain('Early');
      expect(csv).not.toContain('Late');
    });

    it('escapes CSV special characters', async () => {
      const mockEntries = [
        {
          id: '1',
          date: '2024-01-15',
          mealType: 'breakfast',
          foodName: 'Food, with comma',
          servings: 1,
          calories: 100,
          protein: 5,
          carbs: 10,
          fat: 2,
          notes: 'Contains "quotes"',
          createdAt: new Date(),
        },
      ];

      mockLogRepo.getAll.mockResolvedValue(mockEntries as any);
      mockQuickAddRepo.getAll.mockResolvedValue([]);

      const csv = await exportService.exportFoodLogs();

      expect(csv).toContain('"Food, with comma"');
      expect(csv).toContain('"Contains ""quotes"""');
    });

    it('sorts entries by date', async () => {
      const mockEntries = [
        { id: '2', date: '2024-01-20', mealType: 'breakfast', foodName: 'Second', servings: 1, calories: 200, protein: 10, carbs: 20, fat: 5, createdAt: new Date() },
        { id: '1', date: '2024-01-10', mealType: 'breakfast', foodName: 'First', servings: 1, calories: 100, protein: 5, carbs: 10, fat: 2, createdAt: new Date() },
      ];

      mockLogRepo.getAll.mockResolvedValue(mockEntries as any);
      mockQuickAddRepo.getAll.mockResolvedValue([]);

      const csv = await exportService.exportFoodLogs();
      const lines = csv.split('\n');

      const firstDataLine = lines[1];
      const secondDataLine = lines[2];

      expect(firstDataLine).toContain('2024-01-10');
      expect(secondDataLine).toContain('2024-01-20');
    });
  });

  describe('exportWeightLogs', () => {
    it('exports weight entries to CSV format', async () => {
      const mockEntries = [
        { id: '1', date: '2024-01-15', weightKg: 80.5, notes: 'Morning weight', createdAt: new Date() },
        { id: '2', date: '2024-01-16', weightKg: 80.2, createdAt: new Date() },
      ];

      mockWeightRepo.getAll.mockResolvedValue(mockEntries as any);

      const csv = await exportService.exportWeightLogs();

      expect(csv).toContain('Date,Weight (kg),Weight (lbs),Notes');
      expect(csv).toContain('2024-01-15,80.50,177.47,Morning weight');
      expect(csv).toContain('2024-01-16,80.20,176.81,');
    });

    it('filters by date range', async () => {
      const mockEntries = [
        { id: '1', date: '2024-01-10', weightKg: 81, createdAt: new Date() },
        { id: '2', date: '2024-01-15', weightKg: 80, createdAt: new Date() },
        { id: '3', date: '2024-01-20', weightKg: 79, createdAt: new Date() },
      ];

      mockWeightRepo.getAll.mockResolvedValue(mockEntries as any);

      const csv = await exportService.exportWeightLogs('2024-01-12', '2024-01-18');

      expect(csv).toContain('80.00');
      expect(csv).not.toContain('81.00');
      expect(csv).not.toContain('79.00');
    });
  });

  describe('exportProfile', () => {
    it('exports profile data to CSV format', async () => {
      const mockProfile = {
        id: 'profile-1',
        sex: 'male',
        dateOfBirth: new Date('1990-05-15'),
        heightCm: 180,
        activityLevel: 'moderately_active',
        hasCompletedOnboarding: true,
        onboardingSkipped: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'),
      };

      mockProfileRepo.getOrCreate.mockResolvedValue(mockProfile as any);

      const csv = await exportService.exportProfile();

      expect(csv).toContain('Field,Value');
      expect(csv).toContain('Sex,male');
      expect(csv).toContain('Height (cm),180');
      expect(csv).toContain('Activity Level,moderately_active');
      expect(csv).toContain('Onboarding Completed,Yes');
    });

    it('handles missing optional fields', async () => {
      const mockProfile = {
        id: 'profile-1',
        hasCompletedOnboarding: false,
        onboardingSkipped: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockProfileRepo.getOrCreate.mockResolvedValue(mockProfile as any);

      const csv = await exportService.exportProfile();

      expect(csv).toContain('Sex,');
      expect(csv).toContain('Height (cm),');
      expect(csv).toContain('Onboarding Completed,No');
    });
  });

  describe('exportGoals', () => {
    it('exports active goal data', async () => {
      const mockGoal = {
        id: 'goal-1',
        type: 'lose',
        targetWeightKg: 75,
        targetRatePercent: 0.5,
        startDate: '2024-01-01',
        startWeightKg: 85,
        initialTdeeEstimate: 2500,
        initialTargetCalories: 2000,
        initialProteinG: 170,
        initialCarbsG: 200,
        initialFatG: 67,
        currentTdeeEstimate: 2450,
        currentTargetCalories: 1950,
        currentProteinG: 170,
        currentCarbsG: 195,
        currentFatG: 65,
        isActive: true,
      };

      mockGoalRepo.getActiveGoal.mockResolvedValue(mockGoal as any);

      const csv = await exportService.exportGoals();

      expect(csv).toContain('Field,Value');
      expect(csv).toContain('Goal Type,lose');
      expect(csv).toContain('Target Weight (kg),75');
      expect(csv).toContain('Target Rate (%/week),0.5');
      expect(csv).toContain('Start Weight (kg),85');
      expect(csv).toContain('Initial Target Calories,2000');
      expect(csv).toContain('Current Target Calories,1950');
    });

    it('returns message when no active goal', async () => {
      mockGoalRepo.getActiveGoal.mockResolvedValue(null);

      const csv = await exportService.exportGoals();

      expect(csv).toBe('No active goal found');
    });
  });

  describe('exportSettings', () => {
    it('exports settings to CSV format', async () => {
      const mockSettings = {
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 200,
        dailyFatGoal: 67,
        weightUnit: 'kg',
        theme: 'dark',
        notificationsEnabled: true,
        reminderTime: '09:00',
      };

      mockSettingsRepo.getAll.mockResolvedValue(mockSettings as any);

      const csv = await exportService.exportSettings();

      expect(csv).toContain('Setting,Value');
      expect(csv).toContain('Daily Calorie Goal,2000');
      expect(csv).toContain('Daily Protein Goal (g),150');
      expect(csv).toContain('Weight Unit,kg');
      expect(csv).toContain('Theme,dark');
      expect(csv).toContain('Notifications Enabled,Yes');
      expect(csv).toContain('Reminder Time,09:00');
    });

    it('handles disabled notifications', async () => {
      const mockSettings = {
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 200,
        dailyFatGoal: 67,
        weightUnit: 'lbs',
        theme: 'light',
        notificationsEnabled: false,
        reminderTime: null,
      };

      mockSettingsRepo.getAll.mockResolvedValue(mockSettings as any);

      const csv = await exportService.exportSettings();

      expect(csv).toContain('Notifications Enabled,No');
      expect(csv).toContain('Reminder Time,Not set');
    });
  });

  describe('getExportStats', () => {
    it('returns correct statistics', async () => {
      const mockFoodLogs = [
        { date: '2024-01-15' },
        { date: '2024-01-16' },
        { date: '2024-01-17' },
      ];
      const mockQuickAdds = [
        { date: '2024-01-15' },
        { date: '2024-01-18' },
      ];
      const mockWeightLogs = [
        { date: '2024-01-10' },
        { date: '2024-01-20' },
      ];

      mockLogRepo.getAll.mockResolvedValue(mockFoodLogs as any);
      mockQuickAddRepo.getAll.mockResolvedValue(mockQuickAdds as any);
      mockWeightRepo.getAll.mockResolvedValue(mockWeightLogs as any);

      const stats = await exportService.getExportStats();

      expect(stats.foodLogCount).toBe(5); // 3 + 2
      expect(stats.weightLogCount).toBe(2);
      expect(stats.firstLogDate).toBe('2024-01-10');
      expect(stats.lastLogDate).toBe('2024-01-20');
    });

    it('handles empty data', async () => {
      mockLogRepo.getAll.mockResolvedValue([]);
      mockQuickAddRepo.getAll.mockResolvedValue([]);
      mockWeightRepo.getAll.mockResolvedValue([]);

      const stats = await exportService.getExportStats();

      expect(stats.foodLogCount).toBe(0);
      expect(stats.weightLogCount).toBe(0);
      expect(stats.firstLogDate).toBeNull();
      expect(stats.lastLogDate).toBeNull();
    });
  });

  describe('exportAll', () => {
    beforeEach(() => {
      // Setup default mocks
      mockLogRepo.getAll.mockResolvedValue([]);
      mockQuickAddRepo.getAll.mockResolvedValue([]);
      mockWeightRepo.getAll.mockResolvedValue([]);
      mockProfileRepo.getOrCreate.mockResolvedValue({
        id: 'profile-1',
        hasCompletedOnboarding: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockGoalRepo.getActiveGoal.mockResolvedValue(null);
      mockSettingsRepo.getAll.mockResolvedValue({
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 200,
        dailyFatGoal: 67,
        weightUnit: 'kg',
        theme: 'dark',
        notificationsEnabled: false,
      } as any);
    });

    it('exports all data sections by default', async () => {
      const result = await exportService.exportAll();

      expect(result.success).toBe(true);
      expect(result.filePath).toContain('nutritionrx-export-');
      expect(result.filePath).toContain('.csv');

      const FileSystem = require('expo-file-system');
      const writeCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('=== PROFILE ===');
      expect(content).toContain('=== GOALS ===');
      expect(content).toContain('=== SETTINGS ===');
      expect(content).toContain('=== FOOD LOGS ===');
      expect(content).toContain('=== WEIGHT LOGS ===');
    });

    it('respects options to exclude sections', async () => {
      const result = await exportService.exportAll({
        includeProfile: false,
        includeGoals: false,
        includeFoodLogs: true,
        includeWeightLogs: true,
        includeSettings: false,
      });

      expect(result.success).toBe(true);

      const FileSystem = require('expo-file-system');
      const writeCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const content = writeCall[1];

      expect(content).not.toContain('=== PROFILE ===');
      expect(content).not.toContain('=== GOALS ===');
      expect(content).not.toContain('=== SETTINGS ===');
      expect(content).toContain('=== FOOD LOGS ===');
      expect(content).toContain('=== WEIGHT LOGS ===');
    });

    it('handles export errors gracefully', async () => {
      const FileSystem = require('expo-file-system');
      FileSystem.writeAsStringAsync.mockRejectedValueOnce(new Error('Write failed'));

      const result = await exportService.exportAll();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
    });
  });

  describe('shareExport', () => {
    it('shares file successfully', async () => {
      const Sharing = require('expo-sharing');
      Sharing.isAvailableAsync.mockResolvedValue(true);

      const result = await exportService.shareExport('/path/to/file.csv');

      expect(result).toBe(true);
      expect(Sharing.shareAsync).toHaveBeenCalledWith('/path/to/file.csv', {
        mimeType: 'text/csv',
        dialogTitle: 'Export NutritionRx Data',
      });
    });

    it('returns false when sharing not available', async () => {
      const Sharing = require('expo-sharing');
      Sharing.isAvailableAsync.mockResolvedValue(false);

      const result = await exportService.shareExport('/path/to/file.csv');

      expect(result).toBe(false);
    });

    it('handles share errors', async () => {
      const Sharing = require('expo-sharing');
      Sharing.isAvailableAsync.mockResolvedValue(true);
      Sharing.shareAsync.mockRejectedValueOnce(new Error('Share failed'));

      const result = await exportService.shareExport('/path/to/file.csv');

      expect(result).toBe(false);
    });
  });

  describe('exportAndShare', () => {
    beforeEach(() => {
      mockLogRepo.getAll.mockResolvedValue([]);
      mockQuickAddRepo.getAll.mockResolvedValue([]);
      mockWeightRepo.getAll.mockResolvedValue([]);
      mockProfileRepo.getOrCreate.mockResolvedValue({
        id: 'profile-1',
        hasCompletedOnboarding: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockGoalRepo.getActiveGoal.mockResolvedValue(null);
      mockSettingsRepo.getAll.mockResolvedValue({
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 200,
        dailyFatGoal: 67,
        weightUnit: 'kg',
        theme: 'dark',
        notificationsEnabled: false,
      } as any);
    });

    it('exports and shares in one step', async () => {
      const Sharing = require('expo-sharing');
      Sharing.isAvailableAsync.mockResolvedValue(true);

      const result = await exportService.exportAndShare();

      expect(result.success).toBe(true);
      expect(Sharing.shareAsync).toHaveBeenCalled();
    });

    it('returns error when share fails', async () => {
      const Sharing = require('expo-sharing');
      Sharing.isAvailableAsync.mockResolvedValue(false);

      const result = await exportService.exportAndShare();

      expect(result.success).toBe(true); // Export succeeded
      expect(result.error).toBe('Failed to share file');
    });
  });
});
