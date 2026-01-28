/**
 * Voice Command Handler Tests
 * Tests for voice command execution and deep link processing
 */

import {
  handleLogWaterCommand,
  handleQuickAddCommand,
  handleCalorieQueryCommand,
  handleMacroQueryCommand,
  handleWaterQueryCommand,
  handleLogWeightCommand,
  processVoiceDeepLink,
} from '../voiceCommandHandler';

// Mock the stores
jest.mock('@/stores/waterStore', () => ({
  useWaterStore: {
    getState: jest.fn(() => ({
      addGlass: jest.fn().mockResolvedValue(undefined),
      getTodayProgress: jest.fn(() => ({
        glasses: 5,
        goal: 8,
        percent: 62.5,
      })),
    })),
  },
}));

jest.mock('@/stores/foodLogStore', () => ({
  useFoodLogStore: {
    getState: jest.fn(() => ({
      selectedDate: '2024-01-15',
      loadEntriesForDate: jest.fn().mockResolvedValue(undefined),
      addQuickEntry: jest.fn().mockResolvedValue({ id: 'test-id' }),
      getDailySummary: jest.fn(() => ({
        totals: { calories: 1450, protein: 85, carbs: 150, fat: 50 },
        goals: { calories: 2000, protein: 150, carbs: 250, fat: 65 },
      })),
    })),
  },
}));

jest.mock('@/stores/weightStore', () => ({
  useWeightStore: {
    getState: jest.fn(() => ({
      addEntry: jest.fn().mockResolvedValue({ id: 'weight-id' }),
    })),
  },
}));

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      settings: {
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 250,
        dailyFatGoal: 65,
        weightUnit: 'pounds',
      },
    })),
  },
}));

describe('voiceCommandHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLogWaterCommand', () => {
    it('logs water and returns success', async () => {
      const result = await handleLogWaterCommand(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Added water');
      expect(result.data?.totalGlasses).toBeDefined();
    });

    it('handles multiple glasses', async () => {
      const result = await handleLogWaterCommand(3);

      expect(result.success).toBe(true);
      expect(result.message).toContain('glasses');
    });

    it('handles string input', async () => {
      const result = await handleLogWaterCommand('2');

      expect(result.success).toBe(true);
    });

    it('defaults to 1 glass when no amount specified', async () => {
      const result = await handleLogWaterCommand(undefined);

      expect(result.success).toBe(true);
    });
  });

  describe('handleQuickAddCommand', () => {
    it('adds calories and returns success', async () => {
      const result = await handleQuickAddCommand(400, 'lunch');

      expect(result.success).toBe(true);
      expect(result.message).toContain('400 calories');
      expect(result.message).toContain('lunch');
      expect(result.data?.addedCalories).toBe(400);
      expect(result.data?.targetMeal).toBe('lunch');
    });

    it('auto-detects meal when not specified', async () => {
      const result = await handleQuickAddCommand(300);

      expect(result.success).toBe(true);
      expect(result.data?.targetMeal).toBeDefined();
    });

    it('returns error for invalid calories', async () => {
      const result = await handleQuickAddCommand(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_calories');
    });

    it('returns error for non-numeric calories', async () => {
      const result = await handleQuickAddCommand('abc');

      expect(result.success).toBe(false);
    });
  });

  describe('handleCalorieQueryCommand', () => {
    it('returns calorie count', async () => {
      const result = await handleCalorieQueryCommand();

      expect(result.success).toBe(true);
      expect(result.message).toContain('1,450');
      expect(result.data?.totalCalories).toBe(1450);
    });

    it('does not include judgmental language', async () => {
      const result = await handleCalorieQueryCommand();

      expect(result.message).not.toMatch(/good|bad|great|too|only/i);
    });
  });

  describe('handleMacroQueryCommand', () => {
    it('returns protein count', async () => {
      const result = await handleMacroQueryCommand('protein');

      expect(result.success).toBe(true);
      expect(result.message).toContain('protein');
      expect(result.data?.macroType).toBe('protein');
    });

    it('returns carbs count', async () => {
      const result = await handleMacroQueryCommand('carbs');

      expect(result.success).toBe(true);
      expect(result.message).toContain('carbs');
    });

    it('returns fat count', async () => {
      const result = await handleMacroQueryCommand('fat');

      expect(result.success).toBe(true);
      expect(result.message).toContain('fat');
    });

    it('returns error for invalid macro type', async () => {
      const result = await handleMacroQueryCommand(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_macro_type');
    });
  });

  describe('handleWaterQueryCommand', () => {
    it('returns water count', async () => {
      const result = await handleWaterQueryCommand();

      expect(result.success).toBe(true);
      expect(result.message).toContain('5');
      expect(result.message).toContain('glasses');
      expect(result.data?.totalGlasses).toBe(5);
    });
  });

  describe('handleLogWeightCommand', () => {
    it('logs weight in pounds', async () => {
      const result = await handleLogWeightCommand(175, 'pounds');

      expect(result.success).toBe(true);
      expect(result.message).toContain('175');
      expect(result.message).toContain('pounds');
    });

    it('logs weight in kilograms', async () => {
      const result = await handleLogWeightCommand(79.5, 'kilograms');

      expect(result.success).toBe(true);
      expect(result.message).toContain('kilograms');
    });

    it('uses user default unit when not specified', async () => {
      const result = await handleLogWeightCommand(175);

      expect(result.success).toBe(true);
      // Should use default from settings (pounds)
      expect(result.message).toContain('pounds');
    });

    it('returns error for invalid weight', async () => {
      const result = await handleLogWeightCommand(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_weight');
    });
  });

  describe('processVoiceDeepLink', () => {
    it('routes water/add correctly', async () => {
      const result = await processVoiceDeepLink('water/add', { waterAmount: '2' });

      expect(result.success).toBe(true);
    });

    it('routes water/query correctly', async () => {
      const result = await processVoiceDeepLink('water/query', {});

      expect(result.success).toBe(true);
      expect(result.data?.totalGlasses).toBeDefined();
    });

    it('routes quickadd correctly', async () => {
      const result = await processVoiceDeepLink('quickadd', {
        calories: '400',
        meal: 'lunch',
      });

      expect(result.success).toBe(true);
    });

    it('routes query/calories correctly', async () => {
      const result = await processVoiceDeepLink('query/calories', {});

      expect(result.success).toBe(true);
    });

    it('routes query/macros correctly', async () => {
      const result = await processVoiceDeepLink('query/macros', {
        queryType: 'protein',
      });

      expect(result.success).toBe(true);
    });

    it('routes weight/log correctly', async () => {
      const result = await processVoiceDeepLink('weight/log', {
        weight: '175',
        unit: 'pounds',
      });

      expect(result.success).toBe(true);
    });

    it('returns error for unknown path', async () => {
      const result = await processVoiceDeepLink('unknown/path', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('unknown_command');
    });
  });
});
