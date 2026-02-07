/**
 * Toast Component
 * Non-blocking feedback notifications that auto-dismiss
 *
 * Follows "Nourished Calm" design:
 * - Soft cream background
 * - Sage green icons
 * - Auto-dismisses after 2 seconds
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

const TOAST_DURATION = 2000; // 2 seconds
const ANIMATION_DURATION = 200;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Toast types with predefined icons
export type ToastType = 'success' | 'error' | 'info' | 'copied';

interface ToastConfig {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

export interface ToastData {
  type: ToastType;
  title: string;
  subtitle?: string;
}

interface ToastProps {
  visible: boolean;
  type: ToastType;
  title: string;
  subtitle?: string;
  onDismiss?: () => void;
}

export function Toast({
  visible,
  type,
  title,
  subtitle,
  onDismiss,
}: ToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);

  const getToastConfig = (toastType: ToastType): ToastConfig => {
    switch (toastType) {
      case 'success':
        return { icon: 'checkmark-circle', iconColor: colors.success };
      case 'error':
        return { icon: 'alert-circle', iconColor: colors.error };
      case 'info':
        return { icon: 'information-circle', iconColor: colors.accent };
      case 'copied':
        return { icon: 'copy', iconColor: colors.accent };
      default:
        return { icon: 'checkmark-circle', iconColor: colors.success };
    }
  };

  const config = getToastConfig(type);

  useEffect(() => {
    if (visible) {
      // Announce toast title for screen readers
      AccessibilityInfo.announceForAccessibility(title);

      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Set dismiss timer
      dismissTimer.current = setTimeout(() => {
        animateOut();
      }, TOAST_DURATION);
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [visible]);

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.bgSecondary,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Ionicons name={config.icon} size={24} color={config.iconColor} />
        <View style={styles.textContainer} accessibilityLiveRegion="polite">
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toastState, setToastState] = useState<{
    visible: boolean;
    type: ToastType;
    title: string;
    subtitle?: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    subtitle: undefined,
  });

  const showToast = useCallback((data: ToastData) => {
    setToastState({
      visible: true,
      type: data.type,
      title: data.title,
      subtitle: data.subtitle,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Convenience methods
  const showSuccess = useCallback(
    (title: string, subtitle?: string) => {
      showToast({ type: 'success', title, subtitle });
    },
    [showToast]
  );

  const showError = useCallback(
    (title: string, subtitle?: string) => {
      showToast({ type: 'error', title, subtitle });
    },
    [showToast]
  );

  const showCopied = useCallback(
    (title: string = 'Copied', subtitle?: string) => {
      showToast({ type: 'copied', title, subtitle });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, subtitle?: string) => {
      showToast({ type: 'info', title, subtitle });
    },
    [showToast]
  );

  return {
    toastState,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showCopied,
    showInfo,
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    minWidth: 140,
    maxWidth: SCREEN_WIDTH - spacing[8],
    gap: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.body.small,
    marginTop: 2,
  },
});
