import { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, ViewStyle, Animated, AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface SegmentedControlOption<T> {
  value: T;
  label: string;
  testID?: string;
}

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => subscription.remove();
  }, []);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const segmentWidth = 100 / options.length;
  const animatedPosition = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    if (reducedMotion) {
      Animated.timing(animatedPosition, {
        toValue: selectedIndex,
        useNativeDriver: false,
        duration: 0,
      }).start();
    } else {
      Animated.spring(animatedPosition, {
        toValue: selectedIndex,
        useNativeDriver: false,
        speed: 20,
        bounciness: 0,
      }).start();
    }
  }, [selectedIndex, reducedMotion]);

  const handlePress = async (optionValue: T) => {
    if (optionValue !== value) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(optionValue);
    }
  };

  const leftPercent = animatedPosition.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => `${i * segmentWidth}%`),
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgInteractive },
        style,
      ]}
    >
      <View style={styles.indicatorTrack}>
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.bgElevated,
              left: leftPercent,
              width: `${segmentWidth}%`,
            },
          ]}
        />
      </View>
      {options.map((option) => (
        <Pressable
          key={String(option.value)}
          testID={option.testID}
          style={styles.segment}
          onPress={() => handlePress(option.value)}
          accessibilityRole="tab"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: option.value === value }}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color:
                  option.value === value
                    ? colors.textPrimary
                    : colors.textSecondary,
              },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 2,
    position: 'relative',
  },
  indicatorTrack: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: borderRadius.md - 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    ...typography.body.small,
    fontWeight: '600',
  },
});
