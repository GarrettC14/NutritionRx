import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { getDayWarning } from '@/utils/redistribution';
import { DayBudget } from '@/types/planning';

interface DayEditorProps {
  day: DayBudget;
  dailyAverage: number;
  onCaloriesChange: (calories: number) => void;
}

const STEP = 50;

export function DayEditor({ day, dailyAverage, onCaloriesChange }: DayEditorProps) {
  const { colors } = useTheme();
  const warning = getDayWarning(day.calories, dailyAverage);

  const handleStep = (direction: 1 | -1) => {
    const next = day.calories + STEP * direction;
    if (next >= 800) {
      onCaloriesChange(next);
    }
  };

  const handleTextChange = (text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num >= 0) {
      onCaloriesChange(num);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>
        {day.dayLabel} — {day.date}
      </Text>

      <View style={styles.inputRow}>
        <Pressable
          style={[styles.stepButton, { backgroundColor: colors.bgInteractive }]}
          onPress={() => handleStep(-1)}
          accessibilityLabel="Decrease by 50 calories"
        >
          <Ionicons name="remove" size={20} color={colors.textPrimary} />
        </Pressable>

        <TextInput
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgPrimary }]}
          value={String(day.calories)}
          onChangeText={handleTextChange}
          keyboardType="number-pad"
          selectTextOnFocus
          accessibilityLabel={`${day.dayLabel} calories`}
        />

        <Pressable
          style={[styles.stepButton, { backgroundColor: colors.bgInteractive }]}
          onPress={() => handleStep(1)}
          accessibilityLabel="Increase by 50 calories"
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <Text style={[styles.unit, { color: colors.textSecondary }]}>calories</Text>

      {warning && (
        <View style={[styles.warningContainer, { backgroundColor: '#FFF3CD' }]}>
          <Ionicons name="warning-outline" size={16} color="#856404" />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  header: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    ...typography.metric.medium,
    textAlign: 'center',
    minWidth: 120,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  unit: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: -spacing[2],
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.body.small,
    color: '#856404',
    flex: 1,
  },
});
