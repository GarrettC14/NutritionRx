/**
 * Settings Repository Tests
 * Tests for user settings data access and persistence
 */

import { settingsRepository } from '@/repositories/settingsRepository';
import { DEFAULT_SETTINGS } from '@/constants/defaults';

// Mock the database module
const mockDb = {
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

describe('settingsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockResolvedValue([]);
  });

  describe('get', () => {
    it('returns default value when no row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await settingsRepository.get('daily_calorie_goal', 2000);

      expect(result).toBe(2000);
    });

    it('returns default value for string when no row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await settingsRepository.get('theme', 'dark');

      expect(result).toBe('dark');
    });

    it('returns default value for boolean when no row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await settingsRepository.get('notifications_enabled', false);

      expect(result).toBe(false);
    });

    it('returns default value for null when no row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await settingsRepository.get('reminder_time', null);

      expect(result).toBeNull();
    });

    it('parses number values correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '2500' });

      const result = await settingsRepository.get('daily_calorie_goal', 2000);

      expect(result).toBe(2500);
      expect(typeof result).toBe('number');
    });

    it('parses float number values correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '175.5' });

      const result = await settingsRepository.get('some_float', 0.0);

      expect(result).toBe(175.5);
      expect(typeof result).toBe('number');
    });

    it('parses boolean true from "1"', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '1' });

      const result = await settingsRepository.get('notifications_enabled', false);

      expect(result).toBe(true);
    });

    it('parses boolean true from "true"', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'true' });

      const result = await settingsRepository.get('notifications_enabled', false);

      expect(result).toBe(true);
    });

    it('parses boolean false from "0"', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '0' });

      const result = await settingsRepository.get('notifications_enabled', true);

      expect(result).toBe(false);
    });

    it('parses boolean false from "false"', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'false' });

      const result = await settingsRepository.get('notifications_enabled', true);

      expect(result).toBe(false);
    });

    it('returns string values as-is', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'kg' });

      const result = await settingsRepository.get('weight_unit', 'lbs');

      expect(result).toBe('kg');
    });

    it('queries the correct SQL with key parameter', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await settingsRepository.get('my_key', 'default');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT value FROM user_settings WHERE key = ?',
        ['my_key']
      );
    });
  });

  describe('set', () => {
    it('constructs proper upsert SQL with string value', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.set('theme', 'light');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['theme', 'light'])
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(key) DO UPDATE SET'),
        expect.any(Array)
      );
    });

    it('converts number value to string', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.set('daily_calorie_goal', 2500);

      const args = mockDb.runAsync.mock.calls[0][1];
      expect(args[0]).toBe('daily_calorie_goal');
      expect(args[1]).toBe('2500');
    });

    it('converts boolean value to string', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.set('notifications_enabled', true);

      const args = mockDb.runAsync.mock.calls[0][1];
      expect(args[0]).toBe('notifications_enabled');
      expect(args[1]).toBe('true');
    });

    it('passes null as null without converting to string', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.set('reminder_time', null);

      const args = mockDb.runAsync.mock.calls[0][1];
      expect(args[0]).toBe('reminder_time');
      expect(args[1]).toBeNull();
    });

    it('includes timestamp in upsert parameters', async () => {
      const mockDate = new Date('2024-06-15T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.set('theme', 'dark');

      const args = mockDb.runAsync.mock.calls[0][1];
      expect(args[2]).toBe('2024-06-15T12:00:00.000Z');
      // The duplicate value and timestamp for the ON CONFLICT clause
      expect(args[3]).toBe('dark');
      expect(args[4]).toBe('2024-06-15T12:00:00.000Z');

      jest.useRealTimers();
    });
  });

  describe('getAll', () => {
    it('returns all default settings when no rows exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await settingsRepository.getAll();

      expect(result).toEqual({
        dailyCalorieGoal: DEFAULT_SETTINGS.dailyCalorieGoal,
        dailyProteinGoal: DEFAULT_SETTINGS.dailyProteinGoal,
        dailyCarbsGoal: DEFAULT_SETTINGS.dailyCarbsGoal,
        dailyFatGoal: DEFAULT_SETTINGS.dailyFatGoal,
        weightUnit: DEFAULT_SETTINGS.weightUnit,
        theme: DEFAULT_SETTINGS.theme,
        notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
        reminderTime: DEFAULT_SETTINGS.reminderTime,
        checkInDay: 1,
      });
    });

    it('queries settings in one batch query', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await settingsRepository.getAll();

      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(1);
    });

    it('returns stored values when rows exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { key: 'daily_calorie_goal', value: '2500' },
        { key: 'daily_protein_goal', value: '180' },
        { key: 'daily_carbs_goal', value: '250' },
        { key: 'daily_fat_goal', value: '70' },
        { key: 'weight_unit', value: 'kg' },
        { key: 'theme', value: 'light' },
        { key: 'notifications_enabled', value: '1' },
        { key: 'reminder_time', value: '08:00' },
        { key: 'check_in_day', value: '3' },
      ]);

      const result = await settingsRepository.getAll();

      expect(result).toEqual({
        dailyCalorieGoal: 2500,
        dailyProteinGoal: 180,
        dailyCarbsGoal: 250,
        dailyFatGoal: 70,
        weightUnit: 'kg',
        theme: 'light',
        notificationsEnabled: true,
        reminderTime: '08:00',
        checkInDay: 3,
      });
    });
  });

  describe('updateSettings', () => {
    it('only sets provided fields', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getAllAsync.mockResolvedValue([]);

      await settingsRepository.updateSettings({
        dailyCalorieGoal: 1800,
        theme: 'light',
      });

      // Should only call set for the 2 provided fields
      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);

      // Verify the first call is for calorie goal
      expect(mockDb.runAsync.mock.calls[0][1][0]).toBe('daily_calorie_goal');
      expect(mockDb.runAsync.mock.calls[0][1][1]).toBe('1800');

      // Verify the second call is for theme
      expect(mockDb.runAsync.mock.calls[1][1][0]).toBe('theme');
      expect(mockDb.runAsync.mock.calls[1][1][1]).toBe('light');
    });

    it('does not set fields that are undefined', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getAllAsync.mockResolvedValue([]);

      await settingsRepository.updateSettings({
        weightUnit: 'kg',
      });

      expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync.mock.calls[0][1][0]).toBe('weight_unit');
    });

    it('returns updated settings after applying changes', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await settingsRepository.updateSettings({
        dailyCalorieGoal: 1800,
      });

      expect(result).toHaveProperty('dailyCalorieGoal');
      expect(result).toHaveProperty('theme');
    });

    it('handles all fields being updated', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getAllAsync.mockResolvedValue([]);

      await settingsRepository.updateSettings({
        dailyCalorieGoal: 1800,
        dailyProteinGoal: 120,
        dailyCarbsGoal: 180,
        dailyFatGoal: 55,
        weightUnit: 'kg',
        theme: 'auto',
        notificationsEnabled: true,
        reminderTime: '09:00',
      });

      // 8 set calls
      expect(mockDb.runAsync).toHaveBeenCalledTimes(8);
    });

    it('makes no set calls when empty object is passed', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await settingsRepository.updateSettings({});

      // Only getAll calls (getFirstAsync), no runAsync calls
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('getDailyGoals', () => {
    it('returns default daily goals when no rows exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await settingsRepository.getDailyGoals();

      expect(result).toEqual({
        calories: DEFAULT_SETTINGS.dailyCalorieGoal,
        protein: DEFAULT_SETTINGS.dailyProteinGoal,
        carbs: DEFAULT_SETTINGS.dailyCarbsGoal,
        fat: DEFAULT_SETTINGS.dailyFatGoal,
      });
    });

    it('returns stored daily goals', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { key: 'daily_calorie_goal', value: '2200' },
        { key: 'daily_protein_goal', value: '160' },
        { key: 'daily_carbs_goal', value: '220' },
        { key: 'daily_fat_goal', value: '75' },
      ]);

      const result = await settingsRepository.getDailyGoals();

      expect(result).toEqual({
        calories: 2200,
        protein: 160,
        carbs: 220,
        fat: 75,
      });
    });

    it('uses one database query for daily goal keys', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await settingsRepository.getDailyGoals();

      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('setDailyGoals', () => {
    it('sets only provided goal fields', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setDailyGoals({ calories: 2200, protein: 160 });

      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
      expect(mockDb.runAsync.mock.calls[0][1][0]).toBe('daily_calorie_goal');
      expect(mockDb.runAsync.mock.calls[1][1][0]).toBe('daily_protein_goal');
    });

    it('does not set goals that are undefined', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setDailyGoals({ fat: 80 });

      expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync.mock.calls[0][1][0]).toBe('daily_fat_goal');
    });

    it('sets all goals when all are provided', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setDailyGoals({
        calories: 1800,
        protein: 140,
        carbs: 180,
        fat: 60,
      });

      expect(mockDb.runAsync).toHaveBeenCalledTimes(4);
    });

    it('makes no calls when empty object is passed', async () => {
      await settingsRepository.setDailyGoals({});

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('getWeightUnit', () => {
    it('returns default weight unit when no row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await settingsRepository.getWeightUnit();

      expect(result).toBe('lbs');
    });

    it('returns stored weight unit', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'kg' });

      const result = await settingsRepository.getWeightUnit();

      expect(result).toBe('kg');
    });
  });

  describe('setWeightUnit', () => {
    it('sets weight unit to kg', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setWeightUnit('kg');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['weight_unit', 'kg'])
      );
    });

    it('sets weight unit to lbs', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setWeightUnit('lbs');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['weight_unit', 'lbs'])
      );
    });
  });

  describe('getTheme', () => {
    it('returns default theme when no row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await settingsRepository.getTheme();

      expect(result).toBe('dark');
    });

    it('returns stored theme', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'light' });

      const result = await settingsRepository.getTheme();

      expect(result).toBe('light');
    });

    it('returns auto theme', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'auto' });

      const result = await settingsRepository.getTheme();

      expect(result).toBe('auto');
    });
  });

  describe('setTheme', () => {
    it('sets theme to light', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setTheme('light');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['theme', 'light'])
      );
    });

    it('sets theme to dark', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setTheme('dark');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['theme', 'dark'])
      );
    });

    it('sets theme to auto', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.setTheme('auto');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['theme', 'auto'])
      );
    });
  });

  describe('resetToDefaults', () => {
    it('deletes all rows from user_settings', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getAllAsync.mockResolvedValue([]);

      await settingsRepository.resetToDefaults();

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM user_settings');
    });

    it('returns default settings after deletion', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await settingsRepository.resetToDefaults();

      expect(result).toEqual({
        dailyCalorieGoal: DEFAULT_SETTINGS.dailyCalorieGoal,
        dailyProteinGoal: DEFAULT_SETTINGS.dailyProteinGoal,
        dailyCarbsGoal: DEFAULT_SETTINGS.dailyCarbsGoal,
        dailyFatGoal: DEFAULT_SETTINGS.dailyFatGoal,
        weightUnit: DEFAULT_SETTINGS.weightUnit,
        theme: DEFAULT_SETTINGS.theme,
        notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
        reminderTime: DEFAULT_SETTINGS.reminderTime,
        checkInDay: 1,
      });
    });

    it('calls delete before getAll', async () => {
      const callOrder: string[] = [];

      mockDb.runAsync.mockImplementation(() => {
        callOrder.push('runAsync');
        return Promise.resolve(undefined);
      });
      mockDb.getAllAsync.mockImplementation(() => {
        callOrder.push('getAllAsync');
        return Promise.resolve([]);
      });

      await settingsRepository.resetToDefaults();

      // The first call should be runAsync (DELETE), then getAllAsync (getAll)
      expect(callOrder[0]).toBe('runAsync');
      expect(callOrder[1]).toBe('getAllAsync');
    });
  });
});
