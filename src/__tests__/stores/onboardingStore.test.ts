import { useOnboardingStore } from '@/stores/onboardingStore';
import { onboardingRepository } from '@/repositories/onboardingRepository';

// Mock the repository
jest.mock('@/repositories/onboardingRepository', () => ({
  onboardingRepository: {
    getAll: jest.fn(),
    completeOnboarding: jest.fn(),
    setGoalPath: jest.fn(() => Promise.resolve()),
    setEnergyUnit: jest.fn(() => Promise.resolve()),
    setWeightUnit: jest.fn(() => Promise.resolve()),
    markTooltipSeen: jest.fn(),
    hasSeenTooltip: jest.fn(),
    markFirstFoodLogged: jest.fn(() => Promise.resolve()),
    incrementFoodsLogged: jest.fn(() => Promise.resolve()),
    incrementDaysTracked: jest.fn(() => Promise.resolve()),
    resetOnboarding: jest.fn(),
    resetTooltips: jest.fn(() => Promise.resolve()),
    getLocaleDefaults: jest.fn(() => ({ energyUnit: 'calories', weightUnit: 'lbs' })),
  },
}));

describe('Onboarding Store', () => {
  const mockOnboardingData = {
    isComplete: false,
    completedAt: null,
    goalPath: null as 'lose' | 'maintain' | 'gain' | 'track' | null,
    energyUnit: 'calories' as const,
    weightUnit: 'lbs' as const,
    seenTooltips: [] as string[],
    firstFoodLoggedAt: null,
    totalFoodsLogged: 0,
    daysTracked: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
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

  describe('loadOnboarding', () => {
    it('should load onboarding data from repository', async () => {
      const data = {
        ...mockOnboardingData,
        isComplete: true,
        goalPath: 'lose' as const,
      };
      (onboardingRepository.getAll as jest.Mock).mockResolvedValue(data);

      await useOnboardingStore.getState().loadOnboarding();

      expect(useOnboardingStore.getState().isComplete).toBe(true);
      expect(useOnboardingStore.getState().goalPath).toBe('lose');
      expect(useOnboardingStore.getState().isLoaded).toBe(true);
    });

    it('should not reload if already loaded', async () => {
      useOnboardingStore.setState({ isLoaded: true });

      await useOnboardingStore.getState().loadOnboarding();

      expect(onboardingRepository.getAll).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (onboardingRepository.getAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await useOnboardingStore.getState().loadOnboarding();

      expect(useOnboardingStore.getState().error).toBe('DB Error');
      expect(useOnboardingStore.getState().isLoaded).toBe(true);
    });
  });

  describe('completeOnboarding', () => {
    it('should complete onboarding with preferences', async () => {
      const completedData = {
        ...mockOnboardingData,
        isComplete: true,
        completedAt: '2024-01-15T10:00:00.000Z',
        goalPath: 'maintain' as const,
        energyUnit: 'kilojoules' as const,
        weightUnit: 'kg' as const,
      };
      (onboardingRepository.completeOnboarding as jest.Mock).mockResolvedValue(completedData);

      await useOnboardingStore.getState().completeOnboarding('maintain', 'kilojoules', 'kg');

      expect(onboardingRepository.completeOnboarding).toHaveBeenCalledWith(
        'maintain',
        'kilojoules',
        'kg'
      );
      expect(useOnboardingStore.getState().isComplete).toBe(true);
      expect(useOnboardingStore.getState().goalPath).toBe('maintain');
    });
  });

  describe('setGoalPath', () => {
    it('should update goal path in state and persist', () => {
      useOnboardingStore.getState().setGoalPath('gain');

      expect(useOnboardingStore.getState().goalPath).toBe('gain');
      expect(onboardingRepository.setGoalPath).toHaveBeenCalledWith('gain');
    });
  });

  describe('setEnergyUnit', () => {
    it('should update energy unit in state and persist', () => {
      useOnboardingStore.getState().setEnergyUnit('kilojoules');

      expect(useOnboardingStore.getState().energyUnit).toBe('kilojoules');
      expect(onboardingRepository.setEnergyUnit).toHaveBeenCalledWith('kilojoules');
    });
  });

  describe('setWeightUnit', () => {
    it('should update weight unit in state and persist', () => {
      useOnboardingStore.getState().setWeightUnit('kg');

      expect(useOnboardingStore.getState().weightUnit).toBe('kg');
      expect(onboardingRepository.setWeightUnit).toHaveBeenCalledWith('kg');
    });
  });

  describe('markTooltipSeen', () => {
    it('should add tooltip to seen list', async () => {
      (onboardingRepository.markTooltipSeen as jest.Mock).mockResolvedValue([
        'test_tooltip',
      ]);

      await useOnboardingStore.getState().markTooltipSeen('test_tooltip');

      expect(useOnboardingStore.getState().seenTooltips).toContain('test_tooltip');
    });

    it('should not duplicate tooltips', async () => {
      useOnboardingStore.setState({ seenTooltips: ['test_tooltip'] });

      await useOnboardingStore.getState().markTooltipSeen('test_tooltip');

      expect(onboardingRepository.markTooltipSeen).not.toHaveBeenCalled();
    });
  });

  describe('hasSeenTooltip', () => {
    it('should return true for seen tooltip', () => {
      useOnboardingStore.setState({ seenTooltips: ['test_tooltip'] });

      const result = useOnboardingStore.getState().hasSeenTooltip('test_tooltip');

      expect(result).toBe(true);
    });

    it('should return false for unseen tooltip', () => {
      useOnboardingStore.setState({ seenTooltips: [] });

      const result = useOnboardingStore.getState().hasSeenTooltip('test_tooltip');

      expect(result).toBe(false);
    });
  });

  describe('markFirstFoodLogged', () => {
    it('should mark first food logged and return true', async () => {
      useOnboardingStore.setState({ firstFoodLoggedAt: null });

      const result = await useOnboardingStore.getState().markFirstFoodLogged();

      expect(result).toBe(true);
      expect(useOnboardingStore.getState().firstFoodLoggedAt).not.toBeNull();
      expect(onboardingRepository.markFirstFoodLogged).toHaveBeenCalled();
    });

    it('should return false if already logged first food', async () => {
      useOnboardingStore.setState({ firstFoodLoggedAt: new Date() });

      const result = await useOnboardingStore.getState().markFirstFoodLogged();

      expect(result).toBe(false);
    });
  });

  describe('incrementFoodsLogged', () => {
    it('should increment foods logged count', async () => {
      useOnboardingStore.setState({ totalFoodsLogged: 5 });

      await useOnboardingStore.getState().incrementFoodsLogged();

      expect(useOnboardingStore.getState().totalFoodsLogged).toBe(6);
    });
  });

  describe('incrementDaysTracked', () => {
    it('should increment days tracked count', async () => {
      useOnboardingStore.setState({ daysTracked: 3 });

      await useOnboardingStore.getState().incrementDaysTracked();

      expect(useOnboardingStore.getState().daysTracked).toBe(4);
    });
  });

  describe('resetOnboarding', () => {
    it('should reset all onboarding state', async () => {
      useOnboardingStore.setState({
        isComplete: true,
        goalPath: 'lose',
        seenTooltips: ['tooltip1', 'tooltip2'],
      });
      (onboardingRepository.resetOnboarding as jest.Mock).mockResolvedValue(mockOnboardingData);

      await useOnboardingStore.getState().resetOnboarding();

      expect(useOnboardingStore.getState().isComplete).toBe(false);
      expect(useOnboardingStore.getState().goalPath).toBeNull();
      expect(useOnboardingStore.getState().seenTooltips).toEqual([]);
    });
  });

  describe('resetTooltips', () => {
    it('should reset tooltips and first food logged', async () => {
      useOnboardingStore.setState({
        seenTooltips: ['tooltip1'],
        firstFoodLoggedAt: new Date(),
      });

      await useOnboardingStore.getState().resetTooltips();

      expect(useOnboardingStore.getState().seenTooltips).toEqual([]);
      expect(useOnboardingStore.getState().firstFoodLoggedAt).toBeNull();
    });
  });

  describe('shouldShowCelebration', () => {
    it('should return true for users with weight goals', () => {
      useOnboardingStore.setState({ goalPath: 'lose' });

      const result = useOnboardingStore.getState().shouldShowCelebration();

      expect(result).toBe(true);
    });

    it('should return true for maintain goal', () => {
      useOnboardingStore.setState({ goalPath: 'maintain' });

      const result = useOnboardingStore.getState().shouldShowCelebration();

      expect(result).toBe(true);
    });

    it('should return true for gain goal', () => {
      useOnboardingStore.setState({ goalPath: 'gain' });

      const result = useOnboardingStore.getState().shouldShowCelebration();

      expect(result).toBe(true);
    });

    it('should return false for track-only users', () => {
      useOnboardingStore.setState({ goalPath: 'track' });

      const result = useOnboardingStore.getState().shouldShowCelebration();

      expect(result).toBe(false);
    });

    it('should return false when no goal path set', () => {
      useOnboardingStore.setState({ goalPath: null });

      const result = useOnboardingStore.getState().shouldShowCelebration();

      expect(result).toBe(false);
    });
  });
});
