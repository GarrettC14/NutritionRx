/**
 * Goal Store Tests
 * Tests for goal management state, BMR/TDEE calculations, and reflection workflows
 */

import { useGoalStore } from '@/stores/goalStore';
import { goalRepository, profileRepository } from '@/repositories';
import {
  ACTIVITY_MULTIPLIERS,
  CALORIE_FLOORS,
  CALORIES_PER_KG,
  CALORIES_PER_GRAM,
} from '@/constants/defaults';
import { macroCalculator } from '@/services/macroCalculator';
import { Goal, WeeklyReflection, UserProfile } from '@/types/domain';

// Mock repositories
jest.mock('@/repositories', () => ({
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
  profileRepository: {
    getOrCreate: jest.fn(),
  },
}));

// Mock constants
jest.mock('@/constants/defaults', () => ({
  ACTIVITY_MULTIPLIERS: {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  },
  CALORIE_FLOORS: {
    male: 1500,
    female: 1200,
  },
  CALORIES_PER_KG: 7700,
  CALORIES_PER_GRAM: {
    protein: 4,
    carbs: 4,
    fat: 9,
  },
  MAX_WEEKLY_ADJUSTMENTS: {
    burnEstimate: 150,
    calorieTarget: 200,
  },
  DATA_QUALITY_THRESHOLDS: {
    good: 5,
    partial: 3,
  },
}));

// Mock macroCalculator
jest.mock('@/services/macroCalculator', () => ({
  macroCalculator: {
    calculateMacros: jest.fn(),
  },
}));

const mockGoalRepo = goalRepository as jest.Mocked<typeof goalRepository>;
const mockProfileRepo = profileRepository as jest.Mocked<typeof profileRepository>;
const mockMacroCalculator = macroCalculator as jest.Mocked<typeof macroCalculator>;

const initialState = {
  activeGoal: null,
  profile: null,
  reflections: [],
  pendingReflection: null,
  isLoading: false,
  error: null,
  calorieGoal: null,
  proteinGoal: null,
  carbGoal: null,
  fatGoal: null,
  targetWeight: null,
  weeklyGoal: null,
};

