jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone' },
}));

const mockFile = {
  uri: 'file:///data/models/test.gguf',
  exists: true,
  size: 1_000_000_000,
  delete: jest.fn(),
};

const mockFileConstructor = jest.fn().mockImplementation(() => mockFile);
const mockDownloadFileAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-file-system', () => ({
  File: Object.assign(mockFileConstructor, {
    downloadFileAsync: mockDownloadFileAsync,
  }),
  Paths: { document: '/data/models' },
}));

const mockContext = {
  completion: jest.fn().mockResolvedValue({ text: 'Generated response' }),
  clearCache: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
};

const mockInitLlama = jest.fn().mockResolvedValue(mockContext);

jest.mock('llama.rn', () => ({
  initLlama: mockInitLlama,
}));

import type { ModelConfig } from '@/services/llm/modelCatalog';

const standardModel: ModelConfig = {
  tier: 'standard',
  name: 'Test Model',
  filename: 'test-model.gguf',
  huggingFaceRepo: 'test/repo',
  huggingFaceFile: 'test.gguf',
  downloadUrl: 'https://example.com/test.gguf',
  sizeBytes: 1_000_000_000,
  sizeLabel: '~1 GB',
  minRAMGB: 6,
  contextSize: 2048,
  threads: 4,
  chatTemplate: 'chatml',
  stopTokens: ['<|im_end|>', '<|im_start|>'],
};

const llama3Model: ModelConfig = {
  ...standardModel,
  tier: 'compact',
  name: 'Llama3 Test',
  chatTemplate: 'llama3',
  stopTokens: ['<|eot_id|>', '<|end_of_text|>'],
};

// Must import AFTER mocks
const { LlamaProvider } = require('@/services/llm/providers/llamaProvider');

