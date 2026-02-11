import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface OnboardingRadioCardProps {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function OnboardingRadioCard({
  label,
  subtitle,
  selected,
  onPress,
  testID,
}: OnboardingRadioCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: selected ? colors.accent : colors.borderDefault,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.radioContainer}>
        <View
          style={[
            styles.radioOuter,
            { borderColor: selected ? colors.accent : colors.borderStrong },
          ]}
        >
          {selected && (
            <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />
          )}
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  radioContainer: {
    marginRight: spacing[3],
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  subtitle: {
    ...typography.body.medium,
  },
});
