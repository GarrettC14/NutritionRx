import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { DailyTotals } from '@/types/domain';
import { useSettingsStore } from '@/stores';

interface MacroChartProps {
  totals: DailyTotals;
  showGoalComparison?: boolean;
}

// Calories per gram for each macro
const PROTEIN_CAL = 4;
const CARBS_CAL = 4;
const FAT_CAL = 9;

export function MacroChart({ totals, showGoalComparison = true }: MacroChartProps) {
  const { colors } = useTheme();
  const { settings } = useSettingsStore();

  // Calculate calories from macros
  const proteinCals = totals.protein * PROTEIN_CAL;
  const carbsCals = totals.carbs * CARBS_CAL;
  const fatCals = totals.fat * FAT_CAL;
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  // Calculate percentages
  const proteinPct = totalMacroCals > 0 ? Math.round((proteinCals / totalMacroCals) * 100) : 0;
  const carbsPct = totalMacroCals > 0 ? Math.round((carbsCals / totalMacroCals) * 100) : 0;
  const fatPct = 100 - proteinPct - carbsPct; // Ensure they sum to 100

  const pieData = [
    { value: proteinPct, color: colors.protein, text: `${proteinPct}%` },
    { value: carbsPct, color: colors.carbs, text: `${carbsPct}%` },
    { value: fatPct, color: colors.fat, text: `${fatPct}%` },
  ].filter(d => d.value > 0);

  // Goal calculations
  const goalProteinCals = settings.dailyProteinGoal * PROTEIN_CAL;
  const goalCarbsCals = settings.dailyCarbsGoal * CARBS_CAL;
  const goalFatCals = settings.dailyFatGoal * FAT_CAL;
  const goalTotalCals = goalProteinCals + goalCarbsCals + goalFatCals;

  const goalProteinPct = goalTotalCals > 0 ? Math.round((goalProteinCals / goalTotalCals) * 100) : 0;
  const goalCarbsPct = goalTotalCals > 0 ? Math.round((goalCarbsCals / goalTotalCals) * 100) : 0;
  const goalFatPct = 100 - goalProteinPct - goalCarbsPct;

  if (totalMacroCals === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <PieChart
          data={pieData}
          donut
          radius={60}
          innerRadius={40}
          innerCircleColor={colors.bgSecondary}
          centerLabelComponent={() => (
            <Text style={[styles.centerLabel, { color: colors.textPrimary }]}>
              {totals.calories}
            </Text>
          )}
        />

        <View style={styles.macroList}>
          <MacroItem
            label="Protein"
            grams={totals.protein}
            percent={proteinPct}
            goalGrams={showGoalComparison ? settings.dailyProteinGoal : undefined}
            color={colors.protein}
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <MacroItem
            label="Carbs"
            grams={totals.carbs}
            percent={carbsPct}
            goalGrams={showGoalComparison ? settings.dailyCarbsGoal : undefined}
            color={colors.carbs}
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <MacroItem
            label="Fat"
            grams={totals.fat}
            percent={fatPct}
            goalGrams={showGoalComparison ? settings.dailyFatGoal : undefined}
            color={colors.fat}
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
        </View>
      </View>

      {showGoalComparison && (
        <View style={styles.goalComparison}>
          <Text style={[styles.goalTitle, { color: colors.textTertiary }]}>
            Goal ratio: {goalProteinPct}% P / {goalCarbsPct}% C / {goalFatPct}% F
          </Text>
        </View>
      )}
    </View>
  );
}

interface MacroItemProps {
  label: string;
  grams: number;
  percent: number;
  goalGrams?: number;
  color: string;
  textColor: string;
  subtextColor: string;
}

function MacroItem({ label, grams, percent, goalGrams, color, textColor, subtextColor }: MacroItemProps) {
  const progress = goalGrams ? Math.min(grams / goalGrams, 1) : 0;

  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={[styles.macroLabel, { color: subtextColor }]}>{label}</Text>
        <Text style={[styles.macroPercent, { color: subtextColor }]}>{percent}%</Text>
      </View>
      <Text style={[styles.macroValue, { color: textColor }]}>
        {grams}g {goalGrams ? `/ ${goalGrams}g` : ''}
      </Text>
      {goalGrams && (
        <View style={[styles.progressBar, { backgroundColor: color + '30' }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: color, width: `${progress * 100}%` },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  centerLabel: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  macroList: {
    flex: 1,
    gap: spacing[3],
  },
  macroItem: {
    gap: spacing[1],
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    ...typography.caption,
    flex: 1,
  },
  macroPercent: {
    ...typography.caption,
    fontWeight: '600',
  },
  macroValue: {
    ...typography.body.small,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  goalComparison: {
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  goalTitle: {
    ...typography.caption,
  },
});
