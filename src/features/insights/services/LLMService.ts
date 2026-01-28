/**
 * LLM Service
 * Manages on-device LLM for generating nutrition insights
 * Uses llama.rn for React Native integration with llama.cpp
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { initLlama, LlamaContext } from 'llama.rn';
import type { LLMCapabilities, LLMDownloadProgress, LLMStatus } from '../types/insights.types';

const MODEL_CONFIG = {
  fileName: 'smollm2-1.7b-instruct-q4_k_m.gguf',
  downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf',
  expectedSizeBytes: 1_000_000_000,
  minFreeSpaceBytes: 1_500_000_000,
  contextSize: 2048,
  threads: 4,
  gpuLayers: 0,
} as const;

const DEVICE_REQUIREMENTS = {
  minIOSVersion: 14,
  minAndroidAPI: 26,
  minFreeRAMBytes: 2_000_000_000,
} as const;

class LLMServiceClass {
  private context: LlamaContext | null = null;
  private isInitializing: boolean = false;
  private modelPath: string;
  private downloadAbortController: AbortController | null = null;

  constructor() {
    this.modelPath = `${RNFS.DocumentDirectoryPath}/${MODEL_CONFIG.fileName}`;
  }

  async checkCapabilities(): Promise<LLMCapabilities> {
    const platform = Platform.OS;
    const osVersion = Platform.Version;

    try {
      if (platform === 'ios') {
        const iosVersion = typeof osVersion === 'string' ? parseFloat(osVersion) : osVersion;
        if (iosVersion < DEVICE_REQUIREMENTS.minIOSVersion) {
          return { canRunLocalLLM: false, reason: `Requires iOS ${DEVICE_REQUIREMENTS.minIOSVersion} or later`, deviceInfo: { platform, osVersion: String(osVersion) } };
        }
      } else if (platform === 'android') {
        const apiLevel = typeof osVersion === 'number' ? osVersion : parseInt(osVersion, 10);
        if (apiLevel < DEVICE_REQUIREMENTS.minAndroidAPI) {
          return { canRunLocalLLM: false, reason: `Requires Android 8.0 or later`, deviceInfo: { platform, osVersion: String(osVersion) } };
        }
      }

      const freeSpace = await this.getFreeDiskSpace();
      if (freeSpace < MODEL_CONFIG.minFreeSpaceBytes) {
        return { canRunLocalLLM: false, reason: 'Insufficient storage space (need at least 1.5GB free)', deviceInfo: { platform, osVersion: String(osVersion) } };
      }

      return { canRunLocalLLM: true, deviceInfo: { platform, osVersion: String(osVersion) } };
    } catch (error) {
      console.error('[LLMService] Error checking capabilities:', error);
      return { canRunLocalLLM: false, reason: 'Unable to determine device capabilities', deviceInfo: { platform, osVersion: String(osVersion) } };
    }
  }

  private async getFreeDiskSpace(): Promise<number> {
    try {
      const info = await RNFS.getFSInfo();
      return info.freeSpace;
    } catch {
      return MODEL_CONFIG.minFreeSpaceBytes * 2;
    }
  }

  async isModelDownloaded(): Promise<boolean> {
    try {
      const exists = await RNFS.exists(this.modelPath);
      if (!exists) return false;
      const stat = await RNFS.stat(this.modelPath);
      const fileSize = typeof stat.size === 'string' ? parseInt(stat.size, 10) : stat.size;
      return fileSize >= MODEL_CONFIG.expectedSizeBytes * 0.8;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<LLMStatus> {
    const capabilities = await this.checkCapabilities();
    if (!capabilities.canRunLocalLLM) return 'unsupported';
    if (this.context) return 'ready';
    if (this.isInitializing) return 'loading';
    const downloaded = await this.isModelDownloaded();
    return downloaded ? 'ready' : 'not_downloaded';
  }

  async downloadModel(onProgress?: (progress: LLMDownloadProgress) => void): Promise<{ success: boolean; error?: string }> {
    try {
      if (await this.isModelDownloaded()) return { success: true };
      this.downloadAbortController = new AbortController();
      const startTime = Date.now();
      let lastProgressTime = startTime;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: MODEL_CONFIG.downloadUrl,
        toFile: this.modelPath,
        background: true,
        discretionary: true,
        begin: (res) => console.log('[LLMService] Download started, content length:', res.contentLength),
        progress: (res) => {
          const now = Date.now();
          const bytesDownloaded = res.bytesWritten;
          const totalBytes = res.contentLength || MODEL_CONFIG.expectedSizeBytes;
          const percentage = Math.round((bytesDownloaded / totalBytes) * 100);
          const elapsedSeconds = (now - startTime) / 1000;
          const bytesPerSecond = bytesDownloaded / elapsedSeconds;
          const remainingBytes = totalBytes - bytesDownloaded;
          const estimatedSecondsRemaining = Math.round(remainingBytes / bytesPerSecond);

          if (now - lastProgressTime >= 500 || percentage === 100) {
            lastProgressTime = now;
            onProgress?.({ bytesDownloaded, totalBytes, percentage, estimatedSecondsRemaining });
          }
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log('[LLMService] Download completed successfully');
        return { success: true };
      } else {
        throw new Error(`Download failed with status ${downloadResult.statusCode}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
      console.error('[LLMService] Download error:', errorMessage);
      try { const exists = await RNFS.exists(this.modelPath); if (exists) await RNFS.unlink(this.modelPath); } catch {}
      return { success: false, error: errorMessage };
    } finally {
      this.downloadAbortController = null;
    }
  }

  cancelDownload(): void { this.downloadAbortController?.abort(); }

  async deleteModel(): Promise<void> {
    try {
      await this.unload();
      const exists = await RNFS.exists(this.modelPath);
      if (exists) { await RNFS.unlink(this.modelPath); console.log('[LLMService] Model deleted'); }
    } catch (error) { console.error('[LLMService] Error deleting model:', error); }
  }

  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.context) return { success: true };
    if (this.isInitializing) return { success: false, error: 'Already initializing' };

    try {
      this.isInitializing = true;
      const downloaded = await this.isModelDownloaded();
      if (!downloaded) return { success: false, error: 'Model not downloaded' };
      console.log('[LLMService] Initializing LLM context...');
      this.context = await initLlama({ model: this.modelPath, n_ctx: MODEL_CONFIG.contextSize, n_threads: MODEL_CONFIG.threads, n_gpu_layers: MODEL_CONFIG.gpuLayers });
      console.log('[LLMService] LLM context initialized successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('[LLMService] Initialization error:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.isInitializing = false;
    }
  }

  async unload(): Promise<void> {
    if (this.context) {
      try { await this.context.release(); this.context = null; console.log('[LLMService] LLM context unloaded'); }
      catch (error) { console.error('[LLMService] Error unloading context:', error); }
    }
  }

  async generate(prompt: string, maxTokens: number = 512): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      if (!this.context) {
        const initResult = await this.initialize();
        if (!initResult.success) return { success: false, error: initResult.error };
      }
      if (!this.context) return { success: false, error: 'Context not available' };
      console.log('[LLMService] Generating completion...');
      const startTime = Date.now();
      const result = await this.context.completion({ prompt, n_predict: maxTokens, temperature: 0.7, top_p: 0.9, stop: ['</s>', '\n\n\n'] }, () => {});
      console.log(`[LLMService] Generation completed in ${Date.now() - startTime}ms`);
      return { success: true, text: result.text };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown generation error';
      console.error('[LLMService] Generation error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async generateJSON<T>(prompt: string, maxTokens: number = 512): Promise<{ success: boolean; data?: T; error?: string }> {
    const result = await this.generate(prompt, maxTokens);
    if (!result.success || !result.text) return { success: false, error: result.error || 'No text generated' };
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { success: false, error: 'No JSON found in response' };
      const data = JSON.parse(jsonMatch[0]) as T;
      return { success: true, data };
    } catch (parseError) {
      console.error('[LLMService] JSON parse error:', parseError);
      return { success: false, error: 'Failed to parse JSON response' };
    }
  }

  isLoaded(): boolean { return this.context !== null; }

  async getModelSize(): Promise<number> {
    try {
      if (await this.isModelDownloaded()) {
        const stat = await RNFS.stat(this.modelPath);
        return typeof stat.size === 'string' ? parseInt(stat.size, 10) : stat.size;
      }
      return 0;
    } catch { return 0; }
  }
}

export const LLMService = new LLMServiceClass();
export { MODEL_CONFIG, DEVICE_REQUIREMENTS };
