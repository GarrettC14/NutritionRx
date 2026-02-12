import { PURCHASES_ERROR_CODE } from 'react-native-purchases';

/**
 * Concrete mapping from RevenueCat error codes to user-facing messages.
 * Each error code has a deterministic UX response.
 */
const ERROR_MESSAGES: Record<string, string> = {
  [PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR]:
    'The App Store is temporarily unavailable. Please try again later.',
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR]:
    'Purchases are not allowed on this device.',
  [PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR]:
    'Something went wrong. Please try again.',
  [PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR]:
    "This plan isn't available in your region. Please try another plan.",
  [PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR]:
    "We couldn't verify your purchase. Please try again or contact support at support@cascadesoftware.com.",
  [PURCHASES_ERROR_CODE.NETWORK_ERROR]:
    'Connection issue. Check your network and try again.',
  [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR]:
    'You appear to be offline. Please check your connection.',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Returns a user-facing error message for a RevenueCat error code.
 * Silent codes (cancelled, already in progress, pending, already purchased)
 * are handled by the caller before reaching this function.
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}
