import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { animation } from '@/constants/spacing';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingBaseProps {
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
  animated?: boolean;
}

interface CalorieRingProgressProps extends CalorieRingBaseProps {
  progress: number; // 0 to 1
  consumed?: never;
  target?: never;
}

interface CalorieRingTargetProps extends CalorieRingBaseProps {
  progress?: never;
  consumed: number;
  target: number;
}

type CalorieRingProps = CalorieRingProgressProps | CalorieRingTargetProps;

export function CalorieRing({
  progress: progressProp,
  consumed,
  target,
  size = 200,
  strokeWidth = 12,
  trackColor,
  fillColor,
  style,
  children,
  animated = true,
}: CalorieRingProps) {
  const { colors } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  // Calculate progress from consumed/target or use direct progress prop
  const progress = progressProp !== undefined
    ? progressProp
    : (target > 0 ? consumed / target : 0);

  // Clamp progress to 0-1 (allow showing up to 100%, not more)
  const clampedProgress = Math.min(1, Math.max(0, progress));

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = animated
      ? withTiming(circumference * (1 - clampedProgress), {
          duration: animation.progressRing,
          easing: Easing.out(Easing.cubic),
        })
      : circumference * (1 - clampedProgress);

    return {
      strokeDashoffset,
    };
  }, [clampedProgress, animated]);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor ?? colors.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={fillColor ?? colors.ringFill}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
