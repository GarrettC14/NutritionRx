/**
 * TypingIndicator Component
 * Animated dots showing the assistant is generating a response
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/spacing';

const DOT_SIZE = 8;
const DOT_GAP = 6;
const ANIMATION_DURATION = 400;
const ANIMATION_DELAY = 150;

export function TypingIndicator() {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ])
      );

    const animation = Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, ANIMATION_DELAY),
      createAnimation(dot3, ANIMATION_DELAY * 2),
    ]);

    animation.start();

    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={[styles.container, { paddingHorizontal: spacing[4] }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.textTertiary,
                  opacity: dot,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  bubble: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
