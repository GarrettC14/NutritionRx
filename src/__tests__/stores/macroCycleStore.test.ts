/**
 * Macro Cycle Store Tests
 * Tests for macro cycling state management including config actions,
 * override actions, computed helpers, and the calculateDayTargets pure function.
 */

import { useMacroCycleStore } from '@/stores/macroCycleStore';
import { macroCycleRepository } from '@/repositories';
import { MacroCycleConfig, MacroCycleOverride, DayTargets } from '@/types/planning';

jest.mock('@/repositories', () => ({
  macroCycleRepository: {
    getOrCreateConfig: jest.fn(),
    getOverrideByDate: jest.fn(),
    updateConfig: jest.fn(),
    disableCycling: jest.fn(),
    setOverride: jest.fn(),
    clearOverride: jest.fn(),
    getTargetsForDate: jest.fn(),
    getDayType: jest.fn(),
    calculateWeeklyAverage: jest.fn(),
  },
}));

describe('useMacroCycleStore', () => {
  const mockRepo = macroCycleRepository as jest.Mocked<typeof macroCycleRepository>;

  const initialState = {
    config: null,
    todayOverride: null,
    isLoading: false,
    isLoaded: false,
    error: null,
  };

  const mockConfig: MacroCycleConfig = {
    enabled: true,
    patternType: 'training_rest',
    markedDays: [1, 3, 5],
    dayTargets: {
      0: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
      1: { calories: 2200, protein: 150, carbs: 250, fat: 47 },
      2: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
      3: { calories: 2200, protein: 150, carbs: 250, fat: 47 },
      4: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
      5: { calories: 2200, protein: 150, carbs: 250, fat: 47 },
      6: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    lastModified: '2024-01-15T00:00:00.000Z',
  };

  const mockOverride: MacroCycleOverride = {
    id: 'override-1',
    date: '2024-01-15',
    calories: 2500,
    protein: 180,
    carbs: 300,
    fat: 55,
    createdAt: '2024-01-15T10:00:00.000Z',
  };

  const baseTargets: DayTargets = { calories: 2000, protein: 150, carbs: 200, fat: 67 };
  const adjustment = { calories: 200, protein: 0, carbs: 50, fat: -20 };
  const markedDays = [1, 3, 5];

  beforeEach(() => {
    jest.clearAllMocks();
    useMacroCycleStore.setState(initialState);
  });

  // ============================================================
  // Config Actions
  // ============================================================

  describe('loadConfig', () => {
    it('loads config and today override successfully', async () => {
      mockRepo.getOrCreateConfig.mockResolvedValue(mockConfig);
      mockRepo.getOverrideByDate.mockResolvedValue(mockOverride);

      await useMacroCycleStore.getState().loadConfig();

      const state = useMacroCycleStore.getState();
      expect(state.config).toEqual(mockConfig);
      expect(state.todayOverride).toEqual(mockOverride);
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets isLoading to true while loading', async () => {
      let loadingDuringCall = false;
      mockRepo.getOrCreateConfig.mockImplementation(async () => {
        loadingDuringCall = useMacroCycleStore.getState().isLoading;
        return mockConfig;
      });
      mockRepo.getOverrideByDate.mockResolvedValue(null);

      await useMacroCycleStore.getState().loadConfig();

      expect(loadingDuringCall).toBe(true);
      expect(useMacroCycleStore.getState().isLoading).toBe(false);
    });

    it('handles null override when none exists for today', async () => {
      mockRepo.getOrCreateConfig.mockResolvedValue(mockConfig);
      mockRepo.getOverrideByDate.mockResolvedValue(null);

      await useMacroCycleStore.getState().loadConfig();

      expect(useMacroCycleStore.getState().todayOverride).toBeNull();
    });

    it('handles errors and sets error message', async () => {
      mockRepo.getOrCreateConfig.mockRejectedValue(new Error('DB connection failed'));

      await useMacroCycleStore.getState().loadConfig();

      const state = useMacroCycleStore.getState();
      expect(state.error).toBe('DB connection failed');
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('sets fallback error message for non-Error exceptions', async () => {
      mockRepo.getOrCreateConfig.mockRejectedValue('unknown error');

      await useMacroCycleStore.getState().loadConfig();

      expect(useMacroCycleStore.getState().error).toBe('Failed to load macro cycle config');
    });
  });

  describe('enableCycling', () => {
    it('enables cycling with pattern, marked days, and day targets', async () => {
      const dayTargets = mockConfig.dayTargets;
      mockRepo.updateConfig.mockResolvedValue(mockConfig);

      await useMacroCycleStore.getState().enableCycling('training_rest', markedDays, dayTargets);

      expect(mockRepo.updateConfig).toHaveBeenCalledWith({
        enabled: true,
        patternType: 'training_rest',
        markedDays,
        dayTargets,
      });
      expect(useMacroCycleStore.getState().config).toEqual(mockConfig);
    });

    it('sets error on failure', async () => {
      mockRepo.updateConfig.mockRejectedValue(new Error('Enable failed'));

      await useMacroCycleStore.getState().enableCycling('training_rest', [], {});

      expect(useMacroCycleStore.getState().error).toBe('Enable failed');
    });
  });

  describe('disableCycling', () => {
    it('disables cycling and updates config', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      mockRepo.disableCycling.mockResolvedValue(disabledConfig);

      await useMacroCycleStore.getState().disableCycling();

      expect(mockRepo.disableCycling).toHaveBeenCalled();
      expect(useMacroCycleStore.getState().config).toEqual(disabledConfig);
    });

    it('sets error on failure', async () => {
      mockRepo.disableCycling.mockRejectedValue(new Error('Disable failed'));

      await useMacroCycleStore.getState().disableCycling();

      expect(useMacroCycleStore.getState().error).toBe('Disable failed');
    });
  });

  describe('updatePattern', () => {
    it('updates pattern type and marked days', async () => {
      const updatedConfig = { ...mockConfig, patternType: 'high_low_carb' as const };
      mockRepo.updateConfig.mockResolvedValue(updatedConfig);

      await useMacroCycleStore.getState().updatePattern('high_low_carb', [0, 2, 4], mockConfig.dayTargets);

      expect(mockRepo.updateConfig).toHaveBeenCalledWith({
        patternType: 'high_low_carb',
        markedDays: [0, 2, 4],
        dayTargets: mockConfig.dayTargets,
      });
      expect(useMacroCycleStore.getState().config).toEqual(updatedConfig);
    });

    it('sets error on failure', async () => {
      mockRepo.updateConfig.mockRejectedValue(new Error('Update failed'));

      await useMacroCycleStore.getState().updatePattern('custom', [], {});

      expect(useMacroCycleStore.getState().error).toBe('Update failed');
    });
  });

  // ============================================================
  // Override Actions
  // ============================================================

  describe('loadTodayOverride', () => {
    it('loads override for today', async () => {
      mockRepo.getOverrideByDate.mockResolvedValue(mockOverride);

      await useMacroCycleStore.getState().loadTodayOverride();

      expect(useMacroCycleStore.getState().todayOverride).toEqual(mockOverride);
    });

    it('sets null when no override exists', async () => {
      mockRepo.getOverrideByDate.mockResolvedValue(null);

      await useMacroCycleStore.getState().loadTodayOverride();

      expect(useMacroCycleStore.getState().todayOverride).toBeNull();
    });

    it('does not set error state on failure (logs to console)', async () => {
      mockRepo.getOverrideByDate.mockRejectedValue(new Error('Load failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await useMacroCycleStore.getState().loadTodayOverride();

      expect(useMacroCycleStore.getState().error).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setTodayOverride', () => {
    it('sets override for today with provided targets', async () => {
      const targets: DayTargets = { calories: 2500, protein: 180, carbs: 300, fat: 55 };
      mockRepo.setOverride.mockResolvedValue(mockOverride);

      await useMacroCycleStore.getState().setTodayOverride(targets);

      expect(mockRepo.setOverride).toHaveBeenCalledWith(expect.any(String), targets);
      expect(useMacroCycleStore.getState().todayOverride).toEqual(mockOverride);
    });

    it('sets error on failure', async () => {
      mockRepo.setOverride.mockRejectedValue(new Error('Set override failed'));

      await useMacroCycleStore.getState().setTodayOverride(baseTargets);

      expect(useMacroCycleStore.getState().error).toBe('Set override failed');
    });
  });

  describe('clearTodayOverride', () => {
    it('clears override and sets todayOverride to null', async () => {
      useMacroCycleStore.setState({ todayOverride: mockOverride });
      mockRepo.clearOverride.mockResolvedValue(undefined);

      await useMacroCycleStore.getState().clearTodayOverride();

      expect(useMacroCycleStore.getState().todayOverride).toBeNull();
    });

    it('sets error on failure', async () => {
      mockRepo.clearOverride.mockRejectedValue(new Error('Clear override failed'));

      await useMacroCycleStore.getState().clearTodayOverride();

      expect(useMacroCycleStore.getState().error).toBe('Clear override failed');
    });
  });

  // ============================================================
  // Computed / Helpers
  // ============================================================

  describe('getTargetsForDate', () => {
    it('delegates to repository with date and base targets', async () => {
      const expected: DayTargets = { calories: 2200, protein: 150, carbs: 250, fat: 47 };
      mockRepo.getTargetsForDate.mockResolvedValue(expected);

      const result = await useMacroCycleStore.getState().getTargetsForDate('2024-01-15', baseTargets);

      expect(mockRepo.getTargetsForDate).toHaveBeenCalledWith('2024-01-15', baseTargets);
      expect(result).toEqual(expected);
    });
  });

  describe('getTodayTargets', () => {
    it('delegates to repository with today date and base targets', async () => {
      const expected: DayTargets = { calories: 2200, protein: 150, carbs: 250, fat: 47 };
      mockRepo.getTargetsForDate.mockResolvedValue(expected);

      const result = await useMacroCycleStore.getState().getTodayTargets(baseTargets);

      expect(mockRepo.getTargetsForDate).toHaveBeenCalledWith(expect.any(String), baseTargets);
      expect(result).toEqual(expected);
    });
  });

  describe('getDayType', () => {
    it('returns null when config is null', () => {
      useMacroCycleStore.setState({ config: null });

      const result = useMacroCycleStore.getState().getDayType(1);

      expect(result).toBeNull();
    });

    it('returns null when config is disabled', () => {
      useMacroCycleStore.setState({ config: { ...mockConfig, enabled: false } });

      const result = useMacroCycleStore.getState().getDayType(1);

      expect(result).toBeNull();
    });

    it('delegates to repository when config is enabled', () => {
      useMacroCycleStore.setState({ config: mockConfig });
      mockRepo.getDayType.mockReturnValue('training');

      const result = useMacroCycleStore.getState().getDayType(1);

      expect(mockRepo.getDayType).toHaveBeenCalledWith(1, mockConfig);
      expect(result).toBe('training');
    });
  });

  describe('getWeeklyAverage', () => {
    it('returns null when config is null', () => {
      useMacroCycleStore.setState({ config: null });

      const result = useMacroCycleStore.getState().getWeeklyAverage();

      expect(result).toBeNull();
    });

    it('returns null when config is disabled', () => {
      useMacroCycleStore.setState({ config: { ...mockConfig, enabled: false } });

      const result = useMacroCycleStore.getState().getWeeklyAverage();

      expect(result).toBeNull();
    });

    it('delegates to repository when config is enabled', () => {
      useMacroCycleStore.setState({ config: mockConfig });
      const avgTargets: DayTargets = { calories: 2086, protein: 150, carbs: 221, fat: 58 };
      mockRepo.calculateWeeklyAverage.mockReturnValue(avgTargets);

      const result = useMacroCycleStore.getState().getWeeklyAverage();

      expect(mockRepo.calculateWeeklyAverage).toHaveBeenCalledWith(mockConfig);
      expect(result).toEqual(avgTargets);
    });
  });

  // ============================================================
  // calculateDayTargets (pure function - thorough testing)
  // ============================================================

  describe('calculateDayTargets', () => {
    describe('training_rest pattern', () => {
      it('gives marked (training) days base + adjustment', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          markedDays,
          adjustment,
        );

        // Day 1 is marked (training day)
        expect(result[1]).toEqual({
          calories: 2200, // 2000 + 200
          protein: 150,   // 150 + 0
          carbs: 250,     // 200 + 50
          fat: 47,        // 67 + (-20)
        });
      });

      it('gives unmarked (rest) days base targets only', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          markedDays,
          adjustment,
        );

        // Day 0 is not marked (rest day)
        expect(result[0]).toEqual({
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 67,
        });
      });

      it('applies adjustment to all marked days (1, 3, 5)', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          markedDays,
          adjustment,
        );

        for (const day of markedDays) {
          expect(result[day]).toEqual({
            calories: 2200,
            protein: 150,
            carbs: 250,
            fat: 47,
          });
        }
      });

      it('keeps base for all unmarked days (0, 2, 4, 6)', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          markedDays,
          adjustment,
        );

        for (const day of [0, 2, 4, 6]) {
          expect(result[day]).toEqual(baseTargets);
        }
      });

      it('generates targets for all 7 days', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          markedDays,
          adjustment,
        );

        expect(Object.keys(result)).toHaveLength(7);
        for (let d = 0; d < 7; d++) {
          expect(result[d]).toBeDefined();
        }
      });
    });

    describe('high_low_carb pattern', () => {
      it('gives marked (high carb) days more carbs and less fat', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'high_low_carb',
          markedDays,
          adjustment,
        );

        // Day 1 is marked (high carb day)
        expect(result[1]).toEqual({
          calories: 2000, // unchanged
          protein: 150,   // unchanged
          carbs: 250,     // 200 + 50
          fat: 47,        // 67 + (-20)
        });
      });

      it('gives unmarked (low carb) days inverse adjustment scaled by 0.67', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'high_low_carb',
          markedDays,
          adjustment,
        );

        // Day 0 is not marked (low carb day)
        // carbs: 200 - Math.round(50 * 0.67) = 200 - 34 = 166
        // fat: 67 - Math.round(-20 * 0.67) = 67 - (-13) = 67 + 13 = 80
        expect(result[0]).toEqual({
          calories: 2000,
          protein: 150,
          carbs: 200 - Math.round(50 * 0.67),  // 166
          fat: 67 - Math.round(-20 * 0.67),      // 80
        });
      });

      it('keeps calories and protein unchanged for all days', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'high_low_carb',
          markedDays,
          adjustment,
        );

        for (let d = 0; d < 7; d++) {
          expect(result[d].calories).toBe(2000);
          expect(result[d].protein).toBe(150);
        }
      });

      it('high carb days have more carbs than low carb days', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'high_low_carb',
          markedDays,
          adjustment,
        );

        expect(result[1].carbs).toBeGreaterThan(result[0].carbs);
        expect(result[0].fat).toBeGreaterThan(result[1].fat);
      });
    });

    describe('custom pattern', () => {
      it('gives all days the base targets', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'custom',
          markedDays,
          adjustment,
        );

        for (let d = 0; d < 7; d++) {
          expect(result[d]).toEqual(baseTargets);
        }
      });

      it('ignores adjustment and marked days for custom', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'custom',
          [0, 1, 2, 3, 4, 5, 6],
          { calories: 500, protein: 50, carbs: 100, fat: -30 },
        );

        for (let d = 0; d < 7; d++) {
          expect(result[d]).toEqual(baseTargets);
        }
      });
    });

    describe('edge cases', () => {
      it('handles empty marked days (all rest/low carb)', () => {
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          [],
          adjustment,
        );

        for (let d = 0; d < 7; d++) {
          expect(result[d]).toEqual(baseTargets);
        }
      });

      it('handles all days marked', () => {
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          allDays,
          adjustment,
        );

        for (let d = 0; d < 7; d++) {
          expect(result[d]).toEqual({
            calories: 2200,
            protein: 150,
            carbs: 250,
            fat: 47,
          });
        }
      });

      it('handles zero adjustments', () => {
        const zeroAdj = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const result = useMacroCycleStore.getState().calculateDayTargets(
          baseTargets,
          'training_rest',
          markedDays,
          zeroAdj,
        );

        for (let d = 0; d < 7; d++) {
          expect(result[d]).toEqual(baseTargets);
        }
      });
    });
  });
});
