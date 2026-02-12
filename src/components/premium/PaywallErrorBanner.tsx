import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface PaywallErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function PaywallErrorBanner({ message, onDismiss }: PaywallErrorBannerProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(200)}
      exiting={reducedMotion ? undefined : FadeOut.duration(200)}
      style={[styles.container, { backgroundColor: colors.errorBg }]}
      accessibilityRole="alert"
    >
      <Ionicons name="alert-circle" size={18} color={colors.error} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>{message}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss error"
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
  },
});
