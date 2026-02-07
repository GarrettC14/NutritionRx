import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface PremiumBadgeProps {
  size?: 'small' | 'medium';
}

/**
 * Small "PRO" pill badge for premium feature discovery.
 * Use sparingly - only in feature discovery contexts (widget picker, settings headers).
 */
export function PremiumBadge({ size = 'small' }: PremiumBadgeProps) {
  const { colors } = useTheme();

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.premiumGoldMuted },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text
        style={[styles.text, { color: colors.premiumGold }, isSmall && styles.textSmall]}
      >
        PRO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 8,
  },
});
