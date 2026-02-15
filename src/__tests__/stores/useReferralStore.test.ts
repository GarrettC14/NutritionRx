/**
 * Referral Store Tests
 * Tests for referral code generation, application, sharing, and persistence.
 */

// Mock AsyncStorage before imports
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/services/referralService', () => ({
  referralService: {
    getReferralStatus: jest.fn(),
    generateReferralCode: jest.fn(),
    applyReferralCode: jest.fn(),
  },
}));

jest.mock('@/utils/paywallAnalytics', () => ({
  trackPaywallEvent: jest.fn(),
}));

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
}));

import { useReferralStore } from '@/stores/useReferralStore';
import { referralService } from '@/services/referralService';
import { trackPaywallEvent } from '@/utils/paywallAnalytics';
import { Share } from 'react-native';

const mockReferralService = referralService as jest.Mocked<typeof referralService>;
const mockTrackPaywallEvent = trackPaywallEvent as jest.MockedFunction<typeof trackPaywallEvent>;
const mockShare = Share.share as jest.MockedFunction<typeof Share.share>;

describe('useReferralStore', () => {
  const initialState = {
    referralCode: null,
    shareUrl: null,
    isRedeemed: false,
    rewardGranted: false,
    rewardDetails: null,
    appliedCode: null,
    pendingReferralCode: null,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useReferralStore.setState(initialState);
  });

  // ============================================================
  // Initial state
  // ============================================================

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useReferralStore.getState();

      expect(state.referralCode).toBeNull();
      expect(state.shareUrl).toBeNull();
      expect(state.isRedeemed).toBe(false);
      expect(state.rewardGranted).toBe(false);
      expect(state.rewardDetails).toBeNull();
      expect(state.appliedCode).toBeNull();
      expect(state.pendingReferralCode).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ============================================================
  // fetchReferralStatus
  // ============================================================

  describe('fetchReferralStatus', () => {
    const mockStatus = {
      referrer: {
        code: 'ABC123',
        shareUrl: 'https://nutritionrx.app/r/ABC123',
        isRedeemed: true,
        rewardGranted: true,
        rewardDetails: {
          productId: 'premium_monthly',
          entitlement: 'premium',
          duration: '1 month',
        },
      },
      referee: {
        appliedCode: 'XYZ789',
      },
    };

    it('sets all referrer and referee fields on success', async () => {
      mockReferralService.getReferralStatus.mockResolvedValue(mockStatus);

      await useReferralStore.getState().fetchReferralStatus();

      const state = useReferralStore.getState();
      expect(state.referralCode).toBe('ABC123');
      expect(state.shareUrl).toBe('https://nutritionrx.app/r/ABC123');
      expect(state.isRedeemed).toBe(true);
      expect(state.rewardGranted).toBe(true);
      expect(state.rewardDetails).toEqual({
        productId: 'premium_monthly',
        entitlement: 'premium',
        duration: '1 month',
      });
      expect(state.appliedCode).toBe('XYZ789');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets isLoading true at start and false on success', async () => {
      let loadingDuringFetch = false;
      mockReferralService.getReferralStatus.mockImplementation(async () => {
        loadingDuringFetch = useReferralStore.getState().isLoading;
        return mockStatus;
      });

      await useReferralStore.getState().fetchReferralStatus();

      expect(loadingDuringFetch).toBe(true);
      expect(useReferralStore.getState().isLoading).toBe(false);
    });

    it('clears previous error at start', async () => {
      useReferralStore.setState({ error: 'Previous error' });
      mockReferralService.getReferralStatus.mockResolvedValue(mockStatus);

      let errorDuringFetch: string | null = 'not-checked';
      mockReferralService.getReferralStatus.mockImplementation(async () => {
        errorDuringFetch = useReferralStore.getState().error;
        return mockStatus;
      });

      await useReferralStore.getState().fetchReferralStatus();

      expect(errorDuringFetch).toBeNull();
    });

    it('sets error message on failure', async () => {
      mockReferralService.getReferralStatus.mockRejectedValue(
        new Error('Network timeout')
      );

      await useReferralStore.getState().fetchReferralStatus();

      const state = useReferralStore.getState();
      expect(state.error).toBe('Network timeout');
      expect(state.isLoading).toBe(false);
    });

    it('uses fallback message when error.message is undefined', async () => {
      mockReferralService.getReferralStatus.mockRejectedValue({});

      await useReferralStore.getState().fetchReferralStatus();

      expect(useReferralStore.getState().error).toBe(
        'Failed to load referral status.'
      );
    });

    it('sets isLoading false on failure', async () => {
      mockReferralService.getReferralStatus.mockRejectedValue(
        new Error('fail')
      );

      await useReferralStore.getState().fetchReferralStatus();

      expect(useReferralStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================
  // generateCode
  // ============================================================

  describe('generateCode', () => {
    const mockResult = {
      code: 'NEW456',
      shareUrl: 'https://nutritionrx.app/r/NEW456',
    };

    it('sets referralCode and shareUrl on success', async () => {
      mockReferralService.generateReferralCode.mockResolvedValue(mockResult);

      await useReferralStore.getState().generateCode();

      const state = useReferralStore.getState();
      expect(state.referralCode).toBe('NEW456');
      expect(state.shareUrl).toBe('https://nutritionrx.app/r/NEW456');
      expect(state.isLoading).toBe(false);
    });

    it('calls trackPaywallEvent with generated code', async () => {
      mockReferralService.generateReferralCode.mockResolvedValue(mockResult);

      await useReferralStore.getState().generateCode();

      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'referral_code_generated',
        { code: 'NEW456' }
      );
    });

    it('sets isLoading true at start and false on success', async () => {
      let loadingDuringGenerate = false;
      mockReferralService.generateReferralCode.mockImplementation(async () => {
        loadingDuringGenerate = useReferralStore.getState().isLoading;
        return mockResult;
      });

      await useReferralStore.getState().generateCode();

      expect(loadingDuringGenerate).toBe(true);
      expect(useReferralStore.getState().isLoading).toBe(false);
    });

    it('clears previous error at start', async () => {
      useReferralStore.setState({ error: 'Old error' });

      let errorDuringGenerate: string | null = 'not-checked';
      mockReferralService.generateReferralCode.mockImplementation(async () => {
        errorDuringGenerate = useReferralStore.getState().error;
        return mockResult;
      });

      await useReferralStore.getState().generateCode();

      expect(errorDuringGenerate).toBeNull();
    });

    it('sets error message on failure', async () => {
      mockReferralService.generateReferralCode.mockRejectedValue(
        new Error('Server error')
      );

      await useReferralStore.getState().generateCode();

      const state = useReferralStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.isLoading).toBe(false);
    });

    it('uses fallback message when error.message is undefined', async () => {
      mockReferralService.generateReferralCode.mockRejectedValue({});

      await useReferralStore.getState().generateCode();

      expect(useReferralStore.getState().error).toBe(
        'Failed to generate referral code.'
      );
    });

    it('does not call trackPaywallEvent on failure', async () => {
      mockReferralService.generateReferralCode.mockRejectedValue(
        new Error('fail')
      );

      await useReferralStore.getState().generateCode();

      expect(mockTrackPaywallEvent).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // applyCode
  // ============================================================

  describe('applyCode', () => {
    it('returns true and sets appliedCode on success', async () => {
      mockReferralService.applyReferralCode.mockResolvedValue(undefined);

      const result = await useReferralStore.getState().applyCode('FRIEND99');

      expect(result).toBe(true);
      expect(useReferralStore.getState().appliedCode).toBe('FRIEND99');
      expect(useReferralStore.getState().isLoading).toBe(false);
    });

    it('tracks success event on successful apply', async () => {
      mockReferralService.applyReferralCode.mockResolvedValue(undefined);

      await useReferralStore.getState().applyCode('FRIEND99');

      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'referral_code_applied',
        { code: 'FRIEND99', success: true }
      );
    });

    it('returns false and sets error on failure', async () => {
      mockReferralService.applyReferralCode.mockRejectedValue(
        new Error('Code already used')
      );

      const result = await useReferralStore.getState().applyCode('BADCODE');

      expect(result).toBe(false);
      expect(useReferralStore.getState().error).toBe('Code already used');
      expect(useReferralStore.getState().isLoading).toBe(false);
    });

    it('uses fallback message when error.message is undefined', async () => {
      mockReferralService.applyReferralCode.mockRejectedValue({});

      const result = await useReferralStore.getState().applyCode('BADCODE');

      expect(result).toBe(false);
      expect(useReferralStore.getState().error).toBe('Invalid referral code.');
    });

    it('tracks failure event with error details', async () => {
      mockReferralService.applyReferralCode.mockRejectedValue(
        new Error('Code already used')
      );

      await useReferralStore.getState().applyCode('BADCODE');

      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'referral_code_applied',
        { code: 'BADCODE', success: false, error: 'Code already used' }
      );
    });

    it('tracks failure event with fallback error message', async () => {
      mockReferralService.applyReferralCode.mockRejectedValue({});

      await useReferralStore.getState().applyCode('BADCODE');

      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'referral_code_applied',
        { code: 'BADCODE', success: false, error: 'Invalid referral code.' }
      );
    });

    it('sets isLoading true at start and false on success', async () => {
      let loadingDuringApply = false;
      mockReferralService.applyReferralCode.mockImplementation(async () => {
        loadingDuringApply = useReferralStore.getState().isLoading;
      });

      await useReferralStore.getState().applyCode('CODE');

      expect(loadingDuringApply).toBe(true);
      expect(useReferralStore.getState().isLoading).toBe(false);
    });

    it('sets isLoading false on failure', async () => {
      mockReferralService.applyReferralCode.mockRejectedValue(
        new Error('fail')
      );

      await useReferralStore.getState().applyCode('CODE');

      expect(useReferralStore.getState().isLoading).toBe(false);
    });

    it('clears previous error at start', async () => {
      useReferralStore.setState({ error: 'Previous error' });

      let errorDuringApply: string | null = 'not-checked';
      mockReferralService.applyReferralCode.mockImplementation(async () => {
        errorDuringApply = useReferralStore.getState().error;
      });

      await useReferralStore.getState().applyCode('CODE');

      expect(errorDuringApply).toBeNull();
    });

    it('calls referralService.applyReferralCode with the correct code', async () => {
      mockReferralService.applyReferralCode.mockResolvedValue(undefined);

      await useReferralStore.getState().applyCode('MY_CODE');

      expect(mockReferralService.applyReferralCode).toHaveBeenCalledWith(
        'MY_CODE'
      );
    });
  });

  // ============================================================
  // shareReferralLink
  // ============================================================

  describe('shareReferralLink', () => {
    it('calls Share.share with correct message containing shareUrl', async () => {
      useReferralStore.setState({
        shareUrl: 'https://nutritionrx.app/r/ABC123',
        referralCode: 'ABC123',
      });
      mockShare.mockResolvedValue({ action: 'sharedAction' } as any);

      await useReferralStore.getState().shareReferralLink();

      expect(mockShare).toHaveBeenCalledWith({
        message: expect.stringContaining(
          'https://nutritionrx.app/r/ABC123'
        ),
      });
    });

    it('includes the NutritionRx branding in share message', async () => {
      useReferralStore.setState({
        shareUrl: 'https://nutritionrx.app/r/ABC123',
        referralCode: 'ABC123',
      });
      mockShare.mockResolvedValue({ action: 'sharedAction' } as any);

      await useReferralStore.getState().shareReferralLink();

      const shareCall = mockShare.mock.calls[0][0];
      expect(shareCall.message).toContain('NutritionRx');
    });

    it('tracks referral_code_shared event after sharing', async () => {
      useReferralStore.setState({
        shareUrl: 'https://nutritionrx.app/r/ABC123',
        referralCode: 'ABC123',
      });
      mockShare.mockResolvedValue({ action: 'sharedAction' } as any);

      await useReferralStore.getState().shareReferralLink();

      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'referral_code_shared',
        { code: 'ABC123', method: 'share_sheet' }
      );
    });

    it('uses empty string for code in tracking when referralCode is null', async () => {
      useReferralStore.setState({
        shareUrl: 'https://nutritionrx.app/r/ABC123',
        referralCode: null,
      });
      mockShare.mockResolvedValue({ action: 'sharedAction' } as any);

      await useReferralStore.getState().shareReferralLink();

      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'referral_code_shared',
        { code: '', method: 'share_sheet' }
      );
    });

    it('does nothing when shareUrl is null', async () => {
      useReferralStore.setState({ shareUrl: null });

      await useReferralStore.getState().shareReferralLink();

      expect(mockShare).not.toHaveBeenCalled();
      expect(mockTrackPaywallEvent).not.toHaveBeenCalled();
    });

    it('handles Share cancellation silently', async () => {
      useReferralStore.setState({
        shareUrl: 'https://nutritionrx.app/r/ABC123',
        referralCode: 'ABC123',
      });
      mockShare.mockRejectedValue(new Error('User cancelled'));

      // Should not throw
      await expect(
        useReferralStore.getState().shareReferralLink()
      ).resolves.toBeUndefined();

      // Should not track when share fails/is cancelled
      expect(mockTrackPaywallEvent).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // setPendingReferralCode / clearPendingReferralCode
  // ============================================================

  describe('setPendingReferralCode', () => {
    it('sets the pending referral code', () => {
      useReferralStore.getState().setPendingReferralCode('PENDING123');

      expect(useReferralStore.getState().pendingReferralCode).toBe(
        'PENDING123'
      );
    });

    it('overwrites a previously set pending code', () => {
      useReferralStore.getState().setPendingReferralCode('FIRST');
      useReferralStore.getState().setPendingReferralCode('SECOND');

      expect(useReferralStore.getState().pendingReferralCode).toBe('SECOND');
    });
  });

  describe('clearPendingReferralCode', () => {
    it('clears the pending referral code', () => {
      useReferralStore.setState({ pendingReferralCode: 'PENDING123' });

      useReferralStore.getState().clearPendingReferralCode();

      expect(useReferralStore.getState().pendingReferralCode).toBeNull();
    });

    it('is a no-op when already null', () => {
      useReferralStore.getState().clearPendingReferralCode();

      expect(useReferralStore.getState().pendingReferralCode).toBeNull();
    });
  });

  // ============================================================
  // clearError
  // ============================================================

  describe('clearError', () => {
    it('clears the error state', () => {
      useReferralStore.setState({ error: 'Some error' });

      useReferralStore.getState().clearError();

      expect(useReferralStore.getState().error).toBeNull();
    });

    it('is a no-op when error is already null', () => {
      useReferralStore.getState().clearError();

      expect(useReferralStore.getState().error).toBeNull();
    });
  });

  // ============================================================
  // Persistence (partialize)
  // ============================================================

  describe('persistence', () => {
    it('partialize excludes ephemeral fields', () => {
      // Access the persist config via the store's persist API
      const persistOptions = (useReferralStore as any).persist;
      const { getOptions } = persistOptions;
      const options = getOptions();

      const fullState = {
        referralCode: 'CODE',
        shareUrl: 'https://example.com',
        isRedeemed: true,
        rewardGranted: true,
        rewardDetails: {
          productId: 'prod',
          entitlement: 'ent',
          duration: '1m',
        },
        appliedCode: 'APPLIED',
        pendingReferralCode: 'PENDING',
        isLoading: true,
        error: 'Some error',
      };

      const persisted = options.partialize(fullState);

      // Should include persistent fields
      expect(persisted.referralCode).toBe('CODE');
      expect(persisted.shareUrl).toBe('https://example.com');
      expect(persisted.isRedeemed).toBe(true);
      expect(persisted.rewardGranted).toBe(true);
      expect(persisted.rewardDetails).toEqual({
        productId: 'prod',
        entitlement: 'ent',
        duration: '1m',
      });
      expect(persisted.appliedCode).toBe('APPLIED');

      // Should exclude ephemeral fields
      expect(persisted).not.toHaveProperty('pendingReferralCode');
      expect(persisted).not.toHaveProperty('isLoading');
      expect(persisted).not.toHaveProperty('error');
    });
  });
});
