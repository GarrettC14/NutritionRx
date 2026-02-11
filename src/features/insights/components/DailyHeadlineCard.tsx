/**
 * Daily Headline Card
 * Tappable card with left accent border, sparkle icon, headline text, and forward chevron
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { WidgetHeadlineData } from '../types/dailyInsights.types';

interface DailyHeadlineCardProps {
  headline: WidgetHeadlineData;
  onPress: () => void;
}

export function DailyHeadlineCard({ headline, onPress }: DailyHeadlineCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.bgElevated,
          borderLeftColor: colors.premiumGold,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Headline insight: ${headline.text}`}
    >
      <View style={styles.content}>
        <Ionicons name="sparkles" size={18} color={colors.premiumGold} />
        <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={2}>
          {headline.text}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
});
