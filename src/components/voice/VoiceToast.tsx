/**
 * VoiceToast Component
 * Visual feedback for voice commands
 *
 * Follows "Nourished Calm" design:
 * - Soft cream background
 * - Sage green icons
 * - Terracotta accents for success
 * - Auto-dismisses after 2 seconds
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

const TOAST_DURATION = 2000; // 2 seconds
const ANIMATION_DURATION = 200;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface VoiceToastProps {
  visible: boolean;
  icon: string;
  title: string;
  subtitle?: string;
  onDismiss?: () => void;
}

export function VoiceToast({
  visible,
  icon,
  title,
  subtitle,
  onDismiss,
}: VoiceToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
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
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={colors.textPrimary} style={{ marginRight: spacing[3] }} />
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
