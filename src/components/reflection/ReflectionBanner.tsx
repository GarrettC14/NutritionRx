import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface ReflectionBannerProps {
  daysSinceLastReflection: number | null;
  hasCompletedFirstReflection: boolean;
  onStartReflection: () => void;
  onDismiss: () => void;
  dismissCount: number;
}

type BannerState = 'first_time' | 'due' | 'overdue' | 'very_overdue';

function getBannerState(
  daysSince: number | null,
  hasCompleted: boolean,
): BannerState {
  if (!hasCompleted) return 'first_time';
  if (daysSince == null || daysSince >= 14) return 'very_overdue';
  if (daysSince >= 8) return 'overdue';
  return 'due';
}

const BANNER_CONFIG: Record<BannerState, {
  message: string;
  cta: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
}> = {
  first_time: {
    message: 'Set up your weekly reflection to keep your plan on track',
    cta: 'Get started',
    icon: 'sparkles-outline',
    bgColor: '#7C9A82',
  },
  due: {
    message: "It's been a week \u2014 ready for a quick reflection?",
    cta: 'Reflect now',
    icon: 'scale-outline',
    bgColor: '#7C9A82',
  },
  overdue: {
    message: 'Your plan works best with regular updates',
    cta: 'Reflect now',
    icon: 'scale-outline',
    bgColor: '#7C9A82',
  },
  very_overdue: {
    message: "Welcome back! Let's get your plan in sync",
    cta: "Let's go",
    icon: 'hand-left-outline',
    bgColor: '#C4785B',
  },
};

export function ReflectionBanner({
  daysSinceLastReflection,
  hasCompletedFirstReflection,
  onStartReflection,
  onDismiss,
  dismissCount,
}: ReflectionBannerProps) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const bannerState = getBannerState(daysSinceLastReflection, hasCompletedFirstReflection);
  const config = BANNER_CONFIG[bannerState];

  // If dismissed 3+ times, show minimized version
  const isMinimized = dismissCount >= 3;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onStartReflection();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDismiss();
  };

  // Minimized: just a small pressable badge
  if (isMinimized) {
    return (
      <Pressable
        onPress={handleCta}
        style={[styles.minimizedBadge, { backgroundColor: `${config.bgColor}20` }]}
        accessibilityRole="button"
        accessibilityLabel="Weekly reflection available"
      >
        <View style={[styles.minimizedDot, { backgroundColor: config.bgColor }]} />
        <Text style={[styles.minimizedText, { color: colors.textSecondary }]}>
          Reflection available
        </Text>
      </Pressable>
    );
  }

  const bgOpacity = bannerState === 'overdue' ? '25' : '1A'; // 15% vs 10%

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: `${config.bgColor}${bgOpacity}`,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Dismiss button */}
      <Pressable
        onPress={handleDismiss}
        style={styles.dismissButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss reflection reminder"
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </Pressable>

      <View style={styles.row}>
        {/* Icon */}
        <Ionicons name={config.icon} size={24} color={config.bgColor} />

        {/* Message */}
        <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
          {config.message}
        </Text>

        {/* CTA */}
        <Pressable
          onPress={handleCta}
          style={[styles.ctaButton, { backgroundColor: config.bgColor }]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{config.cta}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  dismissButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    zIndex: 1,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingRight: spacing[4], // Space for dismiss button
  },
  message: {
    ...typography.body.small,
    flex: 1,
  },
  ctaButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.body.small,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Minimized state
  minimizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    gap: spacing[2],
    marginBottom: spacing[2],
    minHeight: 44,
  },
  minimizedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  minimizedText: {
    ...typography.body.small,
  },
});
