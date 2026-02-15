jest.mock('@/services/llm/deviceClassifier', () => ({
  classifyDevice: jest.fn(),
}));

jest.mock('@/services/llm/modelCatalog', () => ({
  selectModelForDevice: jest.fn(),
}));

const mockAppleProvider = {
  name: 'apple-foundation',
  isAvailable: jest.fn().mockResolvedValue(true),
  initialize: jest.fn().mockResolvedValue(undefined),
  generate: jest.fn().mockResolvedValue('Apple response'),
  getStatus: jest.fn().mockReturnValue('ready'),
  cleanup: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/services/llm/providers/appleFoundationProvider', () => ({
  AppleFoundationProvider: jest.fn().mockImplementation(() => mockAppleProvider),
}));

const mockLlamaProvider = {
  name: 'llama-standard',
  isAvailable: jest.fn().mockResolvedValue(true),
  initialize: jest.fn().mockResolvedValue(undefined),
  generate: jest.fn().mockResolvedValue('Llama response'),
  getStatus: jest.fn().mockReturnValue('ready'),
  cleanup: jest.fn().mockResolvedValue(undefined),
  isModelDownloaded: jest.fn().mockResolvedValue(true),
  downloadModel: jest.fn().mockResolvedValue({ success: true }),
  cancelDownload: jest.fn(),
  deleteModel: jest.fn().mockResolvedValue(undefined),
  getModelSize: jest.fn().mockResolvedValue(1_000_000_000),
  getModelConfig: jest.fn().mockReturnValue({ tier: 'standard', name: 'Test' }),
};

jest.mock('@/services/llm/providers/llamaProvider', () => ({
  LlamaProvider: jest.fn().mockImplementation(() => mockLlamaProvider),
}));

