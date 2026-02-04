/**
 * Provider Manager Tests
 * Tests the LLMProviderManager singleton behavior: resolve, getStatus, generate.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';
import { llmManager } from '@/services/llm/providerManager';

const mockGetTotalMemory = DeviceInfo.getTotalMemory as jest.Mock;
const mockSupportedAbis = DeviceInfo.supportedAbis as jest.Mock;
const mockGetModel = DeviceInfo.getModel as jest.Mock;

function setupDeviceMocks(opts: {
  ramGB?: number;
  arm64?: boolean;
  model?: string;
  iosVersion?: string;
  platform?: string;
}) {
  mockGetTotalMemory.mockResolvedValue(
    (opts.ramGB ?? 8) * 1024 * 1024 * 1024,
  );
  mockSupportedAbis.mockResolvedValue(
    opts.arm64 !== false ? ['arm64-v8a'] : ['x86_64'],
  );
  mockGetModel.mockResolvedValue(opts.model ?? 'iPhone14,2');
  (Platform as any).OS = opts.platform ?? 'ios';
  (Platform as any).Version = opts.iosVersion ?? '17';
}

describe('LLMProviderManager', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Default device: 8GB arm64 iOS, no Apple Foundation (iOS 17)
    setupDeviceMocks({});

    // Default: model file exists (downloaded)
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      isDirectory: false,
    });

    // Reset singleton state so each test starts fresh
    await llmManager.reset();
  });

  describe('resolve', () => {
    it('resolves to llama provider on standard iOS device', async () => {
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toMatch(/^llama-/);
    });

    it('resolves to llama-standard for 8GB device', async () => {
      setupDeviceMocks({ ramGB: 8 });
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('llama-standard');
    });

    it('resolves to llama-compact for 5GB device', async () => {
      setupDeviceMocks({ ramGB: 5 });
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('llama-compact');
    });

    it('resolves to llama-minimal for 3.5GB device', async () => {
      setupDeviceMocks({ ramGB: 3.5 });
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('llama-minimal');
    });

    it('resolves to unsupported for low-RAM device', async () => {
      setupDeviceMocks({ ramGB: 2 });
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('unsupported');
    });

    it('resolves to unsupported for non-arm64 device', async () => {
      setupDeviceMocks({ ramGB: 8, arm64: false });
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('unsupported');
    });

    it('caches result -- calling resolve twice does not re-classify', async () => {
      await llmManager.resolve();
      const firstProvider = llmManager.getProviderName();

      // Change device info -- should not matter since resolve is cached
      setupDeviceMocks({ ramGB: 2 });
      await llmManager.resolve();

      expect(llmManager.getProviderName()).toBe(firstProvider);
    });

    it('resolves to Apple Foundation on eligible device with available module', async () => {
      setupDeviceMocks({
        model: 'iPhone16,1',
        iosVersion: '26',
        platform: 'ios',
        ramGB: 8,
      });

      const { isFoundationModelsEnabled } = require('react-native-apple-llm');
      isFoundationModelsEnabled.mockResolvedValue('available');

      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('apple-foundation');
    });

    it('falls through to llama when Apple Foundation unavailable', async () => {
      setupDeviceMocks({
        model: 'iPhone16,1',
        iosVersion: '26',
        platform: 'ios',
        ramGB: 8,
      });

      const { isFoundationModelsEnabled } = require('react-native-apple-llm');
      isFoundationModelsEnabled.mockResolvedValue('unavailable');

      await llmManager.resolve();
      expect(llmManager.getProviderName()).toMatch(/^llama-/);
    });
  });

  describe('getStatus', () => {
    it('returns ready with provider for downloaded llama model', async () => {
      const status = await llmManager.getStatus();
      expect(status.ready).toBe(true);
      if (status.ready) {
        expect(status.provider).toMatch(/^llama-/);
      }
    });

    it('returns model-download-required when model not downloaded', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const status = await llmManager.getStatus();
      expect(status.ready).toBe(false);
      if (!status.ready) {
        expect(status.reason).toBe('model-download-required');
        expect((status as any).downloadSizeMB).toBeGreaterThan(0);
        expect((status as any).modelName).toBeTruthy();
      }
    });

    it('returns unsupported for low-RAM devices', async () => {
      setupDeviceMocks({ ramGB: 2 });

      const status = await llmManager.getStatus();
      expect(status.ready).toBe(false);
      if (!status.ready) {
        expect(status.reason).toBe('unsupported');
        expect((status as any).message).toBeTruthy();
      }
    });

    it('returns unsupported message about RAM when device has low RAM', async () => {
      setupDeviceMocks({ ramGB: 2 });

      const status = await llmManager.getStatus();
      expect(status.ready).toBe(false);
      if (!status.ready && status.reason === 'unsupported') {
        expect(status.message).toContain('RAM');
      }
    });

    it('returns unsupported message about processor for non-arm64', async () => {
      setupDeviceMocks({ ramGB: 8, arm64: false });

      const status = await llmManager.getStatus();
      expect(status.ready).toBe(false);
      if (!status.ready && status.reason === 'unsupported') {
        expect(status.message).toContain('64-bit');
      }
    });

    it('returns ready for Apple Foundation provider', async () => {
      setupDeviceMocks({
        model: 'iPhone16,1',
        iosVersion: '26',
        platform: 'ios',
        ramGB: 8,
      });

      const { isFoundationModelsEnabled } = require('react-native-apple-llm');
      isFoundationModelsEnabled.mockResolvedValue('available');

      const status = await llmManager.getStatus();
      expect(status.ready).toBe(true);
      if (status.ready) {
        expect(status.provider).toBe('apple-foundation');
      }
    });
  });

  describe('generate', () => {
    it('throws when device is unsupported', async () => {
      setupDeviceMocks({ ramGB: 2 });

      await expect(llmManager.generate('test')).rejects.toThrow(
        'LLM not available on this device',
      );
    });

    it('returns generated text for llama provider', async () => {
      const result = await llmManager.generate('Tell me about macros');
      expect(result.text).toBeTruthy();
      expect(result.provider).toMatch(/^llama-/);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('downloadModel', () => {
    it('returns false when provider is unsupported', async () => {
      setupDeviceMocks({ ramGB: 2 });
      await llmManager.resolve();

      const result = await llmManager.downloadModel();
      expect(result).toBe(false);
    });

    it('delegates to LlamaProvider when active', async () => {
      await llmManager.resolve();
      const result = await llmManager.downloadModel();
      expect(result).toBe(true);
    });
  });

  describe('getClassification', () => {
    it('returns null before resolve', () => {
      expect(llmManager.getClassification()).toBeNull();
    });

    it('returns classification after resolve', async () => {
      await llmManager.resolve();
      const classification = llmManager.getClassification();
      expect(classification).not.toBeNull();
      expect(classification!.capabilities).toBeDefined();
      expect(classification!.capabilities.totalRamMB).toBeGreaterThan(0);
    });
  });

  describe('cleanup and reset', () => {
    it('cleanup does not throw when no provider', async () => {
      await expect(llmManager.cleanup()).resolves.toBeUndefined();
    });

    it('cleanup succeeds after resolve', async () => {
      await llmManager.resolve();
      await expect(llmManager.cleanup()).resolves.toBeUndefined();
    });

    it('reset clears provider and classification', async () => {
      await llmManager.resolve();
      expect(llmManager.getProviderName()).not.toBe('unsupported');
      expect(llmManager.getClassification()).not.toBeNull();

      await llmManager.reset();
      expect(llmManager.getProviderName()).toBe('unsupported');
      expect(llmManager.getClassification()).toBeNull();
    });

    it('reset allows re-resolving with different device', async () => {
      setupDeviceMocks({ ramGB: 8 });
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('llama-standard');

      await llmManager.reset();

      setupDeviceMocks({ ramGB: 3.5 });
      await llmManager.resolve();
      expect(llmManager.getProviderName()).toBe('llama-minimal');
    });
  });

  describe('getModelDefinition', () => {
    it('returns model definition for llama provider', async () => {
      setupDeviceMocks({ ramGB: 8 });
      await llmManager.resolve();

      const def = llmManager.getModelDefinition();
      expect(def).not.toBeNull();
      expect(def!.id).toBe('standard');
      expect(def!.displayName).toBeTruthy();
    });

    it('returns null for unsupported provider', async () => {
      setupDeviceMocks({ ramGB: 2 });
      await llmManager.resolve();

      expect(llmManager.getModelDefinition()).toBeNull();
    });
  });
});
