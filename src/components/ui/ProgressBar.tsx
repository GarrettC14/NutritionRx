import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { borderRadius, animation } from '@/constants/spacing';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  height = 8,
  color,
  trackColor,
  style,
  animated = true,
}: ProgressBarProps) {
  const { colors } = useTheme();

  const clampedProgress = Math.min(1, Math.max(0, progress));

  const fillStyle = useAnimatedStyle(() => {
    const width = animated
      ? withTiming(`${clampedProgress * 100}%`, {
          duration: animation.progressRing,
          easing: Easing.out(Easing.cubic),
        })
      : `${clampedProgress * 100}%`;

    return {
      width,
    };
  }, [clampedProgress, animated]);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor ?? colors.ringTrack,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color ?? colors.ringFill,
            borderRadius: height / 2,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

// Macro-specific progress bar with multiple segments
interface MacroBarSegment {
  value: number;
  color: string;
}

interface MacroBarProps {
  segments: MacroBarSegment[];
  total: number;
  height?: number;
  style?: ViewStyle;
}

export function MacroBar({
  segments,
  total,
  height = 4,
  style,
}: MacroBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.macroTrack,
        {
          height,
          backgroundColor: colors.ringTrack,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <View style={styles.segmentContainer}>
        {segments.map((segment, index) => {
          const flex = total > 0 ? segment.value / total : 0;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  flex: Math.max(0, flex),
                  backgroundColor: segment.color,
                },
                index === 0 && { borderTopLeftRadius: height / 2, borderBottomLeftRadius: height / 2 },
                index === segments.length - 1 && { borderTopRightRadius: height / 2, borderBottomRightRadius: height / 2 },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  macroTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  segmentContainer: {
    flexDirection: 'row',
    height: '100%',
    gap: 2,
  },
  segment: {
    height: '100%',
  },
});
