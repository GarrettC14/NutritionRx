/**
 * Tests for src/services/llm/providers/appleFoundationProvider.ts
 *
 * Validates the AppleFoundationProvider which uses Apple's on-device
 * Foundation Models via react-native-apple-llm.
 */

// Mutable Platform state so tests can change OS per test case
let platformState = { OS: 'ios' as string };

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return platformState.OS;
    },
  },
  StyleSheet: { create: jest.fn((s: any) => s) },
}));

const mockSession = {
  configure: jest.fn().mockResolvedValue(undefined),
  generateText: jest.fn().mockResolvedValue('Generated text'),
  dispose: jest.fn(),
};

const mockAppleLLM = {
  isFoundationModelsEnabled: jest.fn().mockResolvedValue('available'),
  AppleLLMSession: jest.fn().mockImplementation(() => mockSession),
};

jest.mock('react-native-apple-llm', () => mockAppleLLM);

import { AppleFoundationProvider } from '../../../services/llm/providers/appleFoundationProvider';

describe('AppleFoundationProvider', () => {
  let provider: AppleFoundationProvider;

  beforeEach(() => {
    provider = new AppleFoundationProvider();
    platformState.OS = 'ios';
    jest.clearAllMocks();

    // Reset mock implementations to defaults after clearAllMocks
    mockSession.configure.mockResolvedValue(undefined);
    mockSession.generateText.mockResolvedValue('Generated text');
    mockAppleLLM.isFoundationModelsEnabled.mockResolvedValue('available');
    mockAppleLLM.AppleLLMSession.mockImplementation(() => mockSession);
  });

  describe('name', () => {
    it('is "apple-foundation"', () => {
      expect(provider.name).toBe('apple-foundation');
    });
  });

  describe('isAvailable', () => {
    it('returns false when not iOS', async () => {
      platformState.OS = 'android';
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it('returns true when iOS and foundation models available', async () => {
      platformState.OS = 'ios';
      mockAppleLLM.isFoundationModelsEnabled.mockResolvedValue('available');
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when isFoundationModelsEnabled throws', async () => {
      platformState.OS = 'ios';
      mockAppleLLM.isFoundationModelsEnabled.mockRejectedValue(
        new Error('Not supported'),
      );
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('starts as "uninitialized"', () => {
      expect(provider.getStatus()).toBe('uninitialized');
    });
  });

  describe('initialize', () => {
    it('creates session and sets status to "ready"', async () => {
      await provider.initialize();
      expect(mockAppleLLM.AppleLLMSession).toHaveBeenCalledTimes(1);
      expect(provider.getStatus()).toBe('ready');
    });

    it('is idempotent (second call reuses session)', async () => {
      await provider.initialize();
      await provider.initialize();
      expect(mockAppleLLM.AppleLLMSession).toHaveBeenCalledTimes(1);
      expect(provider.getStatus()).toBe('ready');
    });
  });

  describe('generate', () => {
    it('auto-initializes if not initialized', async () => {
      const result = await provider.generate('You are helpful.', 'Hello');
      expect(mockAppleLLM.AppleLLMSession).toHaveBeenCalledTimes(1);
      expect(result).toBe('Generated text');
    });

    it('configures session with system prompt', async () => {
      await provider.generate('You are helpful.', 'Hello');
      expect(mockSession.configure).toHaveBeenCalledWith({
        instructions: 'You are helpful.',
      });
    });

    it('reuses session config when system prompt has not changed', async () => {
      await provider.generate('You are helpful.', 'Hello');
      await provider.generate('You are helpful.', 'Another message');

      // configure should only be called once since the prompt is the same
      expect(mockSession.configure).toHaveBeenCalledTimes(1);
      // generateText should be called twice
      expect(mockSession.generateText).toHaveBeenCalledTimes(2);
    });

    it('reconfigures when system prompt changes', async () => {
      await provider.generate('Prompt A', 'Hello');
      await provider.generate('Prompt B', 'Hello');

      expect(mockSession.configure).toHaveBeenCalledTimes(2);
      expect(mockSession.configure).toHaveBeenNthCalledWith(1, {
        instructions: 'Prompt A',
      });
      expect(mockSession.configure).toHaveBeenNthCalledWith(2, {
        instructions: 'Prompt B',
      });
    });

    it('returns string result', async () => {
      mockSession.generateText.mockResolvedValue('Some response');
      const result = await provider.generate('sys', 'usr');
      expect(result).toBe('Some response');
      expect(typeof result).toBe('string');
    });

    it('coerces non-string results to string', async () => {
      mockSession.generateText.mockResolvedValue(42);
      const result = await provider.generate('sys', 'usr');
      expect(result).toBe('42');
      expect(typeof result).toBe('string');
    });
  });

  describe('cleanup', () => {
    it('disposes session and resets status', async () => {
      await provider.initialize();
      expect(provider.getStatus()).toBe('ready');

      await provider.cleanup();
      expect(mockSession.dispose).toHaveBeenCalledTimes(1);
      expect(provider.getStatus()).toBe('uninitialized');
    });

    it('handles dispose errors gracefully', async () => {
      await provider.initialize();
      mockSession.dispose.mockImplementation(() => {
        throw new Error('Dispose failed');
      });

      // Should not throw
      await expect(provider.cleanup()).resolves.toBeUndefined();
      expect(provider.getStatus()).toBe('uninitialized');
    });
  });
});
