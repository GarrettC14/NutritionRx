/**
 * useVoiceDeepLinks Hook Tests
 *
 * Tests deep link parsing, voice command processing, toast routing,
 * haptic feedback, duplicate processing guard, initial URL handling,
 * and listener cleanup.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

// ---- Mock functions ----

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };
jest.mock('@/hooks/useRouter', () => ({
  useRouter: jest.fn(() => mockRouter),
}));

const mockProcessVoiceDeepLink = jest.fn();
const mockGetHapticTypeForCommand = jest.fn();
jest.mock('@/services/voiceAssistant', () => ({
  processVoiceDeepLink: (...args: any[]) => mockProcessVoiceDeepLink(...args),
  getHapticTypeForCommand: (...args: any[]) => mockGetHapticTypeForCommand(...args),
}));

const mockShowWaterAddedToast = jest.fn();
const mockShowQuickAddToast = jest.fn();
const mockShowWeightLoggedToast = jest.fn();
const mockShowCalorieQueryToast = jest.fn();
const mockShowMacroQueryToast = jest.fn();
const mockShowWaterQueryToast = jest.fn();
const mockShowErrorToast = jest.fn();

jest.mock('@/components/voice', () => ({
  useVoiceToast: jest.fn(() => ({
    showWaterAddedToast: mockShowWaterAddedToast,
    showQuickAddToast: mockShowQuickAddToast,
    showWeightLoggedToast: mockShowWeightLoggedToast,
    showCalorieQueryToast: mockShowCalorieQueryToast,
    showMacroQueryToast: mockShowMacroQueryToast,
    showWaterQueryToast: mockShowWaterQueryToast,
    showErrorToast: mockShowErrorToast,
  })),
}));

const mockTriggerHaptic = jest.fn().mockResolvedValue(undefined);
jest.mock('@/utils/haptics', () => ({
  triggerHaptic: (...args: any[]) => mockTriggerHaptic(...args),
}));

// Import after mocks
import { useVoiceDeepLinks } from '@/hooks/useVoiceDeepLinks';

// ---- Helpers ----

const mockLinking = Linking as unknown as {
  getInitialURL: jest.Mock;
  addEventListener: jest.Mock;
};

function makeSuccessResult(data: Record<string, any> = {}) {
  return { success: true, message: 'OK', data };
}

function makeErrorResult(message = 'Something went wrong') {
  return { success: false, message, data: undefined };
}

describe('useVoiceDeepLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default: no initial URL
    mockLinking.getInitialURL.mockResolvedValue(null);
    mockLinking.addEventListener.mockReturnValue({ remove: jest.fn() });

    // Default: successful processing
    mockProcessVoiceDeepLink.mockResolvedValue(makeSuccessResult());
    mockGetHapticTypeForCommand.mockReturnValue('waterAdded');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // handleDeepLink - voice command processing
  // ============================================================

  describe('handleDeepLink', () => {
    it('processes a water/add deep link with correct path and params', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add?waterAmount=2');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith(
        'water/add',
        { waterAmount: '2' },
      );
    });

    it('processes a quickadd deep link', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ addedCalories: 400, targetMeal: 'lunch' }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://quickadd?calories=400&meal=lunch');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith(
        'quickadd',
        { calories: '400', meal: 'lunch' },
      );
    });

    it('processes a query/calories deep link', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://query/calories');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith('query/calories', {});
    });

    it('processes a query/macros deep link', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://query/macros?queryType=protein');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith(
        'query/macros',
        { queryType: 'protein' },
      );
    });

    it('processes a weight/log deep link', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://weight/log?weight=175&unit=pounds');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith(
        'weight/log',
        { weight: '175', unit: 'pounds' },
      );
    });

    it('processes a water/query deep link', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/query');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith('water/query', {});
    });

    it('does not process non-voice-command paths', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://settings/profile');
      });

      expect(mockProcessVoiceDeepLink).not.toHaveBeenCalled();
    });

    it('does not process an empty URL', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('');
      });

      expect(mockProcessVoiceDeepLink).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Deep link parsing
  // ============================================================

  describe('deep link parsing', () => {
    it('strips the nutritionrx:// scheme and extracts path', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith('water/add', {});
    });

    it('decodes URL-encoded query parameters', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink(
          'nutritionrx://quickadd?meal=late%20night%20snack&calories=200',
        );
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith(
        'quickadd',
        { meal: 'late night snack', calories: '200' },
      );
    });

    it('handles other custom scheme URLs', async () => {
      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('otherscheme://water/add?waterAmount=1');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith(
        'water/add',
        { waterAmount: '1' },
      );
    });
  });

  // ============================================================
  // Toast routing
  // ============================================================

  describe('toast routing', () => {
    it('shows water added toast for water/add command', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ glassesAdded: 1, totalGlasses: 5, waterGoal: 8 }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add?waterAmount=1');
      });

      expect(mockShowWaterAddedToast).toHaveBeenCalledWith(1, 5, 8);
    });

    it('shows water query toast for water/query command', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ totalGlasses: 5, waterGoal: 8 }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/query');
      });

      expect(mockShowWaterQueryToast).toHaveBeenCalledWith(5, 8);
    });

    it('shows quick add toast for quickadd command', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ addedCalories: 400, targetMeal: 'lunch' }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://quickadd?calories=400&meal=lunch');
      });

      expect(mockShowQuickAddToast).toHaveBeenCalledWith(400, 'lunch');
    });

    it('shows calorie query toast for query/calories command', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ totalCalories: 1450 }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://query/calories');
      });

      expect(mockShowCalorieQueryToast).toHaveBeenCalledWith(1450);
    });

    it('shows macro query toast for query/macros command', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ macroType: 'protein', macroAmount: 85 }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://query/macros?queryType=protein');
      });

      expect(mockShowMacroQueryToast).toHaveBeenCalledWith('protein', 85);
    });

    it('shows weight logged toast for weight/log command', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ weight: 175, unit: 'pounds' }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://weight/log?weight=175&unit=pounds');
      });

      expect(mockShowWeightLoggedToast).toHaveBeenCalledWith(175, 'pounds');
    });

    it('shows error toast when result is not successful', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(makeErrorResult('Water logging failed'));

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add');
      });

      expect(mockShowErrorToast).toHaveBeenCalledWith('Water logging failed');
      expect(mockShowWaterAddedToast).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Haptic feedback
  // ============================================================

  describe('haptic feedback', () => {
    it('triggers haptic feedback after processing a voice command', async () => {
      mockGetHapticTypeForCommand.mockReturnValue('waterAdded');
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ glassesAdded: 1, totalGlasses: 3, waterGoal: 8 }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add');
      });

      expect(mockTriggerHaptic).toHaveBeenCalledWith('waterAdded');
    });

    it('triggers error haptic when command fails', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(makeErrorResult('fail'));

      const { result } = renderHook(() => useVoiceDeepLinks());

      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add');
      });

      expect(mockTriggerHaptic).toHaveBeenCalledWith('error');
    });
  });

  // ============================================================
  // Duplicate processing guard
  // ============================================================

  describe('duplicate processing guard', () => {
    it('prevents duplicate processing while a command is in flight', async () => {
      let resolveFirst: (v: any) => void;
      mockProcessVoiceDeepLink.mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; }),
      );

      const { result } = renderHook(() => useVoiceDeepLinks());

      // Start first call (will hang)
      let firstPromise: Promise<void>;
      act(() => {
        firstPromise = result.current.handleDeepLink('nutritionrx://water/add');
      });

      // Attempt second call immediately — should be blocked by processingRef
      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add');
      });

      // processVoiceDeepLink should have been called only once (the first)
      expect(mockProcessVoiceDeepLink).toHaveBeenCalledTimes(1);

      // Resolve the first call to clean up
      await act(async () => {
        resolveFirst!(makeSuccessResult());
        await firstPromise!;
      });
    });

    it('allows processing again after the debounce timeout', async () => {
      mockProcessVoiceDeepLink.mockResolvedValue(makeSuccessResult());

      const { result } = renderHook(() => useVoiceDeepLinks());

      // First call
      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add');
      });

      // Advance past the 500ms debounce
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Second call should now work
      await act(async () => {
        await result.current.handleDeepLink('nutritionrx://water/add');
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // Initial URL handling
  // ============================================================

  describe('initial URL handling', () => {
    it('handles initial URL on mount if one exists', async () => {
      mockLinking.getInitialURL.mockResolvedValue('nutritionrx://water/add?waterAmount=1');
      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ glassesAdded: 1, totalGlasses: 1, waterGoal: 8 }),
      );

      renderHook(() => useVoiceDeepLinks());

      await waitFor(() => {
        expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith(
          'water/add',
          { waterAmount: '1' },
        );
      });
    });

    it('does not process if initial URL is null', async () => {
      mockLinking.getInitialURL.mockResolvedValue(null);

      renderHook(() => useVoiceDeepLinks());

      // Wait for any potential async activity to settle
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockProcessVoiceDeepLink).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Listener setup and cleanup
  // ============================================================

  describe('listener setup and cleanup', () => {
    it('registers a Linking url event listener on mount', () => {
      renderHook(() => useVoiceDeepLinks());

      expect(mockLinking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function));
    });

    it('removes the listener on unmount', () => {
      const mockRemove = jest.fn();
      mockLinking.addEventListener.mockReturnValue({ remove: mockRemove });

      const { unmount } = renderHook(() => useVoiceDeepLinks());
      unmount();

      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('handles incoming URLs via the event listener', async () => {
      let urlHandler: ((event: { url: string }) => void) | undefined;
      mockLinking.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'url') urlHandler = handler;
        return { remove: jest.fn() };
      });

      mockProcessVoiceDeepLink.mockResolvedValue(
        makeSuccessResult({ totalCalories: 1200 }),
      );

      renderHook(() => useVoiceDeepLinks());

      // Simulate an incoming deep link via the listener
      await act(async () => {
        urlHandler!({ url: 'nutritionrx://query/calories' });
        // Allow async processing to complete
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockProcessVoiceDeepLink).toHaveBeenCalledWith('query/calories', {});
    });
  });
});
