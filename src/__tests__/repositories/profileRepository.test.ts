/**
 * Profile Repository Tests
 * Tests for user profile data access
 */

import { profileRepository } from '@/repositories/profileRepository';

// Mock the database module
const mockGetFirstAsync = jest.fn();
const mockRunAsync = jest.fn();

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => ({
    getFirstAsync: mockGetFirstAsync,
    runAsync: mockRunAsync,
  })),
}));

describe('profileRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProfileRow = {
    id: 'default-profile',
    sex: 'male',
    date_of_birth: '1990-05-15',
    height_cm: 180,
    activity_level: 'moderately_active',
    has_completed_onboarding: 1,
    onboarding_skipped: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-10T00:00:00.000Z',
  };

  describe('get', () => {
    it('returns profile when exists', async () => {
      mockGetFirstAsync.mockResolvedValue(mockProfileRow);

      const result = await profileRepository.get();

      expect(result).not.toBeNull();
      expect(result!.sex).toBe('male');
      expect(result!.heightCm).toBe(180);
      expect(result!.activityLevel).toBe('moderately_active');
      expect(result!.hasCompletedOnboarding).toBe(true);
    });

    it('returns null when profile does not exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await profileRepository.get();

      expect(result).toBeNull();
    });

    it('parses date of birth correctly', async () => {
      mockGetFirstAsync.mockResolvedValue(mockProfileRow);

      const result = await profileRepository.get();

      expect(result!.dateOfBirth).toBeInstanceOf(Date);
      expect(result!.dateOfBirth!.getFullYear()).toBe(1990);
    });
  });

  describe('getOrCreate', () => {
    it('returns existing profile when exists', async () => {
      mockGetFirstAsync.mockResolvedValue(mockProfileRow);

      const result = await profileRepository.getOrCreate();

      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('creates profile when does not exist', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // get() returns null
        .mockResolvedValueOnce(mockProfileRow); // get() after create
      mockRunAsync.mockResolvedValue(undefined);

      const result = await profileRepository.getOrCreate();

      expect(result).not.toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profile'),
        expect.any(Array)
      );
    });
  });

  describe('create', () => {
    it('creates profile with provided data', async () => {
      mockRunAsync.mockResolvedValue(undefined);
      mockGetFirstAsync.mockResolvedValue(mockProfileRow);

      const result = await profileRepository.create({
        sex: 'male',
        dateOfBirth: '1990-05-15',
        heightCm: 180,
        activityLevel: 'moderately_active',
      });

      expect(result).not.toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profile'),
        expect.arrayContaining(['default-profile', 'male', '1990-05-15', 180, 'moderately_active'])
      );
    });

    it('creates profile with defaults', async () => {
      mockRunAsync.mockResolvedValue(undefined);
      mockGetFirstAsync.mockResolvedValue({
        ...mockProfileRow,
        sex: null,
        date_of_birth: null,
        height_cm: null,
        activity_level: null,
      });

      const result = await profileRepository.create({});

      expect(result).not.toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profile'),
        expect.arrayContaining(['default-profile', null, null, null, null])
      );
    });

    it('throws error when creation fails', async () => {
      mockRunAsync.mockResolvedValue(undefined);
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(profileRepository.create({})).rejects.toThrow('Failed to create user profile');
    });
  });

  describe('update', () => {
    it('updates profile fields', async () => {
      mockGetFirstAsync.mockResolvedValue(mockProfileRow);
      mockRunAsync.mockResolvedValue(undefined);

      const result = await profileRepository.update({
        heightCm: 185,
        activityLevel: 'very_active',
      });

      expect(result).not.toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_profile SET'),
        expect.arrayContaining([185, 'very_active', 'default-profile'])
      );
    });

    it('updates onboarding status', async () => {
      mockGetFirstAsync.mockResolvedValue(mockProfileRow);
      mockRunAsync.mockResolvedValue(undefined);

      await profileRepository.update({
        hasCompletedOnboarding: true,
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('has_completed_onboarding'),
        expect.arrayContaining([1, 'default-profile'])
      );
    });

    it('creates profile if not exists before updating', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // get() returns null for getOrCreate
        .mockResolvedValueOnce(mockProfileRow) // after create
        .mockResolvedValueOnce(mockProfileRow); // final get
      mockRunAsync.mockResolvedValue(undefined);

      await profileRepository.update({ heightCm: 175 });

      // First call creates, second call updates
      expect(mockRunAsync).toHaveBeenCalledTimes(2);
    });

    it('throws error when update fails', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockProfileRow) // getOrCreate
        .mockResolvedValueOnce(null); // get after update
      mockRunAsync.mockResolvedValue(undefined);

      await expect(profileRepository.update({ heightCm: 175 })).rejects.toThrow(
        'User profile not found'
      );
    });
  });

  describe('completeOnboarding', () => {
    it('marks onboarding as completed', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockProfileRow,
        has_completed_onboarding: 1,
      });
      mockRunAsync.mockResolvedValue(undefined);

      const result = await profileRepository.completeOnboarding();

      expect(result.hasCompletedOnboarding).toBe(true);
    });
  });

  describe('skipOnboarding', () => {
    it('marks onboarding as skipped', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockProfileRow,
        onboarding_skipped: 1,
      });
      mockRunAsync.mockResolvedValue(undefined);

      const result = await profileRepository.skipOnboarding();

      expect(result.onboardingSkipped).toBe(true);
    });
  });

  describe('hasCompletedOnboarding', () => {
    it('returns true when onboarding is completed', async () => {
      mockGetFirstAsync.mockResolvedValue(mockProfileRow);

      const result = await profileRepository.hasCompletedOnboarding();

      expect(result).toBe(true);
    });

    it('returns false when onboarding is not completed', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockProfileRow,
        has_completed_onboarding: 0,
      });

      const result = await profileRepository.hasCompletedOnboarding();

      expect(result).toBe(false);
    });

    it('returns false when no profile exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await profileRepository.hasCompletedOnboarding();

      expect(result).toBe(false);
    });
  });

  describe('calculateAge', () => {
    it('calculates age correctly', async () => {
      // Mock current date to 2024-01-15
      const mockNow = new Date('2024-01-15');
      jest.useFakeTimers().setSystemTime(mockNow);

      mockGetFirstAsync.mockResolvedValue({
        ...mockProfileRow,
        date_of_birth: '1990-05-15',
      });

      const result = await profileRepository.calculateAge();

      expect(result).toBe(33); // Not yet had birthday in 2024
      jest.useRealTimers();
    });

    it('calculates age correctly after birthday', async () => {
      const mockNow = new Date('2024-06-15');
      jest.useFakeTimers().setSystemTime(mockNow);

      mockGetFirstAsync.mockResolvedValue({
        ...mockProfileRow,
        date_of_birth: '1990-05-15',
      });

      const result = await profileRepository.calculateAge();

      expect(result).toBe(34); // Had birthday in 2024
      jest.useRealTimers();
    });

    it('returns null when no date of birth', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockProfileRow,
        date_of_birth: null,
      });

      const result = await profileRepository.calculateAge();

      expect(result).toBeNull();
    });

    it('returns null when no profile', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await profileRepository.calculateAge();

      expect(result).toBeNull();
    });
  });

  describe('reset', () => {
    it('deletes the profile', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await profileRepository.reset();

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM user_profile WHERE id = ?',
        ['default-profile']
      );
    });
  });
});
