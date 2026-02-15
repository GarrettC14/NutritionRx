import { useChatStore } from '../stores/chatStore';
import { chatService, ChatServiceError } from '../services/chatService';
import { ERROR_MESSAGES } from '../services/contextBuilder';
import { ChatContext } from '../types/chat';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../services/chatService', () => ({
  chatService: {
    sendMessageStreaming: jest.fn(),
  },
  ChatServiceError: class ChatServiceError extends Error {
    type: string;
    constructor(message: string, type: string) {
      super(message);
      this.name = 'ChatServiceError';
      this.type = type;
    }
  },
}));

jest.mock('../services/contextBuilder', () => ({
  ERROR_MESSAGES: {
    network: "I couldn't connect. Please check your internet and try again.",
    api: 'Something went wrong on my end. Please try again in a moment.',
    rate_limited: 'I need a short break. Please try again in a minute.',
    offline:
      'Chat requires an internet connection. Please connect and try again.',
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSendMessageStreaming =
  chatService.sendMessageStreaming as jest.Mock;

/** Minimal ChatContext fixture. */
const makeContext = (overrides: Partial<ChatContext> = {}): ChatContext => ({
  todayLog: {
    calories: 1500,
    calorieTarget: 2000,
    protein: 100,
    proteinTarget: 150,
    carbs: 150,
    carbTarget: 200,
    fat: 50,
    fatTarget: 65,
    water: 4,
    waterTarget: 8,
  },
  weeklyAverage: { calories: 1800, protein: 120, daysLogged: 5 },
  goals: { primaryGoal: 'maintain' },
  preferences: { restrictions: [] },
  recentFoods: ['chicken breast', 'rice'],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useChatStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.setState({
      messages: [],
      isGenerating: false,
      error: null,
      sessionId: 'test-session',
      messageCount: 0,
    });
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('has empty messages array', () => {
      // Reset to true initial state produced by create()
      useChatStore.setState({
        messages: [],
        isGenerating: false,
        error: null,
        sessionId: 'initial-session',
        messageCount: 0,
      });
      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
    });

    it('has isGenerating set to false', () => {
      expect(useChatStore.getState().isGenerating).toBe(false);
    });

    it('has error set to null', () => {
      expect(useChatStore.getState().error).toBeNull();
    });

    it('has a sessionId', () => {
      expect(useChatStore.getState().sessionId).toBeDefined();
      expect(typeof useChatStore.getState().sessionId).toBe('string');
      expect(useChatStore.getState().sessionId.length).toBeGreaterThan(0);
    });

    it('has messageCount set to 0', () => {
      expect(useChatStore.getState().messageCount).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // addMessage
  // -----------------------------------------------------------------------
  describe('addMessage', () => {
    it('adds a message with a generated id and timestamp', () => {
      const { addMessage } = useChatStore.getState();
      const id = addMessage({ role: 'user', content: 'Hello', status: 'sent' });

      expect(typeof id).toBe('string');
      expect(id).toMatch(/^msg_/);

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        id,
        role: 'user',
        content: 'Hello',
        status: 'sent',
      });
      expect(messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('increments messageCount for each added message', () => {
      const { addMessage } = useChatStore.getState();
      addMessage({ role: 'user', content: 'First', status: 'sent' });
      expect(useChatStore.getState().messageCount).toBe(1);

      addMessage({ role: 'assistant', content: 'Second', status: 'sent' });
      expect(useChatStore.getState().messageCount).toBe(2);
    });

    it('returns a unique id for each message', () => {
      const { addMessage } = useChatStore.getState();
      const id1 = addMessage({ role: 'user', content: 'A', status: 'sent' });
      const id2 = addMessage({ role: 'user', content: 'B', status: 'sent' });
      expect(id1).not.toBe(id2);
    });

    it('appends messages in order', () => {
      const { addMessage } = useChatStore.getState();
      addMessage({ role: 'user', content: 'First', status: 'sent' });
      addMessage({ role: 'assistant', content: 'Second', status: 'sent' });

      const { messages } = useChatStore.getState();
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
    });
  });

  // -----------------------------------------------------------------------
  // updateMessage
  // -----------------------------------------------------------------------
  describe('updateMessage', () => {
    it('partially updates the correct message', () => {
      const { addMessage } = useChatStore.getState();
      const id = addMessage({
        role: 'assistant',
        content: 'Initial',
        status: 'sending',
      });

      useChatStore.getState().updateMessage(id, {
        content: 'Updated',
        status: 'sent',
      });

      const msg = useChatStore.getState().messages.find((m) => m.id === id);
      expect(msg).toBeDefined();
      expect(msg!.content).toBe('Updated');
      expect(msg!.status).toBe('sent');
      // role should remain unchanged
      expect(msg!.role).toBe('assistant');
    });

    it('leaves other messages unchanged', () => {
      const { addMessage } = useChatStore.getState();
      const id1 = addMessage({
        role: 'user',
        content: 'Unchanged',
        status: 'sent',
      });
      const id2 = addMessage({
        role: 'assistant',
        content: 'WillChange',
        status: 'sending',
      });

      useChatStore.getState().updateMessage(id2, { content: 'Changed' });

      const msgs = useChatStore.getState().messages;
      expect(msgs.find((m) => m.id === id1)!.content).toBe('Unchanged');
      expect(msgs.find((m) => m.id === id2)!.content).toBe('Changed');
    });

    it('handles non-existent id gracefully (no-op)', () => {
      const { addMessage } = useChatStore.getState();
      addMessage({ role: 'user', content: 'Hello', status: 'sent' });

      // Should not throw
      useChatStore.getState().updateMessage('non-existent-id', {
        content: 'Nope',
      });

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello');
    });
  });

  // -----------------------------------------------------------------------
  // sendMessage — success path
  // -----------------------------------------------------------------------
  describe('sendMessage', () => {
    it('adds user message and placeholder assistant message', async () => {
      mockSendMessageStreaming.mockResolvedValue(undefined);

      await useChatStore.getState().sendMessage('Hi there', makeContext());

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hi there');
      expect(messages[0].status).toBe('sent');
      expect(messages[1].role).toBe('assistant');
    });

    it('calls chatService.sendMessageStreaming with correct arguments', async () => {
      mockSendMessageStreaming.mockResolvedValue(undefined);
      const ctx = makeContext();

      await useChatStore.getState().sendMessage('What should I eat?', ctx);

      expect(mockSendMessageStreaming).toHaveBeenCalledTimes(1);
      const [messagesArg, contextArg, onChunkArg] =
        mockSendMessageStreaming.mock.calls[0];

      // Messages should be all non-system messages excluding the placeholder
      // That means only the user message should be sent
      expect(messagesArg).toHaveLength(1);
      expect(messagesArg[0].role).toBe('user');
      expect(messagesArg[0].content).toBe('What should I eat?');

      // Context should be passed through
      expect(contextArg).toBe(ctx);

      // onChunk should be a function
      expect(typeof onChunkArg).toBe('function');
    });

    it('updates assistant message with streaming chunks via onChunk', async () => {
      mockSendMessageStreaming.mockImplementation(
        async (
          _messages: unknown,
          _context: unknown,
          onChunk: (chunk: string) => void
        ) => {
          onChunk('Hello ');
          onChunk('world!');
        }
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      const { messages } = useChatStore.getState();
      const assistantMsg = messages.find((m) => m.role === 'assistant');
      expect(assistantMsg).toBeDefined();
      // The store accumulates: fullResponse += chunk each time, then sets content
      // After "Hello " -> content = "Hello "
      // After "world!" -> content = "Hello world!"
      expect(assistantMsg!.content).toBe('Hello world!');
      expect(assistantMsg!.status).toBe('sent');
    });

    it('sets isGenerating to true during generation and false when done', async () => {
      let capturedIsGenerating: boolean | undefined;

      mockSendMessageStreaming.mockImplementation(async () => {
        // Capture isGenerating while the service is "running"
        capturedIsGenerating = useChatStore.getState().isGenerating;
      });

      await useChatStore.getState().sendMessage('Test', makeContext());

      expect(capturedIsGenerating).toBe(true);
      expect(useChatStore.getState().isGenerating).toBe(false);
    });

    it('clears any previous error when sending starts', async () => {
      // Set a pre-existing error
      useChatStore.setState({ error: 'old error' });

      mockSendMessageStreaming.mockResolvedValue(undefined);
      await useChatStore.getState().sendMessage('Hi', makeContext());

      // During send, error should have been cleared
      // After success, error remains null
      expect(useChatStore.getState().error).toBeNull();
    });

    it('marks assistant message status as sent on success', async () => {
      mockSendMessageStreaming.mockImplementation(
        async (
          _messages: unknown,
          _context: unknown,
          onChunk: (chunk: string) => void
        ) => {
          onChunk('Done');
        }
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      const assistantMsg = useChatStore
        .getState()
        .messages.find((m) => m.role === 'assistant');
      expect(assistantMsg!.status).toBe('sent');
    });
  });

  // -----------------------------------------------------------------------
  // sendMessage — error handling
  // -----------------------------------------------------------------------
  describe('sendMessage error handling', () => {
    it('handles ChatServiceError with type "api"', async () => {
      mockSendMessageStreaming.mockRejectedValue(
        new ChatServiceError('API failure', 'api')
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      const { messages, error, isGenerating } = useChatStore.getState();
      expect(isGenerating).toBe(false);
      expect(error).toBe(ERROR_MESSAGES.api);

      const assistantMsg = messages.find((m) => m.role === 'assistant');
      expect(assistantMsg!.content).toBe(ERROR_MESSAGES.api);
      expect(assistantMsg!.status).toBe('error');
    });

    it('handles ChatServiceError with type "rate_limited"', async () => {
      mockSendMessageStreaming.mockRejectedValue(
        new ChatServiceError('Too many requests', 'rate_limited')
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      expect(useChatStore.getState().error).toBe(ERROR_MESSAGES.rate_limited);
    });

    it('handles ChatServiceError with type "network"', async () => {
      mockSendMessageStreaming.mockRejectedValue(
        new ChatServiceError('Network failed', 'network')
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      expect(useChatStore.getState().error).toBe(ERROR_MESSAGES.network);
    });

    it('handles ChatServiceError with type "offline"', async () => {
      mockSendMessageStreaming.mockRejectedValue(
        new ChatServiceError('No connection', 'offline')
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      expect(useChatStore.getState().error).toBe(ERROR_MESSAGES.offline);
    });

    it('handles network TypeError errors', async () => {
      mockSendMessageStreaming.mockRejectedValue(
        new TypeError('Network request failed')
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      expect(useChatStore.getState().error).toBe(ERROR_MESSAGES.network);
    });

    it('handles generic/unknown errors with api error message', async () => {
      mockSendMessageStreaming.mockRejectedValue(new Error('Something broke'));

      await useChatStore.getState().sendMessage('Hi', makeContext());

      expect(useChatStore.getState().error).toBe(ERROR_MESSAGES.api);
    });

    it('sets assistant message content to error message on failure', async () => {
      mockSendMessageStreaming.mockRejectedValue(
        new ChatServiceError('Boom', 'rate_limited')
      );

      await useChatStore.getState().sendMessage('Hi', makeContext());

      const assistantMsg = useChatStore
        .getState()
        .messages.find((m) => m.role === 'assistant');
      expect(assistantMsg!.content).toBe(ERROR_MESSAGES.rate_limited);
      expect(assistantMsg!.status).toBe('error');
    });

    it('sets isGenerating to false after error', async () => {
      mockSendMessageStreaming.mockRejectedValue(new Error('fail'));

      await useChatStore.getState().sendMessage('Hi', makeContext());

      expect(useChatStore.getState().isGenerating).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // clearChat
  // -----------------------------------------------------------------------
  describe('clearChat', () => {
    it('resets messages to empty array', () => {
      const { addMessage, clearChat } = useChatStore.getState();
      addMessage({ role: 'user', content: 'Hello', status: 'sent' });
      expect(useChatStore.getState().messages).toHaveLength(1);

      clearChat();
      expect(useChatStore.getState().messages).toEqual([]);
    });

    it('resets messageCount to 0', () => {
      const { addMessage, clearChat } = useChatStore.getState();
      addMessage({ role: 'user', content: 'Hello', status: 'sent' });
      expect(useChatStore.getState().messageCount).toBe(1);

      clearChat();
      expect(useChatStore.getState().messageCount).toBe(0);
    });

    it('resets error to null', () => {
      useChatStore.setState({ error: 'some error' });
      useChatStore.getState().clearChat();
      expect(useChatStore.getState().error).toBeNull();
    });

    it('resets isGenerating to false', () => {
      useChatStore.setState({ isGenerating: true });
      useChatStore.getState().clearChat();
      expect(useChatStore.getState().isGenerating).toBe(false);
    });

    it('generates a new sessionId', () => {
      const oldSessionId = useChatStore.getState().sessionId;
      useChatStore.getState().clearChat();
      const newSessionId = useChatStore.getState().sessionId;

      expect(newSessionId).toBeDefined();
      expect(typeof newSessionId).toBe('string');
      expect(newSessionId).toMatch(/^session_/);
      expect(newSessionId).not.toBe(oldSessionId);
    });
  });

  // -----------------------------------------------------------------------
  // dismissError
  // -----------------------------------------------------------------------
  describe('dismissError', () => {
    it('clears error to null', () => {
      useChatStore.setState({ error: 'Something went wrong' });
      expect(useChatStore.getState().error).toBe('Something went wrong');

      useChatStore.getState().dismissError();
      expect(useChatStore.getState().error).toBeNull();
    });

    it('is a no-op when error is already null', () => {
      expect(useChatStore.getState().error).toBeNull();
      useChatStore.getState().dismissError();
      expect(useChatStore.getState().error).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('sendMessage while already generating still proceeds', async () => {
      // First call: takes a while
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((r) => {
        resolveFirst = r;
      });
      mockSendMessageStreaming.mockImplementationOnce(async () => {
        await firstPromise;
      });

      // Second call: resolves immediately
      mockSendMessageStreaming.mockImplementationOnce(
        async (
          _messages: unknown,
          _context: unknown,
          onChunk: (chunk: string) => void
        ) => {
          onChunk('Second response');
        }
      );

      const firstSend = useChatStore
        .getState()
        .sendMessage('First', makeContext());

      // Start second send while first is still running
      const secondSend = useChatStore
        .getState()
        .sendMessage('Second', makeContext());

      // Resolve first
      resolveFirst!();
      await Promise.all([firstSend, secondSend]);

      // Both messages should exist
      const { messages } = useChatStore.getState();
      const userMsgs = messages.filter((m) => m.role === 'user');
      const assistantMsgs = messages.filter((m) => m.role === 'assistant');
      expect(userMsgs).toHaveLength(2);
      expect(assistantMsgs).toHaveLength(2);
    });

    it('sendMessage with empty text still processes', async () => {
      mockSendMessageStreaming.mockImplementation(
        async (
          _messages: unknown,
          _context: unknown,
          onChunk: (chunk: string) => void
        ) => {
          onChunk('Response to empty');
        }
      );

      await useChatStore.getState().sendMessage('', makeContext());

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('');
      expect(messages[1].content).toBe('Response to empty');
    });

    it('sendMessage filters out system messages before calling service', async () => {
      // Pre-populate a system message
      useChatStore.getState().addMessage({
        role: 'system',
        content: 'System prompt',
        status: 'sent',
      });

      mockSendMessageStreaming.mockResolvedValue(undefined);

      await useChatStore
        .getState()
        .sendMessage('User question', makeContext());

      const [messagesArg] = mockSendMessageStreaming.mock.calls[0];
      // System messages should be filtered out, and the placeholder assistant
      // message should also be excluded. Only the system msg + user msg are
      // in the store. After filtering system + placeholder, only user msg remains.
      const systemMsgs = messagesArg.filter(
        (m: { role: string }) => m.role === 'system'
      );
      expect(systemMsgs).toHaveLength(0);
    });

    it('multiple chunks accumulate correctly', async () => {
      mockSendMessageStreaming.mockImplementation(
        async (
          _messages: unknown,
          _context: unknown,
          onChunk: (chunk: string) => void
        ) => {
          onChunk('A');
          onChunk('B');
          onChunk('C');
          onChunk('D');
          onChunk('E');
        }
      );

      await useChatStore.getState().sendMessage('Go', makeContext());

      const assistantMsg = useChatStore
        .getState()
        .messages.find((m) => m.role === 'assistant');
      expect(assistantMsg!.content).toBe('ABCDE');
    });
  });
});
