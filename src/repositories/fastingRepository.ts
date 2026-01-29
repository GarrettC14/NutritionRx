import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';
import {
  FastingConfig,
  FastingSession,
  FastingStats,
  FastingConfigRow,
  FastingSessionRow,
  FastingProtocol,
  FastingSessionStatus,
} from '@/types/planning';

// Default values
export const DEFAULT_FASTING_CONFIG: Omit<FastingConfig, 'createdAt' | 'lastModified'> = {
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
};

function mapConfigRowToConfig(row: FastingConfigRow): FastingConfig {
  return {
    enabled: Boolean(row.enabled),
    protocol: row.protocol as FastingProtocol,
    customFastHours: row.custom_fast_hours ?? undefined,
    typicalEatStart: row.typical_eat_start,
    typicalEatEnd: row.typical_eat_end,
    notifications: {
      windowOpens: Boolean(row.notify_window_opens),
      windowClosesSoon: Boolean(row.notify_window_closes_soon),
      windowClosesReminder: row.notify_closes_reminder_mins,
      fastComplete: Boolean(row.notify_fast_complete),
    },
    createdAt: row.created_at,
    lastModified: row.last_modified,
  };
}

function mapSessionRowToSession(row: FastingSessionRow): FastingSession {
  return {
    id: row.id,
    startTime: row.start_time,
    endTime: row.end_time ?? undefined,
    targetHours: row.target_hours,
    actualHours: row.actual_hours ?? undefined,
    status: row.status as FastingSessionStatus,
    createdAt: row.created_at,
  };
}

