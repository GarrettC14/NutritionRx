import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface StreakBadgeProps {
  streakDays: number;
}

export function StreakBadge({ streakDays }: StreakBadgeProps) {
  const { colors } = useTheme();

  // Don't show badge if no streak
  if (streakDays === 0) {
    return null;
  }

  // Format text: "1 day" vs "X day streak"
  const streakText = streakDays === 1 ? '1 day' : `${streakDays} day streak`;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgInteractive }]}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {streakText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  emoji: {
    fontSize: 12,
  },
  text: {
    ...typography.caption,
    fontWeight: '500',
  },
});
