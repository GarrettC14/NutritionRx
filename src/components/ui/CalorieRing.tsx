import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  initialView?: 'consumed' | 'remaining';
  allowToggle?: boolean;
  onViewChange?: (view: 'consumed' | 'remaining') => void;
  style?: ViewStyle;
}

export function CalorieRing({
  consumed,
  target,
  size = 220,
  strokeWidth = 14,
  initialView = 'consumed',
  allowToggle = true,
  onViewChange,
  style,
}: CalorieRingProps) {
  const { colors } = useTheme();
  const [view, setView] = useState<'consumed' | 'remaining'>(initialView);

  const remaining = Math.max(0, target - consumed);
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const isOver = consumed > target;
  const overAmount = isOver ? consumed - target : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  const handlePress = () => {
    if (!allowToggle) return;
    const newView = view === 'consumed' ? 'remaining' : 'consumed';
    setView(newView);
    onViewChange?.(newView);
  };

  // Determine what to show
  const primaryValue = view === 'consumed' ? consumed : remaining;
  const primaryLabel = view === 'consumed' ? 'CONSUMED' : 'REMAINING';

  let secondaryLine1: string;
  let secondaryLine2: string;

  if (isOver) {
    secondaryLine1 = `${overAmount.toLocaleString()} over`;
    secondaryLine2 = `target: ${target.toLocaleString()}`;
  } else if (consumed >= target) {
    secondaryLine1 = 'Target reached';
    secondaryLine2 = `of ${target.toLocaleString()}`;
  } else if (view === 'consumed') {
    secondaryLine1 = `${remaining.toLocaleString()} left`;
    secondaryLine2 = `of ${target.toLocaleString()}`;
  } else {
    secondaryLine1 = `${consumed.toLocaleString()} eaten`;
    secondaryLine2 = `of ${target.toLocaleString()}`;
  }

  // Accessibility
  const getAccessibilityLabel = () => {
    const percentage = Math.round((consumed / target) * 100);
    if (view === 'consumed') {
      return `${consumed} calories consumed out of ${target} target. ${remaining} calories remaining. ${percentage}% of daily goal.`;
    } else {
      return `${remaining} calories remaining out of ${target} target. ${consumed} calories consumed. ${percentage}% of daily goal.`;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={allowToggle ? 'Double tap to toggle between consumed and remaining view' : undefined}
    >
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        {/* SVG Ring */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {/* Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.ringTrack}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.ringFill}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>

        {/* Center Content */}
        <View style={styles.centerContent}>
          {/* Label */}
          <Text style={[styles.label, { color: colors.textTertiary }]}>
            {primaryLabel}
          </Text>

          {/* Primary Value */}
          <Text style={[styles.primaryValue, { color: colors.textPrimary }]}>
            {primaryValue.toLocaleString()}
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />

          {/* Secondary Line 1 */}
          <Text style={[styles.secondaryLine1, { color: colors.textSecondary }]}>
            {secondaryLine1}
          </Text>

          {/* Secondary Line 2 */}
          <Text style={[styles.secondaryLine2, { color: colors.textTertiary }]}>
            {secondaryLine2}
          </Text>
        </View>
      </View>

      {/* Page Indicator */}
      {allowToggle && (
        <View style={styles.pageIndicator}>
          <View
            style={[
              styles.dot,
              { backgroundColor: view === 'consumed' ? colors.accent : colors.borderDefault },
            ]}
          />
          <View
            style={[
              styles.dot,
              { backgroundColor: view === 'remaining' ? colors.accent : colors.borderDefault },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ringContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  primaryValue: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 48,
  },
  divider: {
    width: 40,
    height: 1,
    marginVertical: 8,
  },
  secondaryLine1: {
    fontSize: 15,
    fontWeight: '500',
  },
  secondaryLine2: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  pageIndicator: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
