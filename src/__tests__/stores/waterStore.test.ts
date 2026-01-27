/**
 * Water Store Tests
 * Tests for water tracking state management
 */

// Mock repositories - include settingsRepository since the store imports it from @/repositories
jest.mock('@/repositories', () => ({
  waterRepository: {
    getByDate: jest.fn(),
    getOrCreateByDate: jest.fn(() => Promise.resolve({
      id: 'water-1',
      date: '2024-01-15',
      glasses: 5,
      notes: undefined,
      createdAt: new Date('2024-01-15T07:00:00.000Z'),
      updatedAt: new Date('2024-01-15T18:00:00.000Z'),
    })),
    addGlass: jest.fn(() => Promise.resolve({
      id: 'water-1',
      date: '2024-01-15',
      glasses: 6,
      notes: undefined,
      createdAt: new Date('2024-01-15T07:00:00.000Z'),
      updatedAt: new Date(),
    })),
    removeGlass: jest.fn(() => Promise.resolve({
      id: 'water-1',
      date: '2024-01-15',
      glasses: 4,
      notes: undefined,
      createdAt: new Date('2024-01-15T07:00:00.000Z'),
      updatedAt: new Date(),
    })),
    setGlasses: jest.fn((_, glasses) => Promise.resolve({
      id: 'water-1',
      date: '2024-01-15',
      glasses: glasses,
      notes: undefined,
      createdAt: new Date('2024-01-15T07:00:00.000Z'),
      updatedAt: new Date(),
    })),
    getRecentLogs: jest.fn(() => Promise.resolve([])),
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
import { waterRepository, settingsRepository } from '@/repositories';

const mockWaterRepository = waterRepository as jest.Mocked<typeof waterRepository>;
const mockSettingsRepository = settingsRepository as jest.Mocked<typeof settingsRepository>;

describe('waterStore', () => {
  beforeEach(() => {
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

  const mockWaterLog = {
    id: 'water-1',
    date: '2024-01-15',
    glasses: 5,
    notes: undefined,
    createdAt: new Date('2024-01-15T07:00:00.000Z'),
    updatedAt: new Date('2024-01-15T18:00:00.000Z'),
  };

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useWaterStore.getState();

      expect(state.todayLog).toBeNull();
      expect(state.recentLogs).toEqual([]);
      expect(state.goalGlasses).toBe(8);
      expect(state.glassSizeMl).toBe(250);
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadTodayWater', () => {
    it('loads water log for today', async () => {
      await useWaterStore.getState().loadTodayWater();

      const state = useWaterStore.getState();
      expect(state.todayLog).not.toBeNull();
      expect(state.todayLog?.glasses).toBe(5);
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockWaterRepository.getOrCreateByDate.mockRejectedValueOnce(new Error('Database error'));

      await useWaterStore.getState().loadTodayWater();

      const state = useWaterStore.getState();
      expect(state.error).toBe('Database error');
      expect(state.isLoaded).toBe(true);
    });
  });

  describe('addGlass', () => {
    it('adds a glass and updates state', async () => {
      await useWaterStore.getState().addGlass();

      const state = useWaterStore.getState();
      expect(state.todayLog?.glasses).toBe(6);
      expect(mockWaterRepository.addGlass).toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      mockWaterRepository.addGlass.mockRejectedValueOnce(new Error('Failed to add'));

      await useWaterStore.getState().addGlass();

      const state = useWaterStore.getState();
      expect(state.error).toBe('Failed to add');
    });
  });

  describe('removeGlass', () => {
    it('removes a glass and updates state', async () => {
      await useWaterStore.getState().removeGlass();

      const state = useWaterStore.getState();
      expect(state.todayLog?.glasses).toBe(4);
      expect(mockWaterRepository.removeGlass).toHaveBeenCalled();
    });
  });

  describe('setGlasses', () => {
    it('sets glasses to specific value', async () => {
      mockWaterRepository.setGlasses.mockResolvedValueOnce({
        ...mockWaterLog,
        glasses: 8,
      });

      await useWaterStore.getState().setGlasses(8);

      const state = useWaterStore.getState();
      expect(state.todayLog?.glasses).toBe(8);
    });
  });

  describe('setGoalGlasses', () => {
    it('updates goal in state', async () => {
      await useWaterStore.getState().setGoalGlasses(10);

      const state = useWaterStore.getState();
      expect(state.goalGlasses).toBe(10);
      expect(mockSettingsRepository.set).toHaveBeenCalledWith('water_goal_glasses', 10);
    });
  });

  describe('setGlassSizeMl', () => {
    it('updates glass size in state', async () => {
      await useWaterStore.getState().setGlassSizeMl(300);

      const state = useWaterStore.getState();
      expect(state.glassSizeMl).toBe(300);
      expect(mockSettingsRepository.set).toHaveBeenCalledWith('water_glass_size_ml', 300);
    });
  });

  describe('loadRecentLogs', () => {
    it('loads recent water logs', async () => {
      const recentLogs = [
        mockWaterLog,
        { ...mockWaterLog, id: 'water-2', date: '2024-01-14', glasses: 6 },
      ];
      mockWaterRepository.getRecentLogs.mockResolvedValueOnce(recentLogs);

      await useWaterStore.getState().loadRecentLogs(7);

      const state = useWaterStore.getState();
      expect(state.recentLogs).toEqual(recentLogs);
    });
  });

  describe('getTodayProgress', () => {
    it('calculates progress correctly', () => {
      useWaterStore.setState({
        todayLog: mockWaterLog,
        goalGlasses: 8,
      });

      const progress = useWaterStore.getState().getTodayProgress();

      expect(progress.glasses).toBe(5);
      expect(progress.goal).toBe(8);
      expect(progress.percent).toBeCloseTo(62.5);
    });

    it('caps percent at 100', () => {
      useWaterStore.setState({
        todayLog: { ...mockWaterLog, glasses: 12 },
        goalGlasses: 8,
      });

      const progress = useWaterStore.getState().getTodayProgress();

      expect(progress.percent).toBe(100);
    });

    it('returns 0 glasses when no log exists', () => {
      useWaterStore.setState({
        todayLog: null,
        goalGlasses: 8,
      });

      const progress = useWaterStore.getState().getTodayProgress();

      expect(progress.glasses).toBe(0);
      expect(progress.percent).toBe(0);
    });
  });

  describe('hasMetGoal', () => {
    it('returns true when glasses >= goal', () => {
      useWaterStore.setState({
        todayLog: { ...mockWaterLog, glasses: 8 },
        goalGlasses: 8,
      });

      const result = useWaterStore.getState().hasMetGoal();

      expect(result).toBe(true);
    });

    it('returns false when glasses < goal', () => {
      useWaterStore.setState({
        todayLog: mockWaterLog, // glasses: 5
        goalGlasses: 8,
      });

      const result = useWaterStore.getState().hasMetGoal();

      expect(result).toBe(false);
    });

    it('returns false when no log exists', () => {
      useWaterStore.setState({
        todayLog: null,
        goalGlasses: 8,
      });

      const result = useWaterStore.getState().hasMetGoal();

      expect(result).toBe(false);
    });
  });
});
