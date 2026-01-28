/**
 * LLM Service
 * Manages on-device LLM for generating nutrition insights
 * Uses llama.rn for React Native integration with llama.cpp
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { initLlama, LlamaContext } from 'llama.rn';
import type { LLMCapabilities, LLMDownloadProgress, LLMStatus } from '../types/insights.types';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Model configuration
 * SmolLM2-1.7B-Instruct is the recommended model for mobile
 */
const MODEL_CONFIG = {
  // Model file name
  fileName: 'smollm2-1.7b-instruct-q4_k_m.gguf',

  // Model download URL (hosted CDN)
  downloadUrl:
    'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf',

  // Approximate model size in bytes (~1.0GB)
  expectedSizeBytes: 1_000_000_000,

  // Minimum free space required (1.5GB to be safe)
  minFreeSpaceBytes: 1_500_000_000,

  // Context window size
  contextSize: 2048,

  // CPU threads for inference
  threads: 4,

  // GPU layers (0 for CPU-only compatibility)
  gpuLayers: 0,
} as const;

/**
 * Minimum device requirements
 */
const DEVICE_REQUIREMENTS = {
  // iOS minimum version (iOS 14+)
  minIOSVersion: 14,

  // Android minimum API level (26 = Android 8.0)
  minAndroidAPI: 26,

  // Minimum free RAM for inference (~2GB)
  minFreeRAMBytes: 2_000_000_000,
} as const;

// ============================================
// LLM SERVICE CLASS
// ============================================

class LLMServiceClass {
  private context: LlamaContext | null = null;
  private isInitializing: boolean = false;
  private modelPath: string;
  private downloadAbortController: AbortController | null = null;

  constructor() {
    // Model stored in app documents directory (persistent across updates)
    this.modelPath = `${RNFS.DocumentDirectoryPath}/${MODEL_CONFIG.fileName}`;
  }

  // ============================================
  // CAPABILITY DETECTION
  // ============================================

  /**
   * Check if the device can run the local LLM
   */
  async checkCapabilities(): Promise<LLMCapabilities> {
    const platform = Platform.OS;
    const osVersion = Platform.Version;

    try {
      // Check platform version
      if (platform === 'ios') {
        const iosVersion = typeof osVersion === 'string' ? parseFloat(osVersion) : osVersion;
        if (iosVersion < DEVICE_REQUIREMENTS.minIOSVersion) {
          return {
            canRunLocalLLM: false,
            reason: `Requires iOS ${DEVICE_REQUIREMENTS.minIOSVersion} or later`,
            deviceInfo: { platform, osVersion: String(osVersion) },
          };
        }
      } else if (platform === 'android') {
        const apiLevel = typeof osVersion === 'number' ? osVersion : parseInt(osVersion, 10);
        if (apiLevel < DEVICE_REQUIREMENTS.minAndroidAPI) {
          return {
            canRunLocalLLM: false,
            reason: `Requires Android 8.0 or later`,
            deviceInfo: { platform, osVersion: String(osVersion) },
          };
        }
      }

      // Check available storage
      const freeSpace = await this.getFreeDiskSpace();
      if (freeSpace < MODEL_CONFIG.minFreeSpaceBytes) {
        return {
          canRunLocalLLM: false,
          reason: 'Insufficient storage space (need at least 1.5GB free)',
          deviceInfo: { platform, osVersion: String(osVersion) },
        };
      }

      // Device meets requirements
      return {
        canRunLocalLLM: true,
        deviceInfo: { platform, osVersion: String(osVersion) },
      };
    } catch (error) {
      console.error('[LLMService] Error checking capabilities:', error);
      return {
        canRunLocalLLM: false,
        reason: 'Unable to determine device capabilities',
        deviceInfo: { platform, osVersion: String(osVersion) },
      };
    }
  }

  /**
   * Get free disk space
   */
  private async getFreeDiskSpace(): Promise<number> {
    try {
      const info = await RNFS.getFSInfo();
      return info.freeSpace;
    } catch {
      // If we can't determine free space, assume we have enough
      return MODEL_CONFIG.minFreeSpaceBytes * 2;
    }
  }

  // ============================================
  // MODEL MANAGEMENT
  // ============================================

  /**
   * Check if model is downloaded
   */
  async isModelDownloaded(): Promise<boolean> {
    try {
      const exists = await RNFS.exists(this.modelPath);
      if (!exists) return false;

      // Verify file size is reasonable (at least 80% of expected)
      const stat = await RNFS.stat(this.modelPath);
      const fileSize = typeof stat.size === 'string' ? parseInt(stat.size, 10) : stat.size;
      return fileSize >= MODEL_CONFIG.expectedSizeBytes * 0.8;
    } catch {
      return false;
    }
  }

  /**
   * Get current model status
   */
  async getStatus(): Promise<LLMStatus> {
    const capabilities = await this.checkCapabilities();

    if (!capabilities.canRunLocalLLM) {
      return 'unsupported';
    }

    if (this.context) {
      return 'ready';
    }

    if (this.isInitializing) {
      return 'loading';
    }

    const downloaded = await this.isModelDownloaded();
    return downloaded ? 'ready' : 'not_downloaded';
  }

