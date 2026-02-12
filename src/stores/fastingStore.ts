import { create } from 'zustand';
import { fastingRepository } from '@/repositories';
import {
  FastingConfig,
  FastingSession,
  FastingStats,
  FastingProtocol,
} from '@/types/planning';

interface FastingState {
  // State
  config: FastingConfig | null;
  activeSession: FastingSession | null;
  recentSessions: FastingSession[];
  stats: FastingStats | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions - Config
  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<FastingConfig>) => Promise<void>;
  setProtocol: (protocol: FastingProtocol, customHours?: number) => Promise<void>;
  setEatingWindow: (start: string, end: string) => Promise<void>;
  enableFasting: () => Promise<void>;
  disableFasting: () => Promise<void>;

  // Actions - Sessions
  loadActiveSession: () => Promise<void>;
  startFast: () => Promise<void>;
  endFast: (status?: 'completed' | 'ended_early') => Promise<void>;
  editFastTimes: (startTime?: string, endTime?: string) => Promise<void>;
  loadRecentSessions: (limit?: number) => Promise<void>;
  loadStats: () => Promise<void>;

  // Computed
  getFastingHoursForProtocol: (protocol: FastingProtocol, customHours?: number) => number;
  getTimeRemaining: () => { hours: number; minutes: number; totalMinutes: number } | null;
  getProgressPercent: () => number;
  isInEatingWindow: () => boolean;
  isCurrentlyFasting: () => boolean;
}

export const useFastingStore = create<FastingState>((set, get) => ({
  // Initial state
  config: null,
  activeSession: null,
  recentSessions: [],
  stats: null,
  isLoading: false,
  isLoaded: false,
  error: null,

  // ============================================================
  // Config Actions
  // ============================================================

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await fastingRepository.getOrCreateConfig();
      const activeSession = await fastingRepository.getActiveSession();
      set({ config, activeSession, isLoading: false, isLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load fasting config',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  updateConfig: async (updates) => {
    try {
      const config = await fastingRepository.updateConfig(updates);
      set({ config });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update config',
      });
    }
  },

  setProtocol: async (protocol, customHours) => {
    const updates: Partial<FastingConfig> = { protocol };
    if (protocol === 'custom' && customHours) {
      updates.customFastHours = customHours;
    }
    await get().updateConfig(updates);
  },

  setEatingWindow: async (start, end) => {
    await get().updateConfig({
      typicalEatStart: start,
      typicalEatEnd: end,
    });
  },

  enableFasting: async () => {
    await get().updateConfig({ enabled: true });
  },

  disableFasting: async () => {
    await get().updateConfig({ enabled: false });
  },

  // ============================================================
  // Session Actions
  // ============================================================

  loadActiveSession: async () => {
    try {
      const activeSession = await fastingRepository.getActiveSession();
      set({ activeSession });
    } catch (error) {
      if (__DEV__) console.error('Failed to load active session:', error);
    }
  },

  startFast: async () => {
    const { config, getFastingHoursForProtocol } = get();
    if (!config) return;

    try {
      const targetHours = getFastingHoursForProtocol(config.protocol, config.customFastHours);
      const session = await fastingRepository.startSession(targetHours);
      set({ activeSession: session });

      // Reload stats to update streak
      get().loadStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start fast',
      });
    }
  },

  endFast: async (status = 'completed') => {
    const { activeSession } = get();
    if (!activeSession) return;

    try {
      const session = await fastingRepository.endSession(activeSession.id, status);
      set({ activeSession: null });

      // Reload recent sessions and stats
      get().loadRecentSessions();
      get().loadStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to end fast',
      });
    }
  },

  editFastTimes: async (startTime, endTime) => {
    const { activeSession } = get();
    if (!activeSession) return;

    try {
      const session = await fastingRepository.updateSessionTimes(
        activeSession.id,
        startTime,
        endTime
      );
      set({ activeSession: session });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to edit fast times',
      });
    }
  },

  loadRecentSessions: async (limit = 30) => {
    try {
      const recentSessions = await fastingRepository.getRecentSessions(limit);
      set({ recentSessions });
    } catch (error) {
      if (__DEV__) console.error('Failed to load recent sessions:', error);
    }
  },

  loadStats: async () => {
    try {
      const stats = await fastingRepository.getStats();
      set({ stats });
    } catch (error) {
      if (__DEV__) console.error('Failed to load fasting stats:', error);
    }
  },

  // ============================================================
  // Computed
  // ============================================================

  getFastingHoursForProtocol: (protocol, customHours) => {
    switch (protocol) {
      case '16:8':
        return 16;
      case '18:6':
        return 18;
      case '20:4':
        return 20;
      case '14:10':
        return 14;
      case 'custom':
        return customHours || 16;
      default:
        return 16;
    }
  },

  getTimeRemaining: () => {
    const { activeSession, config, getFastingHoursForProtocol } = get();
    if (!activeSession || !config) return null;

    const startTime = new Date(activeSession.startTime);
    const targetHours = activeSession.targetHours;
    const targetEndTime = new Date(startTime.getTime() + targetHours * 60 * 60 * 1000);
    const now = new Date();

    const remainingMs = targetEndTime.getTime() - now.getTime();
    if (remainingMs <= 0) {
      return { hours: 0, minutes: 0, totalMinutes: 0 };
    }

    const totalMinutes = Math.floor(remainingMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return { hours, minutes, totalMinutes };
  },

  getProgressPercent: () => {
    const { activeSession, getTimeRemaining } = get();
    if (!activeSession) return 0;

    const startTime = new Date(activeSession.startTime);
    const now = new Date();
    const elapsed = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
    const targetHours = activeSession.targetHours;

    return Math.min((elapsed / targetHours) * 100, 100);
  },

  isInEatingWindow: () => {
    const { config } = get();
    if (!config || !config.enabled) return true; // Default to eating window if not configured

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHours * 60 + currentMinutes;

    const [startHour, startMin] = config.typicalEatStart.split(':').map(Number);
    const [endHour, endMin] = config.typicalEatEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  },

  isCurrentlyFasting: () => {
    const { activeSession } = get();
    return activeSession !== null;
  },
}));
