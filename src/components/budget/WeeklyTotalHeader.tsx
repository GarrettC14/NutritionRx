import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface WeeklyTotalHeaderProps {
  total: number;
}

export function WeeklyTotalHeader({ total }: WeeklyTotalHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Weekly Total</Text>
      <Text style={[styles.value, { color: colors.textPrimary }]}>
        {total.toLocaleString()} cal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...typography.display.medium,
  },
});
