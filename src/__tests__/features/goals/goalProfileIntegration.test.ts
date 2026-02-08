/**
 * Goal & Profile Integration Tests
 *
 * Tests the integration between goalStore, profileStore, macroCalculator service,
 * and the repository layer for goal creation and profile-driven calculations.
 */

let createdGoals: any[] = [];
let goalIdCounter = 0;
let storedProfile: any = null;

// Mock repositories at the boundary
jest.mock('@/repositories', () => ({
  goalRepository: {
    getActiveGoal: jest.fn(() => {
      const active = createdGoals.find((g) => g.isActive);
      return Promise.resolve(active ?? null);
    }),
    createGoal: jest.fn((input: any) => {
      goalIdCounter++;
      // Deactivate existing goals
      createdGoals.forEach((g) => (g.isActive = false));
      const goal = {
        id: `goal-${goalIdCounter}`,
        type: input.type,
        targetWeightKg: input.targetWeightKg ?? undefined,
        targetRatePercent: input.targetRatePercent,
        startDate: input.startDate,
        startWeightKg: input.startWeightKg,
        initialTdeeEstimate: input.initialTdeeEstimate,
        initialTargetCalories: input.initialTargetCalories,
        initialProteinG: input.initialProteinG,
        initialCarbsG: input.initialCarbsG,
        initialFatG: input.initialFatG,
        currentTdeeEstimate: input.initialTdeeEstimate,
        currentTargetCalories: input.initialTargetCalories,
        currentProteinG: input.initialProteinG,
        currentCarbsG: input.initialCarbsG,
        currentFatG: input.initialFatG,
        eatingStyle: input.eatingStyle,
        proteinPriority: input.proteinPriority,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      createdGoals.push(goal);
      return Promise.resolve(goal);
    }),
    updateGoal: jest.fn((id: string, updates: any) => {
      const goal = createdGoals.find((g) => g.id === id);
      if (!goal) return Promise.reject(new Error('Goal not found'));
      Object.assign(goal, updates, { updatedAt: new Date() });
      return Promise.resolve({ ...goal });
    }),
    completeGoal: jest.fn((id: string) => {
      const goal = createdGoals.find((g) => g.id === id);
      if (goal) {
        goal.isActive = false;
        goal.completedAt = new Date();
      }
      return Promise.resolve(goal);
    }),
    getReflectionsForGoal: jest.fn(() => Promise.resolve([])),
    getPendingReflection: jest.fn(() => Promise.resolve(null)),
    acceptReflection: jest.fn(() => Promise.resolve()),
    declineReflection: jest.fn(() => Promise.resolve()),
  },
  profileRepository: {
    getOrCreate: jest.fn(() => {
      if (storedProfile) return Promise.resolve(storedProfile);
      storedProfile = {
        id: 'profile-1',
        sex: undefined,
        dateOfBirth: undefined,
        heightCm: undefined,
        activityLevel: undefined,
        eatingStyle: 'flexible',
        proteinPriority: 'active',
        hasCompletedOnboarding: false,
        onboardingSkipped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return Promise.resolve(storedProfile);
    }),
    get: jest.fn(() => Promise.resolve(storedProfile)),
    update: jest.fn((updates: any) => {
      if (storedProfile) {
        Object.assign(storedProfile, updates, { updatedAt: new Date() });
      }
      return Promise.resolve(storedProfile);
    }),
    completeOnboarding: jest.fn(() => {
      if (storedProfile) storedProfile.hasCompletedOnboarding = true;
      return Promise.resolve(storedProfile);
    }),
    skipOnboarding: jest.fn(() => {
      if (storedProfile) storedProfile.onboardingSkipped = true;
      return Promise.resolve(storedProfile);
    }),
    reset: jest.fn(() => {
      storedProfile = null;
      return Promise.resolve();
    }),
  },
  settingsRepository: {
    getAll: jest.fn(),
    updateSettings: jest.fn(),
    resetToDefaults: jest.fn(),
  },
}));

// Use the REAL macroCalculator (not mocked) since we want to test its output
// The real macroCalculator is a pure function, no DB dependencies

import { useGoalStore } from '@/stores/goalStore';
import { useProfileStore } from '@/stores/profileStore';
import { macroCalculator } from '@/services/macroCalculator';
import { goalRepository, profileRepository } from '@/repositories';
import {
  ACTIVITY_MULTIPLIERS,
  CALORIE_FLOORS,
  CALORIES_PER_KG,
  CALORIES_PER_GRAM,
} from '@/constants/defaults';

const mockGoalRepo = goalRepository as jest.Mocked<typeof goalRepository>;
const mockProfileRepo = profileRepository as jest.Mocked<typeof profileRepository>;

const goalInitialState = {
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

const profileInitialState = {
  profile: null,
  isLoading: false,
  isLoaded: false,
  error: null,
};

describe('Goal & Profile Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset simulated repository state
    createdGoals = [];
    goalIdCounter = 0;
    storedProfile = null;

    // Reset stores
    useGoalStore.setState(goalInitialState);
    useProfileStore.setState(profileInitialState);
  });

  // ================================================================
  // Creating a goal uses profile data for BMR calculation
  // ================================================================
  describe('Creating a goal uses profile data for BMR calculation', () => {
    it('calculates BMR from weight, height, age, and sex (male)', async () => {
      const weightKg = 85;
      const heightCm = 180;
      const age = 30;
      const sex = 'male' as const;

      // Mifflin-St Jeor for male: 10*85 + 6.25*180 - 5*30 + 5 = 850 + 1125 - 150 + 5 = 1830
      const expectedBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;

      const bmr = useGoalStore.getState().calculateBMR(weightKg, heightCm, age, sex);
      expect(bmr).toBe(expectedBmr);
      expect(bmr).toBe(1830);
    });

    it('calculates BMR from weight, height, age, and sex (female)', async () => {
      const weightKg = 65;
      const heightCm = 165;
      const age = 28;
      const sex = 'female' as const;

      // Mifflin-St Jeor for female: 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25
      const expectedBmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

      const bmr = useGoalStore.getState().calculateBMR(weightKg, heightCm, age, sex);
      expect(bmr).toBe(expectedBmr);
      expect(bmr).toBe(1380.25);
    });

    it('uses profile data to create a goal with correct BMR-derived values', async () => {
      const goal = await useGoalStore.getState().createGoal({
        type: 'lose',
        targetWeightKg: 75,
        targetRatePercent: 0.5,
        currentWeightKg: 85,
        sex: 'male',
        heightCm: 180,
        age: 30,
        activityLevel: 'moderately_active',
      });

      // BMR = 10*85 + 6.25*180 - 5*30 + 5 = 1830
      const expectedBmr = 1830;
      // TDEE = 1830 * 1.55 = 2836.5
      const expectedTdee = expectedBmr * ACTIVITY_MULTIPLIERS.moderately_active;
      // Deficit = (0.5/100 * 85 * 7700) / 7 = 467.86
      const dailyDeficit = (0.5 / 100 * 85 * CALORIES_PER_KG) / 7;
      const expectedCalories = Math.round(expectedTdee - dailyDeficit);

      expect(goal.initialTdeeEstimate).toBe(Math.round(expectedTdee));
      expect(goal.initialTargetCalories).toBe(expectedCalories);
      expect(goal.type).toBe('lose');
      expect(goal.startWeightKg).toBe(85);
      expect(goal.isActive).toBe(true);

      // Goal should be set as active in the store
      const state = useGoalStore.getState();
      expect(state.activeGoal).not.toBeNull();
      expect(state.calorieGoal).toBe(expectedCalories);
    });

    it('female BMR is lower than male BMR with identical stats', () => {
      const maleBmr = useGoalStore.getState().calculateBMR(70, 170, 30, 'male');
      const femaleBmr = useGoalStore.getState().calculateBMR(70, 170, 30, 'female');

      // Male: 10*70 + 6.25*170 - 5*30 + 5 = 700 + 1062.5 - 150 + 5 = 1617.5
      // Female: 10*70 + 6.25*170 - 5*30 - 161 = 700 + 1062.5 - 150 - 161 = 1451.5
      // Difference = 166
      expect(maleBmr - femaleBmr).toBe(166);
      expect(maleBmr).toBeGreaterThan(femaleBmr);
    });
  });

  // ================================================================
  // Different activity levels produce different TDEE values
  // ================================================================
  describe('Different activity levels produce different TDEE values', () => {
    const testBmr = 1800;

    it('sedentary TDEE uses 1.2 multiplier', () => {
      const tdee = useGoalStore.getState().calculateTDEE(testBmr, 'sedentary');
      expect(tdee).toBeCloseTo(testBmr * 1.2, 2);
      expect(tdee).toBe(2160);
    });

    it('lightly active TDEE uses 1.375 multiplier', () => {
      const tdee = useGoalStore.getState().calculateTDEE(testBmr, 'lightly_active');
      expect(tdee).toBeCloseTo(testBmr * 1.375, 2);
    });

    it('moderately active TDEE uses 1.55 multiplier', () => {
      const tdee = useGoalStore.getState().calculateTDEE(testBmr, 'moderately_active');
      expect(tdee).toBeCloseTo(testBmr * 1.55, 2);
    });

    it('very active TDEE uses 1.725 multiplier', () => {
      const tdee = useGoalStore.getState().calculateTDEE(testBmr, 'very_active');
      expect(tdee).toBeCloseTo(testBmr * 1.725, 2);
    });

    it('extremely active TDEE uses 1.9 multiplier', () => {
      const tdee = useGoalStore.getState().calculateTDEE(testBmr, 'extremely_active');
      expect(tdee).toBeCloseTo(testBmr * 1.9, 2);
      expect(tdee).toBe(3420);
    });

    it('TDEE increases monotonically with activity level', () => {
      const calc = useGoalStore.getState().calculateTDEE;
      const sedentary = calc(testBmr, 'sedentary');
      const lightlyActive = calc(testBmr, 'lightly_active');
      const moderatelyActive = calc(testBmr, 'moderately_active');
      const veryActive = calc(testBmr, 'very_active');
      const extremelyActive = calc(testBmr, 'extremely_active');

      expect(sedentary).toBeLessThan(lightlyActive);
      expect(lightlyActive).toBeLessThan(moderatelyActive);
      expect(moderatelyActive).toBeLessThan(veryActive);
      expect(veryActive).toBeLessThan(extremelyActive);
    });

    it('creating goals with different activity levels yields different TDEE', async () => {
      const baseParams = {
        type: 'maintain' as const,
        targetRatePercent: 0,
        currentWeightKg: 80,
        sex: 'male' as const,
        heightCm: 178,
        age: 28,
      };

      const sedentaryGoal = await useGoalStore.getState().createGoal({
        ...baseParams,
        activityLevel: 'sedentary',
      });

      // Reset for next goal
      useGoalStore.setState(goalInitialState);

      const activeGoal = await useGoalStore.getState().createGoal({
        ...baseParams,
        activityLevel: 'very_active',
      });

      // Very active should have higher TDEE
      expect(activeGoal.initialTdeeEstimate).toBeGreaterThan(sedentaryGoal.initialTdeeEstimate);

      // Both should be positive and reasonable
      expect(sedentaryGoal.initialTdeeEstimate).toBeGreaterThan(1500);
      expect(activeGoal.initialTdeeEstimate).toBeLessThan(4500);
    });
  });

  // ================================================================
  // Deficit/surplus targets adjust calories correctly
  // ================================================================
  describe('Deficit/surplus targets adjust calories correctly', () => {
    it('maintain goal sets target calories equal to TDEE', () => {
      const tdee = 2500;
      const result = useGoalStore.getState().calculateTargetCalories(tdee, 'maintain', 0, 'male', 80);
      expect(result).toBe(2500);
    });

    it('lose goal subtracts a deficit from TDEE', () => {
      const tdee = 2500;
      const weightKg = 80;
      const ratePercent = 0.5; // 0.5% of body weight per week
      const dailyDeficit = (ratePercent / 100 * weightKg * CALORIES_PER_KG) / 7;
      const expected = tdee - dailyDeficit;

      const result = useGoalStore.getState().calculateTargetCalories(tdee, 'lose', ratePercent, 'male', weightKg);
      expect(result).toBe(expected);
      expect(result).toBeLessThan(tdee);
    });

    it('gain goal adds a surplus to TDEE', () => {
      const tdee = 2500;
      const weightKg = 80;
      const ratePercent = 0.25;
      const dailySurplus = (ratePercent / 100 * weightKg * CALORIES_PER_KG) / 7;
      const expected = tdee + dailySurplus;

      const result = useGoalStore.getState().calculateTargetCalories(tdee, 'gain', ratePercent, 'male', weightKg);
      expect(result).toBe(expected);
      expect(result).toBeGreaterThan(tdee);
    });

    it('larger rate percent creates larger deficit', () => {
      const tdee = 2500;
      const smallDeficit = useGoalStore.getState().calculateTargetCalories(tdee, 'lose', 0.25, 'male', 80);
      const largeDeficit = useGoalStore.getState().calculateTargetCalories(tdee, 'lose', 1.0, 'male', 80);

      expect(largeDeficit).toBeLessThan(smallDeficit);
    });

    it('enforces male calorie floor of 1500', () => {
      // Very aggressive deficit that would go below floor
      const result = useGoalStore.getState().calculateTargetCalories(1400, 'lose', 1.0, 'male', 80);
      expect(result).toBe(CALORIE_FLOORS.male);
      expect(result).toBe(1500);
    });

    it('enforces female calorie floor of 1200', () => {
      const result = useGoalStore.getState().calculateTargetCalories(1100, 'lose', 1.0, 'female', 60);
      expect(result).toBe(CALORIE_FLOORS.female);
      expect(result).toBe(1200);
    });

    it('end-to-end: creating a loss goal produces correct calorie target', async () => {
      const goal = await useGoalStore.getState().createGoal({
        type: 'lose',
        targetWeightKg: 80,
        targetRatePercent: 0.5,
        currentWeightKg: 90,
        sex: 'male',
        heightCm: 182,
        age: 35,
        activityLevel: 'lightly_active',
      });

      // BMR = 10*90 + 6.25*182 - 5*35 + 5 = 900 + 1137.5 - 175 + 5 = 1867.5
      const expectedBmr = 1867.5;
      const expectedTdee = expectedBmr * ACTIVITY_MULTIPLIERS.lightly_active;
      const dailyDeficit = (0.5 / 100 * 90 * CALORIES_PER_KG) / 7;
      const expectedCalories = Math.round(expectedTdee - dailyDeficit);

      expect(goal.initialTdeeEstimate).toBe(Math.round(expectedTdee));
      expect(goal.initialTargetCalories).toBe(expectedCalories);
      expect(goal.initialTargetCalories).toBeLessThan(goal.initialTdeeEstimate);
    });

    it('end-to-end: creating a gain goal produces correct calorie target', async () => {
      const goal = await useGoalStore.getState().createGoal({
        type: 'gain',
        targetWeightKg: 80,
        targetRatePercent: 0.25,
        currentWeightKg: 70,
        sex: 'male',
        heightCm: 175,
        age: 25,
        activityLevel: 'very_active',
      });

      // Gain goal should have target above TDEE
      expect(goal.initialTargetCalories).toBeGreaterThan(goal.initialTdeeEstimate);
    });
  });

  // ================================================================
  // Macro split calculations produce reasonable protein/carb/fat ratios
  // ================================================================
  describe('Macro split calculations produce reasonable ratios', () => {
    it('flexible eating style splits remaining cals 50/50 carbs/fat', () => {
      const result = macroCalculator.calculateMacros({
        weightKg: 80,
        targetCalories: 2000,
        eatingStyle: 'flexible',
        proteinPriority: 'active',
      });

      // Protein = round(80 * 1.65) = 132g, proteinCals = 528
      // Remaining = 2000 - 528 = 1472
      // Carbs = round(1472 * 0.5 / 4) = 184g
      // Fat = round(1472 * 0.5 / 9) = 82g
      expect(result.protein).toBe(132);
      expect(result.carbs).toBe(184);
      expect(result.fat).toBe(82);

      // All macros should be positive
      expect(result.protein).toBeGreaterThan(0);
      expect(result.carbs).toBeGreaterThan(0);
      expect(result.fat).toBeGreaterThan(0);
    });

    it('carb_focused eating style yields more carbs than fat', () => {
      const result = macroCalculator.calculateMacros({
        weightKg: 80,
        targetCalories: 2200,
        eatingStyle: 'carb_focused',
        proteinPriority: 'active',
      });

      // Carb-focused should have more carb calories than fat calories
      const carbCalories = result.carbs * CALORIES_PER_GRAM.carbs;
      const fatCalories = result.fat * CALORIES_PER_GRAM.fat;

      expect(carbCalories).toBeGreaterThan(fatCalories);
    });

    it('fat_focused eating style caps carbs at 150g', () => {
      const result = macroCalculator.calculateMacros({
        weightKg: 80,
        targetCalories: 2500,
        eatingStyle: 'fat_focused',
        proteinPriority: 'active',
      });

      // Fat-focused caps carbs at 150g
      expect(result.carbs).toBeLessThanOrEqual(150);
      expect(result.fat).toBeGreaterThan(0);
    });

    it('very_low_carb eating style caps carbs at 50g', () => {
      const result = macroCalculator.calculateMacros({
        weightKg: 80,
        targetCalories: 2000,
        eatingStyle: 'very_low_carb',
        proteinPriority: 'active',
      });

      // Very low carb caps at 50g
      expect(result.carbs).toBeLessThanOrEqual(50);
      expect(result.fat).toBeGreaterThan(0);
    });

    it('higher protein priority yields more protein grams', () => {
      const standard = macroCalculator.calculateMacros({
        weightKg: 80,
        targetCalories: 2000,
        eatingStyle: 'flexible',
        proteinPriority: 'standard',
      });

      const maximum = macroCalculator.calculateMacros({
        weightKg: 80,
        targetCalories: 2000,
        eatingStyle: 'flexible',
        proteinPriority: 'maximum',
      });

      expect(maximum.protein).toBeGreaterThan(standard.protein);

      // Standard: 80 * 1.32 = 106g
      // Maximum: 80 * 2.2 = 176g
      expect(standard.protein).toBe(106);
      expect(maximum.protein).toBe(176);
    });

    it('macro totals roughly match target calories', () => {
      const targetCalories = 2000;
      const result = macroCalculator.calculateMacros({
        weightKg: 80,
        targetCalories,
        eatingStyle: 'flexible',
        proteinPriority: 'active',
      });

      const totalFromMacros =
        result.protein * CALORIES_PER_GRAM.protein +
        result.carbs * CALORIES_PER_GRAM.carbs +
        result.fat * CALORIES_PER_GRAM.fat;

      // Allow for rounding (each macro is rounded to integer grams)
      // Maximum rounding error: 3 macros * ~0.5g * 9cal/g = ~13.5 cal
      expect(Math.abs(totalFromMacros - targetCalories)).toBeLessThan(50);
    });

    it('calculateMacrosWithBreakdown provides percentage breakdown', () => {
      const breakdown = macroCalculator.calculateMacrosWithBreakdown({
        weightKg: 80,
        targetCalories: 2200,
        eatingStyle: 'flexible',
        proteinPriority: 'active',
      });

      // Percentages should sum to approximately 100
      const totalPercent = breakdown.proteinPercent + breakdown.carbsPercent + breakdown.fatPercent;
      expect(totalPercent).toBeGreaterThanOrEqual(98);
      expect(totalPercent).toBeLessThanOrEqual(102);

      // Each percentage should be positive
      expect(breakdown.proteinPercent).toBeGreaterThan(0);
      expect(breakdown.carbsPercent).toBeGreaterThan(0);
      expect(breakdown.fatPercent).toBeGreaterThan(0);
    });

    it('end-to-end: goal creation stores macros computed by macroCalculator', async () => {
      const goal = await useGoalStore.getState().createGoal({
        type: 'maintain',
        targetRatePercent: 0,
        currentWeightKg: 80,
        sex: 'male',
        heightCm: 178,
        age: 28,
        activityLevel: 'moderately_active',
        eatingStyle: 'flexible',
        proteinPriority: 'active',
      });

      // The goal should have protein, carbs, fat all set
      expect(goal.initialProteinG).toBeGreaterThan(0);
      expect(goal.initialCarbsG).toBeGreaterThan(0);
      expect(goal.initialFatG).toBeGreaterThan(0);

      // Protein should be based on weight * protein priority factor
      // 80kg * 1.65 g/kg (active) = 132g
      expect(goal.initialProteinG).toBe(132);

      // Verify store state is updated with the goal's macro targets
      const state = useGoalStore.getState();
      expect(state.proteinGoal).toBe(goal.initialProteinG);
      expect(state.carbGoal).toBe(goal.initialCarbsG);
      expect(state.fatGoal).toBe(goal.initialFatG);
    });
  });

  // ================================================================
  // Profile updates that would affect an active goal
  // ================================================================
  describe('Profile updates that would affect an active goal', () => {
    it('profileStore loads and stores user profile', async () => {
      storedProfile = {
        id: 'profile-1',
        sex: 'male',
        dateOfBirth: new Date('1994-03-15'),
        heightCm: 180,
        activityLevel: 'moderately_active',
        eatingStyle: 'flexible',
        proteinPriority: 'active',
        hasCompletedOnboarding: true,
        onboardingSkipped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await useProfileStore.getState().loadProfile();

      const profile = useProfileStore.getState().profile;
      expect(profile).not.toBeNull();
      expect(profile!.sex).toBe('male');
      expect(profile!.heightCm).toBe(180);
      expect(profile!.activityLevel).toBe('moderately_active');
    });

    it('profile and goal store can be loaded independently', async () => {
      storedProfile = {
        id: 'profile-1',
        sex: 'female',
        dateOfBirth: new Date('1996-07-20'),
        heightCm: 165,
        activityLevel: 'lightly_active',
        eatingStyle: 'flexible',
        proteinPriority: 'standard',
        hasCompletedOnboarding: true,
        onboardingSkipped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Load both independently
      await useProfileStore.getState().loadProfile();
      await useGoalStore.getState().loadProfile();

      // Both stores should have profile data
      expect(useProfileStore.getState().profile).not.toBeNull();
      expect(useGoalStore.getState().profile).not.toBeNull();
    });

    it('different weight in profile vs goal shows weight has changed', async () => {
      // Create a goal at starting weight
      const goal = await useGoalStore.getState().createGoal({
        type: 'lose',
        targetWeightKg: 70,
        targetRatePercent: 0.5,
        currentWeightKg: 85,
        sex: 'male',
        heightCm: 178,
        age: 30,
        activityLevel: 'moderately_active',
      });

      expect(goal.startWeightKg).toBe(85);

      // If the user has lost weight, a new TDEE calculation with lower weight
      // would produce a different BMR
      const originalBmr = useGoalStore.getState().calculateBMR(85, 178, 30, 'male');
      const updatedBmr = useGoalStore.getState().calculateBMR(80, 178, 30, 'male');

      // Lower weight = lower BMR
      expect(updatedBmr).toBeLessThan(originalBmr);
      // Difference should be 10*5 = 50 kcal
      expect(originalBmr - updatedBmr).toBe(50);
    });

    it('updateGoalTargets allows adjusting macros on an active goal', async () => {
      // Create initial goal
      await useGoalStore.getState().createGoal({
        type: 'lose',
        targetWeightKg: 75,
        targetRatePercent: 0.5,
        currentWeightKg: 85,
        sex: 'male',
        heightCm: 180,
        age: 30,
        activityLevel: 'moderately_active',
      });

      const originalCalories = useGoalStore.getState().calorieGoal;
      expect(originalCalories).not.toBeNull();

      // Simulate a weekly reflection updating targets
      const newTdee = 2450;
      const newCalories = 1900;
      const newMacros = { protein: 145, carbs: 190, fat: 58 };

      await useGoalStore.getState().updateGoalTargets(newTdee, newCalories, newMacros);

      const state = useGoalStore.getState();
      expect(state.calorieGoal).toBe(1900);
      expect(state.proteinGoal).toBe(145);
      expect(state.carbGoal).toBe(190);
      expect(state.fatGoal).toBe(58);
    });

    it('completing a goal clears all derived state', async () => {
      // Create and complete a goal
      await useGoalStore.getState().createGoal({
        type: 'lose',
        targetWeightKg: 75,
        targetRatePercent: 0.5,
        currentWeightKg: 85,
        sex: 'male',
        heightCm: 180,
        age: 30,
        activityLevel: 'moderately_active',
      });

      expect(useGoalStore.getState().activeGoal).not.toBeNull();
      expect(useGoalStore.getState().calorieGoal).not.toBeNull();

      await useGoalStore.getState().completeGoal();

      const state = useGoalStore.getState();
      expect(state.activeGoal).toBeNull();
      expect(state.calorieGoal).toBeNull();
      expect(state.proteinGoal).toBeNull();
      expect(state.carbGoal).toBeNull();
      expect(state.fatGoal).toBeNull();
      expect(state.reflections).toEqual([]);
      expect(state.pendingReflection).toBeNull();
    });

    it('creating a new goal deactivates the previous one', async () => {
      // Create first goal
      const goal1 = await useGoalStore.getState().createGoal({
        type: 'lose',
        targetWeightKg: 75,
        targetRatePercent: 0.5,
        currentWeightKg: 85,
        sex: 'male',
        heightCm: 180,
        age: 30,
        activityLevel: 'moderately_active',
      });

      expect(goal1.isActive).toBe(true);

      // Create second goal (should deactivate first)
      const goal2 = await useGoalStore.getState().createGoal({
        type: 'maintain',
        targetRatePercent: 0,
        currentWeightKg: 80,
        sex: 'male',
        heightCm: 180,
        age: 30,
        activityLevel: 'moderately_active',
      });

      expect(goal2.isActive).toBe(true);

      // The repository was called with the second goal's data
      expect(mockGoalRepo.createGoal).toHaveBeenCalledTimes(2);

      // Only the new goal should be active in the simulated repo
      const activeGoals = createdGoals.filter((g) => g.isActive);
      expect(activeGoals).toHaveLength(1);
      expect(activeGoals[0].id).toBe(goal2.id);
    });

    it('getAge computes age from dateOfBirth in profileStore', () => {
      const dob = new Date('1994-06-15');
      useProfileStore.setState({
        profile: {
          id: 'profile-1',
          sex: 'male',
          dateOfBirth: dob,
          heightCm: 180,
          activityLevel: 'moderately_active',
          eatingStyle: 'flexible' as const,
          proteinPriority: 'active' as const,
          hasCompletedOnboarding: true,
          onboardingSkipped: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoaded: true,
      });

      const age = useProfileStore.getState().getAge();
      expect(age).not.toBeNull();
      // Age should be reasonable (between 25 and 35 for a 1994 birthday tested in 2024-2026)
      expect(age).toBeGreaterThanOrEqual(25);
      expect(age).toBeLessThanOrEqual(35);
    });
  });
});
