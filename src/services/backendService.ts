/**
 * Backend Service
 * Shared infrastructure for calling Supabase Edge Functions.
 * All requests include the RevenueCat customer ID for authentication.
 */

import Purchases from 'react-native-purchases';

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL ?? '';
}

/**
 * Get the RevenueCat anonymous customer ID for backend auth.
 */
export async function getCustomerId(): Promise<string> {
  return Purchases.getAppUserID();
}

/**
 * Proxy an OpenAI chat completion request through our Supabase backend.
 * The backend holds the OpenAI API key — the app never sees it.
 */
export async function proxyOpenAIChat(
  messages: Array<{ role: string; content: unknown }>,
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    response_format?: { type: string };
    timeoutMs?: number;
  },
): Promise<any> {
  const customerId = await getCustomerId();

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  if (options?.timeoutMs) {
    timer = setTimeout(() => controller.abort(), options.timeoutMs);
  }

  try {
    const res = await fetch(`${getBaseUrl()}/openai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rc-customer-id': customerId,
      },
      body: JSON.stringify({
        app: 'nutritionrx',
        model: options?.model ?? 'gpt-4o-mini',
        messages,
        ...(options?.max_tokens != null && { max_tokens: options.max_tokens }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.response_format && { response_format: options.response_format }),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (__DEV__) {
        const errorBody = await res.text().catch(() => 'Unknown error');
        throw new Error(`OpenAI proxy error (${res.status}): ${errorBody}`);
      }
      throw new Error(`Request failed (${res.status}). Please try again.`);
    }

    return res.json();
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
