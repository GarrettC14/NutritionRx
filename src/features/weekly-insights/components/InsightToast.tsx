/**
 * Insight Toast
 * Floating toast at bottom of screen for concurrent generation feedback
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useWeeklyInsightsStore } from '../stores/weeklyInsightsStore';

const TAB_BAR_HEIGHT = 49;
const TOAST_PADDING = 12;

export function InsightToast() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const bottomOffset = insets.bottom + TAB_BAR_HEIGHT + TOAST_PADDING;
  const toast = useWeeklyInsightsStore((s) => s.toast);
  const hideToast = useWeeklyInsightsStore((s) => s.hideToast);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        hideToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, hideToast]);

  if (!toast.visible) return null;

  return (
    <Pressable onPress={hideToast}>
      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(200)}
        exiting={reducedMotion ? undefined : FadeOut.duration(200)}
        style={[
          styles.container,
          {
            backgroundColor: colors.textPrimary,
            bottom: bottomOffset,
          },
        ]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Text style={[styles.text, { color: colors.bgPrimary }]}>
          {toast.message}
        </Text>
        <Text style={[styles.dismiss, { color: colors.bgPrimary }]}>
          Dismiss
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  dismiss: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    marginLeft: 12,
  },
});