const mockGoal: Goal = {
  id: 'goal-1',
  type: 'lose',
  targetWeightKg: 75,
  targetRatePercent: 0.5,
  startDate: '2024-01-01',
  startWeightKg: 85,
  initialTdeeEstimate: 2500,
  initialTargetCalories: 1950,
  initialProteinG: 153,
  initialCarbsG: 200,
  initialFatG: 60,
  currentTdeeEstimate: 2500,
  currentTargetCalories: 1950,
  currentProteinG: 153,
  currentCarbsG: 200,
  currentFatG: 60,
  eatingStyle: 'flexible',
  proteinPriority: 'active',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockProfile: UserProfile = {
  id: 'profile-1',
  sex: 'male',
  dateOfBirth: new Date('1990-06-15'),
  heightCm: 180,
  activityLevel: 'moderately_active',
  eatingStyle: 'flexible',
  proteinPriority: 'active',
  hasCompletedOnboarding: true,
  onboardingSkipped: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockReflection: WeeklyReflection = {
  id: 'reflection-1',
  goalId: 'goal-1',
  weekNumber: 1,
  weekStartDate: '2024-01-01',
  weekEndDate: '2024-01-07',
  avgCalorieIntake: 1900,
  daysLogged: 6,
  daysWeighed: 5,
  startTrendWeightKg: 85,
  endTrendWeightKg: 84.5,
  weightChangeKg: -0.5,
  newTdeeEstimate: 2480,
  newTargetCalories: 1930,
  newProteinG: 150,
  newCarbsG: 195,
  newFatG: 59,
  wasAccepted: undefined,
  dataQuality: 'good',
  createdAt: new Date('2024-01-08'),
};

describe('useGoalStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGoalStore.setState(initialState);
  });

  // ==========================================================
  // Pure Calculation Functions
  // ==========================================================

  describe('calculateBMR', () => {
    it('calculates BMR for male using Mifflin-St Jeor equation', () => {
      // 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
      const bmr = useGoalStore.getState().calculateBMR(80, 180, 30, 'male');
      expect(bmr).toBe(1780);
    });

    it('calculates BMR for female using Mifflin-St Jeor equation', () => {
      // 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
      const bmr = useGoalStore.getState().calculateBMR(60, 165, 25, 'female');
      expect(bmr).toBe(1345.25);
    });

    it('returns higher BMR for male than female with same stats', () => {
      const maleBmr = useGoalStore.getState().calculateBMR(70, 170, 30, 'male');
      const femaleBmr = useGoalStore.getState().calculateBMR(70, 170, 30, 'female');
      // Difference should be exactly 166 (5 - (-161))
      expect(maleBmr - femaleBmr).toBe(166);
    });

    it('decreases BMR with increasing age', () => {
      const younger = useGoalStore.getState().calculateBMR(80, 180, 25, 'male');
      const older = useGoalStore.getState().calculateBMR(80, 180, 45, 'male');
      // 20 year difference -> 5 * 20 = 100 kcal difference
      expect(younger - older).toBe(100);
    });
  });

  describe('calculateTDEE', () => {
    it('multiplies BMR by sedentary activity factor', () => {
      const tdee = useGoalStore.getState().calculateTDEE(1780, 'sedentary');
      expect(tdee).toBeCloseTo(1780 * 1.2, 2);
    });

    it('multiplies BMR by moderately active factor', () => {
      const tdee = useGoalStore.getState().calculateTDEE(1780, 'moderately_active');
      expect(tdee).toBeCloseTo(1780 * 1.55, 2);
    });

    it('multiplies BMR by extremely active factor', () => {
      const tdee = useGoalStore.getState().calculateTDEE(1500, 'extremely_active');
      expect(tdee).toBeCloseTo(1500 * 1.9, 2);
    });
  });

  describe('calculateTargetCalories', () => {
    it('returns TDEE for maintain goal', () => {
      const result = useGoalStore.getState().calculateTargetCalories(2500, 'maintain', 0, 'male');
      expect(result).toBe(2500);
    });

    it('subtracts deficit for lose goal', () => {
      // ratePercent=0.5 -> weeklyKg = 0.005, dailyDeficit = (0.005 * 7700) / 7 = 5.5
      const result = useGoalStore.getState().calculateTargetCalories(2500, 'lose', 0.5, 'male');
      const expectedDeficit = (0.5 / 100 * CALORIES_PER_KG) / 7;
      expect(result).toBe(2500 - expectedDeficit);
    });

    it('adds surplus for gain goal', () => {
      const result = useGoalStore.getState().calculateTargetCalories(2500, 'gain', 0.5, 'male');
      const expectedSurplus = (0.5 / 100 * CALORIES_PER_KG) / 7;
      expect(result).toBe(2500 + expectedSurplus);
    });

    it('enforces male calorie floor', () => {
      // With a very aggressive deficit, should not go below 1500 for male
      const result = useGoalStore.getState().calculateTargetCalories(1400, 'lose', 1.0, 'male');
      expect(result).toBe(CALORIE_FLOORS.male);
    });

    it('enforces female calorie floor', () => {
      const result = useGoalStore.getState().calculateTargetCalories(1100, 'lose', 1.0, 'female');
      expect(result).toBe(CALORIE_FLOORS.female);
    });

    it('does not apply floor when target is above floor', () => {
      const result = useGoalStore.getState().calculateTargetCalories(2500, 'lose', 0.25, 'male');
      expect(result).toBeGreaterThan(CALORIE_FLOORS.male);
    });
  });

  describe('calculateMacros', () => {
    it('calculates protein at 1.8g per kg bodyweight', () => {
      const macros = useGoalStore.getState().calculateMacros(2000, 80);
      expect(macros.protein).toBe(Math.round(80 * 1.8)); // 144
    });

    it('calculates fat at 27.5% of target calories', () => {
      const macros = useGoalStore.getState().calculateMacros(2000, 80);
      const expectedFat = Math.round((2000 * 0.275) / CALORIES_PER_GRAM.fat);
      expect(macros.fat).toBe(expectedFat); // 61
    });

    it('fills remaining calories with carbs', () => {
      const targetCalories = 2000;
      const weightKg = 80;
      const macros = useGoalStore.getState().calculateMacros(targetCalories, weightKg);

      const proteinCal = macros.protein * CALORIES_PER_GRAM.protein;
      const fatCal = targetCalories * 0.275;
      const expectedCarbs = Math.round((targetCalories - proteinCal - fatCal) / CALORIES_PER_GRAM.carbs);
      expect(macros.carbs).toBe(expectedCarbs);
    });

    it('returns all three macros as rounded integers', () => {
      const macros = useGoalStore.getState().calculateMacros(2200, 75);
      expect(Number.isInteger(macros.protein)).toBe(true);
      expect(Number.isInteger(macros.carbs)).toBe(true);
      expect(Number.isInteger(macros.fat)).toBe(true);
    });
  });

  // ==========================================================
  // Async Actions: Loading
  // ==========================================================

  describe('loadActiveGoal', () => {
    it('loads active goal and sets derived values', async () => {
      mockGoalRepo.getActiveGoal.mockResolvedValue(mockGoal);

      await useGoalStore.getState().loadActiveGoal();

      const state = useGoalStore.getState();
      expect(state.activeGoal).toEqual(mockGoal);
      expect(state.calorieGoal).toBe(mockGoal.currentTargetCalories);
      expect(state.proteinGoal).toBe(mockGoal.currentProteinG);
      expect(state.carbGoal).toBe(mockGoal.currentCarbsG);
      expect(state.fatGoal).toBe(mockGoal.currentFatG);
      expect(state.targetWeight).toBe(mockGoal.targetWeightKg);
      expect(state.weeklyGoal).toBe(mockGoal.targetRatePercent);
      expect(state.isLoading).toBe(false);
    });

    it('sets nulls for derived values when no goal exists', async () => {
      mockGoalRepo.getActiveGoal.mockResolvedValue(null);

      await useGoalStore.getState().loadActiveGoal();

      const state = useGoalStore.getState();
      expect(state.activeGoal).toBeNull();
      expect(state.calorieGoal).toBeNull();
      expect(state.proteinGoal).toBeNull();
    });

    it('sets error on failure', async () => {
      mockGoalRepo.getActiveGoal.mockRejectedValue(new Error('DB error'));

      await useGoalStore.getState().loadActiveGoal();

      const state = useGoalStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadProfile', () => {
    it('loads user profile', async () => {
      mockProfileRepo.getOrCreate.mockResolvedValue(mockProfile);

      await useGoalStore.getState().loadProfile();

      expect(useGoalStore.getState().profile).toEqual(mockProfile);
      expect(useGoalStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockProfileRepo.getOrCreate.mockRejectedValue(new Error('Profile error'));

      await useGoalStore.getState().loadProfile();

      expect(useGoalStore.getState().error).toBe('Profile error');
    });
  });

  describe('loadReflections', () => {
    it('returns early when no active goal', async () => {
      useGoalStore.setState({ activeGoal: null });

      await useGoalStore.getState().loadReflections();

      expect(mockGoalRepo.getReflectionsForGoal).not.toHaveBeenCalled();
    });

    it('loads reflections for active goal', async () => {
      useGoalStore.setState({ activeGoal: mockGoal });
      mockGoalRepo.getReflectionsForGoal.mockResolvedValue([mockReflection]);

      await useGoalStore.getState().loadReflections();

      expect(mockGoalRepo.getReflectionsForGoal).toHaveBeenCalledWith('goal-1');
      expect(useGoalStore.getState().reflections).toEqual([mockReflection]);
    });

    it('sets error on failure', async () => {
      useGoalStore.setState({ activeGoal: mockGoal });
      mockGoalRepo.getReflectionsForGoal.mockRejectedValue(new Error('Reflection error'));

      await useGoalStore.getState().loadReflections();

      expect(useGoalStore.getState().error).toBe('Reflection error');
    });
  });

  describe('loadPendingReflection', () => {
    it('returns early when no active goal', async () => {
      useGoalStore.setState({ activeGoal: null });

      await useGoalStore.getState().loadPendingReflection();

      expect(mockGoalRepo.getPendingReflection).not.toHaveBeenCalled();
    });

    it('loads pending reflection for active goal', async () => {
      useGoalStore.setState({ activeGoal: mockGoal });
      mockGoalRepo.getPendingReflection.mockResolvedValue(mockReflection);

      await useGoalStore.getState().loadPendingReflection();

      expect(mockGoalRepo.getPendingReflection).toHaveBeenCalledWith('goal-1');
      expect(useGoalStore.getState().pendingReflection).toEqual(mockReflection);
    });
  });

  // ==========================================================
  // Async Actions: Goal Management
  // ==========================================================

  describe('createGoal', () => {
    it('orchestrates BMR, TDEE, calories, macros, and creates goal', async () => {
      const mockMacros = { calories: 1950, protein: 140, carbs: 200, fat: 60 };
      mockMacroCalculator.calculateMacros.mockReturnValue(mockMacros);
      mockGoalRepo.createGoal.mockResolvedValue(mockGoal);

      const result = await useGoalStore.getState().createGoal({
        type: 'lose',
        targetWeightKg: 75,
        targetRatePercent: 0.5,
        currentWeightKg: 85,
        sex: 'male',
        heightCm: 180,
        age: 30,
        activityLevel: 'moderately_active',
      });

      expect(mockMacroCalculator.calculateMacros).toHaveBeenCalledWith(
        expect.objectContaining({
          weightKg: 85,
          eatingStyle: 'flexible',
          proteinPriority: 'active',
        })
      );
      expect(mockGoalRepo.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'lose',
          targetWeightKg: 75,
          startWeightKg: 85,
          initialProteinG: 140,
          initialCarbsG: 200,
          initialFatG: 60,
        })
      );
      expect(result).toEqual(mockGoal);
      expect(useGoalStore.getState().activeGoal).toEqual(mockGoal);
    });

    it('uses provided eatingStyle and proteinPriority', async () => {
      mockMacroCalculator.calculateMacros.mockReturnValue({ calories: 2000, protein: 160, carbs: 180, fat: 70 });
      mockGoalRepo.createGoal.mockResolvedValue(mockGoal);

      await useGoalStore.getState().createGoal({
        type: 'maintain',
        targetRatePercent: 0,
        currentWeightKg: 80,
        sex: 'male',
        heightCm: 178,
        age: 28,
        activityLevel: 'very_active',
        eatingStyle: 'carb_focused',
        proteinPriority: 'athletic',
      });

      expect(mockMacroCalculator.calculateMacros).toHaveBeenCalledWith(
        expect.objectContaining({
          eatingStyle: 'carb_focused',
          proteinPriority: 'athletic',
        })
      );
      expect(mockGoalRepo.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          eatingStyle: 'carb_focused',
          proteinPriority: 'athletic',
        })
      );
    });

    it('throws and sets error on failure', async () => {
      mockMacroCalculator.calculateMacros.mockReturnValue({ calories: 2000, protein: 150, carbs: 200, fat: 65 });
      mockGoalRepo.createGoal.mockRejectedValue(new Error('Create failed'));

      await expect(
        useGoalStore.getState().createGoal({
          type: 'lose',
          targetRatePercent: 0.5,
          currentWeightKg: 80,
          sex: 'male',
          heightCm: 175,
          age: 30,
          activityLevel: 'sedentary',
        })
      ).rejects.toThrow('Create failed');

      expect(useGoalStore.getState().error).toBe('Create failed');
    });
  });

  describe('updateGoalTargets', () => {
    it('returns early when no active goal', async () => {
      useGoalStore.setState({ activeGoal: null });

      await useGoalStore.getState().updateGoalTargets(2400, 1900, { protein: 150, carbs: 190, fat: 58 });

      expect(mockGoalRepo.updateGoal).not.toHaveBeenCalled();
    });

    it('updates goal and refreshes derived values', async () => {
      const updatedGoal = { ...mockGoal, currentTargetCalories: 1900, currentProteinG: 150 };
      useGoalStore.setState({ activeGoal: mockGoal });
      mockGoalRepo.updateGoal.mockResolvedValue(updatedGoal);

      await useGoalStore.getState().updateGoalTargets(2400, 1900, { protein: 150, carbs: 190, fat: 58 });

      expect(mockGoalRepo.updateGoal).toHaveBeenCalledWith('goal-1', {
        currentTdeeEstimate: 2400,
        currentTargetCalories: 1900,
        currentProteinG: 150,
        currentCarbsG: 190,
        currentFatG: 58,
      });
      expect(useGoalStore.getState().calorieGoal).toBe(1900);
    });
  });

  describe('completeGoal', () => {
    it('returns early when no active goal', async () => {
      useGoalStore.setState({ activeGoal: null });

      await useGoalStore.getState().completeGoal();

      expect(mockGoalRepo.completeGoal).not.toHaveBeenCalled();
    });

    it('clears goal and derived state on completion', async () => {
      useGoalStore.setState({ activeGoal: mockGoal, reflections: [mockReflection], pendingReflection: mockReflection });
      mockGoalRepo.completeGoal.mockResolvedValue(undefined);

      await useGoalStore.getState().completeGoal();

      const state = useGoalStore.getState();
      expect(state.activeGoal).toBeNull();
      expect(state.calorieGoal).toBeNull();
      expect(state.reflections).toEqual([]);
      expect(state.pendingReflection).toBeNull();
    });
  });

  // ==========================================================
  // Async Actions: Reflections
  // ==========================================================

  describe('acceptReflection', () => {
    it('returns early when no active goal or pending reflection', async () => {
      useGoalStore.setState({ activeGoal: null, pendingReflection: null });

      await useGoalStore.getState().acceptReflection('reflection-1');

      expect(mockGoalRepo.acceptReflection).not.toHaveBeenCalled();
    });

    it('accepts reflection and applies new targets', async () => {
      const updatedGoal = {
        ...mockGoal,
        currentTdeeEstimate: 2480,
        currentTargetCalories: 1930,
        currentProteinG: 150,
        currentCarbsG: 195,
        currentFatG: 59,
      };
      useGoalStore.setState({ activeGoal: mockGoal, pendingReflection: mockReflection });
      mockGoalRepo.acceptReflection.mockResolvedValue(undefined);
      mockGoalRepo.updateGoal.mockResolvedValue(updatedGoal);
      mockGoalRepo.getReflectionsForGoal.mockResolvedValue([{ ...mockReflection, wasAccepted: true }]);

      await useGoalStore.getState().acceptReflection('reflection-1', 'Looks good');

      expect(mockGoalRepo.acceptReflection).toHaveBeenCalledWith('reflection-1', 'Looks good');
      expect(mockGoalRepo.updateGoal).toHaveBeenCalledWith('goal-1', expect.objectContaining({
        currentTdeeEstimate: 2480,
        currentTargetCalories: 1930,
      }));
      expect(useGoalStore.getState().pendingReflection).toBeNull();
    });
  });

  describe('declineReflection', () => {
    it('declines reflection and clears pending', async () => {
      useGoalStore.setState({ activeGoal: mockGoal, pendingReflection: mockReflection });
      mockGoalRepo.declineReflection.mockResolvedValue(undefined);
      mockGoalRepo.getReflectionsForGoal.mockResolvedValue([{ ...mockReflection, wasAccepted: false }]);

      await useGoalStore.getState().declineReflection('reflection-1', 'Not accurate');

      expect(mockGoalRepo.declineReflection).toHaveBeenCalledWith('reflection-1', 'Not accurate');
      expect(useGoalStore.getState().pendingReflection).toBeNull();
    });

    it('sets error on failure', async () => {
      useGoalStore.setState({ activeGoal: mockGoal, pendingReflection: mockReflection });
      mockGoalRepo.declineReflection.mockRejectedValue(new Error('Decline failed'));

      await useGoalStore.getState().declineReflection('reflection-1');

      expect(useGoalStore.getState().error).toBe('Decline failed');
    });
  });
});
