// Set env BEFORE importing the module so BASE_URL is captured correctly.
process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL =
  'https://test.supabase.co/functions/v1';

import { referralService } from '@/services/referralService';

// ── Mocks ──

jest.mock('@/services/backendService', () => ({
  getCustomerId: jest.fn().mockResolvedValue('test-customer-id'),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helpers ──

function okResponse(body: Record<string, unknown>) {
  return { ok: true, json: jest.fn().mockResolvedValue(body) } as any;
}

function errorResponse(status: number, body: Record<string, unknown>) {
  return { ok: false, status, json: jest.fn().mockResolvedValue(body) } as any;
}

// ── Setup ──

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ──

describe('referralService', () => {
  // ────────────────────────────────────────────────────────────
  // generateReferralCode
  // ────────────────────────────────────────────────────────────
  describe('generateReferralCode', () => {
    it('calls POST /generate-referral-code with body {app: "nutritionrx"}', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ code: 'ABC123', shareUrl: 'https://share.link/ABC123' }),
      );

      await referralService.generateReferralCode();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://test.supabase.co/functions/v1/generate-referral-code',
      );
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ app: 'nutritionrx' });
    });

    it('sends x-rc-customer-id header', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ code: 'ABC123', shareUrl: 'https://share.link/ABC123' }),
      );

      await referralService.generateReferralCode();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['x-rc-customer-id']).toBe('test-customer-id');
    });

    it('returns code and shareUrl on success', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ code: 'REF-XYZ', shareUrl: 'https://share.link/REF-XYZ' }),
      );

      const result = await referralService.generateReferralCode();

      expect(result).toEqual({
        code: 'REF-XYZ',
        shareUrl: 'https://share.link/REF-XYZ',
      });
    });

    it('throws on non-ok response with error message', async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(400, { error: 'Code already exists' }),
      );

      await expect(referralService.generateReferralCode()).rejects.toThrow(
        'Code already exists',
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // applyReferralCode
  // ────────────────────────────────────────────────────────────
  describe('applyReferralCode', () => {
    it('calls POST /apply-referral-code with code in body', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ applied: true, message: 'Code applied successfully' }),
      );

      await referralService.applyReferralCode('FRIEND-CODE');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://test.supabase.co/functions/v1/apply-referral-code',
      );
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ code: 'FRIEND-CODE' });
    });

    it('returns applied status and message', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ applied: true, message: 'Referral applied!' }),
      );

      const result = await referralService.applyReferralCode('FRIEND-CODE');

      expect(result).toEqual({
        applied: true,
        message: 'Referral applied!',
      });
    });

    it('throws with server error message', async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(422, { error: 'Invalid referral code' }),
      );

      await expect(
        referralService.applyReferralCode('BAD-CODE'),
      ).rejects.toThrow('Invalid referral code');
    });
  });

  // ────────────────────────────────────────────────────────────
  // getReferralStatus
  // ────────────────────────────────────────────────────────────
  describe('getReferralStatus', () => {
    it('calls GET /referral-status', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          referrer: {
            hasCode: true,
            code: 'MY-CODE',
            shareUrl: 'https://share.link/MY-CODE',
            isRedeemed: false,
            rewardGranted: false,
            rewardDetails: null,
          },
          referee: { hasAppliedCode: false, appliedCode: null },
        }),
      );

      await referralService.getReferralStatus();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://test.supabase.co/functions/v1/referral-status',
      );
      expect(options.method).toBe('GET');
    });

    it('returns full status response', async () => {
      const statusPayload = {
        referrer: {
          hasCode: true,
          code: 'MY-CODE',
          shareUrl: 'https://share.link/MY-CODE',
          isRedeemed: true,
          rewardGranted: true,
          rewardDetails: {
            productId: 'premium_monthly',
            entitlement: 'premium',
            duration: 'P1M',
          },
        },
        referee: {
          hasAppliedCode: true,
          appliedCode: 'FRIEND-CODE',
        },
      };

      mockFetch.mockResolvedValueOnce(okResponse(statusPayload));

      const result = await referralService.getReferralStatus();

      expect(result).toEqual(statusPayload);
    });

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      await expect(referralService.getReferralStatus()).rejects.toThrow(
        'Network request failed',
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // Shared header behavior
  // ────────────────────────────────────────────────────────────
  describe('common headers', () => {
    it('all methods set Content-Type: application/json header', async () => {
      mockFetch.mockResolvedValue(
        okResponse({
          code: 'X',
          shareUrl: 'https://x',
          applied: true,
          message: 'ok',
          referrer: {
            hasCode: false,
            code: null,
            shareUrl: null,
            isRedeemed: false,
            rewardGranted: false,
            rewardDetails: null,
          },
          referee: { hasAppliedCode: false, appliedCode: null },
        }),
      );

      await referralService.generateReferralCode();
      await referralService.applyReferralCode('CODE');
      await referralService.getReferralStatus();

      expect(mockFetch).toHaveBeenCalledTimes(3);
      for (const call of mockFetch.mock.calls) {
        expect(call[1].headers['Content-Type']).toBe('application/json');
      }
    });
  });
});
