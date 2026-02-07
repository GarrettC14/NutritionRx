/**
 * Apple Foundation Provider
 * Uses Apple's on-device Foundation Models via react-native-apple-llm.
 * Available on iOS 26+ with Apple Intelligence-eligible hardware.
 */

import { Platform } from 'react-native';
import type { LLMProvider, LLMProviderStatus } from '../types';

// Conditionally import react-native-apple-llm (may not exist on Android)
let AppleLLMModule: {
  isFoundationModelsEnabled: () => Promise<string>;
  AppleLLMSession: new () => any;
} | null = null;

try {
  AppleLLMModule = require('react-native-apple-llm');
} catch {
  console.log('[AppleFoundationProvider] react-native-apple-llm not available');
}

export class AppleFoundationProvider implements LLMProvider {
  readonly name = 'apple-foundation';
  private session: any = null;
  private status: LLMProviderStatus = 'uninitialized';
  private currentSystemPrompt: string | null = null;

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !AppleLLMModule) return false;

    try {
      const availability = await AppleLLMModule.isFoundationModelsEnabled();
      return availability === 'available';
    } catch {
      return false;
    }
  }

  getStatus(): LLMProviderStatus {
    return this.status;
  }

  async initialize(): Promise<void> {
    if (this.session) return;
    if (!AppleLLMModule) {
      this.status = 'unsupported';
      throw new Error('Apple Foundation Models not available');
    }

    this.status = 'initializing';
    try {
      this.session = new AppleLLMModule.AppleLLMSession();
      this.status = 'ready';
      console.log('[AppleFoundationProvider] Session created');
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.session) {
      await this.initialize();
    }
    if (!this.session) {
      throw new Error('Apple Foundation session not available');
    }

    // Reconfigure session if system prompt changed
    if (systemPrompt !== this.currentSystemPrompt) {
      await this.session.configure({ instructions: systemPrompt });
      this.currentSystemPrompt = systemPrompt;
    }

    const result = await this.session.generateText({ prompt: userMessage });
    return typeof result === 'string' ? result : String(result);
  }

  async cleanup(): Promise<void> {
    if (this.session) {
      try {
        this.session.dispose();
      } catch {}
      this.session = null;
      this.currentSystemPrompt = null;
    }
    this.status = 'uninitialized';
  }
}
