/**
 * Fasting Store Tests
 * Tests for fasting configuration, session management, and computed values
 */

import { useFastingStore } from '@/stores/fastingStore';
import { fastingRepository } from '@/repositories';
import { FastingConfig, FastingSession, FastingStats } from '@/types/planning';

// Mock repositories
jest.mock('@/repositories', () => ({
  fastingRepository: {
    getOrCreateConfig: jest.fn(),
    getActiveSession: jest.fn(),
    updateConfig: jest.fn(),
    startSession: jest.fn(),
    endSession: jest.fn(),
    updateSessionTimes: jest.fn(),
    getRecentSessions: jest.fn(),
    getStats: jest.fn(),
  },
}));

const mockFastingRepo = fastingRepository as jest.Mocked<typeof fastingRepository>;

const mockConfig: FastingConfig = {
  enabled: true,
  protocol: '16:8',
  typicalEatStart: '12:00',
  typicalEatEnd: '20:00',
  notifications: {
    windowOpens: true,
    windowClosesSoon: true,
    windowClosesReminder: 30,
    fastComplete: true,
  },
  createdAt: '2024-01-01T00:00:00Z',
  lastModified: '2024-01-01T00:00:00Z',
};

const mockSession: FastingSession = {
  id: 'session-1',
  startTime: '2024-01-15T20:00:00Z',
  targetHours: 16,
  status: 'active',
  createdAt: '2024-01-15T20:00:00Z',
};

const mockCompletedSession: FastingSession = {
  id: 'session-2',
  startTime: '2024-01-14T20:00:00Z',
  endTime: '2024-01-15T12:30:00Z',
  targetHours: 16,
  actualHours: 16.5,
  status: 'completed',
  createdAt: '2024-01-14T20:00:00Z',
};

const mockStats: FastingStats = {
  currentStreak: 5,
  longestStreak: 12,
  totalFastingHours: 240,
  averageFastHours: 16.2,
  totalFastsCompleted: 15,
  completionRate: 0.88,
};

const initialState = {
  config: null,
  activeSession: null,
  recentSessions: [],
  stats: null,
  isLoading: false,
  isLoaded: false,
  error: null,
};

