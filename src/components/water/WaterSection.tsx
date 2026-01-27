import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useWaterStore } from '@/stores';
import { DEFAULT_WATER_GOAL } from '@/repositories';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const WATER_BLUE = '#7EC8E3';

interface WaterDropsProps {
  filled: number;
  total: number;
}

function WaterDrops({ filled, total }: WaterDropsProps) {
  const { colors } = useTheme();

  // Create a grid of drops
  const drops = Array.from({ length: total }, (_, i) => i < filled);

  return (
    <View style={styles.dropsContainer}>
      {drops.map((isFilled, index) => (
        <View
          key={index}
          style={[
            styles.dropCircle,
            {
              backgroundColor: isFilled ? WATER_BLUE : 'transparent',
              borderColor: isFilled ? WATER_BLUE : colors.textTertiary,
            },
          ]}
        />
      ))}
    </View>
  );
}

interface WaterSectionProps {
  onPress?: () => void;
  defaultExpanded?: boolean;
}

export function WaterSection({ onPress, defaultExpanded = false }: WaterSectionProps) {
  const { colors } = useTheme();
  const { todayLog, goalGlasses, addGlass, removeGlass, hasMetGoal } = useWaterStore();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Chevron rotation animation
  const rotation = useSharedValue(defaultExpanded ? 90 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const glasses = todayLog?.glasses ?? 0;
  const goal = goalGlasses ?? DEFAULT_WATER_GOAL;
  const percent = goal > 0 ? Math.min((glasses / goal) * 100, 100) : 0;
  const goalMet = hasMetGoal();

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(isExpanded ? 0 : 90, { duration: 200 });
    setIsExpanded(!isExpanded);
  };

  const handleAddGlass = async (e?: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await addGlass();
  };

  const handleRemoveGlass = async () => {
    if (glasses > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await removeGlass();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      {/* Collapsible Header */}
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Animated.View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Water</Text>
          {goalMet && (
            <View style={[styles.goalBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark" size={12} color={colors.success} />
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {glasses}/{goal} glasses
          </Text>
          <Pressable
            style={[styles.headerAddButton, { backgroundColor: colors.bgInteractive }]}
            onPress={handleAddGlass}
            hitSlop={8}
          >
            <Ionicons name="add" size={18} color={WATER_BLUE} />
          </Pressable>
        </View>
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.bgInteractive }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: WATER_BLUE,
                  width: `${percent}%`,
                },
              ]}
            />
          </View>

          {/* Water Drops Visualization */}
          <WaterDrops filled={Math.min(glasses, goal)} total={goal} />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.bgInteractive }]}
              onPress={handleRemoveGlass}
              disabled={glasses === 0}
            >
              <Ionicons
                name="remove"
                size={20}
                color={glasses === 0 ? colors.textDisabled : colors.textPrimary}
              />
            </Pressable>
            <Pressable
              style={[styles.addButton, { backgroundColor: WATER_BLUE }]}
              onPress={handleAddGlass}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Glass</Text>
            </Pressable>
          </View>
        </View>
      )}
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
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  goalBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  count: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  headerAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dropsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  dropCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 44,
    borderRadius: 22,
  },
  addButtonText: {
    ...typography.body.medium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
