import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutritionImportSession, IMPORT_SOURCES } from '@/types/nutritionImport';

interface ImportPreviewCardProps {
  session: NutritionImportSession;
}

export function ImportPreviewCard({ session }: ImportPreviewCardProps) {
  const { colors } = useTheme();

  const sourceConfig = IMPORT_SOURCES.find((s) => s.id === session.source);
  const sourceName = sourceConfig?.name || 'Unknown';

  // Calculate date range
  const sortedDays = [...session.parsedDays].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const firstDate = sortedDays[0]?.date;
  const lastDate = sortedDays[sortedDays.length - 1]?.date;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Calculate total calories across all days
  const totalCalories = session.parsedDays.reduce(
    (sum, day) => sum + day.totals.calories,
    0
  );
  const avgCalories = Math.round(totalCalories / session.totalDays);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons
            name={sourceConfig?.icon as keyof typeof Ionicons.glyphMap || 'document-outline'}
            size={24}
            color={colors.accent}
          />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Ready to Import</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            From {sourceName}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {session.totalDays}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {avgCalories.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Cal/Day</Text>
        </View>
      </View>

      {firstDate && lastDate && (
        <View style={[styles.dateRange, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.dateRangeText, { color: colors.textSecondary }]}>
            {formatDate(firstDate)} – {formatDate(lastDate)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    marginVertical: spacing[4],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    ...typography.display.small,
  },
  statLabel: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
  },
  dateRangeText: {
    ...typography.body.small,
  },
});
