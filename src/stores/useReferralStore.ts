import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import { referralService } from '@/services/referralService';
import { trackPaywallEvent } from '@/utils/paywallAnalytics';

interface RewardDetails {
  productId: string;
  entitlement: string;
  duration: string;
}

interface ReferralState {
  // Referrer state
  referralCode: string | null;
  shareUrl: string | null;
  isRedeemed: boolean;
  rewardGranted: boolean;
  rewardDetails: RewardDetails | null;

  // Referee state
  appliedCode: string | null;

  // Ephemeral (NOT persisted)
  pendingReferralCode: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchReferralStatus: () => Promise<void>;
  generateCode: () => Promise<void>;
  applyCode: (code: string) => Promise<boolean>;
  shareReferralLink: () => Promise<void>;
  setPendingReferralCode: (code: string) => void;
  clearPendingReferralCode: () => void;
  clearError: () => void;
}

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      referralCode: null,
      shareUrl: null,
      isRedeemed: false,
      rewardGranted: false,
      rewardDetails: null,
      appliedCode: null,
      pendingReferralCode: null,
      isLoading: false,
      error: null,

      fetchReferralStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const status = await referralService.getReferralStatus();
          set({
            referralCode: status.referrer.code,
            shareUrl: status.referrer.shareUrl,
            isRedeemed: status.referrer.isRedeemed,
            rewardGranted: status.referrer.rewardGranted,
            rewardDetails: status.referrer.rewardDetails,
            appliedCode: status.referee.appliedCode,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message ?? 'Failed to load referral status.',
          });
        }
      },

      generateCode: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await referralService.generateReferralCode();
          set({
            referralCode: result.code,
            shareUrl: result.shareUrl,
            isLoading: false,
          });
          trackPaywallEvent('referral_code_generated', { code: result.code });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message ?? 'Failed to generate referral code.',
          });
        }
      },

      applyCode: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          await referralService.applyReferralCode(code);
          set({ appliedCode: code, isLoading: false });
          trackPaywallEvent('referral_code_applied', { code, success: true });
          return true;
        } catch (error: any) {
          const message = error.message ?? 'Invalid referral code.';
          set({ isLoading: false, error: message });
          trackPaywallEvent('referral_code_applied', {
            code,
            success: false,
            error: message,
          });
          return false;
        }
      },

      shareReferralLink: async () => {
        const { shareUrl, referralCode } = get();
        if (!shareUrl) return;

        try {
          await Share.share({
            message: `I've been using NutritionRx to track my nutrition \u{2014} give it a try with my referral link! We'll both get rewarded.\n\n${shareUrl}`,
          });
          trackPaywallEvent('referral_code_shared', {
            code: referralCode ?? '',
            method: 'share_sheet',
          });
        } catch {
          // User cancelled share sheet — no-op
        }
      },

      setPendingReferralCode: (code: string) => {
        set({ pendingReferralCode: code });
      },

      clearPendingReferralCode: () => {
        set({ pendingReferralCode: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'referral-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        referralCode: state.referralCode,
        shareUrl: state.shareUrl,
        isRedeemed: state.isRedeemed,
        rewardGranted: state.rewardGranted,
        rewardDetails: state.rewardDetails,
        appliedCode: state.appliedCode,
      }),
    },
  ),
);
