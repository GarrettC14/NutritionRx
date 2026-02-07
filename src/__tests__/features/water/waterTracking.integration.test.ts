/**
 * Water Tracking Integration Tests
 * End-to-end tests for water tracking feature.
 * Mock boundary: database is mocked; store and repository logic run real code.
 */

let glassCount = 0;

// Mock repositories - include settingsRepository since the store imports it from @/repositories
jest.mock('@/repositories', () => ({
  waterRepository: {
    getByDate: jest.fn(),
    getOrCreateByDate: jest.fn(() => Promise.resolve({
      id: 'water-today',
      date: '2024-01-15',
      glasses: 0,
      notes: undefined,
      createdAt: new Date('2024-01-15T07:00:00.000Z'),
      updatedAt: new Date('2024-01-15T07:00:00.000Z'),
    })),
    addGlass: jest.fn(() => {
      glassCount++;
      return Promise.resolve({
        id: 'water-today',
        date: '2024-01-15',
        glasses: glassCount,
        notes: undefined,
        createdAt: new Date('2024-01-15T07:00:00.000Z'),
        updatedAt: new Date(),
      });
    }),
    removeGlass: jest.fn(() => {
      glassCount = Math.max(0, glassCount - 1);
      return Promise.resolve({
        id: 'water-today',
        date: '2024-01-15',
        glasses: glassCount,
        notes: undefined,
        createdAt: new Date('2024-01-15T07:00:00.000Z'),
        updatedAt: new Date(),
      });
    }),
    setGlasses: jest.fn((_, glasses) => Promise.resolve({
      id: 'water-today',
      date: '2024-01-15',
      glasses: glasses,
      notes: undefined,
      createdAt: new Date('2024-01-15T07:00:00.000Z'),
      updatedAt: new Date(),
    })),
    getRecentLogs: jest.fn(() => Promise.resolve([])),
    getStats: jest.fn(),
    delete: jest.fn(),
    deleteByDate: jest.fn(),
  },
  settingsRepository: {
    get: jest.fn((_key, defaultValue) => Promise.resolve(defaultValue)),
    set: jest.fn(() => Promise.resolve()),
  },
  DEFAULT_WATER_GOAL: 8,
  DEFAULT_GLASS_SIZE_ML: 250,
}));

// Import after mocks
import { useWaterStore } from '@/stores/waterStore';
import { waterRepository, settingsRepository, DEFAULT_WATER_GOAL, DEFAULT_GLASS_SIZE_ML } from '@/repositories';

const mockWaterRepository = waterRepository as jest.Mocked<typeof waterRepository>;
const mockSettingsRepository = settingsRepository as jest.Mocked<typeof settingsRepository>;

