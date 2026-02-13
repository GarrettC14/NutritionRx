import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { useOnboardingStep } from '@/hooks/useOnboardingStep';
import { useTheme } from '@/hooks/useTheme';
import { componentSpacing } from '@/constants/spacing';

const BAR_HEIGHT = 3;
const BAR_BORDER_RADIUS = BAR_HEIGHT / 2;
const BAR_MARGIN_BOTTOM = 8;

const ANIMATION_DURATION = 350;
const ANIMATION_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

export function OnboardingProgressBar() {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { currentScreen, currentStep, totalSteps, progress } = useOnboardingStep();

  // Don't render on unrecognized screens (e.g., index.tsx redirect)
  if (!currentScreen) {
    return null;
  }

  // Safety: if screen not found in order, hide bar
  if (currentStep === 0) {
    return null;
  }

  const horizontalPadding = componentSpacing.screenEdgePadding;
  const trackWidth = screenWidth - horizontalPadding * 2;

  const fillStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(progress * trackWidth, {
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
        reduceMotion: ReduceMotion.System,
      }),
    };
  }, [progress, trackWidth]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: horizontalPadding,
          marginBottom: BAR_MARGIN_BOTTOM,
        },
      ]}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.bgSecondary,
            height: BAR_HEIGHT,
            borderRadius: BAR_BORDER_RADIUS,
          },
        ]}
      >
        <Animated.View
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityLabel={`Onboarding progress: step ${currentStep} of ${totalSteps}`}
          accessibilityValue={{
            min: 0,
            max: totalSteps,
            now: currentStep,
          }}
          style={[
            styles.fill,
            {
              backgroundColor: colors.accent,
              height: BAR_HEIGHT,
              borderRadius: BAR_BORDER_RADIUS,
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
