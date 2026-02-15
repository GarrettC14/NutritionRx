import { create } from 'zustand';
import { settingsRepository, UserSettings, WeightUnit, Theme, CheckInDay, CalorieCalculationMethod } from '@/repositories';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';

export interface CustomMealTypeRecord {
  id: string;
  name: string;
  sortOrder: number;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsState {
  // State
  settings: UserSettings;
  customMealTypes: CustomMealTypeRecord[];
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
  setCheckInDay: (day: CheckInDay) => Promise<void>;
  setCalorieCalculationMethod: (method: CalorieCalculationMethod) => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // Custom meal type actions
  loadCustomMealTypes: () => Promise<void>;
  addCustomMealType: (name: string, icon?: string) => Promise<void>;
  deactivateCustomMealType: (id: string) => Promise<void>;
  reactivateCustomMealType: (id: string) => Promise<void>;
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
  checkInDay: 1 as CheckInDay, // Monday
  calorieCalculationMethod: 'label' as CalorieCalculationMethod,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: initialSettings,
  customMealTypes: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  loadSettings: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });
    try {
      const settings = await settingsRepository.getAll();
      set({ settings, isLoading: false, isLoaded: true });
      // Load custom meal types in parallel
      get().loadCustomMealTypes();
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

  setCheckInDay: async (day) => {
    await get().updateSettings({ checkInDay: day });
  },

  setCalorieCalculationMethod: async (method) => {
    await get().updateSettings({ calorieCalculationMethod: method });
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

  // Custom meal type actions

  loadCustomMealTypes: async () => {
    try {
      const db = getDatabase();
      const rows = await db.getAllAsync<{
        id: string;
        name: string;
        sort_order: number;
        icon: string | null;
        is_active: number;
        created_at: string;
        updated_at: string;
      }>('SELECT * FROM custom_meal_types ORDER BY sort_order');
      set({
        customMealTypes: rows.map((r) => ({
          id: r.id,
          name: r.name,
          sortOrder: r.sort_order,
          icon: r.icon,
          isActive: r.is_active === 1,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      });
    } catch {
      // Table may not exist yet if migration hasn't run
    }
  },

  addCustomMealType: async (name, icon) => {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    // Place after the 4 defaults + any existing custom types
    const active = get().customMealTypes.filter((c) => c.isActive);
    const sortOrder = 5 + active.length;
    await db.runAsync(
      `INSERT INTO custom_meal_types (id, name, sort_order, icon, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [id, name, sortOrder, icon ?? null, now, now],
    );
    await get().loadCustomMealTypes();
  },

  deactivateCustomMealType: async (id) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE custom_meal_types SET is_active = 0, updated_at = ? WHERE id = ?`,
      [now, id],
    );
    await get().loadCustomMealTypes();
  },

  reactivateCustomMealType: async (id) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const active = get().customMealTypes.filter((c) => c.isActive);
    const sortOrder = 5 + active.length;
    await db.runAsync(
      `UPDATE custom_meal_types SET is_active = 1, sort_order = ?, updated_at = ? WHERE id = ?`,
      [sortOrder, now, id],
    );
    await get().loadCustomMealTypes();
  },
}));
