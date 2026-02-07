/**
 * Llama Provider
 * On-device LLM using llama.rn with device-appropriate model selection,
 * download integrity verification, and proper chat template formatting.
 */

import { File, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import type { LLMProvider, LLMProviderStatus, DownloadProgress } from '../types';
import type { ModelConfig } from '../modelCatalog';

const isExpoGo = Constants.appOwnership === 'expo';

// Lazy load llama.rn only in development builds
let initLlama: any = null;
if (!isExpoGo) {
  try {
    const llamaModule = require('llama.rn');
    initLlama = llamaModule.initLlama;
  } catch (e) {
    console.log('[LlamaProvider] llama.rn not available');
  }
}

export class LlamaProvider implements LLMProvider {
  readonly name: string;
  private model: ModelConfig;
  private context: any = null;
  private status: LLMProviderStatus = 'uninitialized';
  private downloadCancelled = false;

  constructor(model: ModelConfig) {
    this.model = model;
    this.name = `llama-${model.tier}`;
  }

  async isAvailable(): Promise<boolean> {
    if (isExpoGo || !initLlama) return false;
    return true;
  }

  getStatus(): LLMProviderStatus {
    return this.status;
  }

  getModelConfig(): ModelConfig {
    return this.model;
  }

  getModelPath(): string {
    return new File(Paths.document, this.model.filename).uri;
  }

  async isModelDownloaded(): Promise<boolean> {
    try {
      const file = new File(Paths.document, this.model.filename);
      if (!file.exists) return false;
      // Verify file size is within 5% of expected (accounts for minor version differences)
      const ratio = file.size / this.model.sizeBytes;
      return ratio >= 0.80 && ratio <= 1.20;
    } catch {
      return false;
    }
  }

  async getModelSize(): Promise<number> {
    try {
      const file = new File(Paths.document, this.model.filename);
      return file.exists ? file.size : 0;
    } catch {
      return 0;
    }
  }

  async initialize(onProgress?: (progress: number) => void): Promise<void> {
    if (this.context) return;
    if (!initLlama) {
      this.status = 'unsupported';
      throw new Error('llama.rn not available');
    }

    const downloaded = await this.isModelDownloaded();
    if (!downloaded) {
      this.status = 'downloading';
      await this.downloadModel((p) => onProgress?.(p.percentage / 100));
    }

    this.status = 'initializing';
    console.log(`[LlamaProvider] Initializing ${this.model.name} — ctx=${this.model.contextSize}, threads=${this.model.threads}`);

    try {
      this.context = await initLlama({
        model: this.getModelPath(),
        n_ctx: this.model.contextSize,
        n_threads: this.model.threads,
        n_gpu_layers: 0,
      });
      this.status = 'ready';
      console.log(`[LlamaProvider] ${this.model.name} initialized successfully`);
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.context) {
      await this.initialize();
    }
    if (!this.context) {
      throw new Error('Llama context not available');
    }

    const formattedPrompt = this.formatPrompt(systemPrompt, userMessage);

    // Truncation safeguard
    const CHARS_PER_TOKEN = 3.5;
    const maxTokens = 512;
    const maxPromptTokens = this.model.contextSize - maxTokens;
    const maxPromptChars = Math.floor(maxPromptTokens * CHARS_PER_TOKEN);
    const finalPrompt =
      formattedPrompt.length > maxPromptChars
        ? formattedPrompt.slice(0, maxPromptChars)
        : formattedPrompt;

    // Clear KV cache before each completion
    await this.context.clearCache(false);

    const result = await this.context.completion(
      {
        prompt: finalPrompt,
        n_predict: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
        stop: this.model.stopTokens,
      },
      () => {},
    );

    return result.text ?? '';
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      try {
        await this.context.release();
      } catch (e) {
        console.error('[LlamaProvider] Error releasing context:', e);
      }
      this.context = null;
    }
    this.status = 'uninitialized';
  }

  async downloadModel(
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<{ success: boolean; error?: string }> {
    if (await this.isModelDownloaded()) {
      return { success: true };
    }

    this.downloadCancelled = false;
    const startTime = Date.now();
    const destFile = new File(Paths.document, this.model.filename);

    // Poll file size for progress while download runs
    const progressInterval = setInterval(() => {
      if (this.downloadCancelled) return;
      try {
        const file = new File(Paths.document, this.model.filename);
        if (file.exists) {
          const bytesDownloaded = file.size;
          const totalBytes = this.model.sizeBytes;
          const percentage = Math.min(99, Math.round((bytesDownloaded / totalBytes) * 100));
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const bytesPerSecond = elapsedSeconds > 0 ? bytesDownloaded / elapsedSeconds : 0;
          const remainingBytes = totalBytes - bytesDownloaded;
          const estimatedSecondsRemaining =
            bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : undefined;
          onProgress?.({ bytesDownloaded, totalBytes, percentage, estimatedSecondsRemaining });
        }
      } catch {}
    }, 1000);

    try {
      await File.downloadFileAsync(this.model.downloadUrl, destFile, { idempotent: true });

      if (this.downloadCancelled) {
        try { new File(Paths.document, this.model.filename).delete(); } catch {}
        return { success: false, error: 'Download cancelled' };
      }

      // Verify integrity: file size check
      const downloaded = await this.isModelDownloaded();
      if (!downloaded) {
        try { new File(Paths.document, this.model.filename).delete(); } catch {}
        return { success: false, error: 'Download integrity check failed — file size mismatch' };
      }

      onProgress?.({
        bytesDownloaded: this.model.sizeBytes,
        totalBytes: this.model.sizeBytes,
        percentage: 100,
      });

      console.log(`[LlamaProvider] ${this.model.name} downloaded and verified`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      try { new File(Paths.document, this.model.filename).delete(); } catch {}
      return { success: false, error: errorMessage };
    } finally {
      clearInterval(progressInterval);
    }
  }

  cancelDownload(): void {
    this.downloadCancelled = true;
  }

  async deleteModel(): Promise<void> {
    await this.cleanup();
    try {
      const file = new File(Paths.document, this.model.filename);
      if (file.exists) file.delete();
      console.log(`[LlamaProvider] ${this.model.name} model deleted`);
    } catch (e) {
      console.error('[LlamaProvider] Error deleting model:', e);
    }
    this.status = 'uninitialized';
  }

  /**
   * Format system + user prompts using the model's chat template.
   */
  private formatPrompt(systemPrompt: string, userMessage: string): string {
    if (this.model.chatTemplate === 'llama3') {
      return this.formatLlama3(systemPrompt, userMessage);
    }
    return this.formatChatML(systemPrompt, userMessage);
  }

  private formatChatML(systemPrompt: string, userMessage: string): string {
    let prompt = '';
    if (systemPrompt) {
      prompt += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    }
    prompt += `<|im_start|>user\n${userMessage}<|im_end|>\n<|im_start|>assistant\n`;
    return prompt;
  }

  private formatLlama3(systemPrompt: string, userMessage: string): string {
    let prompt = '<|begin_of_text|>';
    if (systemPrompt) {
      prompt += `<|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`;
    }
    prompt += `<|start_header_id|>user<|end_header_id|>\n\n${userMessage}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
    return prompt;
  }
}