export const fastingRepository = {
  // ============================================================
  // Configuration
  // ============================================================

  async getConfig(): Promise<FastingConfig | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<FastingConfigRow>(
      'SELECT * FROM fasting_config WHERE id = 1'
    );
    return row ? mapConfigRowToConfig(row) : null;
  },

  async getOrCreateConfig(): Promise<FastingConfig> {
    const existing = await this.getConfig();
    if (existing) return existing;

    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO fasting_config (
        id, enabled, protocol, typical_eat_start, typical_eat_end,
        notify_window_opens, notify_window_closes_soon, notify_closes_reminder_mins,
        notify_fast_complete, created_at, last_modified
      ) VALUES (1, 0, '16:8', '12:00', '20:00', 1, 1, 30, 1, ?, ?)`,
      [now, now]
    );

    return this.getConfig() as Promise<FastingConfig>;
  },

  async updateConfig(updates: Partial<FastingConfig>): Promise<FastingConfig> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure config exists
    await this.getOrCreateConfig();

    const setClauses: string[] = ['last_modified = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.protocol !== undefined) {
      setClauses.push('protocol = ?');
      values.push(updates.protocol);
    }
    if (updates.customFastHours !== undefined) {
      setClauses.push('custom_fast_hours = ?');
      values.push(updates.customFastHours);
    }
    if (updates.typicalEatStart !== undefined) {
      setClauses.push('typical_eat_start = ?');
      values.push(updates.typicalEatStart);
    }
    if (updates.typicalEatEnd !== undefined) {
      setClauses.push('typical_eat_end = ?');
      values.push(updates.typicalEatEnd);
    }
    if (updates.notifications !== undefined) {
      const n = updates.notifications;
      if (n.windowOpens !== undefined) {
        setClauses.push('notify_window_opens = ?');
        values.push(n.windowOpens ? 1 : 0);
      }
      if (n.windowClosesSoon !== undefined) {
        setClauses.push('notify_window_closes_soon = ?');
        values.push(n.windowClosesSoon ? 1 : 0);
      }
      if (n.windowClosesReminder !== undefined) {
        setClauses.push('notify_closes_reminder_mins = ?');
        values.push(n.windowClosesReminder);
      }
      if (n.fastComplete !== undefined) {
        setClauses.push('notify_fast_complete = ?');
        values.push(n.fastComplete ? 1 : 0);
      }
    }

    await db.runAsync(
      `UPDATE fasting_config SET ${setClauses.join(', ')} WHERE id = 1`,
      values
    );

    return this.getConfig() as Promise<FastingConfig>;
  },

  // ============================================================
  // Sessions
  // ============================================================

  async getActiveSession(): Promise<FastingSession | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<FastingSessionRow>(
      "SELECT * FROM fasting_sessions WHERE status = 'active' ORDER BY start_time DESC LIMIT 1"
    );
    return row ? mapSessionRowToSession(row) : null;
  },

  async getSessionById(id: string): Promise<FastingSession | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<FastingSessionRow>(
      'SELECT * FROM fasting_sessions WHERE id = ?',
      [id]
    );
    return row ? mapSessionRowToSession(row) : null;
  },

  async startSession(targetHours: number): Promise<FastingSession> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();

    // End any active session first
    const activeSession = await this.getActiveSession();
    if (activeSession) {
      await this.endSession(activeSession.id, 'ended_early');
    }

    await db.runAsync(
      `INSERT INTO fasting_sessions (id, start_time, target_hours, status, created_at)
       VALUES (?, ?, ?, 'active', ?)`,
      [id, now, targetHours, now]
    );

    return this.getSessionById(id) as Promise<FastingSession>;
  },

  async endSession(
    id: string,
    status: 'completed' | 'ended_early' = 'completed'
  ): Promise<FastingSession> {
    const db = getDatabase();
    const session = await this.getSessionById(id);
    if (!session) throw new Error('Session not found');

    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const actualHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    await db.runAsync(
      `UPDATE fasting_sessions SET end_time = ?, actual_hours = ?, status = ? WHERE id = ?`,
      [endTime.toISOString(), actualHours, status, id]
    );

    return this.getSessionById(id) as Promise<FastingSession>;
  },

  async updateSessionTimes(
    id: string,
    startTime?: string,
    endTime?: string
  ): Promise<FastingSession> {
    const db = getDatabase();
    const session = await this.getSessionById(id);
    if (!session) throw new Error('Session not found');

    const newStartTime = startTime || session.startTime;
    const newEndTime = endTime || session.endTime;

    let actualHours: number | null = null;
    if (newEndTime) {
      actualHours =
        (new Date(newEndTime).getTime() - new Date(newStartTime).getTime()) / (1000 * 60 * 60);
    }

    const setClauses = ['start_time = ?'];
    const values: (string | number | null)[] = [newStartTime];

    if (endTime !== undefined) {
      setClauses.push('end_time = ?');
      values.push(newEndTime || null);
    }
    if (actualHours !== null) {
      setClauses.push('actual_hours = ?');
      values.push(actualHours);
    }

    values.push(id);

    await db.runAsync(
      `UPDATE fasting_sessions SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    return this.getSessionById(id) as Promise<FastingSession>;
  },

  async getRecentSessions(limit: number = 30): Promise<FastingSession[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FastingSessionRow>(
      'SELECT * FROM fasting_sessions ORDER BY start_time DESC LIMIT ?',
      [limit]
    );
    return rows.map(mapSessionRowToSession);
  },

  async getSessionsByDateRange(startDate: string, endDate: string): Promise<FastingSession[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FastingSessionRow>(
      `SELECT * FROM fasting_sessions
       WHERE date(start_time) >= ? AND date(start_time) <= ?
       ORDER BY start_time DESC`,
      [startDate, endDate]
    );
    return rows.map(mapSessionRowToSession);
  },

  async getStats(): Promise<FastingStats> {
    const db = getDatabase();

    // Get all completed sessions
    const completedSessions = await db.getAllAsync<FastingSessionRow>(
      "SELECT * FROM fasting_sessions WHERE status IN ('completed', 'ended_early') ORDER BY start_time DESC"
    );

    const totalSessions = completedSessions.length;
    const completedFully = completedSessions.filter(s => s.status === 'completed').length;

    const totalHours = completedSessions.reduce((sum, s) => sum + (s.actual_hours || 0), 0);
    const avgHours = totalSessions > 0 ? totalHours / totalSessions : 0;

    // Calculate current streak (consecutive days with completed fasts)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: string | null = null;

    for (const session of completedSessions) {
      if (session.status !== 'completed') continue;

      const sessionDate = session.start_time.split('T')[0];

      if (lastDate === null) {
        tempStreak = 1;
      } else {
        const lastDateObj = new Date(lastDate);
        const sessionDateObj = new Date(sessionDate);
        const dayDiff = Math.floor(
          (lastDateObj.getTime() - sessionDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          if (currentStreak === 0) {
            currentStreak = tempStreak;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      lastDate = sessionDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    if (currentStreak === 0) currentStreak = tempStreak;

    return {
      currentStreak,
      longestStreak,
      totalFastingHours: Math.round(totalHours),
      averageFastHours: Math.round(avgHours * 10) / 10,
      totalFastsCompleted: completedFully,
      completionRate: totalSessions > 0 ? Math.round((completedFully / totalSessions) * 100) : 0,
    };
  },

  async deleteSession(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM fasting_sessions WHERE id = ?', [id]);
  },
};
