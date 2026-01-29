/**
 * Quick Add Widget
 * Shows recent/favorite foods for fast one-tap logging
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useFoodLogStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';

interface QuickItem {
  id: string;
  foodItemId: string;
  name: string;
  calories: number;
  source: 'recent' | 'favorite';
}

export function QuickAddWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { entries } = useFoodLogStore();

  // TODO: Implement favorites store integration
  const favorites: any[] = [];

  // Get recent and favorite items
  const quickItems: QuickItem[] = React.useMemo(() => {
    const items: QuickItem[] = [];

    // Add favorite items first
    favorites?.slice(0, 3).forEach((fav) => {
      items.push({
        id: `fav-${fav.id}`,
        foodItemId: fav.foodItemId || fav.id,
        name: fav.name || fav.foodName || 'Favorite',
        calories: Math.round(fav.calories || 0),
        source: 'favorite',
      });
    });

    // Add recent items (unique names, not already in favorites)
    const recentNames = new Set<string>();
    const favNames = new Set(items.map((i) => i.name.toLowerCase()));

    entries
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((entry) => {
        const name = entry.foodName || 'Recent food';
        const lowerName = name.toLowerCase();
        if (!recentNames.has(lowerName) && !favNames.has(lowerName) && items.length < 6 && entry.foodItemId) {
          recentNames.add(lowerName);
          items.push({
            id: `recent-${entry.id}`,
            foodItemId: entry.foodItemId,
            name,
            calories: Math.round(entry.calories || 0),
            source: 'recent',
          });
        }
      });

    return items.slice(0, 6);
  }, [entries, favorites]);

  const handleQuickAdd = async (item: QuickItem) => {
    if (isEditMode) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate directly to the log screen with the food pre-selected
    router.push({
      pathname: '/add-food/log',
      params: { foodId: item.foodItemId },
    });
  };

  const handleAddNew = () => {
    if (!isEditMode) {
      router.push('/add-food');
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Add</Text>
        <TouchableOpacity
          onPress={handleAddNew}
          disabled={isEditMode}
          style={styles.addButton}
        >
          <Ionicons name="add" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {quickItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Add foods to see quick add options
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemsContainer}
        >
          {quickItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.quickItem}
              onPress={() => handleQuickAdd(item)}
              disabled={isEditMode}
              activeOpacity={0.7}
            >
              <View style={styles.itemIcon}>
                <Ionicons
                  name={item.source === 'favorite' ? 'heart' : 'time-outline'}
                  size={14}
                  color={item.source === 'favorite' ? colors.accent : colors.textSecondary}
                />
              </View>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemCalories}>{item.calories} cal</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    addButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemsContainer: {
      gap: 10,
      paddingVertical: 4,
    },
    quickItem: {
      backgroundColor: colors.bgInteractive,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      minWidth: 100,
      alignItems: 'center',
    },
    itemIcon: {
      marginBottom: 4,
    },
    itemName: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 2,
      maxWidth: 80,
    },
    itemCalories: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    emptyState: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
    },
  });
