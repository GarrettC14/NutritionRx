/**
 * Provider Manager
 * Singleton that resolves the best LLM provider in order:
 * 1. Apple Foundation Models (iOS 26+ on eligible hardware)
 * 2. Llama.rn with device-appropriate model tier
 * 3. Unsupported (terminal fallback)
 */

import { classifyDevice, type DeviceClassification } from './deviceClassifier';
import { selectModelForDevice } from './modelCatalog';
import type { LLMProvider, LLMProviderStatus, DownloadProgress } from './types';
import { AppleFoundationProvider } from './providers/appleFoundationProvider';
import { LlamaProvider } from './providers/llamaProvider';
import { UnsupportedProvider } from './providers/unsupportedProvider';

class ProviderManager {
  private provider: LLMProvider | null = null;
  private classification: DeviceClassification | null = null;
  private resolving = false;

  /**
   * Classify device and select the best provider.
   * Does NOT download or initialize — just picks the provider.
   */
  async resolve(): Promise<void> {
    if (this.provider || this.resolving) return;
    this.resolving = true;

    try {
      this.classification = await classifyDevice();
      if (__DEV__) console.log(`[ProviderManager] Device: ${this.classification.model}, RAM: ${this.classification.ramGB.toFixed(1)}GB, capability: ${this.classification.capability}`);

      // Try Apple Foundation first
      if (this.classification.capability === 'apple_foundation') {
        const appleProvider = new AppleFoundationProvider();
        if (await appleProvider.isAvailable()) {
          this.provider = appleProvider;
          if (__DEV__) console.log('[ProviderManager] Selected: Apple Foundation Models');
          return;
        }
        // Fall through to llama.rn if Apple Foundation not actually available
        if (__DEV__) console.log('[ProviderManager] Apple Foundation not available, falling back to llama.rn');
      }

      // Try llama.rn with device-appropriate model
      if (this.classification.capability !== 'unsupported') {
        const model = selectModelForDevice(this.classification.ramGB);
        if (model) {
          const llamaProvider = new LlamaProvider(model);
          if (await llamaProvider.isAvailable()) {
            this.provider = llamaProvider;
            if (__DEV__) console.log(`[ProviderManager] Selected: ${model.name} (${model.tier})`);
            return;
          }
        }
      }

      // Terminal fallback
      this.provider = new UnsupportedProvider();
      if (__DEV__) console.log('[ProviderManager] Selected: Unsupported (no LLM available)');
    } finally {
      this.resolving = false;
    }
  }

  /**
   * Initialize the current provider (download model if needed).
   */
  async initialize(onProgress?: (progress: number) => void): Promise<void> {
    if (!this.provider) await this.resolve();
    if (!this.provider) throw new Error('No provider resolved');
    await this.provider.initialize(onProgress);
  }

  /**
   * Generate text using system prompt + user message separation.
   */
  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.provider || this.provider.getStatus() !== 'ready') {
      throw new Error('LLM provider not initialized or not ready');
    }
    return this.provider.generate(systemPrompt, userMessage);
  }

  getStatus(): LLMProviderStatus {
    return this.provider?.getStatus() ?? 'uninitialized';
  }

  getProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  getClassification(): DeviceClassification | null {
    return this.classification;
  }

  /**
   * Check if the selected provider is a LlamaProvider and the model is downloaded.
   */
  async isModelDownloaded(): Promise<boolean> {
    if (!this.provider) await this.resolve();
    if (this.provider instanceof LlamaProvider) {
      return this.provider.isModelDownloaded();
    }
    // Apple Foundation and Unsupported don't need downloads
    return this.provider instanceof AppleFoundationProvider;
  }

  /**
   * Download the model (only applicable for LlamaProvider).
   */
  async downloadModel(
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.provider) await this.resolve();
    if (this.provider instanceof LlamaProvider) {
      return this.provider.downloadModel(onProgress);
    }
    return { success: false, error: 'Current provider does not require model download' };
  }

  cancelDownload(): void {
    if (this.provider instanceof LlamaProvider) {
      this.provider.cancelDownload();
    }
  }

  async deleteModel(): Promise<void> {
    if (this.provider instanceof LlamaProvider) {
      await this.provider.deleteModel();
    }
  }

  async getModelSize(): Promise<number> {
    if (this.provider instanceof LlamaProvider) {
      return this.provider.getModelSize();
    }
    return 0;
  }

  getModelConfig() {
    if (this.provider instanceof LlamaProvider) {
      return this.provider.getModelConfig();
    }
    return null;
  }

  async cleanup(): Promise<void> {
    await this.provider?.cleanup();
    this.provider = null;
    this.classification = null;
  }

  /**
   * Reset and re-resolve (e.g., after model deletion).
   */
  async reset(): Promise<void> {
    await this.cleanup();
  }
}

export const providerManager = new ProviderManager();
