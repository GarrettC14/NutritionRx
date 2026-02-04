/**
 * Insight Shimmer
 * Shimmer/skeleton loading placeholder for LLM generation
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

export function InsightShimmer() {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const barColor = colors.textTertiary + '30';

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.bar, styles.barLong, { backgroundColor: barColor }, animatedStyle]}
      />
      <Animated.View
        style={[styles.bar, styles.barMedium, { backgroundColor: barColor }, animatedStyle]}
      />
      <Animated.View
        style={[styles.bar, styles.barShort, { backgroundColor: barColor }, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 4,
  },
  bar: {
    height: 12,
    borderRadius: 6,
  },
  barLong: {
    width: '92%',
  },
  barMedium: {
    width: '70%',
  },
  barShort: {
    width: '45%',
  },
});
