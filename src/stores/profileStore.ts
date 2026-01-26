import { create } from 'zustand';
import { profileRepository, UpdateProfileInput, ActivityLevel, Sex } from '@/repositories';
import { UserProfile } from '@/types/domain';

interface ProfileState {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  resetProfile: () => Promise<void>;

  // Computed
  hasCompletedOnboarding: () => boolean;
  getAge: () => number | null;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  isLoaded: false,
  error: null,

  loadProfile: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });
    try {
      const profile = await profileRepository.getOrCreate();
      set({ profile, isLoading: false, isLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load profile',
        isLoading: false,
      });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileRepository.update(updates);
      set({ profile, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update profile',
        isLoading: false,
      });
    }
  },

  completeOnboarding: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileRepository.completeOnboarding();
      set({ profile, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
        isLoading: false,
      });
    }
  },

  skipOnboarding: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileRepository.skipOnboarding();
      set({ profile, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to skip onboarding',
        isLoading: false,
      });
    }
  },

  resetProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      await profileRepository.reset();
      const profile = await profileRepository.getOrCreate();
      set({ profile, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reset profile',
        isLoading: false,
      });
    }
  },

  hasCompletedOnboarding: () => {
    const { profile } = get();
    return profile?.hasCompletedOnboarding ?? false;
  },

  getAge: () => {
    const { profile } = get();
    if (!profile?.dateOfBirth) return null;

    const today = new Date();
    const birthDate = profile.dateOfBirth;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  },
}));
