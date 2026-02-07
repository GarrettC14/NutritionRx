/**
 * LLM Provider Types
 * Shared interfaces for the multi-provider LLM architecture.
 */

export type LLMProviderStatus =
  | 'uninitialized'
  | 'checking'
  | 'downloading'
  | 'initializing'
  | 'ready'
  | 'error'
  | 'unsupported';

export interface LLMProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  initialize(onProgress?: (progress: number) => void): Promise<void>;
  generate(systemPrompt: string, userMessage: string): Promise<string>;
  getStatus(): LLMProviderStatus;
  cleanup(): Promise<void>;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  estimatedSecondsRemaining?: number;
}
