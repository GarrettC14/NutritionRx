/**
 * Premium Banner Component
 * Displays a promotional banner for premium features
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface PremiumBannerProps {
  title?: string;
  description?: string;
  onUpgradePress?: () => void;
  onDismiss?: () => void;
  variant?: 'compact' | 'expanded';
}

export function PremiumBanner({
  title = 'Upgrade to Premium',
  description = 'Unlock unlimited access to all features',
  onUpgradePress,
  onDismiss,
  variant = 'compact',
}: PremiumBannerProps) {
  const { colors } = useTheme();

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.premiumGoldSubtle }]}>
        <Ionicons name="sparkles" size={18} color={colors.premiumGold} />
        <Text style={[styles.compactText, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          style={[styles.compactButton, { backgroundColor: colors.accent }]}
          onPress={onUpgradePress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade"
        >
          <Text style={styles.compactButtonText}>Upgrade</Text>
        </Pressable>
        {onDismiss && (
          <Pressable style={styles.dismissButton} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.expandedContainer, { backgroundColor: colors.premiumGoldSubtle }]}>
      <View style={styles.expandedContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.premiumGoldMuted }]}>
          <Ionicons name="sparkles" size={24} color={colors.premiumGold} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.expandedTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.expandedDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
        {onDismiss && (
          <Pressable style={styles.expandedDismiss} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
      <Pressable
        style={[styles.expandedButton, { backgroundColor: colors.accent }]}
        onPress={onUpgradePress}
        accessibilityRole="button"
        accessibilityLabel="Unlock Premium"
      >
        <Text style={styles.expandedButtonText}>Unlock Premium</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  compactText: {
    ...typography.body.small,
    fontWeight: '500',
    flex: 1,
  },
  compactButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  compactButtonText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
  dismissButton: {
    padding: spacing[1],
  },
  expandedContainer: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
  },
  expandedContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing[1],
  },
  expandedTitle: {
    ...typography.title.small,
  },
  expandedDescription: {
    ...typography.body.small,
  },
  expandedDismiss: {
    padding: spacing[1],
  },
  expandedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  expandedButtonText: {
    color: '#FFFFFF',
    ...typography.body.medium,
    fontWeight: '600',
  },
});
