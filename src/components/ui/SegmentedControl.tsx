import { View, Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius, animation } from '@/constants/spacing';

interface SegmentedControlOption<T> {
  value: T;
  label: string;
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

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const segmentWidth = 100 / options.length;

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      left: withTiming(`${selectedIndex * segmentWidth}%`, {
        duration: animation.fast,
        easing: Easing.out(Easing.cubic),
      }),
      width: `${segmentWidth}%`,
    };
  }, [selectedIndex, segmentWidth]);

  const handlePress = async (optionValue: T) => {
    if (optionValue !== value) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(optionValue);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgInteractive },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: colors.bgElevated },
          indicatorStyle,
        ]}
      />
      {options.map((option) => (
        <Pressable
          key={String(option.value)}
          style={styles.segment}
          onPress={() => handlePress(option.value)}
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
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: borderRadius.md - 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    ...typography.body.small,
    fontWeight: '600',
  },
});
