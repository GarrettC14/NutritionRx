import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FavoriteButton({
  isFavorite,
  onPress,
  size = 24,
  disabled = false,
  style,
  testID,
}: FavoriteButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;

    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Animate scale: 1 -> 1.3 -> 1
    scale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    onPress();
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, animatedStyle, style]}
      hitSlop={8}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={isFavorite ? colors.favorites : colors.textTertiary}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
});
