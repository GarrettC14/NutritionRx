/**
 * Chat Store
 * Manages conversation state for the GPT nutrition chat
 */

import { create } from 'zustand';
import { ChatMessage, ChatContext } from '../types/chat';
import { chatService, ChatServiceError } from '../services/chatService';
import { ERROR_MESSAGES } from '../services/contextBuilder';

interface ChatState {
  // State
  messages: ChatMessage[];
  isGenerating: boolean;
  error: string | null;
  sessionId: string;
  messageCount: number;

  // Actions
  sendMessage: (text: string, context: ChatContext) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearChat: () => void;
  dismissError: () => void;
}

const generateId = (): string =>
  `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateSessionId = (): string =>
  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isGenerating: false,
  error: null,
  sessionId: generateSessionId(),
  messageCount: 0,

  addMessage: (message) => {
    const id = generateId();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
      messageCount: state.messageCount + 1,
    }));

    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  sendMessage: async (text, context) => {
    console.log(`[LLM:ChatStore] sendMessage() — text="${text.substring(0, 100)}...", contextKeys=${Object.keys(context).join(',')}`);
    const sendStart = Date.now();
    const { addMessage, updateMessage } = get();

    // Add user message
    const userId = addMessage({
      role: 'user',
      content: text,
      status: 'sent',
    });
    console.log(`[LLM:ChatStore] Added user message id=${userId}`);

    // Create placeholder assistant message
    const assistantId = addMessage({
      role: 'assistant',
      content: '',
      status: 'sending',
    });
    console.log(`[LLM:ChatStore] Created placeholder assistant message id=${assistantId}`);

    set({ isGenerating: true, error: null });

    try {
      const allMessages = get().messages.filter(
        (m) => m.role !== 'system' && m.id !== assistantId
      );
      console.log(`[LLM:ChatStore] Sending ${allMessages.length} messages to streaming API...`);

      // Use streaming for real-time response
      let fullResponse = '';
      let chunkCount = 0;
      await chatService.sendMessageStreaming(
        allMessages,
        context,
        (chunk) => {
          fullResponse += chunk;
          chunkCount++;
          updateMessage(assistantId, { content: fullResponse });
        }
      );

      console.log(`[LLM:ChatStore] Streaming complete — ${chunkCount} chunks, ${fullResponse.length} chars, ${Date.now() - sendStart}ms`);
      updateMessage(assistantId, { status: 'sent' });
    } catch (error) {
      let errorMessage = ERROR_MESSAGES.api;

      if (error instanceof ChatServiceError) {
        console.error(`[LLM:ChatStore] ChatServiceError: type=${error.type}, message=${error.message}`);
        errorMessage = ERROR_MESSAGES[error.type] || ERROR_MESSAGES.api;
      } else if (error instanceof TypeError && error.message.includes('Network')) {
        console.error(`[LLM:ChatStore] Network error: ${error.message}`);
        errorMessage = ERROR_MESSAGES.network;
      } else {
        console.error('[LLM:ChatStore] Unknown error:', error);
      }

      console.log(`[LLM:ChatStore] Setting error message on assistant: "${errorMessage.substring(0, 100)}..."`);
      updateMessage(assistantId, {
        content: errorMessage,
        status: 'error',
      });

      set({ error: errorMessage });
    } finally {
      set({ isGenerating: false });
      console.log(`[LLM:ChatStore] sendMessage() DONE in ${Date.now() - sendStart}ms`);
    }
  },

  clearChat: () => {
    set({
      messages: [],
      isGenerating: false,
      error: null,
      sessionId: generateSessionId(),
      messageCount: 0,
    });
  },

  dismissError: () => {
    set({ error: null });
  },
}));
