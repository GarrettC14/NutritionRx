/**
 * Widget Picker Modal
 * Allows users to add new widgets to their dashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { WidgetType } from '@/types/dashboard';
import {
  getAllWidgetDefinitions,
  WIDGET_CATEGORIES,
} from '@/constants/widgetDefinitions';
import { useDashboardStore } from '@/stores/dashboardStore';

interface WidgetPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WidgetPickerModal({ visible, onClose }: WidgetPickerModalProps) {
  const { colors } = useTheme();
  const { widgets, addWidget } = useDashboardStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allDefinitions = getAllWidgetDefinitions();
  const existingTypes = new Set(widgets.map((w) => w.type));

  const filteredDefinitions = selectedCategory
    ? allDefinitions.filter((def) => def.category === selectedCategory)
    : allDefinitions;

  const handleAddWidget = async (type: WidgetType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addWidget(type);
    onClose();
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Widget</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === null && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === null && styles.categoryTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {WIDGET_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={14}
                color={
                  selectedCategory === category.id
                    ? colors.textOnAccent
                    : colors.textSecondary
                }
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Widget List */}
        <ScrollView
          style={styles.widgetList}
          contentContainerStyle={styles.widgetListContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredDefinitions.map((definition) => {
            const isAdded = existingTypes.has(definition.type);

            return (
              <Pressable
                key={definition.type}
                style={({ pressed }) => [
                  styles.widgetItem,
                  pressed && styles.widgetItemPressed,
                  isAdded && styles.widgetItemDisabled,
                ]}
                onPress={() => !isAdded && handleAddWidget(definition.type)}
                disabled={isAdded}
              >
                <View
                  style={[
                    styles.widgetIcon,
                    isAdded && styles.widgetIconDisabled,
                  ]}
                >
                  <Ionicons
                    name={definition.icon as any}
                    size={24}
                    color={isAdded ? colors.textTertiary : colors.accent}
                  />
                </View>

                <View style={styles.widgetInfo}>
                  <Text
                    style={[
                      styles.widgetName,
                      isAdded && styles.widgetNameDisabled,
                    ]}
                  >
                    {definition.name}
                  </Text>
                  <Text style={styles.widgetDescription}>
                    {definition.description}
                  </Text>
                </View>

                {isAdded ? (
                  <View style={styles.addedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.success}
                    />
                    <Text style={styles.addedText}>Added</Text>
                  </View>
                ) : (
                  <View style={styles.addButton}>
                    <Ionicons name="add" size={20} color={colors.accent} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgBase,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bgInteractive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.bgInteractive,
      marginRight: 8,
    },
    categoryChipActive: {
      backgroundColor: colors.accent,
    },
    categoryIcon: {
      marginRight: 6,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    categoryTextActive: {
      color: colors.textOnAccent,
    },
    widgetList: {
      flex: 1,
    },
    widgetListContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    widgetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    widgetItemPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    widgetItemDisabled: {
      opacity: 0.6,
    },
    widgetIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    widgetIconDisabled: {
      backgroundColor: colors.bgInteractive,
    },
    widgetInfo: {
      flex: 1,
    },
    widgetName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    widgetNameDisabled: {
      color: colors.textTertiary,
    },
    widgetDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addedText: {
      fontSize: 12,
      color: colors.success,
      fontWeight: '500',
    },
  });