jest.mock('@/services/llm/providers/unsupportedProvider', () => ({
  UnsupportedProvider: jest.fn().mockImplementation(() => ({
    name: 'unsupported',
    isAvailable: jest.fn().mockResolvedValue(true),
    initialize: jest.fn().mockResolvedValue(undefined),
    generate: jest.fn().mockRejectedValue(new Error('LLM inference is not supported on this device')),
    getStatus: jest.fn().mockReturnValue('unsupported'),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { classifyDevice } from '@/services/llm/deviceClassifier';
import { selectModelForDevice } from '@/services/llm/modelCatalog';

const mockClassifyDevice = classifyDevice as jest.Mock;
const mockSelectModelForDevice = selectModelForDevice as jest.Mock;

describe('ProviderManager', () => {
  let providerManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require to get fresh singleton
    jest.resetModules();

    // Re-establish mocks after resetModules
    jest.doMock('@/services/llm/deviceClassifier', () => ({
      classifyDevice: jest.fn(),
    }));
    jest.doMock('@/services/llm/modelCatalog', () => ({
      selectModelForDevice: jest.fn(),
    }));
    jest.doMock('@/services/llm/providers/appleFoundationProvider', () => ({
      AppleFoundationProvider: jest.fn().mockImplementation(() => ({
        ...mockAppleProvider,
        isAvailable: jest.fn().mockResolvedValue(true),
        getStatus: jest.fn().mockReturnValue('ready'),
        generate: jest.fn().mockResolvedValue('Apple response'),
        cleanup: jest.fn().mockResolvedValue(undefined),
      })),
    }));
    jest.doMock('@/services/llm/providers/llamaProvider', () => ({
      LlamaProvider: jest.fn().mockImplementation(() => ({
        ...mockLlamaProvider,
        isAvailable: jest.fn().mockResolvedValue(true),
        getStatus: jest.fn().mockReturnValue('ready'),
        generate: jest.fn().mockResolvedValue('Llama response'),
        cleanup: jest.fn().mockResolvedValue(undefined),
        isModelDownloaded: jest.fn().mockResolvedValue(true),
        downloadModel: jest.fn().mockResolvedValue({ success: true }),
        cancelDownload: jest.fn(),
        deleteModel: jest.fn().mockResolvedValue(undefined),
        getModelSize: jest.fn().mockResolvedValue(1_000_000_000),
        getModelConfig: jest.fn().mockReturnValue({ tier: 'standard' }),
      })),
    }));
    jest.doMock('@/services/llm/providers/unsupportedProvider', () => ({
      UnsupportedProvider: jest.fn().mockImplementation(() => ({
        name: 'unsupported',
        isAvailable: jest.fn().mockResolvedValue(true),
        initialize: jest.fn().mockResolvedValue(undefined),
        generate: jest.fn().mockRejectedValue(new Error('LLM inference is not supported')),
        getStatus: jest.fn().mockReturnValue('unsupported'),
        cleanup: jest.fn().mockResolvedValue(undefined),
      })),
    }));

    const module = require('@/services/llm/providerManager');
    providerManager = module.providerManager;
  });

  describe('initial state', () => {
    it('getStatus returns uninitialized before resolve', () => {
      expect(providerManager.getStatus()).toBe('uninitialized');
    });

    it('getProviderName returns none before resolve', () => {
      expect(providerManager.getProviderName()).toBe('none');
    });

    it('getClassification returns null before resolve', () => {
      expect(providerManager.getClassification()).toBeNull();
    });
  });

  describe('resolve', () => {
    it('selects Apple Foundation when capability is apple_foundation', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'apple_foundation',
        ramGB: 8,
        architecture: 'arm64',
        model: 'iPhone17,1',
        isAppleIntelligenceEligible: true,
      });

      await providerManager.resolve();
      expect(providerManager.getProviderName()).toBe('apple-foundation');
    });

    it('falls back to Llama when Apple Foundation not available', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'apple_foundation',
        ramGB: 8,
        architecture: 'arm64',
        model: 'iPhone17,1',
        isAppleIntelligenceEligible: true,
      });

      const { AppleFoundationProvider } = require('@/services/llm/providers/appleFoundationProvider');
      AppleFoundationProvider.mockImplementation(() => ({
        ...mockAppleProvider,
        isAvailable: jest.fn().mockResolvedValue(false),
      }));

      const { selectModelForDevice: smfd } = require('@/services/llm/modelCatalog');
      smfd.mockReturnValue({ tier: 'standard', name: 'Test' });

      await providerManager.resolve();
      expect(providerManager.getProviderName()).not.toBe('apple-foundation');
    });

    it('selects Llama for standard capability', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'standard',
        ramGB: 8,
        architecture: 'arm64',
        model: 'Pixel 7',
        isAppleIntelligenceEligible: false,
      });

      const { selectModelForDevice: smfd } = require('@/services/llm/modelCatalog');
      smfd.mockReturnValue({ tier: 'standard', name: 'Test' });

      await providerManager.resolve();
      const name = providerManager.getProviderName();
      expect(name).toContain('llama');
    });

    it('selects Unsupported for unsupported capability', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'unsupported',
        ramGB: 2,
        architecture: 'x86',
        model: 'Emulator',
        isAppleIntelligenceEligible: false,
      });

      await providerManager.resolve();
      expect(providerManager.getProviderName()).toBe('unsupported');
    });

    it('is idempotent (second call does nothing)', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'unsupported',
        ramGB: 2,
        architecture: 'x86',
        model: 'Emulator',
        isAppleIntelligenceEligible: false,
      });

      await providerManager.resolve();
      await providerManager.resolve();
      expect(cd).toHaveBeenCalledTimes(1);
    });

    it('stores device classification', async () => {
      const classification = {
        capability: 'standard',
        ramGB: 8,
        architecture: 'arm64',
        model: 'Pixel 7',
        isAppleIntelligenceEligible: false,
      };
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue(classification);
      const { selectModelForDevice: smfd } = require('@/services/llm/modelCatalog');
      smfd.mockReturnValue({ tier: 'standard', name: 'Test' });

      await providerManager.resolve();
      expect(providerManager.getClassification()).toEqual(classification);
    });
  });

  describe('initialize', () => {
    it('resolves first if not yet resolved', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'unsupported',
        ramGB: 2,
        architecture: 'x86',
        model: 'Emulator',
        isAppleIntelligenceEligible: false,
      });

      await providerManager.initialize();
      expect(cd).toHaveBeenCalled();
    });
  });

  describe('generate', () => {
    it('throws when provider not initialized', async () => {
      await expect(
        providerManager.generate('system', 'user'),
      ).rejects.toThrow();
    });
  });

  describe('isModelDownloaded', () => {
    it('returns false for mocked Apple Foundation provider (instanceof fails with mocks)', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'apple_foundation',
        ramGB: 8,
        architecture: 'arm64',
        model: 'iPhone17,1',
        isAppleIntelligenceEligible: true,
      });

      await providerManager.resolve();
      // With jest mocks, instanceof checks fail because mock factories return plain objects
      const result = await providerManager.isModelDownloaded();
      expect(result).toBe(false);
    });
  });

  describe('downloadModel', () => {
    it('returns error when provider does not need download', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'apple_foundation',
        ramGB: 8,
        architecture: 'arm64',
        model: 'iPhone17,1',
        isAppleIntelligenceEligible: true,
      });

      await providerManager.resolve();
      const result = await providerManager.downloadModel();
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not require');
    });
  });

  describe('cleanup', () => {
    it('resets provider and classification', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'unsupported',
        ramGB: 2,
        architecture: 'x86',
        model: 'Emulator',
        isAppleIntelligenceEligible: false,
      });

      await providerManager.resolve();
      await providerManager.cleanup();
      expect(providerManager.getProviderName()).toBe('none');
      expect(providerManager.getClassification()).toBeNull();
    });
  });

  describe('reset', () => {
    it('calls cleanup', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'unsupported',
        ramGB: 2,
        architecture: 'x86',
        model: 'Emulator',
        isAppleIntelligenceEligible: false,
      });

      await providerManager.resolve();
      await providerManager.reset();
      expect(providerManager.getStatus()).toBe('uninitialized');
    });
  });

  describe('getModelSize', () => {
    it('returns 0 when provider is not LlamaProvider', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'unsupported',
        ramGB: 2,
        architecture: 'x86',
        model: 'Emulator',
        isAppleIntelligenceEligible: false,
      });

      await providerManager.resolve();
      const size = await providerManager.getModelSize();
      expect(size).toBe(0);
    });
  });

  describe('getModelConfig', () => {
    it('returns null when provider is not LlamaProvider', async () => {
      const { classifyDevice: cd } = require('@/services/llm/deviceClassifier');
      cd.mockResolvedValue({
        capability: 'unsupported',
        ramGB: 2,
        architecture: 'x86',
        model: 'Emulator',
        isAppleIntelligenceEligible: false,
      });

      await providerManager.resolve();
      expect(providerManager.getModelConfig()).toBeNull();
    });
  });
});
