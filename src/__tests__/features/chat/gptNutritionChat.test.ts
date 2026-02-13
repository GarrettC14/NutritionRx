/**
 * GPT Nutrition Chat Tests (Feature 5)
 *
 * Tests the complete GPT-powered nutrition chat feature including:
 * 1. Chat types and interfaces
 * 2. Context builder and system prompt
 * 3. Safety detection (ED triggers, medical keywords)
 * 4. Quick replies and error messages
 * 5. Chat service structure and API patterns
 * 6. Chat store (Zustand) state management
 * 7. UI components (ChatBubble, TypingIndicator, QuickReplies, ChatInput, WelcomeMessage)
 * 8. ChatScreen composition and context wiring
 * 9. Route with premium gating
 * 10. OpenAI API config
 * 11. Cross-component consistency
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// 1. Chat Types
// ============================================================

describe('Chat Types (Feature 5)', () => {
  let typesSource: string;

  beforeAll(() => {
    typesSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/types/chat.ts'),
      'utf-8'
    );
  });

  describe('ChatMessage interface', () => {
    it('should define ChatMessage with id, role, content, timestamp, status', () => {
      expect(typesSource).toContain('interface ChatMessage');
      expect(typesSource).toContain('id: string');
      expect(typesSource).toContain("role: 'user' | 'assistant' | 'system'");
      expect(typesSource).toContain('content: string');
      expect(typesSource).toContain('timestamp: Date');
      expect(typesSource).toContain("status: 'sending' | 'sent' | 'error'");
    });
  });

  describe('ChatSession interface', () => {
    it('should define ChatSession with id, messages, startedAt, context', () => {
      expect(typesSource).toContain('interface ChatSession');
      expect(typesSource).toContain('messages: ChatMessage[]');
      expect(typesSource).toContain('startedAt: Date');
      expect(typesSource).toContain('context: ChatContext');
    });
  });

  describe('ChatContext interface', () => {
    it('should include todayLog, weeklyAverage, goals, preferences, recentFoods', () => {
      expect(typesSource).toContain('interface ChatContext');
      expect(typesSource).toContain('todayLog: DailyLogSummary');
      expect(typesSource).toContain('weeklyAverage: WeeklyAverage');
      expect(typesSource).toContain('goals: UserGoals');
      expect(typesSource).toContain('preferences: DietaryPreferences');
      expect(typesSource).toContain('recentFoods: string[]');
    });
  });

  describe('DailyLogSummary interface', () => {
    it('should include calories, protein, carbs, fat with targets', () => {
      expect(typesSource).toContain('interface DailyLogSummary');
      expect(typesSource).toContain('calories: number');
      expect(typesSource).toContain('calorieTarget: number');
      expect(typesSource).toContain('protein: number');
      expect(typesSource).toContain('proteinTarget: number');
      expect(typesSource).toContain('carbs: number');
      expect(typesSource).toContain('carbTarget: number');
      expect(typesSource).toContain('fat: number');
      expect(typesSource).toContain('fatTarget: number');
    });

    it('should include water tracking', () => {
      expect(typesSource).toContain('water: number');
      expect(typesSource).toContain('waterTarget: number');
    });
  });

  describe('QuickReply interface', () => {
    it('should have text (display) and prompt (sent)', () => {
      expect(typesSource).toContain('interface QuickReply');
      expect(typesSource).toContain('text: string');
      expect(typesSource).toContain('prompt: string');
    });
  });

  describe('SafetyTrigger type', () => {
    it('should define eating_disorder and medical triggers', () => {
      expect(typesSource).toContain("type SafetyTrigger = 'eating_disorder' | 'medical'");
    });
  });

  describe('ChatError interface', () => {
    it('should define error types', () => {
      expect(typesSource).toContain('interface ChatError');
      expect(typesSource).toContain("type: 'network' | 'api' | 'rate_limited' | 'offline'");
    });
  });
});

// ============================================================
// 2. Context Builder
// ============================================================

describe('Context Builder (Feature 5)', () => {
  let contextSource: string;

  beforeAll(() => {
    contextSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/services/contextBuilder.ts'),
      'utf-8'
    );
  });

  describe('buildSystemPrompt', () => {
    it('should export buildSystemPrompt function', () => {
      expect(contextSource).toContain('export function buildSystemPrompt');
    });

    it('should accept ChatContext parameter', () => {
      expect(contextSource).toContain('context: ChatContext');
    });

    it('should return a string', () => {
      expect(contextSource).toContain('): string');
    });

    it('should include Nourished Calm personality', () => {
      expect(contextSource).toContain('Nourished Calm');
    });

    it('should include capabilities section', () => {
      expect(contextSource).toContain('## Your Capabilities');
      expect(contextSource).toContain('Suggest meals based on remaining macros');
      expect(contextSource).toContain('Answer nutrition questions');
      expect(contextSource).toContain('Analyze eating patterns');
    });

    it('should include boundaries section', () => {
      expect(contextSource).toContain('## Your Boundaries');
      expect(contextSource).toContain('NOT a doctor');
      expect(contextSource).toContain('CANNOT diagnose');
      expect(contextSource).toContain('will NOT give eating disorder advice');
      expect(contextSource).toContain('will NOT recommend extreme restriction');
    });

    it('should include user data placeholders', () => {
      expect(contextSource).toContain('context.todayLog.calories');
      expect(contextSource).toContain('context.todayLog.calorieTarget');
      expect(contextSource).toContain('context.todayLog.protein');
      expect(contextSource).toContain('context.todayLog.proteinTarget');
      expect(contextSource).toContain('context.todayLog.carbs');
      expect(contextSource).toContain('context.todayLog.fat');
    });

    it('should include weekly averages', () => {
      expect(contextSource).toContain('context.weeklyAverage.calories');
      expect(contextSource).toContain('context.weeklyAverage.protein');
      expect(contextSource).toContain('context.weeklyAverage.daysLogged');
    });

    it('should include goals and preferences', () => {
      expect(contextSource).toContain('context.goals.primaryGoal');
      expect(contextSource).toContain('context.preferences.restrictions');
    });

    it('should include recent foods', () => {
      expect(contextSource).toContain('context.recentFoods');
    });

    it('should include voice guidelines', () => {
      expect(contextSource).toContain('## Voice Guidelines');
      expect(contextSource).toContain('warm and supportive');
      expect(contextSource).toContain('nutrient gaps');
      expect(contextSource).toContain('eating window');
    });

    it('should prohibit certain language', () => {
      expect(contextSource).toContain('"failed"');
      expect(contextSource).toContain('"cheated"');
      expect(contextSource).toContain('"warning"');
    });

    it('should calculate calorie percentage', () => {
      expect(contextSource).toContain('caloriePercent');
      expect(contextSource).toContain('Math.round');
    });
  });

  describe('Safety Detection', () => {
    it('should export detectSafetyTriggers function', () => {
      expect(contextSource).toContain('export function detectSafetyTriggers');
    });

    it('should accept a message string', () => {
      expect(contextSource).toContain('message: string');
    });

    it('should return SafetyTrigger or null', () => {
      expect(contextSource).toContain('SafetyTrigger | null');
    });

    it('should check for eating disorder keywords', () => {
      expect(contextSource).toContain('purge');
      expect(contextSource).toContain('binge');
      expect(contextSource).toContain('restrict');
      expect(contextSource).toContain('hate my body');
      expect(contextSource).toContain('eating disorder');
    });

    it('should check for medical keywords', () => {
      expect(contextSource).toContain('diagnose');
      expect(contextSource).toContain('deficiency');
      expect(contextSource).toContain('prescribe');
      expect(contextSource).toContain('medication');
    });

    it('should normalize to lowercase for matching', () => {
      expect(contextSource).toContain('message.toLowerCase()');
    });

    it('should return eating_disorder for ED triggers', () => {
      expect(contextSource).toContain("return 'eating_disorder'");
    });

    it('should return medical for medical triggers', () => {
      expect(contextSource).toContain("return 'medical'");
    });

    it('should return null for safe messages', () => {
      expect(contextSource).toContain('return null');
    });
  });

  describe('Safety Responses', () => {
    it('should export SAFETY_RESPONSES constant', () => {
      expect(contextSource).toContain('export const SAFETY_RESPONSES');
    });

    it('should include eating disorder response with NEDA helpline', () => {
      expect(contextSource).toContain('1-800-931-2237');
      expect(contextSource).toContain('wellbeing');
    });

    it('should include medical response redirecting to professionals', () => {
      expect(contextSource).toContain('not a medical professional');
      expect(contextSource).toContain('doctor or registered dietitian');
    });
  });

  describe('Quick Replies', () => {
    it('should export QUICK_REPLIES array', () => {
      expect(contextSource).toContain('export const QUICK_REPLIES');
    });

    it('should include dinner suggestion', () => {
      expect(contextSource).toContain('What should I eat for dinner?');
    });

    it('should include weekly review', () => {
      expect(contextSource).toContain('How am I doing this week?');
    });

    it('should include protein check', () => {
      expect(contextSource).toContain('Am I getting enough protein?');
    });

    it('should include snack suggestion', () => {
      expect(contextSource).toContain("What's a healthy snack?");
    });

    it('should have both text and prompt for each reply', () => {
      const textMatches = contextSource.match(/text:/g);
      const promptMatches = contextSource.match(/prompt:/g);
      expect(textMatches).not.toBeNull();
      expect(promptMatches).not.toBeNull();
      // 4 quick replies, each with text and prompt
      expect(textMatches!.length).toBeGreaterThanOrEqual(4);
      expect(promptMatches!.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Error Messages', () => {
    it('should export ERROR_MESSAGES constant', () => {
      expect(contextSource).toContain('export const ERROR_MESSAGES');
    });

    it('should have a network error message', () => {
      expect(contextSource).toContain("couldn't connect");
    });

    it('should have an API error message', () => {
      expect(contextSource).toContain('Something went wrong');
    });

    it('should have a rate limit message', () => {
      expect(contextSource).toContain('short break');
    });

    it('should have an offline message', () => {
      expect(contextSource).toContain('internet connection');
    });
  });
});

// ============================================================
// 3. Context Builder — Functional Tests
// ============================================================

describe('Context Builder Functional Tests', () => {
  const { buildSystemPrompt, detectSafetyTriggers, SAFETY_RESPONSES, QUICK_REPLIES, ERROR_MESSAGES } =
    require('../../../features/chat/services/contextBuilder');

  const mockContext = {
    todayLog: {
      calories: 1200,
      calorieTarget: 2000,
      protein: 80,
      proteinTarget: 150,
      carbs: 120,
      carbTarget: 250,
      fat: 40,
      fatTarget: 67,
      water: 5,
      waterTarget: 8,
    },
    weeklyAverage: {
      calories: 1800,
      protein: 120,
      daysLogged: 5,
    },
    goals: {
      primaryGoal: 'Weight loss',
    },
    preferences: {
      restrictions: ['Very low carb / Keto'],
    },
    recentFoods: ['Grilled chicken', 'Avocado', 'Salad', 'Greek yogurt'],
  };

  describe('buildSystemPrompt', () => {
    it('should return a string', () => {
      const result = buildSystemPrompt(mockContext);
      expect(typeof result).toBe('string');
    });

    it('should include actual calorie values', () => {
      const result = buildSystemPrompt(mockContext);
      expect(result).toContain('1200');
      expect(result).toContain('2000');
    });

    it('should include calorie percentage', () => {
      const result = buildSystemPrompt(mockContext);
      expect(result).toContain('60%');
    });

    it('should include protein values', () => {
      const result = buildSystemPrompt(mockContext);
      expect(result).toContain('80');
      expect(result).toContain('150');
    });

    it('should include weekly averages', () => {
      const result = buildSystemPrompt(mockContext);
      expect(result).toContain('1800');
      expect(result).toContain('5/7');
    });

    it('should include user goal', () => {
      const result = buildSystemPrompt(mockContext);
      expect(result).toContain('Weight loss');
    });

    it('should include dietary preferences', () => {
      const result = buildSystemPrompt(mockContext);
      expect(result).toContain('Very low carb / Keto');
    });

    it('should include recent foods', () => {
      const result = buildSystemPrompt(mockContext);
      expect(result).toContain('Grilled chicken');
      expect(result).toContain('Avocado');
    });

    it('should handle zero calorie target without NaN', () => {
      const zeroContext = {
        ...mockContext,
        todayLog: { ...mockContext.todayLog, calorieTarget: 0 },
      };
      const result = buildSystemPrompt(zeroContext);
      expect(result).not.toContain('NaN');
      expect(result).toContain('0%');
    });

    it('should handle empty restrictions', () => {
      const noRestrictions = {
        ...mockContext,
        preferences: { restrictions: [] },
      };
      const result = buildSystemPrompt(noRestrictions);
      expect(result).toContain('None specified');
    });

    it('should handle empty recent foods', () => {
      const noFoods = { ...mockContext, recentFoods: [] };
      const result = buildSystemPrompt(noFoods);
      expect(result).toContain('None logged today');
    });
  });

  describe('detectSafetyTriggers', () => {
    it('should return eating_disorder for purge', () => {
      expect(detectSafetyTriggers('I want to purge')).toBe('eating_disorder');
    });

    it('should return eating_disorder for binge', () => {
      expect(detectSafetyTriggers('I had a binge episode')).toBe('eating_disorder');
    });

    it('should return eating_disorder for restrict', () => {
      expect(detectSafetyTriggers('I want to restrict more')).toBe('eating_disorder');
    });

    it('should return eating_disorder for hate my body', () => {
      expect(detectSafetyTriggers('I hate my body')).toBe('eating_disorder');
    });

    it('should return eating_disorder for eating disorder mention', () => {
      expect(detectSafetyTriggers('I have an eating disorder')).toBe('eating_disorder');
    });

    it('should return medical for diagnose', () => {
      expect(detectSafetyTriggers('Can you diagnose my issue?')).toBe('medical');
    });

    it('should return medical for deficiency', () => {
      expect(detectSafetyTriggers('Do I have a vitamin deficiency?')).toBe('medical');
    });

    it('should return medical for prescribe', () => {
      expect(detectSafetyTriggers('Can you prescribe something?')).toBe('medical');
    });

    it('should return medical for medication', () => {
      expect(detectSafetyTriggers('What medication should I take?')).toBe('medical');
    });

    it('should return null for safe messages', () => {
      expect(detectSafetyTriggers('What should I eat for dinner?')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(detectSafetyTriggers('')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(detectSafetyTriggers('I WANT TO PURGE')).toBe('eating_disorder');
      expect(detectSafetyTriggers('DIAGNOSE my issue')).toBe('medical');
    });
  });

  describe('SAFETY_RESPONSES', () => {
    it('should have eating_disorder response', () => {
      expect(SAFETY_RESPONSES.eating_disorder).toBeDefined();
      expect(SAFETY_RESPONSES.eating_disorder).toContain('1-800-931-2237');
    });

    it('should have medical response', () => {
      expect(SAFETY_RESPONSES.medical).toBeDefined();
      expect(SAFETY_RESPONSES.medical).toContain('medical professional');
    });
  });

  describe('QUICK_REPLIES', () => {
    it('should be an array of 4 items', () => {
      expect(Array.isArray(QUICK_REPLIES)).toBe(true);
      expect(QUICK_REPLIES.length).toBe(4);
    });

    it('should have text and prompt for each item', () => {
      QUICK_REPLIES.forEach((reply: { text: string; prompt: string }) => {
        expect(typeof reply.text).toBe('string');
        expect(typeof reply.prompt).toBe('string');
        expect(reply.text.length).toBeGreaterThan(0);
        expect(reply.prompt.length).toBeGreaterThan(reply.text.length);
      });
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have messages for all error types', () => {
      expect(ERROR_MESSAGES.network).toBeDefined();
      expect(ERROR_MESSAGES.api).toBeDefined();
      expect(ERROR_MESSAGES.rate_limited).toBeDefined();
      expect(ERROR_MESSAGES.offline).toBeDefined();
    });

    it('should have user-friendly messages (no technical jargon)', () => {
      Object.values(ERROR_MESSAGES).forEach((msg) => {
        expect(msg).not.toContain('Error');
        expect(msg).not.toContain('500');
        expect(msg).not.toContain('exception');
      });
    });
  });
});

// ============================================================
// 4. Chat Service
// ============================================================

describe('Chat Service (Feature 5)', () => {
  let serviceSource: string;

  beforeAll(() => {
    serviceSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/services/chatService.ts'),
      'utf-8'
    );
  });

  describe('Service Structure', () => {
    it('should import ChatMessage and ChatContext types', () => {
      expect(serviceSource).toContain('ChatMessage');
      expect(serviceSource).toContain('ChatContext');
    });

    it('should import context builder functions', () => {
      expect(serviceSource).toContain('buildSystemPrompt');
      expect(serviceSource).toContain('detectSafetyTriggers');
      expect(serviceSource).toContain('SAFETY_RESPONSES');
    });

    it('should import OpenAI config', () => {
      expect(serviceSource).toContain("from '@/config/api'");
      expect(serviceSource).toContain('openaiConfig');
    });

    it('should import proxyOpenAIChat from backendService', () => {
      expect(serviceSource).toContain("from '@/services/backendService'");
      expect(serviceSource).toContain('proxyOpenAIChat');
    });
  });

  describe('sendMessage function', () => {
    it('should export sendMessage function', () => {
      expect(serviceSource).toContain('export async function sendMessage');
    });

    it('should accept messages, context, and options', () => {
      expect(serviceSource).toContain('messages: ChatMessage[]');
      expect(serviceSource).toContain('context: ChatContext');
      expect(serviceSource).toContain('options: SendMessageOptions');
    });

    it('should default model to gpt-4o-mini', () => {
      expect(serviceSource).toContain("model = 'gpt-4o-mini'");
    });

    it('should check for safety triggers before proxy call', () => {
      const sendMessageSection = serviceSource.substring(
        serviceSource.indexOf('export async function sendMessage'),
        serviceSource.indexOf('export async function sendMessageStreaming')
      );
      const safetyCheckIndex = sendMessageSection.indexOf('detectSafetyTriggers');
      const proxyIndex = sendMessageSection.indexOf('proxyOpenAIChat');
      expect(safetyCheckIndex).toBeLessThan(proxyIndex);
    });

    it('should return safety response when trigger detected', () => {
      expect(serviceSource).toContain('SAFETY_RESPONSES[trigger]');
    });

    it('should build system prompt from context', () => {
      expect(serviceSource).toContain('buildSystemPrompt(context)');
    });

    it('should route through proxyOpenAIChat (not direct OpenAI)', () => {
      expect(serviceSource).toContain('proxyOpenAIChat(proxyMessages');
      expect(serviceSource).not.toContain("from 'openai'");
      expect(serviceSource).not.toContain('api.openai.com');
    });

    it('should use maxTokens from config', () => {
      expect(serviceSource).toContain('openaiConfig.maxTokens');
    });

    it('should use temperature from config', () => {
      expect(serviceSource).toContain('openaiConfig.temperature');
    });

    it('should limit conversation history', () => {
      expect(serviceSource).toContain('openaiConfig.maxConversationHistory');
    });
  });

  describe('sendMessageStreaming function', () => {
    it('should export sendMessageStreaming function', () => {
      expect(serviceSource).toContain('export async function sendMessageStreaming');
    });

    it('should accept onChunk callback', () => {
      expect(serviceSource).toContain('onChunk: (chunk: string) => void');
    });

    it('should use proxyOpenAIChat in non-streaming mode', () => {
      const streamSection = serviceSource.substring(
        serviceSource.indexOf('export async function sendMessageStreaming')
      );
      expect(streamSection).toContain('proxyOpenAIChat');
      expect(streamSection).not.toContain('stream: true');
    });

    it('should have TODO for future SSE streaming', () => {
      expect(serviceSource).toContain('TODO: re-enable true SSE streaming');
    });

    it('should deliver full response via onChunk', () => {
      expect(serviceSource).toContain('onChunk(fullResponse)');
    });

    it('should check for safety triggers before proxy call', () => {
      const streamSection = serviceSource.substring(
        serviceSource.indexOf('export async function sendMessageStreaming')
      );
      const safetyCheck = streamSection.indexOf('detectSafetyTriggers');
      expect(safetyCheck).toBeGreaterThan(-1);
    });
  });

  describe('Error Handling', () => {
    it('should detect rate limiting from proxy error message', () => {
      expect(serviceSource).toContain("'rate_limited'");
      expect(serviceSource).toContain("msg.includes('429')");
    });

    it('should re-throw ChatServiceError instances', () => {
      expect(serviceSource).toContain('if (error instanceof ChatServiceError) throw error');
    });

    it('should define ChatServiceError class', () => {
      expect(serviceSource).toContain('class ChatServiceError extends Error');
    });

    it('should include error type on ChatServiceError', () => {
      expect(serviceSource).toContain("type: 'network' | 'api' | 'rate_limited' | 'offline'");
    });
  });

  describe('Exports', () => {
    it('should export chatService object', () => {
      expect(serviceSource).toContain('export const chatService');
    });

    it('should export ChatServiceError class', () => {
      expect(serviceSource).toContain('export class ChatServiceError');
    });

    it('should include sendMessage on chatService', () => {
      expect(serviceSource).toContain('sendMessage,');
    });

    it('should include sendMessageStreaming on chatService', () => {
      expect(serviceSource).toContain('sendMessageStreaming,');
    });
  });
});

// ============================================================
// 5. Chat Store
// ============================================================

describe('Chat Store (Feature 5)', () => {
  let storeSource: string;

  beforeAll(() => {
    storeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/stores/chatStore.ts'),
      'utf-8'
    );
  });

  describe('Store Structure', () => {
    it('should use zustand create', () => {
      expect(storeSource).toContain("from 'zustand'");
      expect(storeSource).toContain('create<ChatState>');
    });

    it('should export useChatStore', () => {
      expect(storeSource).toContain('export const useChatStore');
    });

    it('should import chat types', () => {
      expect(storeSource).toContain('ChatMessage');
      expect(storeSource).toContain('ChatContext');
    });

    it('should import chatService', () => {
      expect(storeSource).toContain('chatService');
      expect(storeSource).toContain('ChatServiceError');
    });

    it('should import error messages', () => {
      expect(storeSource).toContain('ERROR_MESSAGES');
    });
  });

  describe('State Properties', () => {
    it('should have messages array', () => {
      expect(storeSource).toContain('messages: []');
    });

    it('should have isGenerating flag', () => {
      expect(storeSource).toContain('isGenerating: false');
    });

    it('should have error state', () => {
      expect(storeSource).toContain('error: null');
    });

    it('should have sessionId', () => {
      expect(storeSource).toContain('sessionId:');
    });

    it('should have messageCount', () => {
      expect(storeSource).toContain('messageCount: 0');
    });
  });

  describe('Actions', () => {
    it('should have sendMessage action', () => {
      expect(storeSource).toContain('sendMessage: async');
    });

    it('should have addMessage action', () => {
      expect(storeSource).toContain('addMessage: (message)');
    });

    it('should have updateMessage action', () => {
      expect(storeSource).toContain('updateMessage: (id, updates)');
    });

    it('should have clearChat action', () => {
      expect(storeSource).toContain('clearChat: ()');
    });

    it('should have dismissError action', () => {
      expect(storeSource).toContain('dismissError: ()');
    });
  });

  describe('sendMessage Flow', () => {
    it('should add user message first', () => {
      expect(storeSource).toContain("role: 'user'");
      expect(storeSource).toContain("status: 'sent'");
    });

    it('should add assistant placeholder message', () => {
      expect(storeSource).toContain("role: 'assistant'");
      expect(storeSource).toContain("content: ''");
      expect(storeSource).toContain("status: 'sending'");
    });

    it('should set isGenerating to true during API call', () => {
      expect(storeSource).toContain('isGenerating: true');
    });

    it('should use streaming via chatService.sendMessageStreaming', () => {
      expect(storeSource).toContain('chatService.sendMessageStreaming');
    });

    it('should update assistant message with streamed content', () => {
      expect(storeSource).toContain('updateMessage(assistantId');
    });

    it('should set isGenerating to false after completion', () => {
      expect(storeSource).toContain('isGenerating: false');
    });

    it('should handle ChatServiceError with typed error messages', () => {
      expect(storeSource).toContain('ChatServiceError');
      expect(storeSource).toContain('ERROR_MESSAGES[error.type]');
    });

    it('should handle network errors', () => {
      expect(storeSource).toContain('TypeError');
      expect(storeSource).toContain('Network');
    });

    it('should set error status on failed messages', () => {
      expect(storeSource).toContain("status: 'error'");
    });
  });

  describe('addMessage', () => {
    it('should generate unique IDs', () => {
      expect(storeSource).toContain('generateId');
    });

    it('should add timestamp', () => {
      expect(storeSource).toContain('timestamp: new Date()');
    });

    it('should increment message count', () => {
      expect(storeSource).toContain('messageCount: state.messageCount + 1');
    });

    it('should return the message id', () => {
      expect(storeSource).toContain('return id');
    });
  });

  describe('clearChat', () => {
    it('should reset messages to empty', () => {
      const clearSection = storeSource.substring(storeSource.indexOf('clearChat:'));
      expect(clearSection).toContain('messages: []');
    });

    it('should reset isGenerating', () => {
      const clearSection = storeSource.substring(storeSource.indexOf('clearChat:'));
      expect(clearSection).toContain('isGenerating: false');
    });

    it('should generate new session ID', () => {
      expect(storeSource).toContain('generateSessionId()');
    });

    it('should reset message count', () => {
      const clearSection = storeSource.substring(storeSource.indexOf('clearChat:'));
      expect(clearSection).toContain('messageCount: 0');
    });
  });
});

// ============================================================
// 6. ChatBubble Component
// ============================================================

describe('ChatBubble Component (Feature 5)', () => {
  let bubbleSource: string;

  beforeAll(() => {
    bubbleSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/components/ChatBubble.tsx'),
      'utf-8'
    );
  });

  describe('Component Structure', () => {
    it('should export ChatBubble function', () => {
      expect(bubbleSource).toContain('export function ChatBubble');
    });

    it('should accept message and isStreaming props', () => {
      expect(bubbleSource).toContain('ChatBubbleProps');
      expect(bubbleSource).toContain('message: ChatMessage');
      expect(bubbleSource).toContain('isStreaming?: boolean');
    });

    it('should use useTheme hook', () => {
      expect(bubbleSource).toContain('useTheme');
      expect(bubbleSource).toContain('colors');
    });
  });

  describe('User vs Assistant Styling', () => {
    it('should determine if message is from user', () => {
      expect(bubbleSource).toContain("message.role === 'user'");
    });

    it('should use different alignment for user vs assistant', () => {
      expect(bubbleSource).toContain('userContainer');
      expect(bubbleSource).toContain('assistantContainer');
    });

    it('should align user messages to the right', () => {
      expect(bubbleSource).toContain("alignItems: 'flex-end'");
    });

    it('should align assistant messages to the left', () => {
      expect(bubbleSource).toContain("alignItems: 'flex-start'");
    });

    it('should use accent color for user bubble background', () => {
      expect(bubbleSource).toContain('colors.accent');
    });

    it('should use elevated background for assistant bubble', () => {
      expect(bubbleSource).toContain('colors.bgElevated');
    });

    it('should use white text for user messages', () => {
      expect(bubbleSource).toContain("'#FFFFFF'");
    });

    it('should use primary text color for assistant messages', () => {
      expect(bubbleSource).toContain('colors.textPrimary');
    });
  });

  describe('Error State', () => {
    it('should detect error status', () => {
      expect(bubbleSource).toContain("message.status === 'error'");
    });

    it('should use error background for error messages', () => {
      expect(bubbleSource).toContain('colors.errorBg');
    });

    it('should use error color for error text', () => {
      expect(bubbleSource).toContain('colors.error');
    });
  });

  describe('Streaming Cursor', () => {
    it('should show cursor during streaming', () => {
      expect(bubbleSource).toContain('isStreaming');
      expect(bubbleSource).toContain("status === 'sending'");
    });
  });

  describe('Timestamp', () => {
    it('should format timestamp', () => {
      expect(bubbleSource).toContain('formatTime');
      expect(bubbleSource).toContain('toLocaleTimeString');
    });

    it('should show hours and minutes', () => {
      expect(bubbleSource).toContain("'numeric'");
      expect(bubbleSource).toContain("'2-digit'");
    });
  });

  describe('Layout', () => {
    it('should limit bubble width to 80%', () => {
      expect(bubbleSource).toContain("maxWidth: '80%'");
    });

    it('should use borderRadius.xl for bubbles', () => {
      expect(bubbleSource).toContain('borderRadius.xl');
    });

    it('should use smaller radius for bubble tail corner', () => {
      expect(bubbleSource).toContain('borderBottomRightRadius');
      expect(bubbleSource).toContain('borderBottomLeftRadius');
    });
  });
});

// ============================================================
// 7. TypingIndicator Component
// ============================================================

describe('TypingIndicator Component (Feature 5)', () => {
  let indicatorSource: string;

  beforeAll(() => {
    indicatorSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/components/TypingIndicator.tsx'),
      'utf-8'
    );
  });

  describe('Component Structure', () => {
    it('should export TypingIndicator function', () => {
      expect(indicatorSource).toContain('export function TypingIndicator');
    });

    it('should use Animated from react-native', () => {
      expect(indicatorSource).toContain('Animated');
    });

    it('should use useRef for animation values', () => {
      expect(indicatorSource).toContain('useRef');
    });
  });

  describe('Animation', () => {
    it('should create 3 animated dots', () => {
      expect(indicatorSource).toContain('dot1');
      expect(indicatorSource).toContain('dot2');
      expect(indicatorSource).toContain('dot3');
    });

    it('should use Animated.loop for repeating animation', () => {
      expect(indicatorSource).toContain('Animated.loop');
    });

    it('should use Animated.sequence for sequential dots', () => {
      expect(indicatorSource).toContain('Animated.sequence');
    });

    it('should use Animated.parallel for concurrent dots', () => {
      expect(indicatorSource).toContain('Animated.parallel');
    });

    it('should use useNativeDriver', () => {
      expect(indicatorSource).toContain('useNativeDriver: true');
    });

    it('should animate opacity', () => {
      expect(indicatorSource).toContain('opacity');
    });

    it('should clean up animation on unmount', () => {
      expect(indicatorSource).toContain('animation.stop()');
    });
  });

  describe('Styling', () => {
    it('should align to the left (assistant side)', () => {
      expect(indicatorSource).toContain("alignItems: 'flex-start'");
    });

    it('should use bubble styling consistent with chat bubbles', () => {
      expect(indicatorSource).toContain('borderRadius.xl');
      expect(indicatorSource).toContain('borderBottomLeftRadius');
    });

    it('should render dots in a row', () => {
      expect(indicatorSource).toContain("flexDirection: 'row'");
    });
  });
});

// ============================================================
// 8. QuickReplies Component
// ============================================================

describe('QuickReplies Component (Feature 5)', () => {
  let quickSource: string;

  beforeAll(() => {
    quickSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/components/QuickReplies.tsx'),
      'utf-8'
    );
  });

  describe('Component Structure', () => {
    it('should export QuickReplies function', () => {
      expect(quickSource).toContain('export function QuickReplies');
    });

    it('should accept replies, onSelect, and disabled props', () => {
      expect(quickSource).toContain('QuickRepliesProps');
      expect(quickSource).toContain('replies: QuickReply[]');
      expect(quickSource).toContain('onSelect: (reply: QuickReply) => void');
      expect(quickSource).toContain('disabled?: boolean');
    });
  });

  describe('Interaction', () => {
    it('should use Pressable for buttons', () => {
      expect(quickSource).toContain('Pressable');
    });

    it('should call onSelect with the reply when pressed', () => {
      expect(quickSource).toContain('onSelect(reply)');
    });

    it('should respect disabled state', () => {
      expect(quickSource).toContain('disabled');
    });

    it('should show reduced opacity when disabled', () => {
      expect(quickSource).toContain('opacity');
      expect(quickSource).toContain('0.5');
    });
  });

  describe('Styling', () => {
    it('should display reply text', () => {
      expect(quickSource).toContain('reply.text');
    });

    it('should use accent color for text and border', () => {
      expect(quickSource).toContain('colors.accent');
    });

    it('should use pill-shaped buttons', () => {
      expect(quickSource).toContain('borderRadius.xl');
    });

    it('should center text', () => {
      expect(quickSource).toContain("textAlign: 'center'");
    });
  });
});

// ============================================================
// 9. ChatInput Component
// ============================================================

describe('ChatInput Component (Feature 5)', () => {
  let inputSource: string;

  beforeAll(() => {
    inputSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/components/ChatInput.tsx'),
      'utf-8'
    );
  });

  describe('Component Structure', () => {
    it('should export ChatInput function', () => {
      expect(inputSource).toContain('export function ChatInput');
    });

    it('should accept onSend, disabled, and placeholder props', () => {
      expect(inputSource).toContain('ChatInputProps');
      expect(inputSource).toContain('onSend: (text: string) => void');
      expect(inputSource).toContain('disabled?: boolean');
      expect(inputSource).toContain('placeholder?: string');
    });

    it('should have default placeholder text', () => {
      expect(inputSource).toContain('Ask me anything');
    });
  });

  describe('Input Behavior', () => {
    it('should use TextInput from react-native', () => {
      expect(inputSource).toContain('TextInput');
    });

    it('should maintain local text state', () => {
      expect(inputSource).toContain("useState('')");
    });

    it('should clear text after sending', () => {
      expect(inputSource).toContain("setText('')");
    });

    it('should trim text before sending', () => {
      expect(inputSource).toContain('text.trim()');
    });

    it('should not send empty messages', () => {
      expect(inputSource).toContain('!trimmed || disabled');
    });

    it('should support multiline input', () => {
      expect(inputSource).toContain('multiline');
    });

    it('should have max length', () => {
      expect(inputSource).toContain('maxLength={500}');
    });

    it('should submit on keyboard return', () => {
      expect(inputSource).toContain('onSubmitEditing');
      expect(inputSource).toContain("returnKeyType=\"send\"");
    });
  });

  describe('Send Button', () => {
    it('should use Pressable for send button', () => {
      expect(inputSource).toContain('Pressable');
    });

    it('should use send icon', () => {
      expect(inputSource).toContain('name="send"');
    });

    it('should disable button when text is empty or disabled', () => {
      expect(inputSource).toContain('canSend');
      expect(inputSource).toContain('disabled={!canSend}');
    });

    it('should use accent color when active', () => {
      expect(inputSource).toContain('colors.accent');
    });

    it('should use interactive background when disabled', () => {
      expect(inputSource).toContain('colors.bgInteractive');
    });
  });

  describe('Layout', () => {
    it('should have border at top', () => {
      expect(inputSource).toContain('borderTopWidth: 1');
    });

    it('should handle platform-specific padding', () => {
      expect(inputSource).toContain("Platform.OS === 'ios'");
    });

    it('should use flexDirection row for input + button', () => {
      expect(inputSource).toContain("flexDirection: 'row'");
    });
  });
});

// ============================================================
// 10. WelcomeMessage Component
// ============================================================

describe('WelcomeMessage Component (Feature 5)', () => {
  let welcomeSource: string;

  beforeAll(() => {
    welcomeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/components/WelcomeMessage.tsx'),
      'utf-8'
    );
  });

  describe('Component Structure', () => {
    it('should export WelcomeMessage function', () => {
      expect(welcomeSource).toContain('export function WelcomeMessage');
    });

    it('should use useTheme hook', () => {
      expect(welcomeSource).toContain('useTheme');
    });
  });

  describe('Content', () => {
    it('should include greeting', () => {
      expect(welcomeSource).toContain("I'm your nutrition assistant");
    });

    it('should list capabilities', () => {
      expect(welcomeSource).toContain('Meal suggestions');
      expect(welcomeSource).toContain('nutrition questions');
      expect(welcomeSource).toContain('eating patterns');
    });

    it('should include call to action', () => {
      expect(welcomeSource).toContain('What would you like to know?');
    });
  });

  describe('Styling', () => {
    it('should use card-style container', () => {
      expect(welcomeSource).toContain('borderRadius.xl');
      expect(welcomeSource).toContain('borderWidth: 1');
    });

    it('should use themed colors', () => {
      expect(welcomeSource).toContain('colors.bgElevated');
      expect(welcomeSource).toContain('colors.textPrimary');
      expect(welcomeSource).toContain('colors.textSecondary');
    });
  });
});

// ============================================================
// 11. ChatScreen
// ============================================================

describe('ChatScreen (Feature 5)', () => {
  let screenSource: string;

  beforeAll(() => {
    screenSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/screens/ChatScreen.tsx'),
      'utf-8'
    );
  });

  describe('Component Structure', () => {
    it('should export ChatScreen function', () => {
      expect(screenSource).toContain('export function ChatScreen');
    });

    it('should use KeyboardAvoidingView', () => {
      expect(screenSource).toContain('KeyboardAvoidingView');
    });

    it('should use FlatList for messages', () => {
      expect(screenSource).toContain('FlatList');
    });

    it('should use SafeAreaView for bottom inset', () => {
      expect(screenSource).toContain('SafeAreaView');
      expect(screenSource).toContain("edges={['bottom']}");
    });
  });

  describe('Store Integration', () => {
    it('should use useChatStore', () => {
      expect(screenSource).toContain('useChatStore');
    });

    it('should use useFoodLogStore for daily data', () => {
      expect(screenSource).toContain('useFoodLogStore');
      expect(screenSource).toContain('dailyTotals');
    });

    it('should use resolved targets hook for goals', () => {
      expect(screenSource).toContain('useResolvedTargets');
      expect(screenSource).toContain('calorieTarget');
    });

    it('should use useGoalStore for active goal', () => {
      expect(screenSource).toContain('useGoalStore');
      expect(screenSource).toContain('activeGoal');
    });

    it('should use useProfileStore for user profile', () => {
      expect(screenSource).toContain('useProfileStore');
      expect(screenSource).toContain('profile');
    });
  });

  describe('Context Building', () => {
    it('should build ChatContext with useMemo', () => {
      expect(screenSource).toContain('useMemo');
      expect(screenSource).toContain('ChatContext');
    });

    it('should read calorie target from resolved targets', () => {
      expect(screenSource).toContain('calorieTarget');
      expect(screenSource).toContain('useResolvedTargets');
    });

    it('should include protein targets', () => {
      expect(screenSource).toContain('proteinTarget');
      expect(screenSource).toContain('useResolvedTargets');
    });

    it('should include carb and fat targets', () => {
      expect(screenSource).toContain('carbTarget');
      expect(screenSource).toContain('fatTarget');
    });

    it('should map goal type to readable label', () => {
      expect(screenSource).toContain('Weight loss');
      expect(screenSource).toContain('Weight maintenance');
      expect(screenSource).toContain('Weight gain');
    });

    it('should extract eating style from profile', () => {
      expect(screenSource).toContain('profile?.eatingStyle');
    });

    it('should extract recent food names from entries', () => {
      expect(screenSource).toContain('entries.slice(0, 10)');
      expect(screenSource).toContain('foodName');
    });
  });

  describe('Component Composition', () => {
    it('should render ChatBubble for messages', () => {
      expect(screenSource).toContain('ChatBubble');
    });

    it('should render TypingIndicator when generating', () => {
      expect(screenSource).toContain('TypingIndicator');
    });

    it('should render QuickReplies', () => {
      expect(screenSource).toContain('QuickReplies');
      expect(screenSource).toContain('QUICK_REPLIES');
    });

    it('should render ChatInput', () => {
      expect(screenSource).toContain('ChatInput');
    });

    it('should render WelcomeMessage when no messages', () => {
      expect(screenSource).toContain('WelcomeMessage');
    });

    it('should disable input while generating', () => {
      expect(screenSource).toContain('disabled={isGenerating}');
    });
  });

  describe('Scrolling', () => {
    it('should have flatListRef for scroll control', () => {
      expect(screenSource).toContain('flatListRef');
    });

    it('should auto-scroll to bottom on new messages', () => {
      expect(screenSource).toContain('scrollToEnd');
    });

    it('should scroll on content size change', () => {
      expect(screenSource).toContain('onContentSizeChange');
    });
  });

  describe('Keyboard Handling', () => {
    it('should use platform-specific keyboard behavior', () => {
      expect(screenSource).toContain("Platform.OS === 'ios'");
      expect(screenSource).toContain("'padding'");
    });

    it('should persist taps for keyboard handling', () => {
      expect(screenSource).toContain('keyboardShouldPersistTaps="handled"');
    });
  });
});

// ============================================================
// 12. Chat Route (Premium Gating)
// ============================================================

describe('Chat Route (Feature 5)', () => {
  let routeSource: string;

  beforeAll(() => {
    routeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/chat/index.tsx'),
      'utf-8'
    );
  });

  describe('Route Structure', () => {
    it('should export default function', () => {
      expect(routeSource).toContain('export default function ChatRoute');
    });

    it('should use Stack.Screen for header config', () => {
      expect(routeSource).toContain('Stack.Screen');
    });

    it('should set title to Nutrition Assistant', () => {
      expect(routeSource).toContain("title: 'Nutrition Assistant'");
    });

    it('should style header with theme colors', () => {
      expect(routeSource).toContain('colors.bgPrimary');
      expect(routeSource).toContain('colors.textPrimary');
    });
  });

  describe('Premium Gating', () => {
    it('should import useSubscriptionStore', () => {
      expect(routeSource).toContain('useSubscriptionStore');
    });

    it('should check isPremium status', () => {
      expect(routeSource).toContain('isPremium');
    });

    it('should render ChatScreen for premium users', () => {
      expect(routeSource).toContain('if (!isPremium) return <ChatPreview />');
      expect(routeSource).toContain('return <ChatScreen />');
    });

    it('should render ChatPreview for non-premium users', () => {
      expect(routeSource).toContain('ChatPreview');
    });
  });

  describe('ChatPreview (Paywall)', () => {
    it('should define ChatPreview component', () => {
      expect(routeSource).toContain('function ChatPreview');
    });

    it('should include chat icon', () => {
      expect(routeSource).toContain('chatbubbles-outline');
    });

    it('should include Nutrition Assistant title', () => {
      expect(routeSource).toContain('Nutrition Assistant');
    });

    it('should include feature description', () => {
      expect(routeSource).toContain('personalized meal suggestions');
    });

    it('should include upgrade button that navigates to paywall', () => {
      expect(routeSource).toContain('Upgrade to Premium');
      expect(routeSource).toContain('/paywall?context=chat');
    });

    it('should show lock icon on upgrade button', () => {
      expect(routeSource).toContain('lock-closed');
    });
  });

  describe('Header Actions', () => {
    it('should show clear/refresh button for premium users with messages', () => {
      expect(routeSource).toContain('headerRight');
      expect(routeSource).toContain('refresh-outline');
    });

    it('should call clearChat on refresh press', () => {
      expect(routeSource).toContain('clearChat');
    });

    it('should only show refresh when there are messages', () => {
      expect(routeSource).toContain('messageCount > 0');
    });
  });

  describe('Imports', () => {
    it('should import ChatScreen', () => {
      expect(routeSource).toContain("from '@/features/chat/screens/ChatScreen'");
    });

    it('should import useChatStore', () => {
      expect(routeSource).toContain("from '@/features/chat/stores/chatStore'");
    });

    it('should import useSubscriptionStore', () => {
      expect(routeSource).toContain("from '@/stores/subscriptionStore'");
    });

    it('should import expo-router', () => {
      expect(routeSource).toContain("from 'expo-router'");
    });
  });
});

// ============================================================
// 13. OpenAI API Config
// ============================================================

describe('OpenAI API Config (Feature 5)', () => {
  let configSource: string;

  beforeAll(() => {
    configSource = fs.readFileSync(
      path.resolve(__dirname, '../../../config/api.ts'),
      'utf-8'
    );
  });

  describe('OpenAI Configuration', () => {
    it('should export openaiConfig', () => {
      expect(configSource).toContain('export const openaiConfig');
    });

    it('should NOT contain a client-side API key', () => {
      expect(configSource).not.toContain('EXPO_PUBLIC_OPENAI_API_KEY');
    });

    it('should note that the API key is server-side', () => {
      expect(configSource).toContain('server-side');
    });

    it('should set default model to gpt-4o-mini', () => {
      expect(configSource).toContain("model: 'gpt-4o-mini'");
    });

    it('should set maxTokens to 500', () => {
      expect(configSource).toContain('maxTokens: 500');
    });

    it('should set temperature to 0.7', () => {
      expect(configSource).toContain('temperature: 0.7');
    });

    it('should set maxConversationHistory', () => {
      expect(configSource).toContain('maxConversationHistory: 10');
    });

    it('should set maxMessagesPerDay for rate limiting', () => {
      expect(configSource).toContain('maxMessagesPerDay: 50');
    });
  });

  describe('Existing Config Unchanged', () => {
    it('should still have USDA config', () => {
      expect(configSource).toContain('usdaConfig');
      expect(configSource).toContain('USDA_API_KEY');
    });

    it('should still have USDA cache durations', () => {
      expect(configSource).toContain('USDA_CACHE_DURATIONS');
    });
  });
});

// ============================================================
// 14. Cross-Component Consistency
// ============================================================

describe('Cross-Component Consistency (Feature 5)', () => {
  let typesSource: string;
  let contextSource: string;
  let serviceSource: string;
  let storeSource: string;
  let screenSource: string;
  let routeSource: string;

  beforeAll(() => {
    typesSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/types/chat.ts'),
      'utf-8'
    );
    contextSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/services/contextBuilder.ts'),
      'utf-8'
    );
    serviceSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/services/chatService.ts'),
      'utf-8'
    );
    storeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/stores/chatStore.ts'),
      'utf-8'
    );
    screenSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/chat/screens/ChatScreen.tsx'),
      'utf-8'
    );
    routeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/chat/index.tsx'),
      'utf-8'
    );
  });

  describe('Type Consistency', () => {
    it('should import ChatMessage from types in all files that use it', () => {
      expect(serviceSource).toContain("ChatMessage");
      expect(storeSource).toContain("ChatMessage");
      expect(screenSource).toContain("ChatMessage");
    });

    it('should import ChatContext from types in all files that use it', () => {
      expect(contextSource).toContain("ChatContext");
      expect(serviceSource).toContain("ChatContext");
      expect(storeSource).toContain("ChatContext");
      expect(screenSource).toContain("ChatContext");
    });
  });

  describe('Import Chain', () => {
    it('contextBuilder should import from types', () => {
      expect(contextSource).toContain("from '../types/chat'");
    });

    it('chatService should import from types and contextBuilder', () => {
      expect(serviceSource).toContain("from '../types/chat'");
      expect(serviceSource).toContain("from './contextBuilder'");
    });

    it('chatStore should import from types and chatService', () => {
      expect(storeSource).toContain("from '../types/chat'");
      expect(storeSource).toContain("from '../services/chatService'");
    });

    it('ChatScreen should import from store and types', () => {
      expect(screenSource).toContain("from '../stores/chatStore'");
      expect(screenSource).toContain("from '../types/chat'");
    });

    it('Route should import ChatScreen and chatStore', () => {
      expect(routeSource).toContain("from '@/features/chat/screens/ChatScreen'");
      expect(routeSource).toContain("from '@/features/chat/stores/chatStore'");
    });
  });

  describe('Feature Architecture', () => {
    it('all files should be under features/chat/', () => {
      // Verify the file structure by checking import paths
      expect(contextSource).toContain("../types/chat");
      expect(serviceSource).toContain("../types/chat");
      expect(storeSource).toContain("../types/chat");
      expect(screenSource).toContain("../stores/chatStore");
      expect(screenSource).toContain("../components/ChatBubble");
    });

    it('route should use @/ imports for feature code', () => {
      expect(routeSource).toContain("@/features/chat/");
    });

    it('should use @/ imports for shared app code', () => {
      expect(screenSource).toContain("@/stores/foodLogStore");
      expect(screenSource).toContain("@/stores/goalStore");
      expect(screenSource).toContain("@/stores/profileStore");
      expect(screenSource).toContain("@/hooks/useResolvedTargets");
    });
  });

  describe('Theming Consistency', () => {
    const componentFiles = ['ChatBubble', 'TypingIndicator', 'QuickReplies', 'ChatInput', 'WelcomeMessage'];

    componentFiles.forEach((component) => {
      it(`${component} should use useTheme`, () => {
        const source = fs.readFileSync(
          path.resolve(__dirname, `../../../features/chat/components/${component}.tsx`),
          'utf-8'
        );
        expect(source).toContain("from '@/hooks/useTheme'");
      });
    });
  });

  describe('Safety Flow', () => {
    it('types should define SafetyTrigger', () => {
      expect(typesSource).toContain('SafetyTrigger');
    });

    it('contextBuilder should export detectSafetyTriggers and responses', () => {
      expect(contextSource).toContain('export function detectSafetyTriggers');
      expect(contextSource).toContain('export const SAFETY_RESPONSES');
    });

    it('chatService should use safety detection before API calls', () => {
      expect(serviceSource).toContain('detectSafetyTriggers');
      expect(serviceSource).toContain('SAFETY_RESPONSES');
    });
  });
});

// ============================================================
// 15. ChatService Error Handling Functional Tests
// ============================================================

describe('ChatServiceError Functional Tests', () => {
  const { ChatServiceError } = require('../../../features/chat/services/chatService');

  it('should be an instance of Error', () => {
    const error = new ChatServiceError('test', 'api');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have the correct name', () => {
    const error = new ChatServiceError('test', 'api');
    expect(error.name).toBe('ChatServiceError');
  });

  it('should store the error type', () => {
    const error = new ChatServiceError('rate limited', 'rate_limited');
    expect(error.type).toBe('rate_limited');
  });

  it('should store the error message', () => {
    const error = new ChatServiceError('something broke', 'network');
    expect(error.message).toBe('something broke');
  });

  it('should support all error types', () => {
    const types = ['network', 'api', 'rate_limited', 'offline'] as const;
    types.forEach((type) => {
      const error = new ChatServiceError('test', type);
      expect(error.type).toBe(type);
    });
  });
});

// ============================================================
// 16. File Structure Verification
// ============================================================

describe('Feature 5 File Structure', () => {
  const basePath = path.resolve(__dirname, '../../../');

  const expectedFiles = [
    'features/chat/types/chat.ts',
    'features/chat/services/contextBuilder.ts',
    'features/chat/services/chatService.ts',
    'features/chat/stores/chatStore.ts',
    'features/chat/components/ChatBubble.tsx',
    'features/chat/components/TypingIndicator.tsx',
    'features/chat/components/QuickReplies.tsx',
    'features/chat/components/ChatInput.tsx',
    'features/chat/components/WelcomeMessage.tsx',
    'features/chat/screens/ChatScreen.tsx',
    'app/chat/index.tsx',
  ];

  expectedFiles.forEach((file) => {
    it(`should have ${file}`, () => {
      const fullPath = path.resolve(basePath, file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });
});
