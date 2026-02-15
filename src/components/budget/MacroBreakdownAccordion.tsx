import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { DayBudget } from '@/types/planning';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MacroBreakdownAccordionProps {
  day: DayBudget;
  proteinFloor: number;
}

export function MacroBreakdownAccordion({ day, proteinFloor }: MacroBreakdownAccordionProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useSharedValue(-90);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleToggle = () => {
    if (!reducedMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    rotation.value = reducedMotion
      ? (isExpanded ? -90 : 0)
      : withTiming(isExpanded ? -90 : 0, { duration: 200 });
    setIsExpanded(!isExpanded);
  };

  const proteinCal = day.protein * 4;
  const carbsCal = day.carbs * 4;
  const fatCal = day.fat * 9;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      <Pressable
        style={styles.header}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={`Macro breakdown, ${isExpanded ? 'collapse' : 'expand'}`}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Macro Breakdown</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          <MacroRow
            label="Protein"
            grams={day.protein}
            calories={proteinCal}
            color={colors.protein}
            annotation={`min: ${proteinFloor}g`}
            colors={colors}
          />
          <MacroRow
            label="Carbs"
            grams={day.carbs}
            calories={carbsCal}
            color={colors.carbs}
            colors={colors}
          />
          <MacroRow
            label="Fat"
            grams={day.fat}
            calories={fatCal}
            color={colors.fat}
            colors={colors}
          />
        </View>
      )}
    </View>
  );
}

function MacroRow({
  label,
  grams,
  calories,
  color,
  annotation,
  colors,
}: {
  label: string;
  grams: number;
  calories: number;
  color: string;
  annotation?: string;
  colors: any;
}) {
  return (
    <View style={macroStyles.row}>
      <View style={[macroStyles.dot, { backgroundColor: color }]} />
      <View style={macroStyles.labelContainer}>
        <Text style={[macroStyles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {annotation && (
          <Text style={[macroStyles.annotation, { color: colors.textTertiary }]}>
            ({annotation})
          </Text>
        )}
      </View>
      <Text style={[macroStyles.value, { color: colors.textPrimary }]}>
        {grams}g
      </Text>
      <Text style={[macroStyles.cal, { color: colors.textSecondary }]}>
        {calories} cal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  title: {
    ...typography.title.small,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
});

const macroStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  label: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  annotation: {
    ...typography.caption,
  },
  value: {
    ...typography.body.medium,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  cal: {
    ...typography.body.small,
    minWidth: 60,
    textAlign: 'right',
  },
});
