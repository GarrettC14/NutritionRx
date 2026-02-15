/**
 * Tests for src/services/llm/providers/unsupportedProvider.ts
 *
 * Validates the UnsupportedProvider terminal fallback that always reports
 * as available but throws when generate() is called.
 */

import { UnsupportedProvider } from '../../../services/llm/providers/unsupportedProvider';

describe('UnsupportedProvider', () => {
  let provider: UnsupportedProvider;

  beforeEach(() => {
    provider = new UnsupportedProvider();
  });

  it('name is "unsupported"', () => {
    expect(provider.name).toBe('unsupported');
  });

  it('isAvailable always returns true', async () => {
    const result = await provider.isAvailable();
    expect(result).toBe(true);
  });

  it('getStatus always returns "unsupported"', () => {
    expect(provider.getStatus()).toBe('unsupported');
  });

  it('initialize resolves without error', async () => {
    await expect(provider.initialize()).resolves.toBeUndefined();
  });

  it('generate always throws with specific error message', async () => {
    await expect(provider.generate('system', 'user')).rejects.toThrow(
      'LLM inference is not supported on this device',
    );
  });

  it('cleanup resolves without error', async () => {
    await expect(provider.cleanup()).resolves.toBeUndefined();
  });
});
