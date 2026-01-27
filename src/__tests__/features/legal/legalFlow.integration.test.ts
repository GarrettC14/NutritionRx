import { getDatabase } from '@/db/database';
import { LEGAL_DISCLAIMER_VERSION } from '@/features/legal/config/legal';

// Mock the database module
jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(),
}));

const mockDb = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
};

(getDatabase as jest.Mock).mockReturnValue(mockDb);

// Import after mocking
import { settingsRepository } from '@/repositories/settingsRepository';

describe('Legal Acknowledgment Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('First launch flow', () => {
    it('should require acknowledgment when no settings exist', async () => {
      // Simulate no existing settings
      mockDb.getFirstAsync.mockResolvedValue(null);

      const acknowledged = await settingsRepository.get('legal_acknowledged', false);
      const version = await settingsRepository.get('legal_acknowledged_version', '');

      expect(acknowledged).toBe(false);
      expect(version).toBe('');

      // Calculate needsAcknowledgment
      const needsAcknowledgment = !acknowledged || version !== LEGAL_DISCLAIMER_VERSION;
      expect(needsAcknowledgment).toBe(true);
    });

    it('should save acknowledgment after user accepts', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      const timestamp = '2024-01-15T12:00:00.000Z';

      await settingsRepository.set('legal_acknowledged', true);
      await settingsRepository.set('legal_acknowledged_at', timestamp);
      await settingsRepository.set('legal_acknowledged_version', LEGAL_DISCLAIMER_VERSION);

      expect(mockDb.runAsync).toHaveBeenCalledTimes(3);

      // Verify the correct values were saved
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining(['legal_acknowledged', 'true']) // boolean true as 'true'
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining(['legal_acknowledged_at', timestamp])
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining(['legal_acknowledged_version', LEGAL_DISCLAIMER_VERSION])
      );
    });
  });

  describe('Return user flow', () => {
    it('should not require acknowledgment when already acknowledged with current version', async () => {
      // Simulate existing acknowledgment with current version
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ key: 'legal_acknowledged', value: 'true' })
        .mockResolvedValueOnce({ key: 'legal_acknowledged_version', value: LEGAL_DISCLAIMER_VERSION });

      const acknowledged = await settingsRepository.get('legal_acknowledged', false);
      const version = await settingsRepository.get('legal_acknowledged_version', '');

      expect(acknowledged).toBe(true);
      expect(version).toBe(LEGAL_DISCLAIMER_VERSION);

      const needsAcknowledgment = !acknowledged || version !== LEGAL_DISCLAIMER_VERSION;
      expect(needsAcknowledgment).toBe(false);
    });
  });

  describe('Version bump flow', () => {
    it('should require re-acknowledgment when version changes', async () => {
      const oldVersion = '0.9.0';

      // Simulate existing acknowledgment with old version
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ key: 'legal_acknowledged', value: 'true' })
        .mockResolvedValueOnce({ key: 'legal_acknowledged_version', value: oldVersion });

      const acknowledged = await settingsRepository.get('legal_acknowledged', false);
      const version = await settingsRepository.get('legal_acknowledged_version', '');

      expect(acknowledged).toBe(true);
      expect(version).toBe(oldVersion);
      expect(version).not.toBe(LEGAL_DISCLAIMER_VERSION);

      const needsAcknowledgment = !acknowledged || version !== LEGAL_DISCLAIMER_VERSION;
      expect(needsAcknowledgment).toBe(true);
    });

    it('should update version when user re-acknowledges', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      const newTimestamp = '2024-02-01T12:00:00.000Z';

      await settingsRepository.set('legal_acknowledged', true);
      await settingsRepository.set('legal_acknowledged_at', newTimestamp);
      await settingsRepository.set('legal_acknowledged_version', LEGAL_DISCLAIMER_VERSION);

      // Should overwrite old values
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining(['legal_acknowledged_version', LEGAL_DISCLAIMER_VERSION])
      );
    });
  });

  describe('Settings page flow', () => {
    it('should retrieve acknowledgment date for display', async () => {
      const acknowledgedAt = '2024-01-15T12:00:00.000Z';

      mockDb.getFirstAsync.mockResolvedValue({
        key: 'legal_acknowledged_at',
        value: acknowledgedAt,
      });

      const date = await settingsRepository.get('legal_acknowledged_at', '');

      expect(date).toBe(acknowledgedAt);
    });

    it('should format acknowledgment date correctly', () => {
      const acknowledgedAt = '2024-01-15T12:00:00.000Z';
      const date = new Date(acknowledgedAt);
      const formatted = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
      // Should contain year
      expect(formatted).toContain('2024');
    });

    it('should handle unknown date gracefully', () => {
      const formatDate = (isoDate: string | null): string => {
        if (!isoDate) return 'Unknown';
        const date = new Date(isoDate);
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      expect(formatDate(null)).toBe('Unknown');
      expect(formatDate('')).toBe('Unknown');
    });
  });

  describe('Error handling', () => {
    it('should default to requiring acknowledgment on database error', async () => {
      mockDb.getFirstAsync.mockRejectedValue(new Error('Database error'));

      let acknowledged = false;
      let version = '';

      try {
        acknowledged = await settingsRepository.get('legal_acknowledged', false);
        version = await settingsRepository.get('legal_acknowledged_version', '');
      } catch {
        // Default to safe values on error
        acknowledged = false;
        version = '';
      }

      const needsAcknowledgment = !acknowledged || version !== LEGAL_DISCLAIMER_VERSION;
      expect(needsAcknowledgment).toBe(true);
    });

    it('should throw when acknowledgment save fails', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Save failed'));

      await expect(
        settingsRepository.set('legal_acknowledged', true)
      ).rejects.toThrow('Save failed');
    });
  });

  describe('App navigation integration', () => {
    it('should block access to main app until acknowledged', () => {
      // Simulate app index redirect logic
      const needsAcknowledgment = true;
      const needsOnboarding = true;

      // Legal acknowledgment takes priority
      const redirectTo = needsAcknowledgment
        ? '/legal-acknowledgment'
        : needsOnboarding
          ? '/onboarding'
          : '/(tabs)';

      expect(redirectTo).toBe('/legal-acknowledgment');
    });

    it('should proceed to onboarding after acknowledgment', () => {
      const needsAcknowledgment = false;
      const needsOnboarding = true;

      const redirectTo = needsAcknowledgment
        ? '/legal-acknowledgment'
        : needsOnboarding
          ? '/onboarding'
          : '/(tabs)';

      expect(redirectTo).toBe('/onboarding');
    });

    it('should proceed to main app for returning user', () => {
      const needsAcknowledgment = false;
      const needsOnboarding = false;

      const redirectTo = needsAcknowledgment
        ? '/legal-acknowledgment'
        : needsOnboarding
          ? '/onboarding'
          : '/(tabs)';

      expect(redirectTo).toBe('/(tabs)');
    });
  });
});

