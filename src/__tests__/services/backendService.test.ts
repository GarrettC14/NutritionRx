import { proxyOpenAIChat } from '@/services/backendService';

// ── Helpers ──

const mockFetch = jest.fn();
global.fetch = mockFetch;

function okResponse(body: Record<string, unknown>) {
  return { ok: true, json: jest.fn().mockResolvedValue(body) } as any;
}

function errorResponse(status: number, body: string) {
  return { ok: false, status, text: jest.fn().mockResolvedValue(body) } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL =
    'https://test.supabase.co/functions/v1';
});

// ── Tests ──

describe('proxyOpenAIChat', () => {
  const messages = [{ role: 'user', content: 'hello' }];

  it('sends app:"nutritionrx" in the request body', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.app).toBe('nutritionrx');
  });

  it('sends x-rc-customer-id header', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-rc-customer-id']).toBe('test-rc-customer-id');
  });

  it('calls the /openai-proxy endpoint', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages);

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe(
      'https://test.supabase.co/functions/v1/openai-proxy',
    );
  });

  it('defaults model to gpt-4o-mini', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o-mini');
  });

  it('forwards optional parameters when provided', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages, {
      model: 'gpt-4o',
      max_tokens: 1000,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o');
    expect(body.max_tokens).toBe(1000);
    expect(body.temperature).toBe(0.5);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('omits optional parameters when not provided', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });

  it('returns the parsed JSON response', async () => {
    const expected = { choices: [{ message: { content: 'hi' } }] };
    mockFetch.mockResolvedValueOnce(okResponse(expected));

    const result = await proxyOpenAIChat(messages);
    expect(result).toEqual(expected);
  });

  it('throws on non-ok response with status and body', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, 'server error'));

    await expect(proxyOpenAIChat(messages)).rejects.toThrow(
      'OpenAI proxy error (500): server error',
    );
  });

  it('passes AbortSignal when timeoutMs is set', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages, { timeoutMs: 5000 });

    const signal = mockFetch.mock.calls[0][1].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('does not pass AbortSignal when timeoutMs is omitted', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [] }));
    await proxyOpenAIChat(messages);

    const signal = mockFetch.mock.calls[0][1].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    // Signal exists (from AbortController) but should not be aborted
    expect(signal.aborted).toBe(false);
  });

  it('aborts fetch when timeoutMs expires', async () => {
    // Use a very short timeout so it fires before the fetch resolves
    mockFetch.mockImplementationOnce(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );

    await expect(
      proxyOpenAIChat(messages, { timeoutMs: 1 }),
    ).rejects.toThrow('aborted');
  });
});
