/**
 * Profile Store Tests
 * Tests for user profile state management
 */

// Mock repositories
jest.mock('@/repositories', () => ({
  profileRepository: {
    getOrCreate: jest.fn(),
    update: jest.fn(),
    completeOnboarding: jest.fn(),
    skipOnboarding: jest.fn(),
    reset: jest.fn(),
  },
}));

import { useProfileStore } from '@/stores/profileStore';
import { profileRepository } from '@/repositories';
import { UserProfile } from '@/types/domain';

const mockProfileRepo = profileRepository as jest.Mocked<typeof profileRepository>;

const mockProfile: UserProfile = {
  id: 'default-profile',
  sex: 'male',
  dateOfBirth: new Date('1990-06-15'),
  heightCm: 180,
  activityLevel: 'moderately_active',
  eatingStyle: 'flexible',
  proteinPriority: 'active',
  hasCompletedOnboarding: true,
  onboardingSkipped: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

const mockFreshProfile: UserProfile = {
  id: 'default-profile',
  sex: undefined,
  dateOfBirth: undefined,
  heightCm: undefined,
  activityLevel: undefined,
  eatingStyle: 'flexible',
  proteinPriority: 'active',
  hasCompletedOnboarding: false,
  onboardingSkipped: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('useProfileStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProfileStore.setState({
      profile: null,
      isLoading: false,
      isLoaded: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has null profile', () => {
      expect(useProfileStore.getState().profile).toBeNull();
    });

    it('has isLoading false and isLoaded false', () => {
      const state = useProfileStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(false);
    });

    it('has null error', () => {
      expect(useProfileStore.getState().error).toBeNull();
    });
  });

  describe('loadProfile', () => {
    it('calls profileRepository.getOrCreate and updates state', async () => {
      mockProfileRepo.getOrCreate.mockResolvedValue(mockProfile);

      await useProfileStore.getState().loadProfile();

      const state = useProfileStore.getState();
      expect(mockProfileRepo.getOrCreate).toHaveBeenCalledTimes(1);
      expect(state.profile).toEqual(mockProfile);
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('short-circuits when isLoaded is true', async () => {
      useProfileStore.setState({ isLoaded: true });

      await useProfileStore.getState().loadProfile();

      expect(mockProfileRepo.getOrCreate).not.toHaveBeenCalled();
    });

    it('sets isLoading during the call', async () => {
      let loadingDuringCall = false;
      mockProfileRepo.getOrCreate.mockImplementation(async () => {
        loadingDuringCall = useProfileStore.getState().isLoading;
        return mockProfile;
      });

      await useProfileStore.getState().loadProfile();

      expect(loadingDuringCall).toBe(true);
    });

    it('marks isLoaded true even on error to prevent infinite spinner', async () => {
      mockProfileRepo.getOrCreate.mockRejectedValue(new Error('DB error'));

      await useProfileStore.getState().loadProfile();

      const state = useProfileStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('sets generic error message for non-Error throws', async () => {
      mockProfileRepo.getOrCreate.mockRejectedValue('something went wrong');

      await useProfileStore.getState().loadProfile();

      expect(useProfileStore.getState().error).toBe('Failed to load profile');
    });
  });

  describe('updateProfile', () => {
    it('calls profileRepository.update and updates state', async () => {
      const updatedProfile = { ...mockProfile, heightCm: 185 };
      mockProfileRepo.update.mockResolvedValue(updatedProfile);

      await useProfileStore.getState().updateProfile({ heightCm: 185 });

      expect(mockProfileRepo.update).toHaveBeenCalledWith({ heightCm: 185 });
      expect(useProfileStore.getState().profile?.heightCm).toBe(185);
      expect(useProfileStore.getState().isLoading).toBe(false);
    });

    it('clears previous error on new update', async () => {
      useProfileStore.setState({ error: 'old error' });
      mockProfileRepo.update.mockResolvedValue(mockProfile);

      await useProfileStore.getState().updateProfile({ sex: 'male' });

      expect(useProfileStore.getState().error).toBeNull();
    });

    it('sets error on failure', async () => {
      mockProfileRepo.update.mockRejectedValue(new Error('Update failed'));

      await useProfileStore.getState().updateProfile({ heightCm: 185 });

      const state = useProfileStore.getState();
      expect(state.error).toBe('Update failed');
      expect(state.isLoading).toBe(false);
    });

    it('sets generic error for non-Error failures', async () => {
      mockProfileRepo.update.mockRejectedValue(undefined);

      await useProfileStore.getState().updateProfile({ heightCm: 185 });

      expect(useProfileStore.getState().error).toBe('Failed to update profile');
    });
  });

  describe('completeOnboarding', () => {
    it('calls profileRepository.completeOnboarding and updates state', async () => {
      const onboardedProfile = { ...mockProfile, hasCompletedOnboarding: true };
      mockProfileRepo.completeOnboarding.mockResolvedValue(onboardedProfile);

      await useProfileStore.getState().completeOnboarding();

      expect(mockProfileRepo.completeOnboarding).toHaveBeenCalledTimes(1);
      expect(useProfileStore.getState().profile?.hasCompletedOnboarding).toBe(true);
      expect(useProfileStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockProfileRepo.completeOnboarding.mockRejectedValue(new Error('Onboarding error'));

      await useProfileStore.getState().completeOnboarding();

      expect(useProfileStore.getState().error).toBe('Onboarding error');
    });

    it('sets generic error for non-Error failures', async () => {
      mockProfileRepo.completeOnboarding.mockRejectedValue(null);

      await useProfileStore.getState().completeOnboarding();

      expect(useProfileStore.getState().error).toBe('Failed to complete onboarding');
    });
  });

  describe('skipOnboarding', () => {
    it('calls profileRepository.skipOnboarding and updates state', async () => {
      const skippedProfile = { ...mockFreshProfile, onboardingSkipped: true };
      mockProfileRepo.skipOnboarding.mockResolvedValue(skippedProfile);

      await useProfileStore.getState().skipOnboarding();

      expect(mockProfileRepo.skipOnboarding).toHaveBeenCalledTimes(1);
      expect(useProfileStore.getState().profile?.onboardingSkipped).toBe(true);
      expect(useProfileStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockProfileRepo.skipOnboarding.mockRejectedValue(new Error('Skip failed'));

      await useProfileStore.getState().skipOnboarding();

      expect(useProfileStore.getState().error).toBe('Skip failed');
    });
  });

  describe('resetProfile', () => {
    it('calls reset then getOrCreate and updates state', async () => {
      mockProfileRepo.reset.mockResolvedValue(undefined);
      mockProfileRepo.getOrCreate.mockResolvedValue(mockFreshProfile);
      useProfileStore.setState({ profile: mockProfile });

      await useProfileStore.getState().resetProfile();

      expect(mockProfileRepo.reset).toHaveBeenCalledTimes(1);
      expect(mockProfileRepo.getOrCreate).toHaveBeenCalledTimes(1);
      expect(useProfileStore.getState().profile).toEqual(mockFreshProfile);
      expect(useProfileStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockProfileRepo.reset.mockRejectedValue(new Error('Reset exploded'));

      await useProfileStore.getState().resetProfile();

      expect(useProfileStore.getState().error).toBe('Reset exploded');
      expect(useProfileStore.getState().isLoading).toBe(false);
    });

    it('sets generic error for non-Error failures', async () => {
      mockProfileRepo.reset.mockRejectedValue(123);

      await useProfileStore.getState().resetProfile();

      expect(useProfileStore.getState().error).toBe('Failed to reset profile');
    });
  });

  describe('hasCompletedOnboarding', () => {
    it('returns true when profile has completed onboarding', () => {
      useProfileStore.setState({ profile: mockProfile });

      expect(useProfileStore.getState().hasCompletedOnboarding()).toBe(true);
    });

    it('returns false when profile has not completed onboarding', () => {
      useProfileStore.setState({ profile: mockFreshProfile });

      expect(useProfileStore.getState().hasCompletedOnboarding()).toBe(false);
    });

    it('returns false when profile is null', () => {
      useProfileStore.setState({ profile: null });

      expect(useProfileStore.getState().hasCompletedOnboarding()).toBe(false);
    });
  });

  describe('getAge', () => {
    it('calculates age correctly for a past birthday this year', () => {
      const today = new Date();
      // Birthday already passed this year: set to January 1 many years ago
      const birthDate = new Date(today.getFullYear() - 30, 0, 1);
      useProfileStore.setState({
        profile: { ...mockProfile, dateOfBirth: birthDate },
      });

      const age = useProfileStore.getState().getAge();

      expect(age).toBe(30);
    });

    it('calculates age correctly when birthday has not occurred yet this year', () => {
      const today = new Date();
      // Birthday is December 31 of birth year -- hasn't happened yet if today is not Dec 31
      // Use a future month relative to today
      const futureMonth = today.getMonth() + 2 > 11 ? today.getMonth() : today.getMonth() + 2;
      const birthDate = new Date(today.getFullYear() - 25, futureMonth, 15);
      useProfileStore.setState({
        profile: { ...mockProfile, dateOfBirth: birthDate },
      });

      const age = useProfileStore.getState().getAge();

      // If the birthday month is still ahead, age should be 24 (one less)
      expect(age).toBe(24);
    });

    it('returns null when dateOfBirth is undefined', () => {
      useProfileStore.setState({
        profile: { ...mockProfile, dateOfBirth: undefined },
      });

      expect(useProfileStore.getState().getAge()).toBeNull();
    });

    it('returns null when profile is null', () => {
      useProfileStore.setState({ profile: null });

      expect(useProfileStore.getState().getAge()).toBeNull();
    });

    it('handles same-day birthday correctly', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
      useProfileStore.setState({
        profile: { ...mockProfile, dateOfBirth: birthDate },
      });

      expect(useProfileStore.getState().getAge()).toBe(20);
    });
  });
});