describe('useFastingStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFastingStore.setState(initialState);
  });

  // ==========================================================
  // Computed: getFastingHoursForProtocol
  // ==========================================================

  describe('getFastingHoursForProtocol', () => {
    it('returns 16 for 16:8 protocol', () => {
      expect(useFastingStore.getState().getFastingHoursForProtocol('16:8')).toBe(16);
    });

    it('returns 18 for 18:6 protocol', () => {
      expect(useFastingStore.getState().getFastingHoursForProtocol('18:6')).toBe(18);
    });

    it('returns 20 for 20:4 protocol', () => {
      expect(useFastingStore.getState().getFastingHoursForProtocol('20:4')).toBe(20);
    });

    it('returns 14 for 14:10 protocol', () => {
      expect(useFastingStore.getState().getFastingHoursForProtocol('14:10')).toBe(14);
    });

    it('returns custom hours for custom protocol', () => {
      expect(useFastingStore.getState().getFastingHoursForProtocol('custom', 22)).toBe(22);
    });

    it('defaults to 16 for custom protocol with no custom hours', () => {
      expect(useFastingStore.getState().getFastingHoursForProtocol('custom')).toBe(16);
    });

    it('defaults to 16 for unknown protocol', () => {
      expect(useFastingStore.getState().getFastingHoursForProtocol('unknown' as any)).toBe(16);
    });
  });

  // ==========================================================
  // Computed: isCurrentlyFasting
  // ==========================================================

  describe('isCurrentlyFasting', () => {
    it('returns true when there is an active session', () => {
      useFastingStore.setState({ activeSession: mockSession });

      expect(useFastingStore.getState().isCurrentlyFasting()).toBe(true);
    });

    it('returns false when there is no active session', () => {
      useFastingStore.setState({ activeSession: null });

      expect(useFastingStore.getState().isCurrentlyFasting()).toBe(false);
    });
  });

  // ==========================================================
  // Computed: isInEatingWindow
  // ==========================================================

  describe('isInEatingWindow', () => {
    it('returns true when fasting is not configured', () => {
      useFastingStore.setState({ config: null });

      expect(useFastingStore.getState().isInEatingWindow()).toBe(true);
    });

    it('returns true when fasting is disabled', () => {
      useFastingStore.setState({ config: { ...mockConfig, enabled: false } });

      expect(useFastingStore.getState().isInEatingWindow()).toBe(true);
    });

    it('returns true when current time is within eating window', () => {
      useFastingStore.setState({
        config: { ...mockConfig, typicalEatStart: '12:00', typicalEatEnd: '20:00' },
      });

      // Mock Date to 14:30 (within 12:00-20:00)
      const mockDate = new Date(2024, 0, 15, 14, 30, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      expect(useFastingStore.getState().isInEatingWindow()).toBe(true);

      jest.restoreAllMocks();
    });

    it('returns false when current time is outside eating window', () => {
      useFastingStore.setState({
        config: { ...mockConfig, typicalEatStart: '12:00', typicalEatEnd: '20:00' },
      });

      // Mock Date to 08:00 (outside 12:00-20:00)
      const mockDate = new Date(2024, 0, 15, 8, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      expect(useFastingStore.getState().isInEatingWindow()).toBe(false);

      jest.restoreAllMocks();
    });

    it('returns true at exact window start time', () => {
      useFastingStore.setState({
        config: { ...mockConfig, typicalEatStart: '12:00', typicalEatEnd: '20:00' },
      });

      const mockDate = new Date(2024, 0, 15, 12, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      expect(useFastingStore.getState().isInEatingWindow()).toBe(true);

      jest.restoreAllMocks();
    });

    it('returns true at exact window end time', () => {
      useFastingStore.setState({
        config: { ...mockConfig, typicalEatStart: '12:00', typicalEatEnd: '20:00' },
      });

      const mockDate = new Date(2024, 0, 15, 20, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      expect(useFastingStore.getState().isInEatingWindow()).toBe(true);

      jest.restoreAllMocks();
    });
  });

  // ==========================================================
  // Computed: getTimeRemaining
  // ==========================================================

  describe('getTimeRemaining', () => {
    it('returns null when no active session', () => {
      useFastingStore.setState({ activeSession: null, config: mockConfig });

      expect(useFastingStore.getState().getTimeRemaining()).toBeNull();
    });

    it('returns null when no config', () => {
      useFastingStore.setState({ activeSession: mockSession, config: null });

      expect(useFastingStore.getState().getTimeRemaining()).toBeNull();
    });

    it('returns zeros when fasting time has elapsed', () => {
      // Session started 20 hours ago, target is 16 hours
      const startTime = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
      useFastingStore.setState({
        activeSession: { ...mockSession, startTime, targetHours: 16 },
        config: mockConfig,
      });

      const result = useFastingStore.getState().getTimeRemaining();

      expect(result).toEqual({ hours: 0, minutes: 0, totalMinutes: 0 });
    });

    it('calculates remaining time correctly', () => {
      // Session started 10 hours ago, target is 16 hours -> 6 hours remaining
      const startTime = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
      useFastingStore.setState({
        activeSession: { ...mockSession, startTime, targetHours: 16 },
        config: mockConfig,
      });

      const result = useFastingStore.getState().getTimeRemaining();

      expect(result).not.toBeNull();
      // Should be approximately 6 hours (360 minutes), allow for small timing differences
      expect(result!.totalMinutes).toBeGreaterThanOrEqual(359);
      expect(result!.totalMinutes).toBeLessThanOrEqual(360);
      expect(result!.hours).toBeGreaterThanOrEqual(5);
      expect(result!.hours).toBeLessThanOrEqual(6);
    });
  });

  // ==========================================================
  // Computed: getProgressPercent
  // ==========================================================

  describe('getProgressPercent', () => {
    it('returns 0 when no active session', () => {
      useFastingStore.setState({ activeSession: null });

      expect(useFastingStore.getState().getProgressPercent()).toBe(0);
    });

    it('returns progress based on elapsed time', () => {
      // Session started 8 hours ago, target is 16 hours -> 50%
      const startTime = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      useFastingStore.setState({
        activeSession: { ...mockSession, startTime, targetHours: 16 },
      });

      const percent = useFastingStore.getState().getProgressPercent();

      expect(percent).toBeGreaterThanOrEqual(49);
      expect(percent).toBeLessThanOrEqual(51);
    });

    it('caps at 100 percent', () => {
      // Session started 20 hours ago, target is 16 hours -> should cap at 100
      const startTime = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
      useFastingStore.setState({
        activeSession: { ...mockSession, startTime, targetHours: 16 },
      });

      const percent = useFastingStore.getState().getProgressPercent();

      expect(percent).toBe(100);
    });

    it('returns approximately 0 when just started', () => {
      const startTime = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      useFastingStore.setState({
        activeSession: { ...mockSession, startTime, targetHours: 16 },
      });

      const percent = useFastingStore.getState().getProgressPercent();

      expect(percent).toBeLessThan(1);
    });
  });

  // ==========================================================
  // Config Actions
  // ==========================================================

  describe('loadConfig', () => {
    it('loads config and active session together', async () => {
      mockFastingRepo.getOrCreateConfig.mockResolvedValue(mockConfig);
      mockFastingRepo.getActiveSession.mockResolvedValue(mockSession);

      await useFastingStore.getState().loadConfig();

      const state = useFastingStore.getState();
      expect(state.config).toEqual(mockConfig);
      expect(state.activeSession).toEqual(mockSession);
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('handles null active session', async () => {
      mockFastingRepo.getOrCreateConfig.mockResolvedValue(mockConfig);
      mockFastingRepo.getActiveSession.mockResolvedValue(null);

      await useFastingStore.getState().loadConfig();

      expect(useFastingStore.getState().activeSession).toBeNull();
    });

    it('sets error on failure', async () => {
      mockFastingRepo.getOrCreateConfig.mockRejectedValue(new Error('DB error'));

      await useFastingStore.getState().loadConfig();

      const state = useFastingStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('updates config in repository and state', async () => {
      const updatedConfig = { ...mockConfig, protocol: '18:6' as const };
      mockFastingRepo.updateConfig.mockResolvedValue(updatedConfig);

      await useFastingStore.getState().updateConfig({ protocol: '18:6' });

      expect(mockFastingRepo.updateConfig).toHaveBeenCalledWith({ protocol: '18:6' });
      expect(useFastingStore.getState().config).toEqual(updatedConfig);
    });

    it('sets error on failure', async () => {
      mockFastingRepo.updateConfig.mockRejectedValue(new Error('Update failed'));

      await useFastingStore.getState().updateConfig({ protocol: '18:6' });

      expect(useFastingStore.getState().error).toBe('Update failed');
    });
  });

  describe('setProtocol', () => {
    it('calls updateConfig with protocol', async () => {
      const updatedConfig = { ...mockConfig, protocol: '18:6' as const };
      mockFastingRepo.updateConfig.mockResolvedValue(updatedConfig);

      await useFastingStore.getState().setProtocol('18:6');

      expect(mockFastingRepo.updateConfig).toHaveBeenCalledWith({ protocol: '18:6' });
    });

    it('includes customFastHours for custom protocol', async () => {
      const updatedConfig = { ...mockConfig, protocol: 'custom' as const, customFastHours: 22 };
      mockFastingRepo.updateConfig.mockResolvedValue(updatedConfig);

      await useFastingStore.getState().setProtocol('custom', 22);

      expect(mockFastingRepo.updateConfig).toHaveBeenCalledWith({
        protocol: 'custom',
        customFastHours: 22,
      });
    });

    it('does not include customFastHours for non-custom protocol', async () => {
      mockFastingRepo.updateConfig.mockResolvedValue({ ...mockConfig, protocol: '20:4' as const });

      await useFastingStore.getState().setProtocol('20:4');

      expect(mockFastingRepo.updateConfig).toHaveBeenCalledWith({ protocol: '20:4' });
    });
  });

  describe('enableFasting / disableFasting', () => {
    it('enableFasting calls updateConfig with enabled: true', async () => {
      mockFastingRepo.updateConfig.mockResolvedValue({ ...mockConfig, enabled: true });

      await useFastingStore.getState().enableFasting();

      expect(mockFastingRepo.updateConfig).toHaveBeenCalledWith({ enabled: true });
    });

    it('disableFasting calls updateConfig with enabled: false', async () => {
      mockFastingRepo.updateConfig.mockResolvedValue({ ...mockConfig, enabled: false });

      await useFastingStore.getState().disableFasting();

      expect(mockFastingRepo.updateConfig).toHaveBeenCalledWith({ enabled: false });
    });
  });

  // ==========================================================
  // Session Actions
  // ==========================================================

  describe('loadActiveSession', () => {
    it('loads active session from repository', async () => {
      mockFastingRepo.getActiveSession.mockResolvedValue(mockSession);

      await useFastingStore.getState().loadActiveSession();

      expect(useFastingStore.getState().activeSession).toEqual(mockSession);
    });

    it('handles errors silently (logs to console)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFastingRepo.getActiveSession.mockRejectedValue(new Error('Load error'));

      await useFastingStore.getState().loadActiveSession();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('startFast', () => {
    it('returns early when no config', async () => {
      useFastingStore.setState({ config: null });

      await useFastingStore.getState().startFast();

      expect(mockFastingRepo.startSession).not.toHaveBeenCalled();
    });

    it('starts a session with correct target hours from protocol', async () => {
      useFastingStore.setState({ config: mockConfig }); // 16:8 protocol
      mockFastingRepo.startSession.mockResolvedValue(mockSession);
      mockFastingRepo.getStats.mockResolvedValue(mockStats);

      await useFastingStore.getState().startFast();

      expect(mockFastingRepo.startSession).toHaveBeenCalledWith(16);
      expect(useFastingStore.getState().activeSession).toEqual(mockSession);
    });

    it('uses custom hours for custom protocol', async () => {
      useFastingStore.setState({
        config: { ...mockConfig, protocol: 'custom', customFastHours: 22 },
      });
      mockFastingRepo.startSession.mockResolvedValue({ ...mockSession, targetHours: 22 });
      mockFastingRepo.getStats.mockResolvedValue(mockStats);

      await useFastingStore.getState().startFast();

      expect(mockFastingRepo.startSession).toHaveBeenCalledWith(22);
    });

    it('reloads stats after starting', async () => {
      useFastingStore.setState({ config: mockConfig });
      mockFastingRepo.startSession.mockResolvedValue(mockSession);
      mockFastingRepo.getStats.mockResolvedValue(mockStats);

      await useFastingStore.getState().startFast();

      expect(mockFastingRepo.getStats).toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      useFastingStore.setState({ config: mockConfig });
      mockFastingRepo.startSession.mockRejectedValue(new Error('Start failed'));

      await useFastingStore.getState().startFast();

      expect(useFastingStore.getState().error).toBe('Start failed');
    });
  });

  describe('endFast', () => {
    it('returns early when no active session', async () => {
      useFastingStore.setState({ activeSession: null });

      await useFastingStore.getState().endFast();

      expect(mockFastingRepo.endSession).not.toHaveBeenCalled();
    });

    it('ends session with completed status by default', async () => {
      useFastingStore.setState({ activeSession: mockSession });
      mockFastingRepo.endSession.mockResolvedValue(mockCompletedSession);
      mockFastingRepo.getRecentSessions.mockResolvedValue([mockCompletedSession]);
      mockFastingRepo.getStats.mockResolvedValue(mockStats);

      await useFastingStore.getState().endFast();

      expect(mockFastingRepo.endSession).toHaveBeenCalledWith('session-1', 'completed');
      expect(useFastingStore.getState().activeSession).toBeNull();
    });

    it('ends session with ended_early status', async () => {
      useFastingStore.setState({ activeSession: mockSession });
      mockFastingRepo.endSession.mockResolvedValue({ ...mockCompletedSession, status: 'ended_early' });
      mockFastingRepo.getRecentSessions.mockResolvedValue([]);
      mockFastingRepo.getStats.mockResolvedValue(mockStats);

      await useFastingStore.getState().endFast('ended_early');

      expect(mockFastingRepo.endSession).toHaveBeenCalledWith('session-1', 'ended_early');
    });

    it('reloads recent sessions and stats after ending', async () => {
      useFastingStore.setState({ activeSession: mockSession });
      mockFastingRepo.endSession.mockResolvedValue(mockCompletedSession);
      mockFastingRepo.getRecentSessions.mockResolvedValue([mockCompletedSession]);
      mockFastingRepo.getStats.mockResolvedValue(mockStats);

      await useFastingStore.getState().endFast();

      expect(mockFastingRepo.getRecentSessions).toHaveBeenCalled();
      expect(mockFastingRepo.getStats).toHaveBeenCalled();
    });
  });

  describe('editFastTimes', () => {
    it('returns early when no active session', async () => {
      useFastingStore.setState({ activeSession: null });

      await useFastingStore.getState().editFastTimes('2024-01-15T19:00:00Z');

      expect(mockFastingRepo.updateSessionTimes).not.toHaveBeenCalled();
    });

    it('updates session times', async () => {
      const updatedSession = { ...mockSession, startTime: '2024-01-15T19:00:00Z' };
      useFastingStore.setState({ activeSession: mockSession });
      mockFastingRepo.updateSessionTimes.mockResolvedValue(updatedSession);

      await useFastingStore.getState().editFastTimes('2024-01-15T19:00:00Z', undefined);

      expect(mockFastingRepo.updateSessionTimes).toHaveBeenCalledWith(
        'session-1',
        '2024-01-15T19:00:00Z',
        undefined
      );
      expect(useFastingStore.getState().activeSession).toEqual(updatedSession);
    });

    it('sets error on failure', async () => {
      useFastingStore.setState({ activeSession: mockSession });
      mockFastingRepo.updateSessionTimes.mockRejectedValue(new Error('Edit failed'));

      await useFastingStore.getState().editFastTimes('2024-01-15T19:00:00Z');

      expect(useFastingStore.getState().error).toBe('Edit failed');
    });
  });

  describe('loadRecentSessions', () => {
    it('loads recent sessions with default limit', async () => {
      mockFastingRepo.getRecentSessions.mockResolvedValue([mockCompletedSession]);

      await useFastingStore.getState().loadRecentSessions();

      expect(mockFastingRepo.getRecentSessions).toHaveBeenCalledWith(30);
      expect(useFastingStore.getState().recentSessions).toEqual([mockCompletedSession]);
    });

    it('loads recent sessions with custom limit', async () => {
      mockFastingRepo.getRecentSessions.mockResolvedValue([]);

      await useFastingStore.getState().loadRecentSessions(10);

      expect(mockFastingRepo.getRecentSessions).toHaveBeenCalledWith(10);
    });
  });

  describe('loadStats', () => {
    it('loads fasting stats', async () => {
      mockFastingRepo.getStats.mockResolvedValue(mockStats);

      await useFastingStore.getState().loadStats();

      expect(useFastingStore.getState().stats).toEqual(mockStats);
    });

    it('handles errors silently', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFastingRepo.getStats.mockRejectedValue(new Error('Stats error'));

      await useFastingStore.getState().loadStats();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
