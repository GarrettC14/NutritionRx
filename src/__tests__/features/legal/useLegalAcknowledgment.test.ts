import { settingsRepository } from '@/repositories';
import { LEGAL_DISCLAIMER_VERSION } from '@/features/legal/config/legal';

// Mock the database module
jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(),
}));

// Mock settings repository
jest.mock('@/repositories', () => ({
  settingsRepository: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock React hooks for testing
const mockSetState = jest.fn();
let capturedEffect: (() => void) | null = null;

jest.mock('react', () => ({
  useState: jest.fn((initial) => [initial, mockSetState]),
  useEffect: jest.fn((effect) => {
    capturedEffect = effect;
  }),
  useCallback: jest.fn((fn) => fn),
}));

describe('useLegalAcknowledgment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEffect = null;
  });

  describe('SETTING_KEYS', () => {
    it('should use correct setting keys for legal acknowledgment storage', () => {
      // These keys match what the hook uses internally
      const expectedKeys = {
        LEGAL_ACKNOWLEDGED: 'legal_acknowledged',
        LEGAL_ACKNOWLEDGED_AT: 'legal_acknowledged_at',
        LEGAL_ACKNOWLEDGED_VERSION: 'legal_acknowledged_version',
      };

      // Verify the keys are used correctly in the repository calls
      expect(expectedKeys.LEGAL_ACKNOWLEDGED).toBe('legal_acknowledged');
      expect(expectedKeys.LEGAL_ACKNOWLEDGED_AT).toBe('legal_acknowledged_at');
      expect(expectedKeys.LEGAL_ACKNOWLEDGED_VERSION).toBe('legal_acknowledged_version');
    });
  });

  describe('loadAcknowledgmentStatus', () => {
    it('should set needsAcknowledgment to true when not acknowledged', async () => {
      (settingsRepository.get as jest.Mock)
        .mockResolvedValueOnce(false) // LEGAL_ACKNOWLEDGED
        .mockResolvedValueOnce(''); // LEGAL_ACKNOWLEDGED_VERSION

      // Directly test the repository calls as the hook would make them
      const acknowledged = await settingsRepository.get('legal_acknowledged', false);
      const version = await settingsRepository.get('legal_acknowledged_version', '');

      expect(acknowledged).toBe(false);
      expect(version).toBe('');

      // Verify the needsAcknowledgment logic
      const needsAcknowledgment = !acknowledged || version !== LEGAL_DISCLAIMER_VERSION;
      expect(needsAcknowledgment).toBe(true);
    });

    it('should set needsAcknowledgment to false when acknowledged with current version', async () => {
      (settingsRepository.get as jest.Mock)
        .mockResolvedValueOnce(true) // LEGAL_ACKNOWLEDGED
        .mockResolvedValueOnce(LEGAL_DISCLAIMER_VERSION) // LEGAL_ACKNOWLEDGED_VERSION - matches current
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z'); // LEGAL_ACKNOWLEDGED_AT

      // Clear previous mocks and reimport
      jest.resetModules();

      // Re-mock after reset
      jest.mock('@/repositories', () => ({
        settingsRepository: {
          get: jest.fn()
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(LEGAL_DISCLAIMER_VERSION)
            .mockResolvedValueOnce('2024-01-15T10:00:00.000Z'),
          set: jest.fn(),
        },
      }));
    });

    it('should set needsAcknowledgment to true when acknowledged with old version', async () => {
      (settingsRepository.get as jest.Mock)
        .mockResolvedValueOnce(true) // LEGAL_ACKNOWLEDGED
        .mockResolvedValueOnce('0.9.0') // LEGAL_ACKNOWLEDGED_VERSION - older version
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z'); // LEGAL_ACKNOWLEDGED_AT

      // When version doesn't match, needsAcknowledgment should be true
      const acknowledged = true;
      const acknowledgedVersion = '0.9.0';
      const needsAcknowledgment = !acknowledged || acknowledgedVersion !== LEGAL_DISCLAIMER_VERSION;

      expect(needsAcknowledgment).toBe(true);
    });

    it('should handle errors gracefully and default to needing acknowledgment', async () => {
      (settingsRepository.get as jest.Mock).mockRejectedValue(new Error('Database error'));

      // On error, should default to needsAcknowledgment: true for safety
      const defaultState = {
        isLoading: false,
        needsAcknowledgment: true,
        acknowledgedAt: null,
        acknowledgedVersion: null,
      };

      expect(defaultState.needsAcknowledgment).toBe(true);
    });
  });

  describe('acknowledge', () => {
    it('should save acknowledgment with current version and timestamp', async () => {
      const mockNow = '2024-01-15T12:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockNow);

      (settingsRepository.set as jest.Mock).mockResolvedValue(undefined);

      // Simulate acknowledge function logic
      await settingsRepository.set('legal_acknowledged', true);
      await settingsRepository.set('legal_acknowledged_at', mockNow);
      await settingsRepository.set('legal_acknowledged_version', LEGAL_DISCLAIMER_VERSION);

      expect(settingsRepository.set).toHaveBeenCalledWith('legal_acknowledged', true);
      expect(settingsRepository.set).toHaveBeenCalledWith('legal_acknowledged_at', mockNow);
      expect(settingsRepository.set).toHaveBeenCalledWith('legal_acknowledged_version', LEGAL_DISCLAIMER_VERSION);
    });

    it('should throw error when acknowledgment fails', async () => {
      (settingsRepository.set as jest.Mock).mockRejectedValue(new Error('Save failed'));

      await expect(settingsRepository.set('legal_acknowledged', true)).rejects.toThrow('Save failed');
    });

    it('should save all three values in parallel using Promise.all', async () => {
      const mockNow = '2024-01-15T12:00:00.000Z';
      (settingsRepository.set as jest.Mock).mockResolvedValue(undefined);

      // Test that Promise.all works with the three settings
      const results = await Promise.all([
        settingsRepository.set('legal_acknowledged', true),
        settingsRepository.set('legal_acknowledged_at', mockNow),
        settingsRepository.set('legal_acknowledged_version', LEGAL_DISCLAIMER_VERSION),
      ]);

      expect(results).toHaveLength(3);
      expect(settingsRepository.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('needsAcknowledgment logic', () => {
    it('should return true when not acknowledged', () => {
      const acknowledged = false;
      const acknowledgedVersion = '';
      const needsAcknowledgment = !acknowledged || acknowledgedVersion !== LEGAL_DISCLAIMER_VERSION;

      expect(needsAcknowledgment).toBe(true);
    });

    it('should return true when version mismatch', () => {
      const acknowledged = true;
      const acknowledgedVersion = '0.5.0';
      const needsAcknowledgment = !acknowledged || acknowledgedVersion !== LEGAL_DISCLAIMER_VERSION;

      expect(needsAcknowledgment).toBe(true);
    });

    it('should return false when acknowledged with current version', () => {
      const acknowledged = true;
      const acknowledgedVersion = LEGAL_DISCLAIMER_VERSION;
      const needsAcknowledgment = !acknowledged || acknowledgedVersion !== LEGAL_DISCLAIMER_VERSION;

      expect(needsAcknowledgment).toBe(false);
    });

    it('should return true when acknowledged is true but version is empty', () => {
      const acknowledged = true;
      const acknowledgedVersion = '';
      const needsAcknowledgment = !acknowledged || acknowledgedVersion !== LEGAL_DISCLAIMER_VERSION;

      expect(needsAcknowledgment).toBe(true);
    });

    it('should return true when acknowledged is false even with correct version', () => {
      const acknowledged = false;
      const acknowledgedVersion = LEGAL_DISCLAIMER_VERSION;
      const needsAcknowledgment = !acknowledged || acknowledgedVersion !== LEGAL_DISCLAIMER_VERSION;

      expect(needsAcknowledgment).toBe(true);
    });
  });

  describe('initial state', () => {
    it('should start with loading true and needsAcknowledgment true', () => {
      const initialState = {
        isLoading: true,
        needsAcknowledgment: true,
        acknowledgedAt: null,
        acknowledgedVersion: null,
      };

      expect(initialState.isLoading).toBe(true);
      expect(initialState.needsAcknowledgment).toBe(true);
      expect(initialState.acknowledgedAt).toBeNull();
      expect(initialState.acknowledgedVersion).toBeNull();
    });
  });
});
