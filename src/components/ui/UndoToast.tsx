import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  duration?: number;
  visible: boolean;
  onDismiss: () => void;
}

const DURATION_MS = 3000;

export function UndoToast({
  message,
  onUndo,
  duration = DURATION_MS,
  visible,
  onDismiss,
}: UndoToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(180);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!visible) {
      translateY.value = withTiming(180, {
        duration: 180,
        easing: Easing.out(Easing.ease),
      });
      return;
    }

    AccessibilityInfo.announceForAccessibility(message);
    translateY.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });

    timerRef.current = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, message]);

  if (!visible) {
    return null;
  }

  const handleUndoPress = () => {
    onUndo();
    onDismiss();
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.toast, animatedStyle]} pointerEvents="auto">
        <Text style={styles.message}>{message}</Text>
        <Pressable onPress={handleUndoPress}>
          <Text style={styles.undo}>UNDO</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 88,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    marginHorizontal: 16,
    backgroundColor: '#FAF8F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    color: '#2D3436',
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  undo: {
    color: '#7C9A8E',
    fontWeight: '700',
  },
});