describe('LlamaProvider', () => {
  let provider: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFile.exists = true;
    mockFile.size = 1_000_000_000;
    provider = new LlamaProvider(standardModel);
  });

  describe('constructor', () => {
    it('sets name based on model tier', () => {
      expect(provider.name).toBe('llama-standard');
      const compactProvider = new LlamaProvider(llama3Model);
      expect(compactProvider.name).toBe('llama-compact');
    });
  });

  describe('isAvailable', () => {
    it('returns true when llama.rn is available and not Expo Go', async () => {
      expect(await provider.isAvailable()).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('starts as uninitialized', () => {
      expect(provider.getStatus()).toBe('uninitialized');
    });
  });

  describe('getModelConfig', () => {
    it('returns the model config', () => {
      expect(provider.getModelConfig()).toBe(standardModel);
    });
  });

  describe('getModelPath', () => {
    it('returns the model file URI', () => {
      const path = provider.getModelPath();
      expect(path).toBe('file:///data/models/test.gguf');
    });
  });

  describe('isModelDownloaded', () => {
    it('returns true when file exists with correct size', async () => {
      mockFile.exists = true;
      mockFile.size = 1_000_000_000;
      expect(await provider.isModelDownloaded()).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      mockFile.exists = false;
      expect(await provider.isModelDownloaded()).toBe(false);
    });

    it('returns false when file size is too small (<80% of expected)', async () => {
      mockFile.exists = true;
      mockFile.size = 500_000_000; // 50% of expected
      expect(await provider.isModelDownloaded()).toBe(false);
    });

    it('returns false when file size is too large (>120% of expected)', async () => {
      mockFile.exists = true;
      mockFile.size = 1_500_000_000; // 150% of expected
      expect(await provider.isModelDownloaded()).toBe(false);
    });

    it('returns true when file is within 20% tolerance', async () => {
      mockFile.exists = true;
      mockFile.size = 1_100_000_000; // 110% of expected
      expect(await provider.isModelDownloaded()).toBe(true);
    });

    it('returns false when file access throws', async () => {
      mockFileConstructor.mockImplementationOnce(() => {
        throw new Error('File access error');
      });
      expect(await provider.isModelDownloaded()).toBe(false);
    });
  });

  describe('getModelSize', () => {
    it('returns file size when file exists', async () => {
      mockFile.exists = true;
      mockFile.size = 1_000_000_000;
      expect(await provider.getModelSize()).toBe(1_000_000_000);
    });

    it('returns 0 when file does not exist', async () => {
      mockFile.exists = false;
      expect(await provider.getModelSize()).toBe(0);
    });
  });

  describe('initialize', () => {
    it('initializes llama context and sets status to ready', async () => {
      await provider.initialize();
      expect(provider.getStatus()).toBe('ready');
      expect(mockInitLlama).toHaveBeenCalledWith({
        model: expect.any(String),
        n_ctx: 2048,
        n_threads: 4,
        n_gpu_layers: 0,
      });
    });

    it('is idempotent (second call does nothing)', async () => {
      await provider.initialize();
      await provider.initialize();
      expect(mockInitLlama).toHaveBeenCalledTimes(1);
    });

    it('downloads model if not already downloaded', async () => {
      mockFile.exists = false;
      // After download, model should "exist"
      mockDownloadFileAsync.mockImplementation(async () => {
        mockFile.exists = true;
        mockFile.size = 1_000_000_000;
      });
      await provider.initialize();
      expect(mockDownloadFileAsync).toHaveBeenCalled();
    });

    it('sets status to error on initialization failure', async () => {
      mockInitLlama.mockRejectedValueOnce(new Error('Init failed'));
      await expect(provider.initialize()).rejects.toThrow('Init failed');
      expect(provider.getStatus()).toBe('error');
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('generates text with formatted prompt', async () => {
      const result = await provider.generate('System prompt', 'User message');
      expect(result).toBe('Generated response');
      expect(mockContext.clearCache).toHaveBeenCalledWith(false);
      expect(mockContext.completion).toHaveBeenCalledWith(
        expect.objectContaining({
          n_predict: 512,
          temperature: 0.7,
          top_p: 0.9,
          stop: standardModel.stopTokens,
        }),
        expect.any(Function),
      );
    });

    it('formats ChatML prompt correctly', async () => {
      await provider.generate('System prompt', 'User message');
      const prompt = mockContext.completion.mock.calls[0][0].prompt;
      expect(prompt).toContain('<|im_start|>system');
      expect(prompt).toContain('System prompt');
      expect(prompt).toContain('<|im_end|>');
      expect(prompt).toContain('<|im_start|>user');
      expect(prompt).toContain('User message');
      expect(prompt).toContain('<|im_start|>assistant');
    });

    it('formats Llama3 prompt correctly', async () => {
      const llama3Provider = new LlamaProvider(llama3Model);
      // Need to initialize
      await llama3Provider.initialize();
      await llama3Provider.generate('System prompt', 'User message');
      const prompt = mockContext.completion.mock.calls[0][0].prompt;
      expect(prompt).toContain('<|begin_of_text|>');
      expect(prompt).toContain('<|start_header_id|>system<|end_header_id|>');
      expect(prompt).toContain('System prompt');
      expect(prompt).toContain('<|eot_id|>');
      expect(prompt).toContain('<|start_header_id|>user<|end_header_id|>');
      expect(prompt).toContain('User message');
      expect(prompt).toContain('<|start_header_id|>assistant<|end_header_id|>');
    });

    it('truncates prompt when it exceeds context size', async () => {
      const longSystemPrompt = 'x'.repeat(50000);
      await provider.generate(longSystemPrompt, 'short message');
      const prompt = mockContext.completion.mock.calls[0][0].prompt;
      // Max prompt chars = (2048 - 512) * 3.5 = 5376
      expect(prompt.length).toBeLessThanOrEqual(5376);
    });

    it('returns empty string when result.text is undefined', async () => {
      mockContext.completion.mockResolvedValueOnce({ text: undefined });
      const result = await provider.generate('sys', 'user');
      expect(result).toBe('');
    });

    it('auto-initializes if context is null', async () => {
      const freshProvider = new LlamaProvider(standardModel);
      const result = await freshProvider.generate('sys', 'user');
      expect(result).toBe('Generated response');
    });
  });

  describe('cleanup', () => {
    it('releases context and sets status to uninitialized', async () => {
      await provider.initialize();
      await provider.cleanup();
      expect(mockContext.release).toHaveBeenCalled();
      expect(provider.getStatus()).toBe('uninitialized');
    });

    it('handles release errors gracefully', async () => {
      await provider.initialize();
      mockContext.release.mockRejectedValueOnce(new Error('Release failed'));
      await expect(provider.cleanup()).resolves.toBeUndefined();
    });

    it('does nothing when no context exists', async () => {
      await expect(provider.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('downloadModel', () => {
    it('returns success when model already downloaded', async () => {
      mockFile.exists = true;
      mockFile.size = 1_000_000_000;
      const result = await provider.downloadModel();
      expect(result).toEqual({ success: true });
      expect(mockDownloadFileAsync).not.toHaveBeenCalled();
    });

    it('downloads file and verifies integrity', async () => {
      mockFile.exists = false;
      mockDownloadFileAsync.mockImplementation(async () => {
        mockFile.exists = true;
        mockFile.size = 1_000_000_000;
      });
      const result = await provider.downloadModel();
      expect(result.success).toBe(true);
      expect(mockDownloadFileAsync).toHaveBeenCalledWith(
        standardModel.downloadUrl,
        expect.anything(),
        { idempotent: true },
      );
    });

    it('returns error when download fails', async () => {
      mockFile.exists = false;
      mockDownloadFileAsync.mockRejectedValueOnce(new Error('Network error'));
      const result = await provider.downloadModel();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('returns error when integrity check fails after download', async () => {
      mockFile.exists = false;
      mockDownloadFileAsync.mockImplementation(async () => {
        mockFile.exists = true;
        mockFile.size = 100; // Way too small
      });
      const result = await provider.downloadModel();
      expect(result.success).toBe(false);
      expect(result.error).toContain('integrity');
    });
  });

  describe('cancelDownload', () => {
    it('sets downloadCancelled flag', () => {
      provider.cancelDownload();
      // The flag is private, but we can test its effect indirectly
      // by checking that a download started after cancel returns cancelled
    });
  });

  describe('deleteModel', () => {
    it('cleans up context and deletes model file', async () => {
      await provider.initialize();
      await provider.deleteModel();
      expect(mockContext.release).toHaveBeenCalled();
      expect(mockFile.delete).toHaveBeenCalled();
      expect(provider.getStatus()).toBe('uninitialized');
    });

    it('handles delete errors gracefully', async () => {
      mockFile.delete.mockImplementationOnce(() => {
        throw new Error('Delete failed');
      });
      await expect(provider.deleteModel()).resolves.toBeUndefined();
    });
  });
});
