import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { usePinStatus, PinnedItem, createPinnableItem } from '@/modules/widgets';
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

interface PinToWidgetButtonProps {
  /**
   * Food item to pin
   */
  food: {
    id: string;
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    servingSize?: number;
    servingUnit?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  };

  /**
   * Size of the button
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Callback when pin status changes
   */
  onPinChange?: (isPinned: boolean) => void;

  /**
   * Show label text
   * @default false
   */
  showLabel?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PinToWidgetButton({
  food,
  size = 'medium',
  onPinChange,
  showLabel = false,
}: PinToWidgetButtonProps) {
  const { colors } = useTheme();
  const { isPinned, isLoading, toggle } = usePinStatus(food.id);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const iconSize = size === 'small' ? 16 : size === 'large' ? 28 : 22;

  const handlePress = useCallback(async () => {
    // Animate
    scale.value = withSequence(
      withSpring(0.8, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    if (!isPinned) {
      rotation.value = withSequence(
        withSpring(-15, { damping: 10 }),
        withSpring(15, { damping: 10 }),
        withSpring(0, { damping: 10 })
      );
    }

    // Haptic feedback
    Haptics.impactAsync(
      isPinned ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );

    // Toggle pin status
    const pinnableItem = createPinnableItem(food);
    const result = await toggle(pinnableItem);

    if (result.success) {
      onPinChange?.(!isPinned);
    }
  }, [isPinned, food, toggle, onPinChange, scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  if (isLoading) {
    return (
      <Pressable style={[styles.button, styles[`button_${size}`]]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      style={[
        styles.button,
        styles[`button_${size}`],
        animatedStyle,
        isPinned && { backgroundColor: colors.accent + '20' },
      ]}
      onPress={handlePress}
      accessibilityLabel={isPinned ? 'Unpin from widget' : 'Pin to widget'}
      accessibilityRole="button"
    >
      <Ionicons
        name={isPinned ? 'pin' : 'pin-outline'}
        size={iconSize}
        color={isPinned ? colors.accent : colors.textSecondary}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  button_small: {
    width: 44,
    height: 44,
  },
  button_medium: {
    width: 44,
    height: 44,
  },
  button_large: {
    width: 56,
    height: 56,
  },
});
