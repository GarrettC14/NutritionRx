import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ImportProgress } from '@/types/nutritionImport';

interface ImportProgressBarProps {
  progress: ImportProgress;
}

export function ImportProgressBar({ progress }: ImportProgressBarProps) {
  const { colors } = useTheme();

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Importing your history...
        </Text>
        <Text style={[styles.count, { color: colors.textPrimary }]}>
          {progress.current} of {progress.total}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.accent,
              width: `${percentage}%`,
            },
          ]}
        />
      </View>

      {progress.currentDate && (
        <Text style={[styles.currentDate, { color: colors.textSecondary }]}>
          {progress.currentDate}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.body.medium,
  },
  count: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  currentDate: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[1],
  },
});