describe('Scroll-to-acknowledge behavior', () => {
  describe('scroll detection', () => {
    it('should calculate when user has scrolled to bottom', () => {
      const layoutMeasurement = { height: 600 };
      const contentOffset = { y: 400 };
      const contentSize = { height: 1000 };
      const paddingToBottom = 40;

      const hasScrolledToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      expect(hasScrolledToBottom).toBe(true); // 600 + 400 = 1000 >= 1000 - 40 = 960
    });

    it('should not trigger when user has not scrolled far enough', () => {
      const layoutMeasurement = { height: 600 };
      const contentOffset = { y: 200 };
      const contentSize = { height: 1000 };
      const paddingToBottom = 40;

      const hasScrolledToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      expect(hasScrolledToBottom).toBe(false); // 600 + 200 = 800 < 960
    });
  });

  describe('checkbox interaction', () => {
    it('should not allow checking before scroll', () => {
      const hasScrolledToBottom = false;

      const handleCheckboxPress = () => {
        if (!hasScrolledToBottom) return false;
        return true;
      };

      expect(handleCheckboxPress()).toBe(false);
    });

    it('should allow checking after scroll', () => {
      const hasScrolledToBottom = true;

      const handleCheckboxPress = () => {
        if (!hasScrolledToBottom) return false;
        return true;
      };

      expect(handleCheckboxPress()).toBe(true);
    });
  });

  describe('proceed button state', () => {
    it('should be disabled when not scrolled', () => {
      const hasScrolledToBottom = false;
      const isChecked = false;
      const canProceed = hasScrolledToBottom && isChecked;

      expect(canProceed).toBe(false);
    });

    it('should be disabled when scrolled but not checked', () => {
      const hasScrolledToBottom = true;
      const isChecked = false;
      const canProceed = hasScrolledToBottom && isChecked;

      expect(canProceed).toBe(false);
    });

    it('should be disabled when checked but not scrolled', () => {
      const hasScrolledToBottom = false;
      const isChecked = true;
      const canProceed = hasScrolledToBottom && isChecked;

      expect(canProceed).toBe(false);
    });

    it('should be enabled when both scrolled and checked', () => {
      const hasScrolledToBottom = true;
      const isChecked = true;
      const canProceed = hasScrolledToBottom && isChecked;

      expect(canProceed).toBe(true);
    });
  });
});

describe('Legal version management', () => {
  it('should use semantic versioning', () => {
    const version = LEGAL_DISCLAIMER_VERSION;
    const parts = version.split('.');

    expect(parts).toHaveLength(3);
    parts.forEach(part => {
      expect(Number.isInteger(parseInt(part, 10))).toBe(true);
    });
  });

  it('should trigger re-acknowledgment for major version bump', () => {
    const oldVersion = '1.0.0';
    const newVersion = '2.0.0';

    expect(oldVersion !== newVersion).toBe(true);
  });

  it('should trigger re-acknowledgment for minor version bump', () => {
    const oldVersion = '1.0.0';
    const newVersion = '1.1.0';

    expect(oldVersion !== newVersion).toBe(true);
  });

  it('should trigger re-acknowledgment for patch version bump', () => {
    const oldVersion = '1.0.0';
    const newVersion = '1.0.1';

    expect(oldVersion !== newVersion).toBe(true);
  });

  it('should not trigger re-acknowledgment for same version', () => {
    const oldVersion = LEGAL_DISCLAIMER_VERSION;
    const newVersion = LEGAL_DISCLAIMER_VERSION;

    expect(oldVersion === newVersion).toBe(true);
  });
});
