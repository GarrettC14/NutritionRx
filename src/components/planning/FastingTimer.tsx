import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withTiming,
  interpolate,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Colors from the design system
const FASTING_GREEN = '#9CAF88'; // Sage Green for fasting
const EATING_CREAM = '#FFEAA7'; // Warm cream for eating window

interface FastingTimerProps {
  progress: number; // 0-100
  isFasting: boolean;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export function FastingTimer({
  progress,
  isFasting,
  size = 180,
  strokeWidth = 12,
  children,
}: FastingTimerProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate progress changes
  const animatedProgress = useDerivedValue(() => {
    if (reducedMotion) {
      return progress;
    }
    return withTiming(progress, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress, reducedMotion]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      animatedProgress.value,
      [0, 100],
      [circumference, 0]
    );
    return {
      strokeDashoffset,
    };
  });

  const activeColor = isFasting ? FASTING_GREEN : EATING_CREAM;
  const trackColor = colors.bgInteractive;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {/* Center content */}
      <View style={styles.centerContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
