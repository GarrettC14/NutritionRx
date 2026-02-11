import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { DailyTotals } from '@/types/domain';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';

interface MacroChartProps {
  totals: DailyTotals;
  showGoalComparison?: boolean;
}

// Calories per gram for each macro
const PROTEIN_CAL = 4;
const CARBS_CAL = 4;
const FAT_CAL = 9;

// Donut chart component
interface DonutSegment {
  percentage: number;
  color: string;
}

const DonutChart = React.memo(function DonutChart({
  segments,
  size = 120,
  strokeWidth = 20,
  centerText,
  centerSubtext,
  centerColor,
  subtextColor,
  bgColor,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerText?: string;
  centerSubtext?: string;
  centerColor?: string;
  subtextColor?: string;
  bgColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = circumference * 0.25; // Start at top (12 o'clock)

  return (
    <Svg width={size} height={size}>
      {/* Background circle */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={bgColor || '#30363D'}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Segments */}
      {segments.map((segment, index) => {
        const segmentLength = (segment.percentage / 100) * circumference;
        const offset = currentOffset;
        currentOffset -= segmentLength;

        return (
          <Circle
            key={index}
            cx={center}
            cy={center}
            r={radius}
            stroke={segment.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
          />
        );
      })}
      {/* Center text */}
      {centerText && (
        <SvgText
          x={center}
          y={centerSubtext ? center : center + 6}
          fill={centerColor || '#F0F6FC'}
          fontSize={18}
          fontWeight="600"
          textAnchor="middle"
        >
          {centerText}
        </SvgText>
      )}
      {/* Center subtext */}
      {centerSubtext && (
        <SvgText
          x={center}
          y={center + 16}
          fill={subtextColor || '#8B949E'}
          fontSize={10}
          textAnchor="middle"
        >
          {centerSubtext}
        </SvgText>
      )}
    </Svg>
  );
});

export const MacroChart = React.memo(function MacroChart({ totals, showGoalComparison = true }: MacroChartProps) {
  const { colors } = useTheme();
  const { protein: proteinGoal, carbs: carbsGoal, fat: fatGoal } = useResolvedTargets();

  // Memoize macro calculations and segment data
  const { proteinPct, carbsPct, fatPct, totalMacroCals, segments, goalProteinPct, goalCarbsPct, goalFatPct } = useMemo(() => {
    const proteinCals = totals.protein * PROTEIN_CAL;
    const carbsCals = totals.carbs * CARBS_CAL;
    const fatCals = totals.fat * FAT_CAL;
    const total = proteinCals + carbsCals + fatCals;

    const pPct = total > 0 ? Math.round((proteinCals / total) * 100) : 0;
    const cPct = total > 0 ? Math.round((carbsCals / total) * 100) : 0;
    const fPct = 100 - pPct - cPct;

    const goalProteinCals = proteinGoal * PROTEIN_CAL;
    const goalCarbsCals = carbsGoal * CARBS_CAL;
    const goalFatCals = fatGoal * FAT_CAL;
    const goalTotal = goalProteinCals + goalCarbsCals + goalFatCals;

    const gPPct = goalTotal > 0 ? Math.round((goalProteinCals / goalTotal) * 100) : 0;
    const gCPct = goalTotal > 0 ? Math.round((goalCarbsCals / goalTotal) * 100) : 0;
    const gFPct = 100 - gPPct - gCPct;

    return {
      proteinPct: pPct,
      carbsPct: cPct,
      fatPct: fPct,
      totalMacroCals: total,
      segments: [
        { percentage: pPct, color: colors.protein },
        { percentage: cPct, color: colors.carbs },
        { percentage: fPct, color: colors.fat },
      ].filter(d => d.percentage > 0) as DonutSegment[],
      goalProteinPct: gPPct,
      goalCarbsPct: gCPct,
      goalFatPct: gFPct,
    };
  }, [totals, proteinGoal, carbsGoal, fatGoal, colors.protein, colors.carbs, colors.fat]);

  if (totalMacroCals === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <DonutChart
          segments={segments}
          centerText={String(totals.calories)}
          centerSubtext="calories"
          centerColor={colors.textPrimary}
          subtextColor={colors.textTertiary}
          bgColor={colors.bgInteractive}
        />

        <View style={styles.macroList}>
          <MacroItem
            label="Protein"
            grams={totals.protein}
            percent={proteinPct}
            goalGrams={showGoalComparison ? proteinGoal : undefined}
            color={colors.protein}
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <MacroItem
            label="Carbs"
            grams={totals.carbs}
            percent={carbsPct}
            goalGrams={showGoalComparison ? carbsGoal : undefined}
            color={colors.carbs}
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <MacroItem
            label="Fat"
            grams={totals.fat}
            percent={fatPct}
            goalGrams={showGoalComparison ? fatGoal : undefined}
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
});

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
