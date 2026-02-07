/**
 * Unsupported Provider
 * Terminal fallback when the device cannot run any LLM.
 * generate() always throws — UI must check getStatus() first.
 */

import type { LLMProvider, LLMProviderStatus } from '../types';

export class UnsupportedProvider implements LLMProvider {
  readonly name = 'unsupported';

  async isAvailable(): Promise<boolean> {
    return true; // Always "available" as the terminal fallback
  }

  getStatus(): LLMProviderStatus {
    return 'unsupported';
  }

  async initialize(): Promise<void> {
    // Nothing to initialize
  }

  async generate(): Promise<string> {
    throw new Error('LLM inference is not supported on this device');
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up
  }
}
