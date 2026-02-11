import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  testID?: string;
}

interface OnboardingSegmentedToggleProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function OnboardingSegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: OnboardingSegmentedToggleProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          testID={option.testID}
          style={[
            styles.segment,
            value === option.value && { backgroundColor: colors.accent },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onChange(option.value);
          }}
        >
          <Text
            style={[
              styles.segmentText,
              { color: value === option.value ? '#FFFFFF' : colors.textSecondary },
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
    padding: spacing[1],
  },
  segment: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
});
