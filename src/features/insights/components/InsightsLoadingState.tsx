/**
 * InsightsLoadingState Component
 * Shows loading skeleton while generating insights
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function InsightsLoadingState() {
  const { colors } = useTheme();

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {[1, 2].map((i) => (
        <View
          key={i}
          style={[styles.skeleton, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}
        >
          <View style={styles.header}>
            <View style={[styles.iconSkeleton, { backgroundColor: colors.bgInteractive }]} />
            <View style={[styles.titleSkeleton, { backgroundColor: colors.bgInteractive }]} />
          </View>
          <View style={[styles.textSkeleton, { backgroundColor: colors.bgInteractive }]} />
          <View style={[styles.textSkeleton, styles.shortSkeleton, { backgroundColor: colors.bgInteractive }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  skeleton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  iconSkeleton: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  titleSkeleton: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  textSkeleton: {
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  shortSkeleton: {
    width: '60%',
  },
});
