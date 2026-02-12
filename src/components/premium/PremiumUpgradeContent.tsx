import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { PaywallCategory } from './analyticsEnums';
import { UPGRADE_CONTENT, CategoryContent } from './upgradeContent';

interface PremiumUpgradeContentProps {
  category: PaywallCategory;
}

export function PremiumUpgradeContent({ category }: PremiumUpgradeContentProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const content: CategoryContent = UPGRADE_CONTENT[category];

  const enterAnimation = reducedMotion ? undefined : FadeIn.duration(150);
  const exitAnimation = reducedMotion ? undefined : FadeOut.duration(150);

  return (
    <Animated.View key={category} entering={enterAnimation} exiting={exitAnimation}>
      <Text
        style={[styles.headline, { color: colors.textPrimary }]}
        accessibilityRole="header"
      >
        {content.headline}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {content.subtitle}
      </Text>

      <View style={styles.benefits}>
        {content.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>{benefit.icon}</Text>
            <Text style={[styles.benefitText, { color: colors.textPrimary }]}>
              {benefit.text}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  benefits: {
    gap: 12,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  benefitIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});
