/**
 * VoiceToast Component Tests
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { VoiceToast } from '../VoiceToast';

// Mock useTheme hook
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      bgSecondary: '#1a1a1a',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
    },
  }),
}));

// Mock Animated to avoid animation timing issues in tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({
    start: (callback?: () => void) => callback?.(),
  });
  RN.Animated.spring = () => ({
    start: (callback?: () => void) => callback?.(),
  });
  RN.Animated.parallel = (animations: any[]) => ({
    start: (callback?: () => void) => callback?.(),
  });
  return RN;
});

describe('VoiceToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <VoiceToast
        visible={false}
        icon="💧"
        title="+1 Water"
        subtitle="5 of 8"
      />
    );

    expect(queryByText('+1 Water')).toBeNull();
  });

  it('renders content when visible', () => {
    const { getByText } = render(
      <VoiceToast
        visible={true}
        icon="💧"
        title="+1 Water"
        subtitle="5 of 8"
      />
    );

    expect(getByText('💧')).toBeTruthy();
    expect(getByText('+1 Water')).toBeTruthy();
    expect(getByText('5 of 8')).toBeTruthy();
  });

  it('renders without subtitle', () => {
    const { getByText, queryByText } = render(
      <VoiceToast
        visible={true}
        icon="✓"
        title="+400 cal"
      />
    );

    expect(getByText('+400 cal')).toBeTruthy();
    // No subtitle should be present
  });

  it('calls onDismiss after auto-dismiss timeout', async () => {
    const onDismiss = jest.fn();

    render(
      <VoiceToast
        visible={true}
        icon="💧"
        title="+1 Water"
        onDismiss={onDismiss}
      />
    );

    // Fast-forward past the toast duration (2000ms) and animation (200ms)
    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    // onDismiss should be called after auto-dismiss
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it('displays water added toast correctly', () => {
    const { getByText } = render(
      <VoiceToast
        visible={true}
        icon="💧"
        title="+1 Water"
        subtitle="5 of 8"
      />
    );

    expect(getByText('💧')).toBeTruthy();
    expect(getByText('+1 Water')).toBeTruthy();
    expect(getByText('5 of 8')).toBeTruthy();
  });

  it('displays quick add toast correctly', () => {
    const { getByText } = render(
      <VoiceToast
        visible={true}
        icon="✓"
        title="+400 cal"
        subtitle="Lunch"
      />
    );

    expect(getByText('✓')).toBeTruthy();
    expect(getByText('+400 cal')).toBeTruthy();
    expect(getByText('Lunch')).toBeTruthy();
  });

  it('displays weight logged toast correctly', () => {
    const { getByText } = render(
      <VoiceToast
        visible={true}
        icon="⚖️"
        title="175 lbs"
        subtitle="Weight logged"
      />
    );

    expect(getByText('⚖️')).toBeTruthy();
    expect(getByText('175 lbs')).toBeTruthy();
    expect(getByText('Weight logged')).toBeTruthy();
  });
});
