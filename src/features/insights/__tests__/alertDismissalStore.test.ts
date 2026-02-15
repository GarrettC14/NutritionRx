/**
 * Alert Dismissal Store Tests
 * Tests the Zustand store that tracks dismissed deficiency alerts with expiration
 */

import { useAlertDismissalStore } from '../stores/alertDismissalStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

(global as any).__DEV__ = true;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const BASE_TIME = 1700000000000; // Fixed timestamp for deterministic tests

describe('alertDismissalStore', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useAlertDismissalStore.setState({ dismissals: [] });
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  // ─── Initial State ────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with an empty dismissals array', () => {
      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toEqual([]);
    });
  });

  // ─── dismissAlert ─────────────────────────────────────────────────

  describe('dismissAlert', () => {
    it('creates a dismissal with correct alertId format (nutrientId_severity)', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(1);
      expect(dismissals[0].alertId).toBe('vitamin_d_high');
      expect(dismissals[0].nutrientId).toBe('vitamin_d');
    });

    it('sets dismissedAt to current time', () => {
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals[0].dismissedAt).toBe(BASE_TIME);
    });

    it('sets expiresAt to now + 7 days', () => {
      useAlertDismissalStore.getState().dismissAlert('calcium', 'high');

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals[0].expiresAt).toBe(BASE_TIME + SEVEN_DAYS_MS);
    });

    it('replaces an existing dismissal for the same alertId', () => {
      // Dismiss at BASE_TIME
      useAlertDismissalStore.getState().dismissAlert('zinc', 'low');
      expect(useAlertDismissalStore.getState().dismissals).toHaveLength(1);

      // Advance time by 1 day and dismiss again
      const oneDayLater = BASE_TIME + 24 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(oneDayLater);
      useAlertDismissalStore.getState().dismissAlert('zinc', 'low');

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(1);
      expect(dismissals[0].dismissedAt).toBe(oneDayLater);
      expect(dismissals[0].expiresAt).toBe(oneDayLater + SEVEN_DAYS_MS);
    });

    it('keeps dismissals for different alertIds', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');
      useAlertDismissalStore.getState().dismissAlert('calcium', 'low');

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(3);
    });

    it('handles same nutrient with different severities as separate dismissals', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'moderate');

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(2);
      expect(dismissals.map((d) => d.alertId)).toEqual(
        expect.arrayContaining(['vitamin_d_high', 'vitamin_d_moderate'])
      );
    });
  });

  // ─── isAlertDismissed ─────────────────────────────────────────────

  describe('isAlertDismissed', () => {
    it('returns true for a valid non-expired dismissal', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      // Still at BASE_TIME, so the dismissal is valid
      const result = useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'high');
      expect(result).toBe(true);
    });

    it('returns true when checked just before expiration', () => {
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      // Advance to 1ms before expiration
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS - 1);
      const result = useAlertDismissalStore.getState().isAlertDismissed('iron', 'moderate');
      expect(result).toBe(true);
    });

    it('returns false for an expired dismissal', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      // Advance time past 7 days
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS + 1);
      const result = useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'high');
      expect(result).toBe(false);
    });

    it('returns false exactly at expiration time (expiresAt is exclusive)', () => {
      useAlertDismissalStore.getState().dismissAlert('calcium', 'low');

      // Advance to exactly the expiration time
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS);
      const result = useAlertDismissalStore.getState().isAlertDismissed('calcium', 'low');
      expect(result).toBe(false);
    });

    it('returns false for a non-existent dismissal', () => {
      const result = useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'high');
      expect(result).toBe(false);
    });

    it('returns false for wrong severity', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      const result = useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'low');
      expect(result).toBe(false);
    });
  });

  // ─── getDismissedAlertIds ─────────────────────────────────────────

  describe('getDismissedAlertIds', () => {
    it('returns an empty Set when no dismissals exist', () => {
      const ids = useAlertDismissalStore.getState().getDismissedAlertIds();
      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBe(0);
    });

    it('returns a Set of valid alert IDs', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      const ids = useAlertDismissalStore.getState().getDismissedAlertIds();
      expect(ids.size).toBe(2);
      expect(ids.has('vitamin_d_high')).toBe(true);
      expect(ids.has('iron_moderate')).toBe(true);
    });

    it('excludes expired dismissals from the returned Set', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      // Advance time by 3 days and add another dismissal
      const threeDaysLater = BASE_TIME + 3 * 24 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(threeDaysLater);
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      // Advance time past the first dismissal's expiration but before the second's
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS + 1);
      const ids = useAlertDismissalStore.getState().getDismissedAlertIds();
      expect(ids.size).toBe(1);
      expect(ids.has('vitamin_d_high')).toBe(false);
      expect(ids.has('iron_moderate')).toBe(true);
    });

    it('returns empty Set when all dismissals are expired', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      // Advance time past all expirations
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS + 1);
      const ids = useAlertDismissalStore.getState().getDismissedAlertIds();
      expect(ids.size).toBe(0);
    });
  });

  // ─── clearExpiredDismissals ───────────────────────────────────────

  describe('clearExpiredDismissals', () => {
    it('removes only expired entries and keeps valid ones', () => {
      // Dismiss at BASE_TIME
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      // Dismiss at BASE_TIME + 3 days
      const threeDaysLater = BASE_TIME + 3 * 24 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(threeDaysLater);
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      // Advance to just past the first dismissal's expiration
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS + 1);
      useAlertDismissalStore.getState().clearExpiredDismissals();

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(1);
      expect(dismissals[0].alertId).toBe('iron_moderate');
    });

    it('removes all entries when all are expired', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      // Advance past all expirations
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS + 1);
      useAlertDismissalStore.getState().clearExpiredDismissals();

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(0);
    });

    it('does nothing when no dismissals are expired', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      // Time hasn't advanced, nothing is expired
      useAlertDismissalStore.getState().clearExpiredDismissals();

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(2);
    });

    it('does nothing when dismissals array is already empty', () => {
      useAlertDismissalStore.getState().clearExpiredDismissals();

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(0);
    });

    it('removes entry exactly at expiration boundary', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      // Advance to exactly the expiration time (expiresAt <= now means expired)
      dateNowSpy.mockReturnValue(BASE_TIME + SEVEN_DAYS_MS);
      useAlertDismissalStore.getState().clearExpiredDismissals();

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(0);
    });
  });

  // ─── clearAllDismissals ───────────────────────────────────────────

  describe('clearAllDismissals', () => {
    it('empties the dismissals array completely', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');
      useAlertDismissalStore.getState().dismissAlert('calcium', 'low');

      expect(useAlertDismissalStore.getState().dismissals).toHaveLength(3);

      useAlertDismissalStore.getState().clearAllDismissals();

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toEqual([]);
    });

    it('works when dismissals are already empty', () => {
      useAlertDismissalStore.getState().clearAllDismissals();

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toEqual([]);
    });
  });

  // ─── Multiple Dismissals & Edge Cases ─────────────────────────────

  describe('multiple dismissals and edge cases', () => {
    it('handles multiple different nutrients', () => {
      const nutrients = ['vitamin_a', 'vitamin_b12', 'vitamin_c', 'vitamin_d', 'iron', 'zinc', 'calcium'];
      for (const nutrient of nutrients) {
        useAlertDismissalStore.getState().dismissAlert(nutrient, 'high');
      }

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(nutrients.length);

      const ids = useAlertDismissalStore.getState().getDismissedAlertIds();
      expect(ids.size).toBe(nutrients.length);
    });

    it('handles same nutrient with multiple different severities', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'low');
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'moderate');
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(3);

      const alertIds = dismissals.map((d) => d.alertId);
      expect(alertIds).toContain('vitamin_d_low');
      expect(alertIds).toContain('vitamin_d_moderate');
      expect(alertIds).toContain('vitamin_d_high');

      // All should share the same nutrientId
      for (const d of dismissals) {
        expect(d.nutrientId).toBe('vitamin_d');
      }
    });

    it('mixed expired and valid dismissals are handled correctly across all methods', () => {
      // Dismiss three alerts at different times
      // vitamin_d dismissed at BASE_TIME, expires at BASE_TIME + 7 days
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      // iron dismissed at BASE_TIME + 2 days, expires at BASE_TIME + 9 days
      dateNowSpy.mockReturnValue(BASE_TIME + 2 * 24 * 60 * 60 * 1000);
      useAlertDismissalStore.getState().dismissAlert('iron', 'moderate');

      // calcium dismissed at BASE_TIME + 5 days, expires at BASE_TIME + 12 days
      dateNowSpy.mockReturnValue(BASE_TIME + 5 * 24 * 60 * 60 * 1000);
      useAlertDismissalStore.getState().dismissAlert('calcium', 'low');

      // Check at BASE_TIME + 10 days: vitamin_d expired, iron expired, calcium still valid
      const checkTime = BASE_TIME + 10 * 24 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(checkTime);

      // isAlertDismissed
      expect(useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'high')).toBe(false);
      expect(useAlertDismissalStore.getState().isAlertDismissed('iron', 'moderate')).toBe(false);
      expect(useAlertDismissalStore.getState().isAlertDismissed('calcium', 'low')).toBe(true);

      // getDismissedAlertIds
      const ids = useAlertDismissalStore.getState().getDismissedAlertIds();
      expect(ids.size).toBe(1);
      expect(ids.has('calcium_low')).toBe(true);

      // clearExpiredDismissals
      useAlertDismissalStore.getState().clearExpiredDismissals();
      expect(useAlertDismissalStore.getState().dismissals).toHaveLength(1);
      expect(useAlertDismissalStore.getState().dismissals[0].alertId).toBe('calcium_low');
    });

    it('re-dismissing after expiration creates a fresh dismissal', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      // Advance past expiration
      const afterExpiration = BASE_TIME + SEVEN_DAYS_MS + 1000;
      dateNowSpy.mockReturnValue(afterExpiration);

      expect(useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'high')).toBe(false);

      // Re-dismiss
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      expect(useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'high')).toBe(true);

      const { dismissals } = useAlertDismissalStore.getState();
      expect(dismissals).toHaveLength(1);
      expect(dismissals[0].dismissedAt).toBe(afterExpiration);
      expect(dismissals[0].expiresAt).toBe(afterExpiration + SEVEN_DAYS_MS);
    });
  });

  // ─── __DEV__ Logging ──────────────────────────────────────────────

  describe('__DEV__ logging', () => {
    it('logs to console when dismissing an alert', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LLM:AlertStore] dismissAlert(vitamin_d_high)')
      );

      consoleSpy.mockRestore();
    });

    it('logs to console when checking isAlertDismissed', () => {
      useAlertDismissalStore.getState().dismissAlert('vitamin_d', 'high');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      useAlertDismissalStore.getState().isAlertDismissed('vitamin_d', 'high');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LLM:AlertStore] isAlertDismissed(vitamin_d_high)')
      );

      consoleSpy.mockRestore();
    });

    it('logs to console when getting dismissed alert IDs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      useAlertDismissalStore.getState().getDismissedAlertIds();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LLM:AlertStore] getDismissedAlertIds()')
      );

      consoleSpy.mockRestore();
    });

    it('logs to console when clearing all dismissals', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      useAlertDismissalStore.getState().clearAllDismissals();

      expect(consoleSpy).toHaveBeenCalledWith('[LLM:AlertStore] clearAllDismissals()');

      consoleSpy.mockRestore();
    });
  });
});
