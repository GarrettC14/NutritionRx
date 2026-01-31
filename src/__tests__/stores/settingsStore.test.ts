/**
 * Settings Store Tests
 * Tests for settings state management
 */

import { DEFAULT_SETTINGS } from '@/constants/defaults';

// Mock repositories
jest.mock('@/repositories', () => ({
  settingsRepository: {
    getAll: jest.fn(),
    updateSettings: jest.fn(),
    resetToDefaults: jest.fn(),
  },
}));

import { useSettingsStore } from '@/stores/settingsStore';
import { settingsRepository } from '@/repositories';

const mockSettingsRepo = settingsRepository as jest.Mocked<typeof settingsRepository>;

const initialSettings = {
  dailyCalorieGoal: DEFAULT_SETTINGS.dailyCalorieGoal,
  dailyProteinGoal: DEFAULT_SETTINGS.dailyProteinGoal,
  dailyCarbsGoal: DEFAULT_SETTINGS.dailyCarbsGoal,
  dailyFatGoal: DEFAULT_SETTINGS.dailyFatGoal,
  weightUnit: DEFAULT_SETTINGS.weightUnit,
  theme: DEFAULT_SETTINGS.theme,
  notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
  reminderTime: DEFAULT_SETTINGS.reminderTime,
};

const mockLoadedSettings = {
  dailyCalorieGoal: 2500,
  dailyProteinGoal: 180,
  dailyCarbsGoal: 250,
  dailyFatGoal: 80,
  weightUnit: 'kg' as const,
  theme: 'light' as const,
  notificationsEnabled: true,
  reminderTime: '08:00',
};

