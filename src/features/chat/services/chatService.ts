/**
 * Chat Service
 * Handles OpenAI API communication for the nutrition chat feature
 */

import { ChatMessage, ChatContext } from '../types/chat';
import { buildSystemPrompt, detectSafetyTriggers, SAFETY_RESPONSES } from './contextBuilder';
import { openaiConfig } from '@/config/api';
import { proxyOpenAIChat } from '@/services/backendService';

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
  if (__DEV__) console.log(`[LLM:Chat] sendMessage() — model=${model}, messageCount=${messages.length}, stream=false`);

  // Check for safety triggers in the latest user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMessage) {
    if (__DEV__) console.log(`[LLM:Chat] Last user message: "${lastUserMessage.content.substring(0, 100)}..."`);
    const trigger = detectSafetyTriggers(lastUserMessage.content);
    if (trigger) {
      if (__DEV__) console.log(`[LLM:Chat] Safety trigger detected: ${trigger}`);
      return SAFETY_RESPONSES[trigger];
    }
  }

  const systemPrompt = buildSystemPrompt(context);
  if (__DEV__) console.log(`[LLM:Chat] System prompt built (${systemPrompt.length} chars)`);

  const filteredMessages = messages
    .filter((m) => m.role !== 'system')
    .slice(-openaiConfig.maxConversationHistory);
  if (__DEV__) console.log(`[LLM:Chat] Sending ${filteredMessages.length} messages (maxHistory=${openaiConfig.maxConversationHistory}), maxTokens=${openaiConfig.maxTokens}, temp=${openaiConfig.temperature}`);

  const proxyMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...filteredMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const apiStart = Date.now();

  try {
    const data = await proxyOpenAIChat(proxyMessages, {
      model,
      max_tokens: openaiConfig.maxTokens,
      temperature: openaiConfig.temperature,
    });

    if (__DEV__) console.log(`[LLM:Chat] Proxy response parsed — choices=${data.choices?.length || 0}, usage=${JSON.stringify(data.usage || {})} (${Date.now() - apiStart}ms)`);

    if (!data.choices || data.choices.length === 0) {
      if (__DEV__) console.error('[LLM:Chat] No choices in response');
      throw new ChatServiceError('No response from OpenAI', 'api');
    }

    const responseText = data.choices[0].message.content;
    if (__DEV__) console.log(`[LLM:Chat] sendMessage COMPLETE — responseLength=${responseText.length}, preview="${responseText.substring(0, 150)}..."`);
    return responseText;
  } catch (error) {
    if (error instanceof ChatServiceError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('429')) throw new ChatServiceError('Rate limited', 'rate_limited');
    if (__DEV__) console.error(`[LLM:Chat] Proxy error (${Date.now() - apiStart}ms):`, error);
    throw new ChatServiceError(`API request failed: ${msg}`, 'api');
  }
}

/**
 * Send a message with streaming response
 * Calls onChunk for each text chunk received
 *
 * // TODO: re-enable true SSE streaming when Supabase openai-proxy streaming support is confirmed
 * Currently uses non-streaming proxy and delivers the full response via onChunk.
 */
export async function sendMessageStreaming(
  messages: ChatMessage[],
  context: ChatContext,
  onChunk: (chunk: string) => void,
  options: SendMessageOptions = {}
): Promise<string> {
  const { model = 'gpt-4o-mini' } = options;
  if (__DEV__) console.log(`[LLM:Chat] sendMessageStreaming() — model=${model}, messageCount=${messages.length} (non-streaming proxy)`);

  // Check for safety triggers
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMessage) {
    if (__DEV__) console.log(`[LLM:Chat] Streaming — last user message: "${lastUserMessage.content.substring(0, 100)}..."`);
    const trigger = detectSafetyTriggers(lastUserMessage.content);
    if (trigger) {
      if (__DEV__) console.log(`[LLM:Chat] Safety trigger detected in streaming: ${trigger}`);
      const response = SAFETY_RESPONSES[trigger];
      onChunk(response);
      return response;
    }
  }

  const systemPrompt = buildSystemPrompt(context);
  if (__DEV__) console.log(`[LLM:Chat] Streaming system prompt built (${systemPrompt.length} chars)`);

  const filteredMessages = messages
    .filter((m) => m.role !== 'system')
    .slice(-openaiConfig.maxConversationHistory);
  if (__DEV__) console.log(`[LLM:Chat] Streaming ${filteredMessages.length} messages`);

  const proxyMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...filteredMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const apiStart = Date.now();

  try {
    const data = await proxyOpenAIChat(proxyMessages, {
      model,
      max_tokens: openaiConfig.maxTokens,
      temperature: openaiConfig.temperature,
    });

    if (__DEV__) console.log(`[LLM:Chat] Proxy response (streaming path) — choices=${data.choices?.length || 0}, usage=${JSON.stringify(data.usage || {})} (${Date.now() - apiStart}ms)`);

    if (!data.choices || data.choices.length === 0) {
      if (__DEV__) console.error('[LLM:Chat] No choices in response');
      throw new ChatServiceError('No response from OpenAI', 'api');
    }

    const fullResponse = data.choices[0].message.content;
    onChunk(fullResponse);

    if (__DEV__) console.log(`[LLM:Chat] Streaming COMPLETE in ${Date.now() - apiStart}ms — responseLength=${fullResponse.length}`);
    return fullResponse;
  } catch (error) {
    if (error instanceof ChatServiceError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('429')) throw new ChatServiceError('Rate limited', 'rate_limited');
    if (__DEV__) console.error(`[LLM:Chat] Streaming proxy error (${Date.now() - apiStart}ms):`, error);
    throw new ChatServiceError(`API request failed: ${msg}`, 'api');
  }
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
