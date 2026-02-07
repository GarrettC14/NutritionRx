/**
 * Insight Toast
 * Floating toast at bottom of screen for concurrent generation feedback
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useWeeklyInsightsStore } from '../stores/weeklyInsightsStore';

export function InsightToast() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const toast = useWeeklyInsightsStore((s) => s.toast);
  const hideToast = useWeeklyInsightsStore((s) => s.hideToast);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        hideToast();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, hideToast]);

  if (!toast.visible) return null;

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(200)}
      exiting={reducedMotion ? undefined : FadeOut.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: colors.textPrimary,
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.text, { color: colors.bgPrimary }]}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
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
  },
});