describe('useSettingsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({
      settings: { ...initialSettings },
      isLoading: false,
      isLoaded: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has default settings matching DEFAULT_SETTINGS', () => {
      const state = useSettingsStore.getState();

      expect(state.settings.dailyCalorieGoal).toBe(2000);
      expect(state.settings.dailyProteinGoal).toBe(150);
      expect(state.settings.dailyCarbsGoal).toBe(200);
      expect(state.settings.dailyFatGoal).toBe(65);
      expect(state.settings.weightUnit).toBe('lbs');
      expect(state.settings.theme).toBe('dark');
      expect(state.settings.notificationsEnabled).toBe(false);
      expect(state.settings.reminderTime).toBeNull();
    });

    it('has isLoading false and isLoaded false', () => {
      const state = useSettingsStore.getState();

      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(false);
    });

    it('has null error', () => {
      const state = useSettingsStore.getState();

      expect(state.error).toBeNull();
    });
  });

  describe('loadSettings', () => {
    it('calls settingsRepository.getAll and updates state', async () => {
      mockSettingsRepo.getAll.mockResolvedValue(mockLoadedSettings);

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(mockSettingsRepo.getAll).toHaveBeenCalledTimes(1);
      expect(state.settings).toEqual(mockLoadedSettings);
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('short-circuits when isLoaded is true', async () => {
      useSettingsStore.setState({ isLoaded: true });

      await useSettingsStore.getState().loadSettings();

      expect(mockSettingsRepo.getAll).not.toHaveBeenCalled();
    });

    it('sets isLoading to true while loading', async () => {
      let loadingStateDuringCall = false;
      mockSettingsRepo.getAll.mockImplementation(async () => {
        loadingStateDuringCall = useSettingsStore.getState().isLoading;
        return mockLoadedSettings;
      });

      await useSettingsStore.getState().loadSettings();

      expect(loadingStateDuringCall).toBe(true);
    });

    it('sets error message on failure with Error instance', async () => {
      mockSettingsRepo.getAll.mockRejectedValue(new Error('Database connection failed'));

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.error).toBe('Database connection failed');
      expect(state.isLoading).toBe(false);
    });

    it('sets generic error message on failure with non-Error', async () => {
      mockSettingsRepo.getAll.mockRejectedValue('unexpected error');

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.error).toBe('Failed to load settings');
      expect(state.isLoading).toBe(false);
    });

    it('does not set isLoaded on error', async () => {
      mockSettingsRepo.getAll.mockRejectedValue(new Error('fail'));

      await useSettingsStore.getState().loadSettings();

      expect(useSettingsStore.getState().isLoaded).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('calls settingsRepository.updateSettings with partial updates', async () => {
      const updatedSettings = { ...initialSettings, dailyCalorieGoal: 1800 };
      mockSettingsRepo.updateSettings.mockResolvedValue(updatedSettings);

      await useSettingsStore.getState().updateSettings({ dailyCalorieGoal: 1800 });

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({ dailyCalorieGoal: 1800 });
      expect(useSettingsStore.getState().settings.dailyCalorieGoal).toBe(1800);
      expect(useSettingsStore.getState().isLoading).toBe(false);
    });

    it('clears previous error on new update', async () => {
      useSettingsStore.setState({ error: 'previous error' });
      mockSettingsRepo.updateSettings.mockResolvedValue(initialSettings);

      await useSettingsStore.getState().updateSettings({ dailyCalorieGoal: 2000 });

      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('sets error message on failure', async () => {
      mockSettingsRepo.updateSettings.mockRejectedValue(new Error('Update rejected'));

      await useSettingsStore.getState().updateSettings({ dailyCalorieGoal: 1800 });

      const state = useSettingsStore.getState();
      expect(state.error).toBe('Update rejected');
      expect(state.isLoading).toBe(false);
    });

    it('sets generic error for non-Error failures', async () => {
      mockSettingsRepo.updateSettings.mockRejectedValue(42);

      await useSettingsStore.getState().updateSettings({ dailyCalorieGoal: 1800 });

      expect(useSettingsStore.getState().error).toBe('Failed to update settings');
    });
  });

  describe('setDailyGoals', () => {
    it('maps calories to dailyCalorieGoal', async () => {
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        dailyCalorieGoal: 2200,
      });

      await useSettingsStore.getState().setDailyGoals({ calories: 2200 });

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ dailyCalorieGoal: 2200 })
      );
    });

    it('maps all macro goals correctly', async () => {
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        dailyCalorieGoal: 2200,
        dailyProteinGoal: 160,
        dailyCarbsGoal: 220,
        dailyFatGoal: 70,
      });

      await useSettingsStore.getState().setDailyGoals({
        calories: 2200,
        protein: 160,
        carbs: 220,
        fat: 70,
      });

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({
        dailyCalorieGoal: 2200,
        dailyProteinGoal: 160,
        dailyCarbsGoal: 220,
        dailyFatGoal: 70,
      });
    });

    it('only includes defined goals in update', async () => {
      mockSettingsRepo.updateSettings.mockResolvedValue(initialSettings);

      await useSettingsStore.getState().setDailyGoals({ protein: 175 });

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({
        dailyProteinGoal: 175,
      });
    });
  });

  describe('setWeightUnit', () => {
    it('calls updateSettings with weightUnit', async () => {
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        weightUnit: 'kg',
      });

      await useSettingsStore.getState().setWeightUnit('kg');

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({ weightUnit: 'kg' });
    });
  });

  describe('setTheme', () => {
    it('calls updateSettings with theme', async () => {
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        theme: 'light',
      });

      await useSettingsStore.getState().setTheme('light');

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({ theme: 'light' });
    });
  });

  describe('toggleNotifications', () => {
    it('flips false to true', async () => {
      useSettingsStore.setState({
        settings: { ...initialSettings, notificationsEnabled: false },
      });
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        notificationsEnabled: true,
      });

      await useSettingsStore.getState().toggleNotifications();

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({
        notificationsEnabled: true,
      });
    });

    it('flips true to false', async () => {
      useSettingsStore.setState({
        settings: { ...initialSettings, notificationsEnabled: true },
      });
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        notificationsEnabled: false,
      });

      await useSettingsStore.getState().toggleNotifications();

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({
        notificationsEnabled: false,
      });
    });
  });

  describe('setReminderTime', () => {
    it('sets a reminder time string', async () => {
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        reminderTime: '09:30',
      });

      await useSettingsStore.getState().setReminderTime('09:30');

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({ reminderTime: '09:30' });
    });

    it('clears reminder time with null', async () => {
      mockSettingsRepo.updateSettings.mockResolvedValue({
        ...initialSettings,
        reminderTime: null,
      });

      await useSettingsStore.getState().setReminderTime(null);

      expect(mockSettingsRepo.updateSettings).toHaveBeenCalledWith({ reminderTime: null });
    });
  });

  describe('resetToDefaults', () => {
    it('calls settingsRepository.resetToDefaults and updates state', async () => {
      useSettingsStore.setState({ settings: mockLoadedSettings });
      mockSettingsRepo.resetToDefaults.mockResolvedValue({ ...initialSettings });

      await useSettingsStore.getState().resetToDefaults();

      expect(mockSettingsRepo.resetToDefaults).toHaveBeenCalledTimes(1);
      const state = useSettingsStore.getState();
      expect(state.settings.dailyCalorieGoal).toBe(2000);
      expect(state.settings.theme).toBe('dark');
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockSettingsRepo.resetToDefaults.mockRejectedValue(new Error('Reset failed'));

      await useSettingsStore.getState().resetToDefaults();

      const state = useSettingsStore.getState();
      expect(state.error).toBe('Reset failed');
      expect(state.isLoading).toBe(false);
    });

    it('sets generic error for non-Error failures', async () => {
      mockSettingsRepo.resetToDefaults.mockRejectedValue(null);

      await useSettingsStore.getState().resetToDefaults();

      expect(useSettingsStore.getState().error).toBe('Failed to reset settings');
    });
  });
});
