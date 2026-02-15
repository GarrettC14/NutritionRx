import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { FoodItem } from '@/types/domain';

interface QuickConfirmCardProps {
  food: FoodItem;
  serving: { size: number; unit: string };
  onLog: (serving: { size: number; unit: string }) => void;
  onEdit: () => void;
  onDismiss: () => void;
}

const NURSE_BACKGROUND = '#FAF8F2';
const NURSE_TEXT = '#2D3436';
const NURSE_SUBTEXT = '#5F7161';
const NURSE_MUTED = '#8E9DAD';
const NURSE_ACCENT = '#7C9A8E';

function formatDecimal(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function calculateNutritionForServing(food: FoodItem, servingSize: number) {
  if (!food.servingSize || food.servingSize <= 0) {
    return {
      calories: food.calories,
      protein: food.protein,
    };
  }

  const multiplier = servingSize / food.servingSize;
  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
  };
}

export function QuickConfirmCard({
  food,
  serving,
  onLog,
  onEdit,
  onDismiss,
}: QuickConfirmCardProps) {
  const [amount, setAmount] = useState(serving.size);

  useEffect(() => {
    setAmount(serving.size);
  }, [serving]);

  const translateY = useSharedValue(260);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 16, stiffness: 150 });
    return () => {
      translateY.value = withTiming(260, {
        duration: 180,
        easing: Easing.out(Easing.ease),
      });
    };
  }, []);

  const amountText = `${formatDecimal(amount)} ${serving.unit}`;
  const nutrition = useMemo(
    () => calculateNutritionForServing(food, amount),
    [food, amount]
  );

  const increment = () => {
    setAmount((prev) => Number((prev + 0.5).toFixed(2)));
  };

  const decrement = () => {
    setAmount((prev) => Number(Math.max(0.25, prev - 0.5).toFixed(2)));
  };

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <Pressable style={styles.backdropTouchable} onPress={onDismiss} />

      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.foundText}>✓ Found in your history</Text>
        <Text style={styles.nameText} numberOfLines={2}>
          {food.name}
        </Text>
        {food.brand ? <Text style={styles.brandText}>{food.brand}</Text> : null}

        <Text style={styles.nutritionText}>
          {nutrition.calories} cal  ·  {nutrition.protein}g protein
        </Text>

        <View style={styles.servingRow}>
          <Text style={styles.label}>Serving:</Text>
          <View style={styles.servingControls}>
            <Pressable style={styles.chevronButton} onPress={decrement}>
              <Text style={styles.chevronText}>−</Text>
            </Pressable>
            <Text style={styles.servingValue}>{amountText}</Text>
            <Pressable style={styles.chevronButton} onPress={increment}>
              <Text style={styles.chevronText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={onEdit}>
            <Text style={styles.secondaryText}>Edit ▾</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => onLog({ size: amount, unit: serving.unit })}
          >
            <Text style={styles.primaryText}>✓ Log Food</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  card: {
    margin: 16,
    borderRadius: 18,
    backgroundColor: NURSE_BACKGROUND,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  foundText: {
    color: NURSE_SUBTEXT,
    fontSize: 13,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: NURSE_TEXT,
  },
  brandText: {
    color: NURSE_SUBTEXT,
    fontSize: 14,
    marginTop: -4,
  },
  nutritionText: {
    color: NURSE_MUTED,
    fontSize: 14,
    marginTop: 2,
  },
  servingRow: {
    marginTop: 4,
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: NURSE_TEXT,
    fontWeight: '600',
  },
  servingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingValue: {
    fontSize: 16,
    color: NURSE_TEXT,
    minWidth: 100,
    textAlign: 'center',
    fontWeight: '600',
  },
  chevronButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9D7D1',
  },
  chevronText: {
    color: NURSE_TEXT,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: NURSE_ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: NURSE_ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: NURSE_ACCENT,
    fontWeight: '600',
  },
});
