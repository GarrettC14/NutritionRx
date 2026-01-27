import { onboardingRepository, GoalPath, EnergyUnit } from '@/repositories/onboardingRepository';

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

describe('onboardingRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return default value when no setting exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await onboardingRepository.get('test_key', 'default');

      expect(result).toBe('default');
    });

    it('should parse number values correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '42' });

      const result = await onboardingRepository.get('test_key', 0);

      expect(result).toBe(42);
    });

    it('should parse boolean values correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '1' });

      const result = await onboardingRepository.get('test_key', false);

      expect(result).toBe(true);
    });

    it('should parse boolean "true" string correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'true' });

      const result = await onboardingRepository.get('test_key', false);

      expect(result).toBe(true);
    });

    it('should parse array values correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '["a","b","c"]' });

      const result = await onboardingRepository.get('test_key', [] as string[]);

      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should return default for invalid JSON array', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: 'invalid' });

      const result = await onboardingRepository.get('test_key', ['default']);

      expect(result).toEqual(['default']);
    });
  });

  describe('set', () => {
    it('should save string values', async () => {
      await onboardingRepository.set('test_key', 'test_value');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['test_key', 'test_value'])
      );
    });

    it('should save boolean values as 1/0', async () => {
      await onboardingRepository.set('test_key', true);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test_key', '1'])
      );
    });

    it('should save array values as JSON', async () => {
      await onboardingRepository.set('test_key', ['a', 'b']);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test_key', '["a","b"]'])
      );
    });

    it('should handle null values', async () => {
      await onboardingRepository.set('test_key', null);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test_key', null])
      );
    });
  });

  describe('getAll', () => {
    it('should return all onboarding data with defaults', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await onboardingRepository.getAll();

      expect(result).toEqual({
        isComplete: false,
        completedAt: null,
        goalPath: null,
        energyUnit: 'calories',
        weightUnit: 'lbs',
        seenTooltips: [],
        firstFoodLoggedAt: null,
        totalFoodsLogged: 0,
        daysTracked: 0,
      });
    });
  });

  describe('completeOnboarding', () => {
    it('should save all onboarding preferences', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await onboardingRepository.completeOnboarding('lose', 'calories', 'lbs');

      // Should have called set for isComplete, completedAt, goalPath, energyUnit, weightUnit
      expect(mockDb.runAsync).toHaveBeenCalledTimes(5);
    });
  });

  describe('markTooltipSeen', () => {
    it('should add tooltip to seen list', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '[]' });

      const result = await onboardingRepository.markTooltipSeen('test_tooltip');

      expect(result).toEqual(['test_tooltip']);
    });

    it('should not duplicate tooltips', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '["test_tooltip"]' });

      const result = await onboardingRepository.markTooltipSeen('test_tooltip');

      expect(result).toEqual(['test_tooltip']);
      // Should not call set since tooltip already exists
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('hasSeenTooltip', () => {
    it('should return true for seen tooltip', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '["test_tooltip"]' });

      const result = await onboardingRepository.hasSeenTooltip('test_tooltip');

      expect(result).toBe(true);
    });

    it('should return false for unseen tooltip', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '[]' });

      const result = await onboardingRepository.hasSeenTooltip('test_tooltip');

      expect(result).toBe(false);
    });
  });

  describe('markFirstFoodLogged', () => {
    it('should set first food logged timestamp', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await onboardingRepository.markFirstFoodLogged();

      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('should not overwrite existing timestamp', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '2024-01-01T00:00:00.000Z' });

      await onboardingRepository.markFirstFoodLogged();

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('incrementFoodsLogged', () => {
    it('should increment the count', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '5' });

      const result = await onboardingRepository.incrementFoodsLogged();

      expect(result).toBe(6);
    });
  });

  describe('incrementDaysTracked', () => {
    it('should increment the count', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ value: '3' });

      const result = await onboardingRepository.incrementDaysTracked();

      expect(result).toBe(4);
    });
  });

  describe('resetOnboarding', () => {
    it('should delete all onboarding settings', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await onboardingRepository.resetOnboarding();

      // Should call delete for each setting key
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM user_settings WHERE key = ?',
        expect.any(Array)
      );
    });
  });

  describe('resetTooltips', () => {
    it('should reset seen tooltips and first food logged', async () => {
      await onboardingRepository.resetTooltips();

      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLocaleDefaults', () => {
    it('should return US defaults for en_US locale', () => {
      const defaults = onboardingRepository.getLocaleDefaults();

      expect(defaults.energyUnit).toBe('calories');
      expect(defaults.weightUnit).toBe('lbs');
    });
  });
});