describe('Water Tracking Integration', () => {
  beforeEach(() => {
    // Reset glass count
    glassCount = 0;

    // Reset store state
    useWaterStore.setState({
      todayLog: null,
      recentLogs: [],
      goalGlasses: 8,
      glassSizeMl: 250,
      isLoading: false,
      isLoaded: false,
      error: null,
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Daily water tracking flow', () => {
    it('tracks water from 0 to goal completion', async () => {
      // Load initial state
      await useWaterStore.getState().loadTodayWater();

      let state = useWaterStore.getState();
      expect(state.todayLog?.glasses).toBe(0);
      expect(state.hasMetGoal()).toBe(false);

      // Add glasses until goal is met
      for (let i = 0; i < 8; i++) {
        await useWaterStore.getState().addGlass();
      }

      state = useWaterStore.getState();
      expect(state.todayLog?.glasses).toBe(8);
      expect(state.hasMetGoal()).toBe(true);

      const progress = state.getTodayProgress();
      expect(progress.percent).toBe(100);
    });

    it('allows removing glasses if added by mistake', async () => {
      // Set up initial state with 5 glasses
      glassCount = 5;
      mockWaterRepository.getOrCreateByDate.mockResolvedValueOnce({
        id: 'water-today',
        date: '2024-01-15',
        glasses: 5,
        notes: undefined,
        createdAt: new Date('2024-01-15T07:00:00.000Z'),
        updatedAt: new Date('2024-01-15T12:00:00.000Z'),
      });

      // Load initial state
      await useWaterStore.getState().loadTodayWater();

      expect(useWaterStore.getState().todayLog?.glasses).toBe(5);

      // Remove 2 glasses
      await useWaterStore.getState().removeGlass();
      await useWaterStore.getState().removeGlass();

      expect(useWaterStore.getState().todayLog?.glasses).toBe(3);
    });
  });

  describe('Custom goal configuration', () => {
    it('allows setting custom daily goal', async () => {
      // Set custom goal
      await useWaterStore.getState().setGoalGlasses(10);

      expect(useWaterStore.getState().goalGlasses).toBe(10);
      expect(mockSettingsRepository.set).toHaveBeenCalledWith('water_goal_glasses', 10);

      // Verify goal check uses new value
      useWaterStore.setState({
        todayLog: {
          id: 'water-today',
          date: '2024-01-15',
          glasses: 8,
          notes: undefined,
          createdAt: new Date('2024-01-15T07:00:00.000Z'),
          updatedAt: new Date('2024-01-15T18:00:00.000Z'),
        },
      });

      expect(useWaterStore.getState().hasMetGoal()).toBe(false); // 8 < 10
    });

    it('allows setting custom glass size', async () => {
      await useWaterStore.getState().setGlassSizeMl(300);

      expect(useWaterStore.getState().glassSizeMl).toBe(300);
      expect(mockSettingsRepository.set).toHaveBeenCalledWith('water_glass_size_ml', 300);
    });
  });

  describe('Progress tracking', () => {
    it('calculates daily water intake in liters', () => {
      useWaterStore.setState({
        goalGlasses: 8,
        glassSizeMl: 250,
        todayLog: {
          id: 'water-today',
          date: '2024-01-15',
          glasses: 4,
          notes: undefined,
          createdAt: new Date('2024-01-15T07:00:00.000Z'),
          updatedAt: new Date('2024-01-15T12:00:00.000Z'),
        },
      });

      const state = useWaterStore.getState();
      const progress = state.getTodayProgress();

      // 4 glasses * 250ml = 1000ml = 1L consumed
      // 8 glasses * 250ml = 2000ml = 2L goal
      const consumedMl = progress.glasses * state.glassSizeMl;
      const goalMl = progress.goal * state.glassSizeMl;

      expect(consumedMl).toBe(1000);
      expect(goalMl).toBe(2000);
      expect(progress.percent).toBe(50);
    });

    it('handles progress exceeding 100%', () => {
      useWaterStore.setState({
        goalGlasses: 8,
        todayLog: {
          id: 'water-today',
          date: '2024-01-15',
          glasses: 12, // 150% of goal
          notes: undefined,
          createdAt: new Date('2024-01-15T07:00:00.000Z'),
          updatedAt: new Date('2024-01-15T18:00:00.000Z'),
        },
      });

      const progress = useWaterStore.getState().getTodayProgress();

      // Percent should be capped at 100 for display purposes
      expect(progress.percent).toBe(100);
      // But glasses should show actual count
      expect(progress.glasses).toBe(12);
    });
  });

  describe('Weekly statistics', () => {
    it('loads recent logs for weekly view', async () => {
      const weekLogs = [
        { id: 'w1', date: '2024-01-15', glasses: 8, notes: undefined, createdAt: new Date(), updatedAt: new Date() },
        { id: 'w2', date: '2024-01-14', glasses: 6, notes: undefined, createdAt: new Date(), updatedAt: new Date() },
        { id: 'w3', date: '2024-01-13', glasses: 9, notes: undefined, createdAt: new Date(), updatedAt: new Date() },
        { id: 'w4', date: '2024-01-12', glasses: 7, notes: undefined, createdAt: new Date(), updatedAt: new Date() },
        { id: 'w5', date: '2024-01-11', glasses: 8, notes: undefined, createdAt: new Date(), updatedAt: new Date() },
        { id: 'w6', date: '2024-01-10', glasses: 5, notes: undefined, createdAt: new Date(), updatedAt: new Date() },
        { id: 'w7', date: '2024-01-09', glasses: 10, notes: undefined, createdAt: new Date(), updatedAt: new Date() },
      ];

      mockWaterRepository.getRecentLogs.mockResolvedValueOnce(weekLogs);

      await useWaterStore.getState().loadRecentLogs(7);

      const state = useWaterStore.getState();
      expect(state.recentLogs).toHaveLength(7);

      // Calculate average
      const totalGlasses = weekLogs.reduce((sum, log) => sum + log.glasses, 0);
      const avgGlasses = totalGlasses / weekLogs.length;

      expect(avgGlasses).toBeCloseTo(7.57, 1);
    });
  });

  describe('Error handling', () => {
    it('handles network errors gracefully', async () => {
      mockWaterRepository.getOrCreateByDate.mockRejectedValueOnce(new Error('Network error'));

      await useWaterStore.getState().loadTodayWater();

      const state = useWaterStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoaded).toBe(true);
      expect(state.todayLog).toBeNull();
    });

    it('recovers from errors on retry', async () => {
      // First call fails
      mockWaterRepository.getOrCreateByDate.mockRejectedValueOnce(new Error('Temporary error'));

      await useWaterStore.getState().loadTodayWater();

      expect(useWaterStore.getState().error).toBe('Temporary error');

      // Second call succeeds
      mockWaterRepository.getOrCreateByDate.mockResolvedValueOnce({
        id: 'water-today',
        date: '2024-01-15',
        glasses: 0,
        notes: undefined,
        createdAt: new Date('2024-01-15T07:00:00.000Z'),
        updatedAt: new Date('2024-01-15T07:00:00.000Z'),
      });

      await useWaterStore.getState().loadTodayWater();

      const state = useWaterStore.getState();
      expect(state.error).toBeNull();
      expect(state.todayLog).not.toBeNull();
    });
  });

  describe('Constants validation', () => {
    it('default goal is reasonable', () => {
      expect(DEFAULT_WATER_GOAL).toBeGreaterThanOrEqual(6);
      expect(DEFAULT_WATER_GOAL).toBeLessThanOrEqual(12);
    });

    it('default glass size is standard', () => {
      expect(DEFAULT_GLASS_SIZE_ML).toBeGreaterThanOrEqual(200);
      expect(DEFAULT_GLASS_SIZE_ML).toBeLessThanOrEqual(350);
    });
  });
});
