import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useWaterStore } from '@/stores';
import { DEFAULT_WATER_GOAL } from '@/repositories';

interface WaterDropsProps {
  filled: number;
  total: number;
}

function WaterDrops({ filled, total }: WaterDropsProps) {
  const { colors } = useTheme();

  // Create a grid of 2 rows x 4 columns
  const drops = Array.from({ length: total }, (_, i) => i < filled);

  return (
    <View style={styles.dropsContainer}>
      {drops.map((isFilled, index) => (
        <Text
          key={index}
          style={[
            styles.drop,
            { color: isFilled ? '#7EC8E3' : colors.textTertiary },
          ]}
        >
          {isFilled ? '💧' : '○'}
        </Text>
      ))}
    </View>
  );
}

interface WaterSectionProps {
  onPress?: () => void;
}

export function WaterSection({ onPress }: WaterSectionProps) {
  const { colors } = useTheme();
  const { todayLog, goalGlasses, addGlass, removeGlass, hasMetGoal } = useWaterStore();

  const glasses = todayLog?.glasses ?? 0;
  const goal = goalGlasses ?? DEFAULT_WATER_GOAL;
  const percent = goal > 0 ? Math.min((glasses / goal) * 100, 100) : 0;
  const goalMet = hasMetGoal();

  const handleAddGlass = async () => {
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
    <Pressable
      style={[styles.container, { backgroundColor: colors.bgSecondary }]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>💧</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Water</Text>
          {goalMet && (
            <View style={[styles.goalBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark" size={12} color={colors.success} />
            </View>
          )}
        </View>
        <Text style={[styles.count, { color: colors.textPrimary }]}>
          {glasses} / {goal} glasses
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.bgInteractive }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: '#7EC8E3',
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
          style={[styles.addButton, { backgroundColor: '#7EC8E3' }]}
          onPress={handleAddGlass}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Glass</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    ...typography.title.small,
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
  drop: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
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
