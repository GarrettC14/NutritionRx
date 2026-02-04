/**
 * LLM Provider Tests
 * Tests for Apple Foundation, Llama, and Unsupported providers.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { UnsupportedProvider } from '@/services/llm/providers/unsupportedProvider';
import { LlamaProvider } from '@/services/llm/providers/llamaProvider';
import { AppleFoundationProvider } from '@/services/llm/providers/appleFoundationProvider';
import { MODEL_CATALOG } from '@/services/llm/modelCatalog';

// ─── Unsupported Provider ────────────────────────────────────

describe('UnsupportedProvider', () => {
  let provider: UnsupportedProvider;

  beforeEach(() => {
    provider = new UnsupportedProvider();
  });

  it('has name "unsupported"', () => {
    expect(provider.name).toBe('unsupported');
  });

  it('isAvailable returns true (terminal fallback)', async () => {
    expect(await provider.isAvailable()).toBe(true);
  });

  it('initialize succeeds (no-op)', async () => {
    await expect(provider.initialize()).resolves.toBeUndefined();
  });

  it('generate throws an error', async () => {
    await expect(provider.generate('test prompt')).rejects.toThrow(
      'LLM inference is not supported on this device',
    );
  });

  it('cleanup succeeds (no-op)', async () => {
    await expect(provider.cleanup()).resolves.toBeUndefined();
  });
});

// ─── Llama Provider ──────────────────────────────────────────

describe('LlamaProvider', () => {
  const standardModel = MODEL_CATALOG[0]; // standard model
  let provider: LlamaProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new LlamaProvider(standardModel);
  });

  describe('basic properties', () => {
    it('has the providerName from model definition', () => {
      expect(provider.name).toBe('llama-standard');
    });

    it('getModelDefinition returns the model definition', () => {
      expect(provider.getModelDefinition()).toBe(standardModel);
    });

    it('getModelPath returns path under models/ directory', () => {
      const path = provider.getModelPath();
      expect(path).toContain('models/');
      expect(path).toContain(standardModel.filename);
    });
  });

  describe('isAvailable', () => {
    it('returns true when llama.rn is available', async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe('isModelDownloaded', () => {
    it('returns true when model file exists', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        isDirectory: false,
      });
      expect(await provider.isModelDownloaded()).toBe(true);
    });

    it('returns false when model file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });
      expect(await provider.isModelDownloaded()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('throws if model file is not downloaded', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });
      await expect(provider.initialize()).rejects.toThrow(
        'Model not downloaded',
      );
    });

    it('calls initLlama with correct params when model exists', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        isDirectory: false,
      });

      const { initLlama } = require('llama.rn');
      await provider.initialize();

      expect(initLlama).toHaveBeenCalledWith({
        model: provider.getModelPath(),
        n_ctx: standardModel.contextLength,
        n_threads: standardModel.nThreads,
        n_gpu_layers: 0,
      });
    });

    it('is idempotent -- second call is a no-op', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        isDirectory: false,
      });

      const { initLlama } = require('llama.rn');
      await provider.initialize();
      await provider.initialize();

      expect(initLlama).toHaveBeenCalledTimes(1);
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        isDirectory: false,
      });
    });

    it('returns generated text with provider name and latency', async () => {
      await provider.initialize();
      const result = await provider.generate('Test prompt');

      expect(result.text).toBe('Mock LLM response text for testing');
      expect(result.provider).toBe('llama-standard');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('auto-initializes if not yet initialized', async () => {
      const result = await provider.generate('Test prompt');
      expect(result.text).toBe('Mock LLM response text for testing');
    });
  });

  describe('cleanup', () => {
    it('is safe to call when not initialized', async () => {
      await expect(provider.cleanup()).resolves.toBeUndefined();
    });

    it('releases context when initialized', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        isDirectory: false,
      });
      await provider.initialize();

      await provider.cleanup();
      // After cleanup, context should be null, allowing re-initialization
    });
  });

  describe('deleteModel', () => {
    it('deletes model file when it exists', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        isDirectory: false,
      });

      await provider.deleteModel();

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        provider.getModelPath(),
      );
    });

    it('does nothing when model file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      await provider.deleteModel();

      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });
  });

  describe('downloadModel', () => {
    it('creates download resumable and downloads', async () => {
      const result = await provider.downloadModel();
      expect(result).toBe(true);
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('models/'),
        { intermediates: true },
      );
      expect(FileSystem.createDownloadResumable).toHaveBeenCalledWith(
        standardModel.downloadUrl,
        provider.getModelPath(),
        {},
        expect.any(Function),
      );
    });

    it('calls progress callback during download', async () => {
      const onProgress = jest.fn();
      // Override to capture and call the progress callback
      (FileSystem.createDownloadResumable as jest.Mock).mockImplementation(
        (_url: string, _path: string, _opts: any, progressCb: (p: any) => void) => {
          progressCb({
            totalBytesWritten: 500,
            totalBytesExpectedToWrite: 1000,
          });
          return {
            downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock' }),
          };
        },
      );

      await provider.downloadModel(onProgress);
      expect(onProgress).toHaveBeenCalledWith(0.5);
    });
  });
});

// ─── Apple Foundation Provider ───────────────────────────────
// The module captures AppleLLMModule at load time (Platform.OS is 'ios' by default).

describe('AppleFoundationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
  });

  it('has name "apple-foundation"', () => {
    const provider = new AppleFoundationProvider();
    expect(provider.name).toBe('apple-foundation');
  });

  it('isAvailable returns false when module reports unavailable', async () => {
    const { isFoundationModelsEnabled } = require('react-native-apple-llm');
    isFoundationModelsEnabled.mockResolvedValue('unavailable');

    const provider = new AppleFoundationProvider();
    expect(await provider.isAvailable()).toBe(false);
  });

  it('isAvailable returns true when module reports available', async () => {
    const { isFoundationModelsEnabled } = require('react-native-apple-llm');
    isFoundationModelsEnabled.mockResolvedValue('available');

    const provider = new AppleFoundationProvider();
    expect(await provider.isAvailable()).toBe(true);
  });

  it('isAvailable returns false when Platform.OS is android', async () => {
    // Even though AppleLLMModule was captured at load time (ios),
    // isAvailable() checks Platform.OS first
    (Platform as any).OS = 'android';

    const provider = new AppleFoundationProvider();
    expect(await provider.isAvailable()).toBe(false);
  });

  it('isAvailable returns false when isFoundationModelsEnabled throws', async () => {
    const { isFoundationModelsEnabled } = require('react-native-apple-llm');
    isFoundationModelsEnabled.mockRejectedValue(new Error('Not supported'));

    const provider = new AppleFoundationProvider();
    expect(await provider.isAvailable()).toBe(false);
  });

  it('initialize creates a session and configures it', async () => {
    const provider = new AppleFoundationProvider();
    await provider.initialize();
    // Should not throw -- session is created from mock
  });

  it('generate returns result with provider name and latency', async () => {
    const provider = new AppleFoundationProvider();
    await provider.initialize();
    const result = await provider.generate('What should I eat?');

    expect(result.text).toBe('Mock Apple Foundation response');
    expect(result.provider).toBe('apple-foundation');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('generate auto-initializes if session not created', async () => {
    const provider = new AppleFoundationProvider();
    // Don't call initialize -- generate should call it
    const result = await provider.generate('Test');
    expect(result.text).toBe('Mock Apple Foundation response');
  });

  it('cleanup is safe to call multiple times', async () => {
    const provider = new AppleFoundationProvider();
    await provider.initialize();
    await provider.cleanup();
    await expect(provider.cleanup()).resolves.toBeUndefined();
  });
});
