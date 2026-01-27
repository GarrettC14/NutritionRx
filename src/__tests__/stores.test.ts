// Mock the repositories
jest.mock('@/repositories', () => ({
  settingsRepository: {
    getAll: jest.fn(),
    updateSettings: jest.fn(),
    resetToDefaults: jest.fn(),
  },
  foodRepository: {
    search: jest.fn(),
    getRecent: jest.fn(),
    getFrequent: jest.fn(),
    findByBarcode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    recordUsage: jest.fn(),
  },
  logEntryRepository: {
    findByDate: jest.fn(),
    getDailyTotals: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  quickAddRepository: {
    findByDate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  weightRepository: {
    getRecent: jest.fn(),
    getLatest: jest.fn(),
    getTrendWeight: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByDate: jest.fn(),
    findByDateRange: jest.fn(),
  },
  profileRepository: {
    get: jest.fn(),
    getOrCreate: jest.fn(),
    update: jest.fn(),
    completeOnboarding: jest.fn(),
    skipOnboarding: jest.fn(),
    reset: jest.fn(),
  },
  goalRepository: {
    getActiveGoal: jest.fn(),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    completeGoal: jest.fn(),
    getReflectionsForGoal: jest.fn(),
    getPendingReflection: jest.fn(),
    acceptReflection: jest.fn(),
    declineReflection: jest.fn(),
  },
}));

// Import stores after mocking
import { useSettingsStore } from '@/stores/settingsStore';
import { useFoodSearchStore } from '@/stores/foodSearchStore';
import { useWeightStore } from '@/stores/weightStore';
import { useGoalStore } from '@/stores/goalStore';
import { useProfileStore } from '@/stores/profileStore';

import {
  settingsRepository,
  foodRepository,
  weightRepository,
  profileRepository,
} from '@/repositories';

describe('Settings Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useSettingsStore.setState({
      settings: {
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 200,
        dailyFatGoal: 65,
        weightUnit: 'lbs',
        theme: 'dark',
        notificationsEnabled: false,
        reminderTime: null,
      },
      isLoading: false,
      isLoaded: false,
      error: null,
    });
  });

  it('should load settings from repository', async () => {
    const mockSettings = {
      dailyCalorieGoal: 2500,
      dailyProteinGoal: 180,
      dailyCarbsGoal: 250,
      dailyFatGoal: 80,
      weightUnit: 'kg' as const,
      theme: 'light' as const,
      notificationsEnabled: true,
      reminderTime: '08:00',
    };

    (settingsRepository.getAll as jest.Mock).mockResolvedValue(mockSettings);

    await useSettingsStore.getState().loadSettings();

    expect(useSettingsStore.getState().settings).toEqual(mockSettings);
    expect(useSettingsStore.getState().isLoaded).toBe(true);
  });

  it('should update settings', async () => {
    const updates = { dailyCalorieGoal: 2200 };
    const updatedSettings = {
      ...useSettingsStore.getState().settings,
      dailyCalorieGoal: 2200,
    };

    (settingsRepository.updateSettings as jest.Mock).mockResolvedValue(updatedSettings);

    await useSettingsStore.getState().updateSettings(updates);

    expect(useSettingsStore.getState().settings.dailyCalorieGoal).toBe(2200);
  });
});

describe('Food Search Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFoodSearchStore.setState({
      query: '',
      results: [],
      recentFoods: [],
      frequentFoods: [],
      isSearching: false,
      isLoadingRecent: false,
      error: null,
    });
  });

  it('should not search for queries shorter than min length', () => {
    useFoodSearchStore.getState().setQuery('a');

    expect(foodRepository.search).not.toHaveBeenCalled();
    expect(useFoodSearchStore.getState().results).toEqual([]);
  });

  it('should search for valid queries', async () => {
    const mockResults = [
      { id: '1', name: 'Apple', calories: 95 },
    ];

    (foodRepository.search as jest.Mock).mockResolvedValue(mockResults);

    await useFoodSearchStore.getState().search('apple');

    expect(foodRepository.search).toHaveBeenCalledWith('apple');
  });

  it('should load recent foods', async () => {
    const mockRecent = [
      { id: '1', name: 'Recent Food', calories: 100 },
    ];

    (foodRepository.getRecent as jest.Mock).mockResolvedValue(mockRecent);

    await useFoodSearchStore.getState().loadRecentFoods();

    expect(useFoodSearchStore.getState().recentFoods).toEqual(mockRecent);
  });

  it('should clear search results', () => {
    useFoodSearchStore.setState({
      query: 'apple',
      results: [{ id: '1', name: 'Apple' }] as any,
    });

    useFoodSearchStore.getState().clearSearch();

    expect(useFoodSearchStore.getState().query).toBe('');
    expect(useFoodSearchStore.getState().results).toEqual([]);
  });
});

