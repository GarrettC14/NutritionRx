/**
 * Headline Insight Card
 * Full-width card showing the highest-scored question's headline
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface HeadlineInsightCardProps {
  headline: string;
  onPress: () => void;
}

export function HeadlineInsightCard({ headline, onPress }: HeadlineInsightCardProps) {
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
      accessibilityLabel={`Headline insight: ${headline}`}
    >
      <View style={styles.content}>
        <Ionicons name="sparkles" size={18} color={colors.premiumGold} />
        <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={2}>
          {headline}
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
    marginBottom: 16,
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
