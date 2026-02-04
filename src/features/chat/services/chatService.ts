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
  console.log(`[LLM:Chat] sendMessage() — model=${model}, messageCount=${messages.length}, stream=false`);

  // Check for safety triggers in the latest user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMessage) {
    console.log(`[LLM:Chat] Last user message: "${lastUserMessage.content.substring(0, 100)}..."`);
    const trigger = detectSafetyTriggers(lastUserMessage.content);
    if (trigger) {
      console.log(`[LLM:Chat] Safety trigger detected: ${trigger}`);
      return SAFETY_RESPONSES[trigger];
    }
  }

  const apiKey = openaiConfig.apiKey;
  if (!apiKey) {
    console.error('[LLM:Chat] No API key configured');
    throw new ChatServiceError('OpenAI API key not configured', 'api');
  }

  const systemPrompt = buildSystemPrompt(context);
  console.log(`[LLM:Chat] System prompt built (${systemPrompt.length} chars)`);

  const filteredMessages = messages
    .filter((m) => m.role !== 'system')
    .slice(-openaiConfig.maxConversationHistory);
  console.log(`[LLM:Chat] Sending ${filteredMessages.length} messages (maxHistory=${openaiConfig.maxConversationHistory}), maxTokens=${openaiConfig.maxTokens}, temp=${openaiConfig.temperature}`);

  const requestBody = {
    model,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...filteredMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
    max_tokens: openaiConfig.maxTokens,
    temperature: openaiConfig.temperature,
    stream: false,
  };

  const apiStart = Date.now();
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[LLM:Chat] API response — status=${response.status}, ok=${response.ok} (${Date.now() - apiStart}ms)`);

  if (!response.ok) {
    if (response.status === 429) {
      console.error('[LLM:Chat] Rate limited (429)');
      throw new ChatServiceError('Rate limited', 'rate_limited');
    }
    if (response.status === 401 || response.status === 403) {
      console.error(`[LLM:Chat] Auth error (${response.status})`);
      throw new ChatServiceError('Invalid API key', 'api');
    }
    const errorText = await response.text();
    console.error(`[LLM:Chat] API error ${response.status}: ${errorText.substring(0, 300)}`);
    throw new ChatServiceError(`API request failed: ${response.status}`, 'api');
  }

  const data = await response.json();
  console.log(`[LLM:Chat] Response parsed — choices=${data.choices?.length || 0}, usage=${JSON.stringify(data.usage || {})}`);

  if (!data.choices || data.choices.length === 0) {
    console.error('[LLM:Chat] No choices in response');
    throw new ChatServiceError('No response from OpenAI', 'api');
  }

  const responseText = data.choices[0].message.content;
  console.log(`[LLM:Chat] sendMessage COMPLETE — responseLength=${responseText.length}, preview="${responseText.substring(0, 150)}..."`);
  return responseText;
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
  console.log(`[LLM:Chat] sendMessageStreaming() — model=${model}, messageCount=${messages.length}`);

  // Check for safety triggers
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMessage) {
    console.log(`[LLM:Chat] Streaming — last user message: "${lastUserMessage.content.substring(0, 100)}..."`);
    const trigger = detectSafetyTriggers(lastUserMessage.content);
    if (trigger) {
      console.log(`[LLM:Chat] Safety trigger detected in streaming: ${trigger}`);
      const response = SAFETY_RESPONSES[trigger];
      onChunk(response);
      return response;
    }
  }

  const apiKey = openaiConfig.apiKey;
  if (!apiKey) {
    console.error('[LLM:Chat] No API key configured (streaming)');
    throw new ChatServiceError('OpenAI API key not configured', 'api');
  }

  const systemPrompt = buildSystemPrompt(context);
  console.log(`[LLM:Chat] Streaming system prompt built (${systemPrompt.length} chars)`);

  const filteredMessages = messages
    .filter((m) => m.role !== 'system')
    .slice(-openaiConfig.maxConversationHistory);
  console.log(`[LLM:Chat] Streaming ${filteredMessages.length} messages`);

  const requestBody = {
    model,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...filteredMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
    max_tokens: openaiConfig.maxTokens,
    temperature: openaiConfig.temperature,
    stream: true,
  };

  const apiStart = Date.now();
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[LLM:Chat] Streaming API response — status=${response.status}, ok=${response.ok} (${Date.now() - apiStart}ms to first byte)`);

  if (!response.ok) {
    if (response.status === 429) {
      console.error('[LLM:Chat] Streaming rate limited (429)');
      throw new ChatServiceError('Rate limited', 'rate_limited');
    }
    if (response.status === 401 || response.status === 403) {
      console.error(`[LLM:Chat] Streaming auth error (${response.status})`);
      throw new ChatServiceError('Invalid API key', 'api');
    }
    const errorText = await response.text();
    console.error(`[LLM:Chat] Streaming API error ${response.status}: ${errorText.substring(0, 300)}`);
    throw new ChatServiceError(`API request failed: ${response.status}`, 'api');
  }

  // Parse SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    console.error('[LLM:Chat] No response body for streaming');
    throw new ChatServiceError('No response body', 'api');
  }

  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';
  let chunkCount = 0;

  console.log('[LLM:Chat] Starting SSE stream parsing...');
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
      if (data === '[DONE]') {
        console.log('[LLM:Chat] Stream [DONE] received');
        continue;
      }

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          chunkCount++;
          onChunk(delta);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  console.log(`[LLM:Chat] Streaming COMPLETE in ${Date.now() - apiStart}ms — ${chunkCount} chunks, responseLength=${fullResponse.length}`);
  console.log(`[LLM:Chat] Streaming response preview: "${fullResponse.substring(0, 200)}${fullResponse.length > 200 ? '...' : ''}"`);
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
