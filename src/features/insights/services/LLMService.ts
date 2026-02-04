/**
 * LLM Service
 * Manages on-device LLM for generating nutrition insights
 * Uses llama.rn for React Native integration with llama.cpp
 *
 * Note: LLM features require a development build - they don't work in Expo Go
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import type { LLMCapabilities, LLMDownloadProgress, LLMStatus } from '../types/insights.types';

// Check if we're running in Expo Go (LLM requires development build)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy load llama.rn only in development builds
let initLlama: any = null;

if (!isExpoGo) {
  try {
    const llamaModule = require('llama.rn');
    initLlama = llamaModule.initLlama;
  } catch (e) {
    console.log('[LLMService] llama.rn not available');
  }
}

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
  private context: any = null;
  private isInitializing: boolean = false;
  private modelPath: string;
  private downloadResumable: FileSystem.DownloadResumable | null = null;

  constructor() {
    this.modelPath = `${FileSystem.documentDirectory}${MODEL_CONFIG.fileName}`;
  }

  async checkCapabilities(): Promise<LLMCapabilities> {
    const platform = Platform.OS;
    const osVersion = Platform.Version;
    console.log(`[LLM:Service] checkCapabilities() called — platform=${platform}, osVersion=${osVersion}, isExpoGo=${isExpoGo}, initLlama=${!!initLlama}`);

    // LLM doesn't work in Expo Go
    if (isExpoGo) {
      console.log('[LLM:Service] checkCapabilities → BLOCKED: running in Expo Go');
      return {
        canRunLocalLLM: false,
        reason: 'LLM requires a development build (not available in Expo Go)',
        deviceInfo: { platform, osVersion: String(osVersion) },
      };
    }

    // llama.rn not loaded
    if (!initLlama) {
      console.log('[LLM:Service] checkCapabilities → BLOCKED: initLlama is null (llama.rn not loaded)');
      return {
        canRunLocalLLM: false,
        reason: 'LLM module not available',
        deviceInfo: { platform, osVersion: String(osVersion) },
      };
    }

    try {
      if (platform === 'ios') {
        const iosVersion = typeof osVersion === 'string' ? parseFloat(osVersion) : osVersion;
        console.log(`[LLM:Service] iOS version check: ${iosVersion} >= ${DEVICE_REQUIREMENTS.minIOSVersion}`);
        if (iosVersion < DEVICE_REQUIREMENTS.minIOSVersion) {
          console.log(`[LLM:Service] checkCapabilities → BLOCKED: iOS ${iosVersion} < ${DEVICE_REQUIREMENTS.minIOSVersion}`);
          return {
            canRunLocalLLM: false,
            reason: `Requires iOS ${DEVICE_REQUIREMENTS.minIOSVersion} or later`,
            deviceInfo: { platform, osVersion: String(osVersion) },
          };
        }
      } else if (platform === 'android') {
        const apiLevel = typeof osVersion === 'number' ? osVersion : parseInt(osVersion, 10);
        console.log(`[LLM:Service] Android API level check: ${apiLevel} >= ${DEVICE_REQUIREMENTS.minAndroidAPI}`);
        if (apiLevel < DEVICE_REQUIREMENTS.minAndroidAPI) {
          console.log(`[LLM:Service] checkCapabilities → BLOCKED: Android API ${apiLevel} < ${DEVICE_REQUIREMENTS.minAndroidAPI}`);
          return {
            canRunLocalLLM: false,
            reason: `Requires Android 8.0 or later`,
            deviceInfo: { platform, osVersion: String(osVersion) },
          };
        }
      }

      const freeSpace = await this.getFreeDiskSpace();
      console.log(`[LLM:Service] Free disk space: ${(freeSpace / 1_000_000_000).toFixed(2)}GB (need ${(MODEL_CONFIG.minFreeSpaceBytes / 1_000_000_000).toFixed(2)}GB)`);
      if (freeSpace < MODEL_CONFIG.minFreeSpaceBytes) {
        console.log('[LLM:Service] checkCapabilities → BLOCKED: insufficient storage');
        return {
          canRunLocalLLM: false,
          reason: 'Insufficient storage space (need at least 1.5GB free)',
          deviceInfo: { platform, osVersion: String(osVersion) },
        };
      }

      console.log('[LLM:Service] checkCapabilities → CAPABLE: device can run LLM');
      return { canRunLocalLLM: true, deviceInfo: { platform, osVersion: String(osVersion) } };
    } catch (error) {
      console.error('[LLM:Service] checkCapabilities → ERROR:', error);
      return {
        canRunLocalLLM: false,
        reason: 'Unable to determine device capabilities',
        deviceInfo: { platform, osVersion: String(osVersion) },
      };
    }
  }

  private async getFreeDiskSpace(): Promise<number> {
    try {
      const freeSpace = await FileSystem.getFreeDiskStorageAsync();
      return freeSpace;
    } catch {
      // Return a large value to not block on disk space check errors
      return MODEL_CONFIG.minFreeSpaceBytes * 2;
    }
  }

  async isModelDownloaded(): Promise<boolean> {
    if (isExpoGo) {
      console.log('[LLM:Service] isModelDownloaded → false (Expo Go)');
      return false;
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(this.modelPath);
      console.log(`[LLM:Service] isModelDownloaded check — path=${this.modelPath}, exists=${fileInfo.exists}, size=${fileInfo.exists ? fileInfo.size : 'N/A'}`);
      if (!fileInfo.exists) return false;
      const downloaded = (fileInfo.size ?? 0) >= MODEL_CONFIG.expectedSizeBytes * 0.8;
      console.log(`[LLM:Service] isModelDownloaded → ${downloaded} (size=${fileInfo.size}, threshold=${MODEL_CONFIG.expectedSizeBytes * 0.8})`);
      return downloaded;
    } catch (err) {
      console.log('[LLM:Service] isModelDownloaded → false (error)', err);
      return false;
    }
  }

  async getStatus(): Promise<LLMStatus> {
    console.log(`[LLM:Service] getStatus() called — isExpoGo=${isExpoGo}, hasContext=${!!this.context}, isInitializing=${this.isInitializing}`);
    if (isExpoGo) {
      console.log('[LLM:Service] getStatus → unsupported (Expo Go)');
      return 'unsupported';
    }

    const capabilities = await this.checkCapabilities();
    if (!capabilities.canRunLocalLLM) {
      console.log(`[LLM:Service] getStatus → unsupported (reason: ${capabilities.reason})`);
      return 'unsupported';
    }
    if (this.context) {
      console.log('[LLM:Service] getStatus → ready (context loaded)');
      return 'ready';
    }
    if (this.isInitializing) {
      console.log('[LLM:Service] getStatus → loading (initializing)');
      return 'loading';
    }
    const downloaded = await this.isModelDownloaded();
    const status = downloaded ? 'ready' : 'not_downloaded';
    console.log(`[LLM:Service] getStatus → ${status}`);
    return status;
  }

  async downloadModel(
    onProgress?: (progress: LLMDownloadProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[LLM:Service] downloadModel() called — isExpoGo=${isExpoGo}`);
    if (isExpoGo) {
      console.log('[LLM:Service] downloadModel → ABORT: Expo Go');
      return { success: false, error: 'Downloads not available in Expo Go' };
    }

    try {
      if (await this.isModelDownloaded()) {
        console.log('[LLM:Service] downloadModel → SKIP: already downloaded');
        return { success: true };
      }

      const startTime = Date.now();

      const callback: FileSystem.DownloadProgressCallback = (downloadProgress) => {
        const bytesDownloaded = downloadProgress.totalBytesWritten;
        const totalBytes = downloadProgress.totalBytesExpectedToWrite || MODEL_CONFIG.expectedSizeBytes;
        const percentage = Math.round((bytesDownloaded / totalBytes) * 100);
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const bytesPerSecond = bytesDownloaded / elapsedSeconds;
        const remainingBytes = totalBytes - bytesDownloaded;
        const estimatedSecondsRemaining = Math.round(remainingBytes / bytesPerSecond);

        onProgress?.({ bytesDownloaded, totalBytes, percentage, estimatedSecondsRemaining });
      };

      this.downloadResumable = FileSystem.createDownloadResumable(
        MODEL_CONFIG.downloadUrl,
        this.modelPath,
        {},
        callback
      );

      console.log('[LLMService] Download started');
      const result = await this.downloadResumable.downloadAsync();

      if (result?.uri) {
        console.log('[LLMService] Download completed successfully');
        return { success: true };
      } else {
        throw new Error('Download failed - no URI returned');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
      console.error('[LLMService] Download error:', errorMessage);

      // Clean up partial download
      try {
        const fileInfo = await FileSystem.getInfoAsync(this.modelPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(this.modelPath, { idempotent: true });
        }
      } catch {}

      return { success: false, error: errorMessage };
    } finally {
      this.downloadResumable = null;
    }
  }

  cancelDownload(): void {
    if (this.downloadResumable) {
      this.downloadResumable.pauseAsync().catch(() => {});
      this.downloadResumable = null;
    }
  }

  async deleteModel(): Promise<void> {
    try {
      await this.unload();
      const fileInfo = await FileSystem.getInfoAsync(this.modelPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(this.modelPath, { idempotent: true });
        console.log('[LLMService] Model deleted');
      }
    } catch (error) {
      console.error('[LLMService] Error deleting model:', error);
    }
  }

  async initialize(): Promise<{ success: boolean; error?: string }> {
    console.log(`[LLM:Service] initialize() called — isExpoGo=${isExpoGo}, initLlama=${!!initLlama}, hasContext=${!!this.context}, isInitializing=${this.isInitializing}`);

    if (isExpoGo || !initLlama) {
      console.log('[LLM:Service] initialize → ABORT: not available in Expo Go or llama.rn missing');
      return { success: false, error: 'LLM not available in Expo Go' };
    }

    if (this.context) {
      console.log('[LLM:Service] initialize → SKIP: context already loaded');
      return { success: true };
    }
    if (this.isInitializing) {
      console.log('[LLM:Service] initialize → SKIP: already initializing');
      return { success: false, error: 'Already initializing' };
    }

    try {
      this.isInitializing = true;
      const downloaded = await this.isModelDownloaded();
      if (!downloaded) {
        console.log('[LLM:Service] initialize → ABORT: model not downloaded');
        return { success: false, error: 'Model not downloaded' };
      }

      console.log(`[LLM:Service] Initializing LLM context — model=${this.modelPath}, n_ctx=${MODEL_CONFIG.contextSize}, threads=${MODEL_CONFIG.threads}, gpuLayers=${MODEL_CONFIG.gpuLayers}`);
      const initStart = Date.now();
      this.context = await initLlama({
        model: this.modelPath,
        n_ctx: MODEL_CONFIG.contextSize,
        n_threads: MODEL_CONFIG.threads,
        n_gpu_layers: MODEL_CONFIG.gpuLayers,
      });
      console.log(`[LLM:Service] Context initialized successfully in ${Date.now() - initStart}ms`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('[LLM:Service] initialize → ERROR:', errorMessage, error);
      return { success: false, error: errorMessage };
    } finally {
      this.isInitializing = false;
    }
  }

  async unload(): Promise<void> {
    if (this.context) {
      try {
        await this.context.release();
        this.context = null;
        console.log('[LLMService] LLM context unloaded');
      } catch (error) {
        console.error('[LLMService] Error unloading context:', error);
      }
    }
  }

  /**
   * Wrap a raw prompt in ChatML template.
   * SmolLM2-Instruct is fine-tuned with ChatML — without this wrapper
   * the model echoes/continues the raw prompt instead of answering it.
   */
  private formatChatPrompt(prompt: string): string {
    return `<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;
  }

  /**
   * Stop tokens matching the ChatML template so the model knows when
   * to stop generating. Generic sequences like '\n\n\n' cause premature stops.
   */
  private getStopTokens(): string[] {
    return ['<|im_end|>', '<|im_start|>'];
  }

  async generate(
    prompt: string,
    maxTokens: number = 512
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    console.log(`[LLM:Service] generate() called — promptLength=${prompt.length}, maxTokens=${maxTokens}, hasContext=${!!this.context}`);
    console.log(`[LLM:Service] generate() prompt preview: "${prompt.substring(0, 200)}..."`);

    if (isExpoGo) {
      console.log('[LLM:Service] generate → ABORT: Expo Go');
      return { success: false, error: 'LLM not available in Expo Go' };
    }

    try {
      if (!this.context) {
        console.log('[LLM:Service] generate → context not loaded, calling initialize()...');
        const initResult = await this.initialize();
        if (!initResult.success) {
          console.log(`[LLM:Service] generate → initialize failed: ${initResult.error}`);
          return { success: false, error: initResult.error };
        }
      }
      if (!this.context) {
        console.log('[LLM:Service] generate → ABORT: context still null after initialize');
        return { success: false, error: 'Context not available' };
      }

      // Wrap prompt in ChatML template (SmolLM2 is instruction-tuned with ChatML)
      const formattedPrompt = this.formatChatPrompt(prompt);
      console.log(`[LLM:Service] Formatted prompt length: ${formattedPrompt.length} chars (raw: ${prompt.length})`);

      // Truncation safeguard — estimate token count and truncate if needed
      const CHARS_PER_TOKEN = 3.5;
      const maxPromptTokens = MODEL_CONFIG.contextSize - maxTokens;
      const maxPromptChars = Math.floor(maxPromptTokens * CHARS_PER_TOKEN);
      let finalPrompt = formattedPrompt;
      if (formattedPrompt.length > maxPromptChars) {
        console.warn(`[LLM:Service] Prompt too long (${formattedPrompt.length} chars > ${maxPromptChars} max), truncating`);
        finalPrompt = formattedPrompt.slice(0, maxPromptChars);
      }

      // Clear KV cache to prevent token accumulation across calls
      await this.context.clearCache(false);

      const stopTokens = this.getStopTokens();
      console.log(`[LLM:Service] Starting completion — n_predict=${maxTokens}, temp=0.7, top_p=0.9, stops=[${stopTokens.join(', ')}]`);
      const startTime = Date.now();
      const result = await this.context.completion(
        {
          prompt: finalPrompt,
          n_predict: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          stop: stopTokens,
        },
        () => {}
      );
      const elapsed = Date.now() - startTime;
      console.log(`[LLM:Service] Generation completed in ${elapsed}ms — outputLength=${result.text?.length || 0}`);
      console.log(`[LLM:Service] Generated text: "${result.text?.substring(0, 300)}${(result.text?.length || 0) > 300 ? '...' : ''}"`);
      return { success: true, text: result.text };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown generation error';
      console.error('[LLM:Service] generate → ERROR:', errorMessage, error);
      return { success: false, error: errorMessage };
    }
  }

  async generateJSON<T>(
    prompt: string,
    maxTokens: number = 512
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    console.log(`[LLM:Service] generateJSON() called — promptLength=${prompt.length}, maxTokens=${maxTokens}`);
    const result = await this.generate(prompt, maxTokens);
    if (!result.success || !result.text) {
      console.log(`[LLM:Service] generateJSON → no text: success=${result.success}, error=${result.error}`);
      return { success: false, error: result.error || 'No text generated' };
    }

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log(`[LLM:Service] generateJSON → no JSON found in response: "${result.text.substring(0, 200)}"`);
        return { success: false, error: 'No JSON found in response' };
      }
      console.log(`[LLM:Service] generateJSON → extracted JSON (${jsonMatch[0].length} chars): "${jsonMatch[0].substring(0, 200)}..."`);
      const data = JSON.parse(jsonMatch[0]) as T;
      console.log('[LLM:Service] generateJSON → parsed successfully:', JSON.stringify(data).substring(0, 200));
      return { success: true, data };
    } catch (parseError) {
      console.error('[LLM:Service] generateJSON → parse error:', parseError, 'raw text:', result.text.substring(0, 300));
      return { success: false, error: 'Failed to parse JSON response' };
    }
  }

  isLoaded(): boolean {
    return this.context !== null;
  }

  isAvailable(): boolean {
    return !isExpoGo && initLlama !== null;
  }

  async getModelSize(): Promise<number> {
    try {
      if (await this.isModelDownloaded()) {
        const fileInfo = await FileSystem.getInfoAsync(this.modelPath);
        return fileInfo.size ?? 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

export const LLMService = new LLMServiceClass();
export { MODEL_CONFIG, DEVICE_REQUIREMENTS };
