import React from 'react';

// Make React available globally so component files using JSX without React import work
// under the classic jsx transform used by ts-jest
(globalThis as any).React = React;

// Augment the react-native mock with components needed for ConfirmDialog
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Modal: ({ children, testID, visible, ...props }: any) => {
      if (!visible) return null;
      return React.createElement('Modal', { testID, ...props }, children);
    },
    Pressable: ({ children, testID, style, onPress, ...props }: any) => {
      // Resolve style if it's a function (pressed state)
      const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
      return React.createElement(
        'Pressable',
        { testID, style: resolvedStyle, onPress, ...props },
        children,
      );
    },
    View: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    Text: ({ children, ...props }: any) =>
      React.createElement('Text', props, children),
  };
});

import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConfirmDialog, ConfirmDialogConfig } from '@/components/ui/ConfirmDialog';

// Mock the theme hook to return a stable set of colors
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colorScheme: 'dark',
    isDark: true,
    colors: {
      bgPrimary: '#0D1117',
      bgSecondary: '#161B22',
      bgElevated: '#21262D',
      bgInteractive: '#30363D',
      textPrimary: '#F0F6FC',
      textSecondary: '#8B949E',
      textTertiary: '#6E7681',
      textDisabled: '#484F58',
      accent: '#64B5F6',
      error: '#F85149',
    },
    preference: 'system',
    setPreference: jest.fn(),
  }),
}));

describe('ConfirmDialog', () => {
  const defaultConfig: ConfirmDialogConfig = {
    title: 'Delete Entry',
    message: 'Are you sure you want to delete this entry?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmStyle: 'default',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  const defaultProps = {
    visible: true,
    config: defaultConfig,
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId('ui-confirm-dialog')).toBeTruthy();
  });

  it('does not render when config is null', () => {
    render(<ConfirmDialog visible={true} config={null} onDismiss={jest.fn()} />);

    expect(screen.queryByTestId('ui-confirm-dialog')).toBeNull();
  });

  it('shows title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Delete Entry')).toBeTruthy();
    expect(screen.getByText('Are you sure you want to delete this entry?')).toBeTruthy();
  });

  it('calls onConfirm and onDismiss when confirm button pressed', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const config: ConfirmDialogConfig = {
      ...defaultConfig,
      onConfirm,
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={onDismiss} />);

    fireEvent.press(screen.getByTestId('ui-confirm-dialog-confirm'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel and onDismiss when cancel button pressed', () => {
    const onCancel = jest.fn();
    const onDismiss = jest.fn();

    const config: ConfirmDialogConfig = {
      ...defaultConfig,
      onCancel,
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={onDismiss} />);

    fireEvent.press(screen.getByTestId('ui-confirm-dialog-cancel'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('destructive variant applies error color to confirm button', () => {
    const config: ConfirmDialogConfig = {
      ...defaultConfig,
      confirmStyle: 'destructive',
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={jest.fn()} />);

    const confirmButton = screen.getByTestId('ui-confirm-dialog-confirm');
    expect(confirmButton).toBeTruthy();

    // The button's style should include the error color (#F85149) as backgroundColor
    const style = confirmButton.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.backgroundColor).toBe('#F85149');
  });

  it('default variant applies accent color to confirm button', () => {
    const config: ConfirmDialogConfig = {
      ...defaultConfig,
      confirmStyle: 'default',
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={jest.fn()} />);

    const confirmButton = screen.getByTestId('ui-confirm-dialog-confirm');
    const style = confirmButton.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.backgroundColor).toBe('#64B5F6');
  });

  it('hides cancel button when cancelLabel is null', () => {
    const config: ConfirmDialogConfig = {
      ...defaultConfig,
      cancelLabel: null,
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={jest.fn()} />);

    expect(screen.queryByTestId('ui-confirm-dialog-cancel')).toBeNull();
    // Confirm button should still be present
    expect(screen.getByTestId('ui-confirm-dialog-confirm')).toBeTruthy();
  });

  it('shows cancel button when cancelLabel is a string', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId('ui-confirm-dialog-cancel')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('displays custom confirm and cancel labels', () => {
    const config: ConfirmDialogConfig = {
      ...defaultConfig,
      confirmLabel: 'Yes, remove',
      cancelLabel: 'No, keep it',
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={jest.fn()} />);

    expect(screen.getByText('Yes, remove')).toBeTruthy();
    expect(screen.getByText('No, keep it')).toBeTruthy();
  });

  it('displays icon when provided', () => {
    const config: ConfirmDialogConfig = {
      ...defaultConfig,
      icon: '\u{1F5D1}',
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={jest.fn()} />);

    expect(screen.getByText('\u{1F5D1}')).toBeTruthy();
  });

  it('uses default confirmLabel when not specified', () => {
    const config: ConfirmDialogConfig = {
      title: 'Test',
      message: 'Test message',
      onConfirm: jest.fn(),
    };

    render(<ConfirmDialog visible={true} config={config} onDismiss={jest.fn()} />);

    expect(screen.getByText('Confirm')).toBeTruthy();
  });
});