describe('Weight Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWeightStore.setState({
      entries: [],
      latestEntry: null,
      trendWeight: null,
      isLoading: false,
      error: null,
    });
  });

  it('should load recent weight entries', async () => {
    const mockEntries = [
      { id: '1', date: '2024-01-15', weightKg: 80 },
      { id: '2', date: '2024-01-14', weightKg: 80.2 },
    ];

    (weightRepository.getRecent as jest.Mock).mockResolvedValue(mockEntries);

    await useWeightStore.getState().loadEntries();

    expect(useWeightStore.getState().entries).toEqual(mockEntries);
  });

  it('should load trend weight', async () => {
    (weightRepository.getTrendWeight as jest.Mock).mockResolvedValue(79.8);

    await useWeightStore.getState().loadTrendWeight();

    expect(useWeightStore.getState().trendWeight).toBe(79.8);
  });
});

describe('Profile Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProfileStore.setState({
      profile: null,
      isLoading: false,
      isLoaded: false,
      error: null,
    });
  });

  it('should load or create profile', async () => {
    const mockProfile = {
      id: 'default-profile',
      sex: 'male',
      heightCm: 180,
      activityLevel: 'moderately_active',
      eatingStyle: 'flexible',
      proteinPriority: 'active',
      hasCompletedOnboarding: false,
      onboardingSkipped: false,
    };

    (profileRepository.getOrCreate as jest.Mock).mockResolvedValue(mockProfile);

    await useProfileStore.getState().loadProfile();

    expect(useProfileStore.getState().profile).toEqual(mockProfile);
    expect(useProfileStore.getState().isLoaded).toBe(true);
  });

  it('should complete onboarding', async () => {
    const mockProfile = {
      id: 'default-profile',
      hasCompletedOnboarding: true,
    };

    (profileRepository.completeOnboarding as jest.Mock).mockResolvedValue(mockProfile);

    await useProfileStore.getState().completeOnboarding();

    expect(useProfileStore.getState().profile?.hasCompletedOnboarding).toBe(true);
  });

  it('should calculate age from date of birth', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 30);

    useProfileStore.setState({
      profile: {
        id: 'default-profile',
        dateOfBirth: birthDate,
        eatingStyle: 'flexible',
        proteinPriority: 'active',
        hasCompletedOnboarding: false,
        onboardingSkipped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const age = useProfileStore.getState().getAge();

    expect(age).toBe(30);
  });
});

describe('Goal Store Calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateBMR', () => {
    it('should calculate BMR for male using Mifflin-St Jeor', () => {
      const bmr = useGoalStore.getState().calculateBMR(80, 180, 30, 'male');

      // 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
      expect(bmr).toBe(1780);
    });

    it('should calculate BMR for female using Mifflin-St Jeor', () => {
      const bmr = useGoalStore.getState().calculateBMR(65, 165, 25, 'female');

      // 10 * 65 + 6.25 * 165 - 5 * 25 - 161 = 650 + 1031.25 - 125 - 161 = 1395.25
      expect(bmr).toBe(1395.25);
    });
  });

  describe('calculateTDEE', () => {
    it('should multiply BMR by activity factor', () => {
      const tdee = useGoalStore.getState().calculateTDEE(1780, 'moderately_active');

      // 1780 * 1.55 = 2759
      expect(tdee).toBe(2759);
    });

    it('should handle sedentary activity level', () => {
      const tdee = useGoalStore.getState().calculateTDEE(1500, 'sedentary');

      // 1500 * 1.2 = 1800
      expect(tdee).toBe(1800);
    });
  });

  describe('calculateTargetCalories', () => {
    it('should return TDEE for maintenance', () => {
      const target = useGoalStore.getState().calculateTargetCalories(2500, 'maintain', 0, 'male');

      expect(target).toBe(2500);
    });

    it('should create deficit for weight loss', () => {
      const target = useGoalStore.getState().calculateTargetCalories(2500, 'lose', 0.5, 'male');

      // 0.5% of body weight per week = ~275 calorie deficit (based on 7700 cal/kg)
      expect(target).toBeLessThan(2500);
    });

    it('should create surplus for weight gain', () => {
      const target = useGoalStore.getState().calculateTargetCalories(2500, 'gain', 0.25, 'male');

      expect(target).toBeGreaterThan(2500);
    });

    it('should not go below calorie floor for females', () => {
      const target = useGoalStore.getState().calculateTargetCalories(1500, 'lose', 1, 'female');

      // Should not go below 1200
      expect(target).toBeGreaterThanOrEqual(1200);
    });

    it('should not go below calorie floor for males', () => {
      const target = useGoalStore.getState().calculateTargetCalories(1800, 'lose', 1, 'male');

      // Should not go below 1500
      expect(target).toBeGreaterThanOrEqual(1500);
    });
  });

  describe('calculateMacros', () => {
    it('should calculate protein based on body weight', () => {
      const macros = useGoalStore.getState().calculateMacros(2000, 80);

      // Protein: 80kg * 1.8g/kg = 144g
      expect(macros.protein).toBe(144);
    });

    it('should allocate ~27.5% of calories to fat', () => {
      const macros = useGoalStore.getState().calculateMacros(2000, 80);

      // Fat: 2000 * 0.275 / 9 = ~61g
      expect(macros.fat).toBe(61);
    });

    it('should fill remaining calories with carbs', () => {
      const macros = useGoalStore.getState().calculateMacros(2000, 80);

      // Total calories should roughly equal target
      const totalCals = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
      expect(totalCals).toBeGreaterThan(1900);
      expect(totalCals).toBeLessThan(2100);
    });
  });
});
