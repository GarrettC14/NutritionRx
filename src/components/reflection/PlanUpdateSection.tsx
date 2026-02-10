import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface PlanUpdateSectionProps {
  /** Whether the plan has changes from recalculation */
  hasChanges: boolean;
  /** Whether this is the user's first reflection ever */
  isFirstReflection: boolean;
  /** Whether macro cycling is enabled */
  macroCyclingEnabled: boolean;
  /** Previous (current) calorie target */
  previousCalories: number;
  previousProteinG: number;
  previousCarbsG: number;
  previousFatG: number;
  /** Preview of new targets (may be same as previous if no changes) */
  previewCalories: number | null;
  previewProteinG: number | null;
  previewCarbsG: number | null;
  previewFatG: number | null;
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

export function PlanUpdateSection({
  hasChanges,
  isFirstReflection,
  macroCyclingEnabled,
  previousCalories,
  previousProteinG,
  previousCarbsG,
  previousFatG,
  previewCalories,
  previewProteinG,
  previewCarbsG,
  previewFatG,
}: PlanUpdateSectionProps) {
  const { colors, isDark } = useTheme();

  // If no preview computed yet, show placeholder
  if (previewCalories == null) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          Your plan
        </Text>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>
            Enter your weight above to see your updated plan
          </Text>
        </View>
      </View>
    );
  }

  const header = isFirstReflection
    ? 'Your starting plan'
    : hasChanges
      ? 'Your updated plan'
      : 'Your plan';

  const intro = isFirstReflection
    ? "Based on your weight, here's your personalized plan:"
    : hasChanges
      ? "We've gently adjusted your targets based on your progress:"
      : 'Your plan is right on track — no changes this week.';

  const rows: Array<{
    label: string;
    prev: string;
    next: string;
    suffix: string;
  }> = [
    {
      label: 'Daily calories',
      prev: formatNum(previousCalories),
      next: formatNum(previewCalories),
      suffix: '',
    },
    {
      label: 'Protein',
      prev: `${Math.round(previousProteinG)}`,
      next: `${Math.round(previewProteinG!)}`,
      suffix: 'g',
    },
    {
      label: 'Carbs',
      prev: `${Math.round(previousCarbsG)}`,
      next: `${Math.round(previewCarbsG!)}`,
      suffix: 'g',
    },
    {
      label: 'Fat',
      prev: `${Math.round(previousFatG)}`,
      next: `${Math.round(previewFatG!)}`,
      suffix: 'g',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
        {header}
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgSecondary },
          isDark ? styles.shadowDark : styles.shadowLight,
        ]}
      >
        <Text style={[styles.introText, { color: colors.textSecondary }]}>
          {intro}
        </Text>

        <View style={styles.macroRows}>
          {rows.map((row) => {
            const changed = hasChanges && row.prev !== row.next;
            return (
              <View key={row.label} style={styles.macroRow}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                  {row.label}
                </Text>
                <View style={styles.macroValues}>
                  {hasChanges && !isFirstReflection ? (
                    <>
                      <Text style={[styles.macroOld, { color: colors.textTertiary }]}>
                        {row.prev}{row.suffix}
                      </Text>
                      <Text style={[styles.macroArrow, { color: colors.textTertiary }]}>
                        {'\u2192'}
                      </Text>
                      <Text
                        style={[
                          styles.macroNew,
                          { color: changed ? '#7C9A82' : colors.textPrimary },
                        ]}
                      >
                        {row.next}{row.suffix}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.macroNew, { color: colors.textPrimary }]}>
                      {row.next}{row.suffix}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {macroCyclingEnabled && (
          <Text style={[styles.cyclingNote, { color: colors.textTertiary }]}>
            These are your daily averages — your cycling split is applied on top.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  sectionLabel: {
    ...typography.title.small,
    fontWeight: '600',
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderText: {
    ...typography.body.medium,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  introText: {
    ...typography.body.medium,
  },
  macroRows: {
    gap: spacing[2],
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    ...typography.body.medium,
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  macroOld: {
    ...typography.body.medium,
    textDecorationLine: 'line-through',
  },
  macroArrow: {
    ...typography.body.small,
  },
  macroNew: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  cyclingNote: {
    ...typography.body.small,
    fontStyle: 'italic',
    marginTop: spacing[1],
  },
});
