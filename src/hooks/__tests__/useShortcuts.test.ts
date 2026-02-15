/**
 * useShortcuts Hook Tests
 *
 * Tests for Siri Shortcut donation hooks that interface with
 * the ShortcutsBridge native module on iOS.
 *
 * Note: The hook destructures ShortcutsBridge from NativeModules at
 * module load time (line 16). This means the hook's internal
 * `ShortcutsBridge` variable is the same object reference as
 * `NativeModules.ShortcutsBridge` from the mock. We manipulate
 * properties on that captured reference to test different scenarios.
 */

import { renderHook, act } from '@testing-library/react-native';
import { Platform, NativeModules } from 'react-native';

// ---- Mock voiceAssistant service ----
const mockGetCurrentMealPeriod = jest.fn(() => 'lunch');
jest.mock('@/services/voiceAssistant', () => ({
  getCurrentMealPeriod: mockGetCurrentMealPeriod,
}));

// ---- Import hooks under test (uses the default mock ShortcutsBridge) ----
import {
  useShortcuts,
  useWaterShortcutDonation,
  useQuickAddShortcutDonation,
  useCalorieQueryShortcutDonation,
  useMacroQueryShortcutDonation,
  useWeightShortcutDonation,
  useFoodLogShortcutDonation,
} from '../useShortcuts';

// Grab a reference to the same ShortcutsBridge object the hook captured
// at module load time (from the mock in src/__mocks__/react-native.ts).
const capturedBridge = NativeModules.ShortcutsBridge;

