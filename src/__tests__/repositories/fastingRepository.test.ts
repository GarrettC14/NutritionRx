/**
 * Fasting Repository Tests
 * Tests for fasting config and session data access
 */

import {
  fastingRepository,
  DEFAULT_FASTING_CONFIG,
} from '@/repositories/fastingRepository';

// Mock the database module
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-uuid-fasting'),
}));

describe('fastingRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
  });

  const mockConfigRow = {
    id: 1,
    enabled: 1,
    protocol: '16:8',
    custom_fast_hours: null,
    typical_eat_start: '12:00',
    typical_eat_end: '20:00',
    notify_window_opens: 1,
    notify_window_closes_soon: 1,
    notify_closes_reminder_mins: 30,
    notify_fast_complete: 1,
    created_at: '2024-01-15T10:00:00.000Z',
    last_modified: '2024-01-15T10:00:00.000Z',
  };

  const mockSessionRow = {
    id: 'session-1',
    start_time: '2024-01-15T20:00:00.000Z',
    end_time: null,
    target_hours: 16,
    actual_hours: null,
    status: 'active',
    created_at: '2024-01-15T20:00:00.000Z',
  };

  const mockCompletedSessionRow = {
    id: 'session-2',
    start_time: '2024-01-14T20:00:00.000Z',
    end_time: '2024-01-15T12:00:00.000Z',
    target_hours: 16,
    actual_hours: 16,
    status: 'completed',
    created_at: '2024-01-14T20:00:00.000Z',
  };

  // ==========================================================
  // DEFAULT_FASTING_CONFIG constant
  // ==========================================================

  describe('DEFAULT_FASTING_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_FASTING_CONFIG).toEqual({
        enabled: false,
        protocol: '16:8',
        typicalEatStart: '12:00',
        typicalEatEnd: '20:00',
        notifications: {
          windowOpens: true,
          windowClosesSoon: true,
          windowClosesReminder: 30,
          fastComplete: true,
        },
      });
    });
  });

  // ==========================================================
  // getConfig
  // ==========================================================

  describe('getConfig', () => {
    it('returns mapped config when row exists', async () => {
      mockGetFirstAsync.mockResolvedValue(mockConfigRow);

      const result = await fastingRepository.getConfig();

      expect(result).not.toBeNull();
      expect(result!.enabled).toBe(true);
      expect(result!.protocol).toBe('16:8');
      expect(result!.customFastHours).toBeUndefined();
      expect(result!.typicalEatStart).toBe('12:00');
      expect(result!.typicalEatEnd).toBe('20:00');
      expect(result!.notifications.windowOpens).toBe(true);
      expect(result!.notifications.windowClosesSoon).toBe(true);
      expect(result!.notifications.windowClosesReminder).toBe(30);
      expect(result!.notifications.fastComplete).toBe(true);
      expect(result!.createdAt).toBe('2024-01-15T10:00:00.000Z');
      expect(result!.lastModified).toBe('2024-01-15T10:00:00.000Z');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM fasting_config WHERE id = 1'
      );
    });

    it('returns null when no config exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await fastingRepository.getConfig();

      expect(result).toBeNull();
    });

    it('maps enabled=0 to false', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...mockConfigRow, enabled: 0 });

      const result = await fastingRepository.getConfig();

      expect(result!.enabled).toBe(false);
    });

    it('maps custom_fast_hours when present', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockConfigRow,
        protocol: 'custom',
        custom_fast_hours: 14,
      });

      const result = await fastingRepository.getConfig();

      expect(result!.protocol).toBe('custom');
      expect(result!.customFastHours).toBe(14);
    });
  });

  // ==========================================================
  // getOrCreateConfig
  // ==========================================================

  describe('getOrCreateConfig', () => {
    it('returns existing config when it exists', async () => {
      mockGetFirstAsync.mockResolvedValue(mockConfigRow);

      const result = await fastingRepository.getOrCreateConfig();

      expect(result.enabled).toBe(true);
      expect(result.protocol).toBe('16:8');
      // Should not insert
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('creates config when none exists', async () => {
      // First call: getConfig -> null (no config)
      // Second call: getConfig -> returns the new row (after insert)
      mockGetFirstAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockConfigRow, enabled: 0 });

      const result = await fastingRepository.getOrCreateConfig();

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fasting_config'),
        expect.arrayContaining([expect.any(String), expect.any(String)])
      );
      expect(result.enabled).toBe(false);
      expect(result.protocol).toBe('16:8');
    });
  });

  // ==========================================================
  // updateConfig
  // ==========================================================

  describe('updateConfig', () => {
    it('updates enabled field', async () => {
      // getOrCreateConfig -> getConfig returns existing
      // final getConfig returns updated
      mockGetFirstAsync
        .mockResolvedValueOnce(mockConfigRow) // getOrCreateConfig -> getConfig
        .mockResolvedValueOnce({ ...mockConfigRow, enabled: 0 }); // final getConfig

      const result = await fastingRepository.updateConfig({ enabled: false });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fasting_config SET'),
        expect.arrayContaining([expect.any(String), 0])
      );
      expect(result.enabled).toBe(false);
    });

    it('updates protocol field', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockConfigRow) // getOrCreateConfig -> getConfig
        .mockResolvedValueOnce({ ...mockConfigRow, protocol: '18:6' }); // final getConfig

      const result = await fastingRepository.updateConfig({ protocol: '18:6' });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('protocol = ?'),
        expect.arrayContaining([expect.any(String), '18:6'])
      );
      expect(result.protocol).toBe('18:6');
    });

    it('updates customFastHours', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockConfigRow) // getOrCreateConfig -> getConfig
        .mockResolvedValueOnce({
          ...mockConfigRow,
          protocol: 'custom',
          custom_fast_hours: 20,
        }); // final getConfig

      const result = await fastingRepository.updateConfig({ customFastHours: 20 });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('custom_fast_hours = ?'),
        expect.arrayContaining([expect.any(String), 20])
      );
      expect(result.customFastHours).toBe(20);
    });

    it('updates notification settings', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockConfigRow)
        .mockResolvedValueOnce({
          ...mockConfigRow,
          notify_window_opens: 0,
          notify_closes_reminder_mins: 15,
        });

      const result = await fastingRepository.updateConfig({
        notifications: {
          windowOpens: false,
          windowClosesReminder: 15,
        },
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('notify_window_opens = ?'),
        expect.arrayContaining([0, 15])
      );
      expect(result.notifications.windowOpens).toBe(false);
      expect(result.notifications.windowClosesReminder).toBe(15);
    });

    it('updates typicalEatStart and typicalEatEnd', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockConfigRow)
        .mockResolvedValueOnce({
          ...mockConfigRow,
          typical_eat_start: '10:00',
          typical_eat_end: '18:00',
        });

      const result = await fastingRepository.updateConfig({
        typicalEatStart: '10:00',
        typicalEatEnd: '18:00',
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('typical_eat_start = ?'),
        expect.arrayContaining(['10:00', '18:00'])
      );
      expect(result.typicalEatStart).toBe('10:00');
      expect(result.typicalEatEnd).toBe('18:00');
    });

    it('creates config if none exists before updating', async () => {
      // getOrCreateConfig -> getConfig: null first time, then created row
      mockGetFirstAsync
        .mockResolvedValueOnce(null)           // getOrCreateConfig -> getConfig returns null
        .mockResolvedValueOnce({ ...mockConfigRow, enabled: 0 }) // getOrCreateConfig -> after insert, getConfig
        .mockResolvedValueOnce({ ...mockConfigRow, enabled: 1 }); // final getConfig after update

      const result = await fastingRepository.updateConfig({ enabled: true });

      // INSERT (create) + UPDATE
      expect(mockRunAsync).toHaveBeenCalledTimes(2);
      expect(result.enabled).toBe(true);
    });
  });

  // ==========================================================
  // getActiveSession
  // ==========================================================

  describe('getActiveSession', () => {
    it('returns mapped session when active session exists', async () => {
      mockGetFirstAsync.mockResolvedValue(mockSessionRow);

      const result = await fastingRepository.getActiveSession();

      expect(result).not.toBeNull();
      expect(result!.id).toBe('session-1');
      expect(result!.startTime).toBe('2024-01-15T20:00:00.000Z');
      expect(result!.endTime).toBeUndefined();
      expect(result!.targetHours).toBe(16);
      expect(result!.actualHours).toBeUndefined();
      expect(result!.status).toBe('active');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'")
      );
    });

    it('returns null when no active session', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await fastingRepository.getActiveSession();

      expect(result).toBeNull();
    });
  });

  // ==========================================================
  // getSessionById
  // ==========================================================

  describe('getSessionById', () => {
    it('returns mapped session when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockCompletedSessionRow);

      const result = await fastingRepository.getSessionById('session-2');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('session-2');
      expect(result!.endTime).toBe('2024-01-15T12:00:00.000Z');
      expect(result!.actualHours).toBe(16);
      expect(result!.status).toBe('completed');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        ['session-2']
      );
    });

    it('returns null when not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await fastingRepository.getSessionById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================
  // startSession
  // ==========================================================

  describe('startSession', () => {
    it('inserts a new session and returns it', async () => {
      // getActiveSession -> null
      // getSessionById (return) -> new session
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // no active session
        .mockResolvedValueOnce({
          id: 'test-uuid-fasting',
          start_time: '2024-01-15T20:00:00.000Z',
          end_time: null,
          target_hours: 16,
          actual_hours: null,
          status: 'active',
          created_at: '2024-01-15T20:00:00.000Z',
        });

      const result = await fastingRepository.startSession(16);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fasting_sessions'),
        expect.arrayContaining(['test-uuid-fasting', expect.any(String), 16, expect.any(String)])
      );
      expect(result.id).toBe('test-uuid-fasting');
      expect(result.targetHours).toBe(16);
      expect(result.status).toBe('active');
    });

    it('ends existing active session before starting a new one', async () => {
      // getActiveSession -> returns active session
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSessionRow)                  // getActiveSession -> found
        .mockResolvedValueOnce(mockSessionRow)                  // endSession -> getSessionById (to calc hours)
        .mockResolvedValueOnce(mockCompletedSessionRow)         // endSession -> getSessionById (return)
        .mockResolvedValueOnce({                                // startSession -> getSessionById (return new)
          id: 'test-uuid-fasting',
          start_time: '2024-01-15T22:00:00.000Z',
          end_time: null,
          target_hours: 18,
          actual_hours: null,
          status: 'active',
          created_at: '2024-01-15T22:00:00.000Z',
        });

      const result = await fastingRepository.startSession(18);

      // endSession UPDATE + startSession INSERT = 2 runAsync calls
      expect(mockRunAsync).toHaveBeenCalledTimes(2);
      // First call: UPDATE to end the active session
      expect(mockRunAsync.mock.calls[0][0]).toContain('UPDATE fasting_sessions SET');
      expect(mockRunAsync.mock.calls[0][1]).toEqual(
        expect.arrayContaining(['ended_early', 'session-1'])
      );
      // Second call: INSERT for the new session
      expect(mockRunAsync.mock.calls[1][0]).toContain('INSERT INTO fasting_sessions');
      expect(result.id).toBe('test-uuid-fasting');
      expect(result.targetHours).toBe(18);
    });
  });

  // ==========================================================
  // endSession
  // ==========================================================

  describe('endSession', () => {
    it('ends session with default status (completed)', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSessionRow) // getSessionById for validation
        .mockResolvedValueOnce({               // getSessionById for return
          ...mockSessionRow,
          end_time: '2024-01-16T12:00:00.000Z',
          actual_hours: 16,
          status: 'completed',
        });

      const result = await fastingRepository.endSession('session-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fasting_sessions SET end_time = ?'),
        expect.arrayContaining([
          expect.any(String), // endTime ISO
          expect.any(Number), // actualHours
          'completed',
          'session-1',
        ])
      );
      expect(result.status).toBe('completed');
      expect(result.endTime).toBe('2024-01-16T12:00:00.000Z');
    });

    it('ends session with explicit ended_early status', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSessionRow)
        .mockResolvedValueOnce({
          ...mockSessionRow,
          end_time: '2024-01-16T04:00:00.000Z',
          actual_hours: 8,
          status: 'ended_early',
        });

      const result = await fastingRepository.endSession('session-1', 'ended_early');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fasting_sessions SET'),
        expect.arrayContaining(['ended_early', 'session-1'])
      );
      expect(result.status).toBe('ended_early');
    });

    it('throws error when session not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(fastingRepository.endSession('nonexistent')).rejects.toThrow(
        'Session not found'
      );
    });
  });

  // ==========================================================
  // updateSessionTimes
  // ==========================================================

  describe('updateSessionTimes', () => {
    it('updates startTime only', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSessionRow) // getSessionById for validation
        .mockResolvedValueOnce({               // getSessionById for return
          ...mockSessionRow,
          start_time: '2024-01-15T19:00:00.000Z',
        });

      const result = await fastingRepository.updateSessionTimes(
        'session-1',
        '2024-01-15T19:00:00.000Z'
      );

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('start_time = ?'),
        expect.arrayContaining(['2024-01-15T19:00:00.000Z', 'session-1'])
      );
      expect(result.startTime).toBe('2024-01-15T19:00:00.000Z');
    });

    it('updates endTime only', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSessionRow) // getSessionById for validation
        .mockResolvedValueOnce({               // getSessionById for return
          ...mockSessionRow,
          end_time: '2024-01-16T12:00:00.000Z',
          actual_hours: 16,
        });

      const result = await fastingRepository.updateSessionTimes(
        'session-1',
        undefined,
        '2024-01-16T12:00:00.000Z'
      );

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('end_time = ?'),
        expect.arrayContaining(['2024-01-16T12:00:00.000Z', 'session-1'])
      );
      // Also sets actual_hours since endTime is present
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('actual_hours = ?'),
        expect.any(Array)
      );
      expect(result.endTime).toBe('2024-01-16T12:00:00.000Z');
    });

    it('updates both startTime and endTime', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSessionRow)
        .mockResolvedValueOnce({
          ...mockSessionRow,
          start_time: '2024-01-15T18:00:00.000Z',
          end_time: '2024-01-16T10:00:00.000Z',
          actual_hours: 16,
        });

      const result = await fastingRepository.updateSessionTimes(
        'session-1',
        '2024-01-15T18:00:00.000Z',
        '2024-01-16T10:00:00.000Z'
      );

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      expect(result.startTime).toBe('2024-01-15T18:00:00.000Z');
      expect(result.endTime).toBe('2024-01-16T10:00:00.000Z');
    });

    it('throws error when session not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(
        fastingRepository.updateSessionTimes('nonexistent', '2024-01-15T19:00:00.000Z')
      ).rejects.toThrow('Session not found');
    });
  });

  // ==========================================================
  // getRecentSessions
  // ==========================================================

  describe('getRecentSessions', () => {
    it('returns sessions with default limit of 30', async () => {
      mockGetAllAsync.mockResolvedValue([mockSessionRow, mockCompletedSessionRow]);

      const result = await fastingRepository.getRecentSessions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-2');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY start_time DESC LIMIT ?'),
        [30]
      );
    });

    it('respects explicit limit', async () => {
      mockGetAllAsync.mockResolvedValue([mockSessionRow]);

      const result = await fastingRepository.getRecentSessions(5);

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [5]
      );
    });

    it('returns empty array when no sessions', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await fastingRepository.getRecentSessions();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // getSessionsByDateRange
  // ==========================================================

  describe('getSessionsByDateRange', () => {
    it('returns sessions within date range', async () => {
      mockGetAllAsync.mockResolvedValue([mockCompletedSessionRow]);

      const result = await fastingRepository.getSessionsByDateRange('2024-01-14', '2024-01-15');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-2');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('date(start_time) >= ? AND date(start_time) <= ?'),
        ['2024-01-14', '2024-01-15']
      );
    });

    it('returns empty array when no sessions in range', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await fastingRepository.getSessionsByDateRange('2024-02-01', '2024-02-28');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // getStats
  // ==========================================================

  describe('getStats', () => {
    it('calculates stats for completed sessions', async () => {
      const sessions = [
        {
          id: 's1',
          start_time: '2024-01-15T20:00:00.000Z',
          end_time: '2024-01-16T12:00:00.000Z',
          target_hours: 16,
          actual_hours: 16,
          status: 'completed',
          created_at: '2024-01-15T20:00:00.000Z',
        },
        {
          id: 's2',
          start_time: '2024-01-14T20:00:00.000Z',
          end_time: '2024-01-15T12:00:00.000Z',
          target_hours: 16,
          actual_hours: 16,
          status: 'completed',
          created_at: '2024-01-14T20:00:00.000Z',
        },
        {
          id: 's3',
          start_time: '2024-01-13T20:00:00.000Z',
          end_time: '2024-01-14T04:00:00.000Z',
          target_hours: 16,
          actual_hours: 8,
          status: 'ended_early',
          created_at: '2024-01-13T20:00:00.000Z',
        },
      ];
      mockGetAllAsync.mockResolvedValue(sessions);

      const result = await fastingRepository.getStats();

      expect(result.totalFastsCompleted).toBe(2); // only 'completed'
      expect(result.totalFastingHours).toBe(40); // 16+16+8
      expect(result.averageFastHours).toBe(13.3); // 40/3 = 13.333 -> rounded to 13.3
      expect(result.completionRate).toBe(67); // 2/3 = 66.67 -> 67
      expect(result.currentStreak).toBe(2); // s1 and s2 are consecutive completed days
      expect(result.longestStreak).toBe(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('completed', 'ended_early')"),
      );
    });

    it('returns zero stats when no sessions', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await fastingRepository.getStats();

      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalFastingHours: 0,
        averageFastHours: 0,
        totalFastsCompleted: 0,
        completionRate: 0,
      });
    });

    it('calculates streaks correctly with gaps', async () => {
      // 3 consecutive days, then a gap, then 1 day
      const sessions = [
        {
          id: 's1',
          start_time: '2024-01-20T20:00:00.000Z',
          end_time: '2024-01-21T12:00:00.000Z',
          target_hours: 16,
          actual_hours: 16,
          status: 'completed',
          created_at: '2024-01-20T20:00:00.000Z',
        },
        // gap on 2024-01-19
        {
          id: 's2',
          start_time: '2024-01-18T20:00:00.000Z',
          end_time: '2024-01-19T12:00:00.000Z',
          target_hours: 16,
          actual_hours: 16,
          status: 'completed',
          created_at: '2024-01-18T20:00:00.000Z',
        },
        {
          id: 's3',
          start_time: '2024-01-17T20:00:00.000Z',
          end_time: '2024-01-18T12:00:00.000Z',
          target_hours: 16,
          actual_hours: 16,
          status: 'completed',
          created_at: '2024-01-17T20:00:00.000Z',
        },
        {
          id: 's4',
          start_time: '2024-01-16T20:00:00.000Z',
          end_time: '2024-01-17T12:00:00.000Z',
          target_hours: 16,
          actual_hours: 16,
          status: 'completed',
          created_at: '2024-01-16T20:00:00.000Z',
        },
      ];
      mockGetAllAsync.mockResolvedValue(sessions);

      const result = await fastingRepository.getStats();

      // s1 is alone (2024-01-20), gap on 2024-01-19, then s2-s3-s4 are consecutive (18,17,16)
      expect(result.currentStreak).toBe(1); // first streak before break
      expect(result.longestStreak).toBe(3); // s2, s3, s4
    });

    it('handles single completed session', async () => {
      mockGetAllAsync.mockResolvedValue([
        {
          id: 's1',
          start_time: '2024-01-15T20:00:00.000Z',
          end_time: '2024-01-16T12:00:00.000Z',
          target_hours: 16,
          actual_hours: 16,
          status: 'completed',
          created_at: '2024-01-15T20:00:00.000Z',
        },
      ]);

      const result = await fastingRepository.getStats();

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.totalFastsCompleted).toBe(1);
      expect(result.completionRate).toBe(100);
    });
  });

  // ==========================================================
  // deleteSession
  // ==========================================================

  describe('deleteSession', () => {
    it('deletes session by id', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await fastingRepository.deleteSession('session-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM fasting_sessions WHERE id = ?',
        ['session-1']
      );
    });
  });
});
