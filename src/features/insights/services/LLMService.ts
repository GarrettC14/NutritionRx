/**
 * LLM Service
 * Facade that delegates to providerManager for multi-provider LLM support.
 * Maintains backward-compatible API so downstream consumers don't break.
 *
 * Note: LLM features require a development build - they don't work in Expo Go
 */

import Constants from 'expo-constants';
import { providerManager } from '@/services/llm/providerManager';
import type { LLMCapabilities, LLMDownloadProgress, LLMStatus } from '../types/insights.types';

const isExpoGo = Constants.appOwnership === 'expo';

class LLMServiceClass {
  private initialized = false;

  async checkCapabilities(): Promise<LLMCapabilities> {
    if (isExpoGo) {
      return {
        canRunLocalLLM: false,
        reason: 'LLM requires a development build (not available in Expo Go)',
        deviceInfo: { platform: 'unknown', osVersion: 'unknown' },
      };
    }

    try {
      await providerManager.resolve();
      const status = providerManager.getStatus();
      const classification = providerManager.getClassification();

      return {
        canRunLocalLLM: status !== 'unsupported',
        reason: status === 'unsupported' ? 'Device does not support local LLM' : undefined,
        deviceInfo: {
          platform: classification?.model ?? 'unknown',
          osVersion: classification?.architecture ?? 'unknown',
        },
      };
    } catch (error) {
      return {
        canRunLocalLLM: false,
        reason: 'Unable to determine device capabilities',
        deviceInfo: { platform: 'unknown', osVersion: 'unknown' },
      };
    }
  }

  async isModelDownloaded(): Promise<boolean> {
    if (isExpoGo) return false;
    try {
      await providerManager.resolve();
      return providerManager.isModelDownloaded();
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<LLMStatus> {
    if (isExpoGo) return 'unsupported';

    try {
      await providerManager.resolve();
      const status = providerManager.getStatus();

      // Map provider status to existing LLMStatus for backward compatibility
      switch (status) {
        case 'ready':
          return 'ready';
        case 'downloading':
          return 'downloading';
        case 'initializing':
          return 'loading';
        case 'error':
          return 'error';
        case 'unsupported':
          return 'unsupported';
        case 'uninitialized':
        case 'checking': {
          // Check if model is downloaded to decide between 'ready' and 'not_downloaded'
          const downloaded = await providerManager.isModelDownloaded();
          return downloaded ? 'ready' : 'not_downloaded';
        }
        default:
          return 'not_downloaded';
      }
    } catch {
      return 'unsupported';
    }
  }

  async downloadModel(
    onProgress?: (progress: LLMDownloadProgress) => void,
  ): Promise<{ success: boolean; error?: string }> {
    if (isExpoGo) {
      return { success: false, error: 'Downloads not available in Expo Go' };
    }

    try {
      await providerManager.resolve();
      return providerManager.downloadModel(onProgress);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      return { success: false, error: errorMessage };
    }
  }

  cancelDownload(): void {
    providerManager.cancelDownload();
  }

  async deleteModel(): Promise<void> {
    await providerManager.deleteModel();
    this.initialized = false;
  }

  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (isExpoGo) {
      return { success: false, error: 'LLM not available in Expo Go' };
    }

    try {
      await providerManager.resolve();
      await providerManager.initialize();
      this.initialized = true;
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      return { success: false, error: errorMessage };
    }
  }

  async unload(): Promise<void> {
    await providerManager.cleanup();
    this.initialized = false;
  }

  /**
   * Legacy single-prompt generate for backward compatibility.
   * Treats the entire prompt as the user message with no system prompt.
   * Use generateWithSystem() for the new system+user separation.
   */
  async generate(
    prompt: string,
    maxTokens: number = 512,
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    if (isExpoGo) {
      return { success: false, error: 'LLM not available in Expo Go' };
    }

    try {
      // Ensure provider is resolved and initialized
      await providerManager.resolve();
      const status = providerManager.getStatus();

      if (status !== 'ready') {
        // Try to initialize (which may trigger download for Llama)
        await providerManager.initialize();
      }

      if (providerManager.getStatus() !== 'ready') {
        return { success: false, error: 'LLM not ready' };
      }

      const text = await providerManager.generate('', prompt);
      return { success: true, text };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      console.error('[LLMService] generate error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * New system+user prompt generation for the context pipeline.
   */
  async generateWithSystem(
    systemPrompt: string,
    userMessage: string,
    maxTokens: number = 512,
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    if (isExpoGo) {
      return { success: false, error: 'LLM not available in Expo Go' };
    }

    try {
      await providerManager.resolve();
      const status = providerManager.getStatus();

      if (status !== 'ready') {
        await providerManager.initialize();
      }

      if (providerManager.getStatus() !== 'ready') {
        return { success: false, error: 'LLM not ready' };
      }

      const text = await providerManager.generate(systemPrompt, userMessage);
      return { success: true, text };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      console.error('[LLMService] generateWithSystem error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async generateJSON<T>(
    prompt: string,
    maxTokens: number = 512,
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const result = await this.generate(prompt, maxTokens);
    if (!result.success || !result.text) {
      return { success: false, error: result.error || 'No text generated' };
    }

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'No JSON found in response' };
      }
      const data = JSON.parse(jsonMatch[0]) as T;
      return { success: true, data };
    } catch {
      return { success: false, error: 'Failed to parse JSON response' };
    }
  }

  isLoaded(): boolean {
    return providerManager.getStatus() === 'ready';
  }

  isAvailable(): boolean {
    return !isExpoGo;
  }

  async getModelSize(): Promise<number> {
    return providerManager.getModelSize();
  }

  /** Expose provider info for developer settings */
  getProviderName(): string {
    return providerManager.getProviderName();
  }

  getClassification() {
    return providerManager.getClassification();
  }

  getModelConfig() {
    return providerManager.getModelConfig();
  }
}

export const LLMService = new LLMServiceClass();
