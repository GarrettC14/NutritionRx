/**
 * Integration tests for the onboarding flow
 * Tests the complete flow from repository to store to UI
 */

import { useOnboardingStore } from '@/stores/onboardingStore';

// Mock the database
const mockDb = {
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
};

jest.mock('@/db/database', () => ({
  getDatabase: () => mockDb,
}));

// Mock NativeModules for locale detection
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  NativeModules: {
    SettingsManager: {
      settings: {
        AppleLocale: 'en_US',
      },
    },
  },
}));

describe('Onboarding Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to initial state
    useOnboardingStore.setState({
      isComplete: false,
      completedAt: null,
      goalPath: null,
      energyUnit: 'calories',
      weightUnit: 'lbs',
      seenTooltips: [],
      firstFoodLoggedAt: null,
      totalFoodsLogged: 0,
      daysTracked: 0,
      isLoading: false,
      isLoaded: false,
      error: null,
    });
  });

  describe('Fresh User Onboarding', () => {
    it('should initialize with default values for new user', async () => {
      // Simulate no existing data in database
      mockDb.getFirstAsync.mockResolvedValue(null);

      await useOnboardingStore.getState().loadOnboarding();

      const state = useOnboardingStore.getState();
      expect(state.isComplete).toBe(false);
      expect(state.goalPath).toBeNull();
      expect(state.energyUnit).toBe('calories');
      expect(state.weightUnit).toBe('lbs');
      expect(state.seenTooltips).toEqual([]);
      expect(state.isLoaded).toBe(true);
    });

    it('should complete full onboarding flow', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue(undefined);

      // Load initial state
      await useOnboardingStore.getState().loadOnboarding();
      expect(useOnboardingStore.getState().isComplete).toBe(false);

      // User selects goal
      useOnboardingStore.getState().setGoalPath('lose');
      expect(useOnboardingStore.getState().goalPath).toBe('lose');

      // User selects preferences
      useOnboardingStore.getState().setEnergyUnit('calories');
      useOnboardingStore.getState().setWeightUnit('lbs');

      // Complete onboarding
      // Mock the return value
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ value: '1' }) // isComplete
        .mockResolvedValueOnce({ value: new Date().toISOString() }) // completedAt
        .mockResolvedValueOnce({ value: 'lose' }) // goalPath
        .mockResolvedValueOnce({ value: 'calories' }) // energyUnit
        .mockResolvedValueOnce({ value: 'lbs' }) // weightUnit
        .mockResolvedValueOnce({ value: '[]' }) // seenTooltips
        .mockResolvedValueOnce(null) // firstFoodLoggedAt
        .mockResolvedValueOnce({ value: '0' }) // totalFoodsLogged
        .mockResolvedValueOnce({ value: '0' }); // daysTracked

      await useOnboardingStore.getState().completeOnboarding('lose', 'calories', 'lbs');

      expect(useOnboardingStore.getState().isComplete).toBe(true);
      expect(useOnboardingStore.getState().goalPath).toBe('lose');
    });
  });

  describe('Returning User', () => {
    it('should restore saved onboarding state', async () => {
      // Simulate existing completed onboarding
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ value: '1' }) // isComplete
        .mockResolvedValueOnce({ value: '2024-01-15T10:00:00.000Z' }) // completedAt
        .mockResolvedValueOnce({ value: 'maintain' }) // goalPath
        .mockResolvedValueOnce({ value: 'kilojoules' }) // energyUnit
        .mockResolvedValueOnce({ value: 'kg' }) // weightUnit
        .mockResolvedValueOnce({ value: '["tooltip1","tooltip2"]' }) // seenTooltips
        .mockResolvedValueOnce({ value: '2024-01-15T11:00:00.000Z' }) // firstFoodLoggedAt
        .mockResolvedValueOnce({ value: '25' }) // totalFoodsLogged
        .mockResolvedValueOnce({ value: '7' }); // daysTracked

      await useOnboardingStore.getState().loadOnboarding();

      const state = useOnboardingStore.getState();
      expect(state.isComplete).toBe(true);
      expect(state.goalPath).toBe('maintain');
      expect(state.energyUnit).toBe('kilojoules');
      expect(state.weightUnit).toBe('kg');
      expect(state.seenTooltips).toEqual(['tooltip1', 'tooltip2']);
      expect(state.totalFoodsLogged).toBe(25);
      expect(state.daysTracked).toBe(7);
    });
  });

  describe('Tooltip Tracking', () => {
    it('should track seen tooltips correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '[]' });
      mockDb.runAsync.mockResolvedValue(undefined);

      await useOnboardingStore.getState().loadOnboarding();

      // Mark first tooltip seen
      await useOnboardingStore.getState().markTooltipSeen('tooltip1');
      expect(useOnboardingStore.getState().seenTooltips).toContain('tooltip1');
      expect(useOnboardingStore.getState().hasSeenTooltip('tooltip1')).toBe(true);
      expect(useOnboardingStore.getState().hasSeenTooltip('tooltip2')).toBe(false);

      // Mark second tooltip seen
      await useOnboardingStore.getState().markTooltipSeen('tooltip2');
      expect(useOnboardingStore.getState().seenTooltips).toContain('tooltip2');
    });

    it('should not duplicate tooltips', async () => {
      useOnboardingStore.setState({ seenTooltips: ['tooltip1'] });

      await useOnboardingStore.getState().markTooltipSeen('tooltip1');

      expect(useOnboardingStore.getState().seenTooltips).toEqual(['tooltip1']);
    });
  });

  describe('First Food Celebration', () => {
    it('should track first food logged', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue(undefined);

      // First food should return true
      const isFirst = await useOnboardingStore.getState().markFirstFoodLogged();
      expect(isFirst).toBe(true);
      expect(useOnboardingStore.getState().firstFoodLoggedAt).not.toBeNull();

      // Subsequent foods should return false
      const isSecond = await useOnboardingStore.getState().markFirstFoodLogged();
      expect(isSecond).toBe(false);
    });

    it('should determine celebration style based on goal', () => {
      // Track-only users don't see progress bar
      useOnboardingStore.setState({ goalPath: 'track' });
      expect(useOnboardingStore.getState().shouldShowCelebration()).toBe(false);

      // Users with goals see progress bar
      useOnboardingStore.setState({ goalPath: 'lose' });
      expect(useOnboardingStore.getState().shouldShowCelebration()).toBe(true);

      useOnboardingStore.setState({ goalPath: 'gain' });
      expect(useOnboardingStore.getState().shouldShowCelebration()).toBe(true);

      useOnboardingStore.setState({ goalPath: 'maintain' });
      expect(useOnboardingStore.getState().shouldShowCelebration()).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    it('should increment foods logged count', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '5' });
      mockDb.runAsync.mockResolvedValue(undefined);

      useOnboardingStore.setState({ totalFoodsLogged: 5 });

      await useOnboardingStore.getState().incrementFoodsLogged();
      expect(useOnboardingStore.getState().totalFoodsLogged).toBe(6);

      await useOnboardingStore.getState().incrementFoodsLogged();
      expect(useOnboardingStore.getState().totalFoodsLogged).toBe(7);
    });

    it('should increment days tracked count', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '3' });
      mockDb.runAsync.mockResolvedValue(undefined);

      useOnboardingStore.setState({ daysTracked: 3 });

      await useOnboardingStore.getState().incrementDaysTracked();
      expect(useOnboardingStore.getState().daysTracked).toBe(4);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all onboarding data', async () => {
      // Set up completed state
      useOnboardingStore.setState({
        isComplete: true,
        goalPath: 'lose',
        seenTooltips: ['t1', 't2'],
        firstFoodLoggedAt: new Date(),
        totalFoodsLogged: 50,
        daysTracked: 14,
      });

      // Mock fresh state after reset
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue(undefined);

      await useOnboardingStore.getState().resetOnboarding();

      const state = useOnboardingStore.getState();
      expect(state.isComplete).toBe(false);
      expect(state.goalPath).toBeNull();
      expect(state.seenTooltips).toEqual([]);
      expect(state.firstFoodLoggedAt).toBeNull();
      expect(state.totalFoodsLogged).toBe(0);
      expect(state.daysTracked).toBe(0);
    });

    it('should reset tooltips only', async () => {
      useOnboardingStore.setState({
        isComplete: true,
        seenTooltips: ['t1', 't2'],
        firstFoodLoggedAt: new Date(),
      });

      mockDb.runAsync.mockResolvedValue(undefined);

      await useOnboardingStore.getState().resetTooltips();

      const state = useOnboardingStore.getState();
      expect(state.isComplete).toBe(true); // Should not change
      expect(state.seenTooltips).toEqual([]);
      expect(state.firstFoodLoggedAt).toBeNull();
    });
  });
});
