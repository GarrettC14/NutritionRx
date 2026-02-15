/**
 * useVoiceToast Hook Tests
 */

import { renderHook, act } from '@testing-library/react-native';
import { useVoiceToast } from '../useVoiceToast';

describe('useVoiceToast', () => {
  it('initializes with toast not visible', () => {
    const { result } = renderHook(() => useVoiceToast());

    expect(result.current.toastState.visible).toBe(false);
    expect(result.current.toastState.icon).toBe('');
    expect(result.current.toastState.title).toBe('');
  });

  it('shows toast with showToast', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showToast({
        icon: 'water-outline',
        title: '+1 Water',
        subtitle: '5 of 8',
      });
    });

    expect(result.current.toastState.visible).toBe(true);
    expect(result.current.toastState.icon).toBe('water-outline');
    expect(result.current.toastState.title).toBe('+1 Water');
    expect(result.current.toastState.subtitle).toBe('5 of 8');
  });

  it('hides toast with hideToast', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showToast({
        icon: 'water-outline',
        title: 'Test',
      });
    });

    expect(result.current.toastState.visible).toBe(true);

    act(() => {
      result.current.hideToast();
    });

    expect(result.current.toastState.visible).toBe(false);
  });

  it('shows water added toast correctly', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showWaterAddedToast(1, 5, 8);
    });

    expect(result.current.toastState.visible).toBe(true);
    expect(result.current.toastState.icon).toBe('water-outline');
    expect(result.current.toastState.title).toBe('+1 Water');
    expect(result.current.toastState.subtitle).toBe('5 of 8');
  });

  it('shows multiple water glasses toast correctly', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showWaterAddedToast(3, 6, 8);
    });

    expect(result.current.toastState.title).toBe('+3 Water');
    expect(result.current.toastState.subtitle).toBe('6 of 8');
  });

  it('shows quick add toast correctly', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showQuickAddToast(400, 'lunch');
    });

    expect(result.current.toastState.visible).toBe(true);
    expect(result.current.toastState.icon).toBe('checkmark-outline');
    expect(result.current.toastState.title).toBe('+400 cal');
    expect(result.current.toastState.subtitle).toBe('Lunch');
  });

  it('capitalizes meal name in quick add toast', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showQuickAddToast(300, 'breakfast');
    });

    expect(result.current.toastState.subtitle).toBe('Breakfast');
  });

  it('shows weight logged toast for pounds', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showWeightLoggedToast(175, 'pounds');
    });

    expect(result.current.toastState.visible).toBe(true);
    expect(result.current.toastState.icon).toBe('scale-outline');
    expect(result.current.toastState.title).toBe('175 lbs');
    expect(result.current.toastState.subtitle).toBe('Weight logged');
  });

  it('shows weight logged toast for kilograms with decimal', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showWeightLoggedToast(79.5, 'kilograms');
    });

    expect(result.current.toastState.title).toBe('79.5 kg');
  });

  it('replaces previous toast when showing new one', () => {
    const { result } = renderHook(() => useVoiceToast());

    act(() => {
      result.current.showToast({
        icon: 'water-outline',
        title: 'First',
      });
    });

    expect(result.current.toastState.title).toBe('First');

    act(() => {
      result.current.showToast({
        icon: 'checkmark-outline',
        title: 'Second',
      });
    });

    expect(result.current.toastState.title).toBe('Second');
    expect(result.current.toastState.icon).toBe('checkmark-outline');
  });
});
