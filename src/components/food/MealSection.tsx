import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { LogEntry, QuickAddEntry } from '@/types/domain';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { FoodEntryCard } from './FoodEntryCard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MealSectionProps {
  mealType: MealType;
  entries: LogEntry[];
  quickAddEntries: QuickAddEntry[];
  onAddPress: (mealType: MealType) => void;
  onEntryPress?: (entry: LogEntry) => void;
  onQuickAddPress?: (entry: QuickAddEntry) => void;
  onDeleteEntry?: (entry: LogEntry) => void;
  onDeleteQuickAdd?: (entry: QuickAddEntry) => void;
  onCopyMeal?: (mealType: MealType) => void;
  defaultExpanded?: boolean;
}

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export function MealSection({
  mealType,
  entries,
  quickAddEntries,
  onAddPress,
  onEntryPress,
  onQuickAddPress,
  onDeleteEntry,
  onDeleteQuickAdd,
  onCopyMeal,
  defaultExpanded = false,
}: MealSectionProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showMenu, setShowMenu] = useState(false);

  // Chevron rotation animation
  const rotation = useSharedValue(defaultExpanded ? 90 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const totalCalories =
    entries.reduce((sum, e) => sum + e.calories, 0) +
    quickAddEntries.reduce((sum, e) => sum + e.calories, 0);

  const itemCount = entries.length + quickAddEntries.length;
  const hasEntries = itemCount > 0;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(isExpanded ? 0 : 90, { duration: 200 });
    setIsExpanded(!isExpanded);
  };

  const handleCopyMeal = () => {
    setShowMenu(false);
    onCopyMeal?.(mealType);
  };

  const handleMenuPress = () => {
    if (hasEntries) {
      setShowMenu(true);
    }
  };

  const handleAddPress = (e: any) => {
    e.stopPropagation();
    onAddPress(mealType);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      {/* Collapsible Header */}
      <Pressable
        style={styles.header}
        onPress={toggleExpanded}
        onLongPress={handleMenuPress}
        delayLongPress={300}
      >
        <View style={styles.headerLeft}>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Animated.View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {MEAL_TYPE_LABELS[mealType]}
          </Text>
          {!isExpanded && hasEntries && (
            <Text style={[styles.itemCount, { color: colors.textTertiary }]}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.totalCalories, { color: colors.textSecondary }]}>
            {totalCalories} cal
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.bgInteractive }]}
            onPress={handleAddPress}
            hitSlop={8}
          >
            <Ionicons name="add" size={18} color={colors.accent} />
          </Pressable>
        </View>
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {hasEntries ? (
            <View style={styles.entriesList}>
              {entries.map((entry) => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  onPress={() => onEntryPress?.(entry)}
                  onDelete={onDeleteEntry ? () => onDeleteEntry(entry) : undefined}
                />
              ))}
              {quickAddEntries.map((entry) => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  onPress={() => onQuickAddPress?.(entry)}
                  onDelete={onDeleteQuickAdd ? () => onDeleteQuickAdd(entry) : undefined}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No foods logged yet
              </Text>
            </View>
          )}

          {/* Menu button when expanded and has entries */}
          {hasEntries && onCopyMeal && (
            <Pressable
              style={styles.copyButton}
              onPress={handleCopyMeal}
            >
              <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.copyButtonText, { color: colors.textTertiary }]}>
                Copy to tomorrow
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
              {MEAL_TYPE_LABELS[mealType]}
            </Text>
            <Pressable
              style={[styles.menuItem, { borderBottomColor: colors.borderDefault }]}
              onPress={handleCopyMeal}
            >
              <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                Copy to Tomorrow
              </Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  itemCount: {
    ...typography.caption,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  totalCalories: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  addButton: {
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
  entriesList: {
    gap: spacing[2],
  },
  emptyState: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body.medium,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
    paddingVertical: spacing[2],
  },
  copyButtonText: {
    ...typography.caption,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '80%',
    maxWidth: 300,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  menuTitle: {
    ...typography.title.small,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderBottomWidth: 0,
  },
  menuItemText: {
    ...typography.body.medium,
  },
});