describe('useShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform to iOS
    (Platform as any).OS = 'ios';
    // Reset the mock on the *same* object the hook holds
    capturedBridge.donateShortcut = jest.fn().mockResolvedValue({ success: true });
    mockGetCurrentMealPeriod.mockReturnValue('lunch');
  });

  // ============================================================
  // Core donateShortcut Tests
  // ============================================================

  describe('donateShortcut', () => {
    it('calls ShortcutsBridge.donateShortcut on iOS', async () => {
      const { result } = renderHook(() => useShortcuts());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.donateShortcut({
          type: 'LOG_WATER',
          data: { amount: 1 },
        });
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'LOG_WATER',
        { amount: 1 }
      );
      expect(success).toBe(true);
    });

    it('returns false on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';
      const { result } = renderHook(() => useShortcuts());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.donateShortcut({
          type: 'LOG_WATER',
          data: { amount: 1 },
        });
      });

      expect(capturedBridge.donateShortcut).not.toHaveBeenCalled();
      expect(success).toBe(false);
    });

    it('returns false on web platform', async () => {
      (Platform as any).OS = 'web';
      const { result } = renderHook(() => useShortcuts());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.donateShortcut({
          type: 'QUERY_CALORIES',
          data: {},
        });
      });

      expect(capturedBridge.donateShortcut).not.toHaveBeenCalled();
      expect(success).toBe(false);
    });

    it('returns false when donateShortcut method is not on bridge', async () => {
      // Remove donateShortcut from the captured bridge object
      delete capturedBridge.donateShortcut;
      const { result } = renderHook(() => useShortcuts());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.donateShortcut({
          type: 'LOG_WATER',
          data: { amount: 1 },
        });
      });

      expect(success).toBe(false);
    });

    it('returns false when native module throws an error', async () => {
      capturedBridge.donateShortcut = jest
        .fn()
        .mockRejectedValue(new Error('Native error'));
      const { result } = renderHook(() => useShortcuts());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.donateShortcut({
          type: 'LOG_WATER',
          data: { amount: 1 },
        });
      });

      expect(success).toBe(false);
    });

    it('returns false when native module returns null result', async () => {
      capturedBridge.donateShortcut = jest.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useShortcuts());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.donateShortcut({
          type: 'QUERY_CALORIES',
          data: {},
        });
      });

      expect(success).toBe(false);
    });

    it('returns false when native module returns success: false', async () => {
      capturedBridge.donateShortcut = jest
        .fn()
        .mockResolvedValue({ success: false });
      const { result } = renderHook(() => useShortcuts());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.donateShortcut({
          type: 'LOG_WATER',
          data: { amount: 1 },
        });
      });

      expect(success).toBe(false);
    });
  });

  // ============================================================
  // useWaterShortcutDonation Tests
  // ============================================================

  describe('useWaterShortcutDonation', () => {
    it('donates LOG_WATER shortcut with amount', async () => {
      const { result } = renderHook(() => useWaterShortcutDonation());

      await act(async () => {
        await result.current.donateAfterWaterLog(3);
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'LOG_WATER',
        { amount: 3 }
      );
    });

    it('defaults to amount 1 when no amount provided', async () => {
      const { result } = renderHook(() => useWaterShortcutDonation());

      await act(async () => {
        await result.current.donateAfterWaterLog();
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'LOG_WATER',
        { amount: 1 }
      );
    });
  });

  // ============================================================
  // useQuickAddShortcutDonation Tests
  // ============================================================

  describe('useQuickAddShortcutDonation', () => {
    it('donates QUICK_ADD shortcut with calories and meal', async () => {
      const { result } = renderHook(() => useQuickAddShortcutDonation());

      await act(async () => {
        await result.current.donateAfterQuickAdd(400, 'breakfast');
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'QUICK_ADD',
        { calories: 400, meal: 'breakfast' }
      );
    });

    it('uses getCurrentMealPeriod when no meal is provided', async () => {
      mockGetCurrentMealPeriod.mockReturnValue('dinner');
      const { result } = renderHook(() => useQuickAddShortcutDonation());

      await act(async () => {
        await result.current.donateAfterQuickAdd(250);
      });

      expect(mockGetCurrentMealPeriod).toHaveBeenCalled();
      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'QUICK_ADD',
        { calories: 250, meal: 'dinner' }
      );
    });
  });

  // ============================================================
  // useCalorieQueryShortcutDonation Tests
  // ============================================================

  describe('useCalorieQueryShortcutDonation', () => {
    it('donates QUERY_CALORIES shortcut with empty data', async () => {
      const { result } = renderHook(() => useCalorieQueryShortcutDonation());

      await act(async () => {
        await result.current.donateAfterCalorieQuery();
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'QUERY_CALORIES',
        {}
      );
    });
  });

  // ============================================================
  // useMacroQueryShortcutDonation Tests
  // ============================================================

  describe('useMacroQueryShortcutDonation', () => {
    it('donates QUERY_MACROS shortcut with macroType', async () => {
      const { result } = renderHook(() => useMacroQueryShortcutDonation());

      await act(async () => {
        await result.current.donateAfterMacroQuery('protein');
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'QUERY_MACROS',
        { macroType: 'protein' }
      );
    });

    it('handles different macro types', async () => {
      const { result } = renderHook(() => useMacroQueryShortcutDonation());

      await act(async () => {
        await result.current.donateAfterMacroQuery('fat');
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'QUERY_MACROS',
        { macroType: 'fat' }
      );
    });
  });

  // ============================================================
  // useWeightShortcutDonation Tests
  // ============================================================

  describe('useWeightShortcutDonation', () => {
    it('donates LOG_WEIGHT shortcut with weight and unit', async () => {
      const { result } = renderHook(() => useWeightShortcutDonation());

      await act(async () => {
        await result.current.donateAfterWeightLog(175.5, 'pounds');
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'LOG_WEIGHT',
        { weight: 175.5, unit: 'pounds' }
      );
    });

    it('handles kilograms unit', async () => {
      const { result } = renderHook(() => useWeightShortcutDonation());

      await act(async () => {
        await result.current.donateAfterWeightLog(80, 'kilograms');
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'LOG_WEIGHT',
        { weight: 80, unit: 'kilograms' }
      );
    });
  });

  // ============================================================
  // useFoodLogShortcutDonation Tests
  // ============================================================

  describe('useFoodLogShortcutDonation', () => {
    it('donates LOG_FOOD shortcut with foodId and foodName', async () => {
      const { result } = renderHook(() => useFoodLogShortcutDonation());

      await act(async () => {
        await result.current.donateFrequentFoodShortcut('food-123', 'Chicken Breast');
      });

      expect(capturedBridge.donateShortcut).toHaveBeenCalledWith(
        'LOG_FOOD',
        { foodId: 'food-123', foodName: 'Chicken Breast' }
      );
    });
  });
});
