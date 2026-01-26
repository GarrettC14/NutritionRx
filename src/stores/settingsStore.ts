import { create } from 'zustand';
import { settingsRepository, UserSettings, WeightUnit, Theme } from '@/repositories';
import { DEFAULT_SETTINGS } from '@/constants/defaults';

interface SettingsState {
  // State
  settings: UserSettings;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  setDailyGoals: (goals: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }) => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  toggleNotifications: () => Promise<void>;
  setReminderTime: (time: string | null) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const initialSettings: UserSettings = {
  dailyCalorieGoal: DEFAULT_SETTINGS.dailyCalorieGoal,
  dailyProteinGoal: DEFAULT_SETTINGS.dailyProteinGoal,
  dailyCarbsGoal: DEFAULT_SETTINGS.dailyCarbsGoal,
  dailyFatGoal: DEFAULT_SETTINGS.dailyFatGoal,
  weightUnit: DEFAULT_SETTINGS.weightUnit,
  theme: DEFAULT_SETTINGS.theme,
  notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
  reminderTime: DEFAULT_SETTINGS.reminderTime,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: initialSettings,
  isLoading: false,
  isLoaded: false,
  error: null,

  loadSettings: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });
    try {
      const settings = await settingsRepository.getAll();
      set({ settings, isLoading: false, isLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false,
      });
    }
  },

  updateSettings: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsRepository.updateSettings(updates);
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update settings',
        isLoading: false,
      });
    }
  },

  setDailyGoals: async (goals) => {
    const updates: Partial<UserSettings> = {};
    if (goals.calories !== undefined) updates.dailyCalorieGoal = goals.calories;
    if (goals.protein !== undefined) updates.dailyProteinGoal = goals.protein;
    if (goals.carbs !== undefined) updates.dailyCarbsGoal = goals.carbs;
    if (goals.fat !== undefined) updates.dailyFatGoal = goals.fat;
    await get().updateSettings(updates);
  },

  setWeightUnit: async (unit) => {
    await get().updateSettings({ weightUnit: unit });
  },

  setTheme: async (theme) => {
    await get().updateSettings({ theme });
  },

  toggleNotifications: async () => {
    const current = get().settings.notificationsEnabled;
    await get().updateSettings({ notificationsEnabled: !current });
  },

  setReminderTime: async (time) => {
    await get().updateSettings({ reminderTime: time });
  },

  resetToDefaults: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsRepository.resetToDefaults();
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reset settings',
        isLoading: false,
      });
    }
  },
}));
