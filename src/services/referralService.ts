import Purchases from 'react-native-purchases';

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL ?? '';

// ── Types ──

export interface ReferralCodeResponse {
  code: string;
  shareUrl: string;
}

export interface ApplyCodeResponse {
  applied: boolean;
  message: string;
}

export interface ReferralStatusResponse {
  referrer: {
    hasCode: boolean;
    code: string | null;
    shareUrl: string | null;
    isRedeemed: boolean;
    rewardGranted: boolean;
    rewardDetails: {
      productId: string;
      entitlement: string;
      duration: string;
    } | null;
  };
  referee: {
    hasAppliedCode: boolean;
    appliedCode: string | null;
  };
}

// ── Helpers ──

async function getCustomerId(): Promise<string> {
  return Purchases.getAppUserID();
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
): Promise<T> {
  const customerId = await getCustomerId();

  if (__DEV__) {
    console.log('[Referral] Customer ID:', customerId);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-rc-customer-id': customerId,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ?? data.message ?? 'Something went wrong. Please try again.',
    );
  }

  return data as T;
}

// ── Service ──

export const referralService = {
  async generateReferralCode(): Promise<ReferralCodeResponse> {
    return apiFetch<ReferralCodeResponse>('/generate-referral-code', {
      method: 'POST',
      body: { app: 'nutritionrx' },
    });
  },

  async applyReferralCode(code: string): Promise<ApplyCodeResponse> {
    return apiFetch<ApplyCodeResponse>('/apply-referral-code', {
      method: 'POST',
      body: { code },
    });
  },

  async getReferralStatus(): Promise<ReferralStatusResponse> {
    return apiFetch<ReferralStatusResponse>('/referral-status');
  },
};
