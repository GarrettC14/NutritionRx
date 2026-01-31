/**
 * Chat Service
 * Handles OpenAI API communication for the nutrition chat feature
 */

import { ChatMessage, ChatContext } from '../types/chat';
import { buildSystemPrompt, detectSafetyTriggers, SAFETY_RESPONSES } from './contextBuilder';
import { openaiConfig } from '@/config/api';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface SendMessageOptions {
  stream?: boolean;
  model?: 'gpt-4o-mini' | 'gpt-4o';
}

/**
 * Send a message to OpenAI and get a response
 * Returns the full response text (non-streaming)
 */
export async function sendMessage(
  messages: ChatMessage[],
  context: ChatContext,
  options: SendMessageOptions = {}
): Promise<string> {
  const { model = 'gpt-4o-mini' } = options;

  // Check for safety triggers in the latest user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMessage) {
    const trigger = detectSafetyTriggers(lastUserMessage.content);
    if (trigger) {
      return SAFETY_RESPONSES[trigger];
    }
  }

  const apiKey = openaiConfig.apiKey;
  if (!apiKey) {
    throw new ChatServiceError('OpenAI API key not configured', 'api');
  }

  const systemPrompt = buildSystemPrompt(context);

  const requestBody = {
    model,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...messages
        .filter((m) => m.role !== 'system')
        .slice(-openaiConfig.maxConversationHistory)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
    max_tokens: openaiConfig.maxTokens,
    temperature: openaiConfig.temperature,
    stream: false,
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new ChatServiceError('Rate limited', 'rate_limited');
    }
    if (response.status === 401 || response.status === 403) {
      throw new ChatServiceError('Invalid API key', 'api');
    }
    throw new ChatServiceError(`API request failed: ${response.status}`, 'api');
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new ChatServiceError('No response from OpenAI', 'api');
  }

  return data.choices[0].message.content;
}

/**
 * Send a message with streaming response
 * Calls onChunk for each text chunk received
 */
export async function sendMessageStreaming(
  messages: ChatMessage[],
  context: ChatContext,
  onChunk: (chunk: string) => void,
  options: SendMessageOptions = {}
): Promise<string> {
  const { model = 'gpt-4o-mini' } = options;

  // Check for safety triggers
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMessage) {
    const trigger = detectSafetyTriggers(lastUserMessage.content);
    if (trigger) {
      const response = SAFETY_RESPONSES[trigger];
      onChunk(response);
      return response;
    }
  }

  const apiKey = openaiConfig.apiKey;
  if (!apiKey) {
    throw new ChatServiceError('OpenAI API key not configured', 'api');
  }

  const systemPrompt = buildSystemPrompt(context);

  const requestBody = {
    model,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...messages
        .filter((m) => m.role !== 'system')
        .slice(-openaiConfig.maxConversationHistory)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
    max_tokens: openaiConfig.maxTokens,
    temperature: openaiConfig.temperature,
    stream: true,
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new ChatServiceError('Rate limited', 'rate_limited');
    }
    if (response.status === 401 || response.status === 403) {
      throw new ChatServiceError('Invalid API key', 'api');
    }
    throw new ChatServiceError(`API request failed: ${response.status}`, 'api');
  }

  // Parse SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new ChatServiceError('No response body', 'api');
  }

  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          onChunk(delta);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return fullResponse;
}

/**
 * Custom error class for chat service errors
 */
export class ChatServiceError extends Error {
  type: 'network' | 'api' | 'rate_limited' | 'offline';

  constructor(message: string, type: 'network' | 'api' | 'rate_limited' | 'offline') {
    super(message);
    this.name = 'ChatServiceError';
    this.type = type;
  }
}

export const chatService = {
  sendMessage,
  sendMessageStreaming,
};
