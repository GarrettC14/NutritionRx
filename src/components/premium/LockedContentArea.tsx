/**
 * LockedContentArea Component
 * Standardized premium content blur pattern for gating features behind paywall
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface LockedContentAreaProps {
  /** Content to show blurred behind the lock overlay */
  children: React.ReactNode;
  /** Context string passed to paywall for analytics/messaging */
  context?: string;
  /** Custom message to display under lock icon */
  message?: string;
  /** Minimum height of the locked area */
  minHeight?: number;
  /** Additional container styles */
  style?: ViewStyle;
}

/**
 * Renders children with a heavy blur overlay and lock icon for non-premium users.
 * Used for premium-gated card content areas.
 *
 * Usage:
 * ```tsx
 * <LockedContentArea context="micronutrients" minHeight={150}>
 *   <MicronutrientContent />
 * </LockedContentArea>
 * ```
 */
export function LockedContentArea({
  children,
  context = 'general',
  message = 'Upgrade to unlock',
  minHeight = 120,
  style,
}: LockedContentAreaProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    router.push(`/paywall?context=${context}`);
  };

  return (
    <View style={[styles.container, { minHeight }, style]}>
      {/* Content rendered at very low opacity */}
      <View style={styles.content} pointerEvents="none">
        {children}
      </View>

      {/* Blur Overlay - tappable to open paywall */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <BlurView
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod="dimezisBlurView"
        />

        {/* Fallback overlay for when blur doesn't render properly */}
        <View
          style={[
            styles.fallbackOverlay,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)' },
          ]}
        />

        {/* Lock Icon + Text */}
        <View style={styles.lockContainer}>
          <View style={[styles.lockIcon, { backgroundColor: `${colors.accent}33` }]}>
            <Ionicons name="lock-closed" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.lockText, { color: colors.textSecondary }]}>
            {message}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    opacity: 0.03,
  },
  fallbackOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  lockContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  lockIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    ...typography.body.small,
    fontWeight: '500',
  },
});
