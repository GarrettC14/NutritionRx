import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

interface LockedOverlayProps {
  children: React.ReactNode;
  context?: string;
  message?: string;
}

/**
 * Renders children with a blur overlay and lock icon for non-premium users.
 * Used for "blurred preview" gating pattern.
 */
export function LockedOverlay({
  children,
  context = 'general',
  message = 'Upgrade to unlock',
}: LockedOverlayProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isPremium } = useSubscriptionStore();

  if (isPremium) {
    return <>{children}</>;
  }

  const handlePress = () => {
    router.push(`/paywall?context=${context}`);
  };

  return (
    <View style={styles.container}>
      {/* Content (will be blurred) */}
      <View style={styles.content}>{children}</View>

      {/* Blur Overlay */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <BlurView
          intensity={12}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Lock Icon + Text */}
        <View style={styles.lockContainer}>
          <View style={[styles.lockIcon, { backgroundColor: colors.bgElevated }]}>
            <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
          </View>
          <Text style={[styles.lockText, { color: colors.textSecondary }]}>{message}</Text>
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
    // Content renders normally behind blur
  },
  lockContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