  /**
   * Download the model file
   * @param onProgress - Progress callback
   */
  async downloadModel(
    onProgress?: (progress: LLMDownloadProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if already downloaded
      if (await this.isModelDownloaded()) {
        return { success: true };
      }

      // Create abort controller for cancellation
      this.downloadAbortController = new AbortController();

      const startTime = Date.now();
      let lastProgressTime = startTime;

      // Start download
      const downloadResult = await RNFS.downloadFile({
        fromUrl: MODEL_CONFIG.downloadUrl,
        toFile: this.modelPath,
        background: true,
        discretionary: true,
        begin: (res) => {
          console.log('[LLMService] Download started, content length:', res.contentLength);
        },
        progress: (res) => {
          const now = Date.now();
          const bytesDownloaded = res.bytesWritten;
          const totalBytes = res.contentLength || MODEL_CONFIG.expectedSizeBytes;
          const percentage = Math.round((bytesDownloaded / totalBytes) * 100);

          // Calculate estimated time remaining
          const elapsedSeconds = (now - startTime) / 1000;
          const bytesPerSecond = bytesDownloaded / elapsedSeconds;
          const remainingBytes = totalBytes - bytesDownloaded;
          const estimatedSecondsRemaining = Math.round(remainingBytes / bytesPerSecond);

          // Throttle progress updates to every 500ms
          if (now - lastProgressTime >= 500 || percentage === 100) {
            lastProgressTime = now;
            onProgress?.({
              bytesDownloaded,
              totalBytes,
              percentage,
              estimatedSecondsRemaining,
            });
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

      // Clean up partial download
      try {
        const exists = await RNFS.exists(this.modelPath);
        if (exists) {
          await RNFS.unlink(this.modelPath);
        }
      } catch {
        // Ignore cleanup errors
      }

      return { success: false, error: errorMessage };
    } finally {
      this.downloadAbortController = null;
    }
  }

  /**
   * Cancel ongoing download
   */
  cancelDownload(): void {
    this.downloadAbortController?.abort();
  }

  /**
   * Delete the downloaded model
   */
  async deleteModel(): Promise<void> {
    try {
      // Unload context first if loaded
      await this.unload();

      const exists = await RNFS.exists(this.modelPath);
      if (exists) {
        await RNFS.unlink(this.modelPath);
        console.log('[LLMService] Model deleted');
      }
    } catch (error) {
      console.error('[LLMService] Error deleting model:', error);
    }
  }

  // ============================================
  // CONTEXT MANAGEMENT
  // ============================================

  /**
   * Initialize the LLM context
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.context) {
      return { success: true };
    }

    if (this.isInitializing) {
      return { success: false, error: 'Already initializing' };
    }

    try {
      this.isInitializing = true;

      // Verify model exists
      const downloaded = await this.isModelDownloaded();
      if (!downloaded) {
        return { success: false, error: 'Model not downloaded' };
      }

      console.log('[LLMService] Initializing LLM context...');

      // Initialize llama context
      this.context = await initLlama({
        model: this.modelPath,
        n_ctx: MODEL_CONFIG.contextSize,
        n_threads: MODEL_CONFIG.threads,
        n_gpu_layers: MODEL_CONFIG.gpuLayers,
      });

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

  /**
   * Unload the LLM context to free memory
   */
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

  // ============================================
  // INFERENCE
  // ============================================

  /**
   * Generate text completion
   * @param prompt - The prompt to complete
   * @param maxTokens - Maximum tokens to generate (default: 512)
   */
  async generate(
    prompt: string,
    maxTokens: number = 512
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      // Initialize if needed
      if (!this.context) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      if (!this.context) {
        return { success: false, error: 'Context not available' };
      }

      console.log('[LLMService] Generating completion...');
      const startTime = Date.now();

      // Generate completion
      const result = await this.context.completion(
        {
          prompt,
          n_predict: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          stop: ['</s>', '\n\n\n'], // Stop tokens
        },
        (token) => {
          // Optional: streaming callback if needed
        }
      );

      const elapsedMs = Date.now() - startTime;
      console.log(`[LLMService] Generation completed in ${elapsedMs}ms`);

      return { success: true, text: result.text };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown generation error';
      console.error('[LLMService] Generation error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate JSON response (with parsing)
   * @param prompt - The prompt expecting JSON output
   * @param maxTokens - Maximum tokens to generate
   */
  async generateJSON<T>(
    prompt: string,
    maxTokens: number = 512
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const result = await this.generate(prompt, maxTokens);

    if (!result.success || !result.text) {
      return { success: false, error: result.error || 'No text generated' };
    }

    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'No JSON found in response' };
      }

      const data = JSON.parse(jsonMatch[0]) as T;
      return { success: true, data };
    } catch (parseError) {
      console.error('[LLMService] JSON parse error:', parseError);
      return { success: false, error: 'Failed to parse JSON response' };
    }
  }

  // ============================================
  // MEMORY MANAGEMENT
  // ============================================

  /**
   * Check if context is loaded
   */
  isLoaded(): boolean {
    return this.context !== null;
  }

  /**
   * Get model file size in bytes
   */
  async getModelSize(): Promise<number> {
    try {
      if (await this.isModelDownloaded()) {
        const stat = await RNFS.stat(this.modelPath);
        return typeof stat.size === 'string' ? parseInt(stat.size, 10) : stat.size;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const LLMService = new LLMServiceClass();

// Export config for use in other modules
export { MODEL_CONFIG, DEVICE_REQUIREMENTS };
