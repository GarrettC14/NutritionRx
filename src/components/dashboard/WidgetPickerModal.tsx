/**
 * Widget Picker Modal
 * Allows users to add new widgets to their dashboard
 */

import React, { useMemo } from 'react';
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
import { WidgetType, WidgetDefinition } from '@/types/dashboard';
import {
  getAllWidgetDefinitions,
  WIDGET_CATEGORIES,
} from '@/constants/widgetDefinitions';
import { useDashboardStore } from '@/stores/dashboardStore';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { TestIDs } from '@/constants/testIDs';

interface WidgetPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WidgetPickerModal({ visible, onClose }: WidgetPickerModalProps) {
  const { colors } = useTheme();
  const { widgets, addWidget } = useDashboardStore();

  const allDefinitions = getAllWidgetDefinitions();
  const existingTypes = new Set(widgets.map((w) => w.type));

  // Group widgets by category
  const widgetsByCategory = useMemo(() => {
    const grouped: Record<string, WidgetDefinition[]> = {};
    WIDGET_CATEGORIES.forEach((cat) => {
      grouped[cat.id] = allDefinitions.filter((def) => def.category === cat.id);
    });
    return grouped;
  }, [allDefinitions]);

  const handleAddWidget = async (type: WidgetType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addWidget(type);
    // Don't close - allow user to add multiple widgets
  };

  const styles = createStyles(colors);

  const renderWidgetItem = (definition: WidgetDefinition) => {
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
        accessibilityRole="button"
        accessibilityLabel={`${isAdded ? 'Already added' : 'Add'} ${definition.name} widget${definition.isPremium ? ', premium feature' : ''}`}
      >
        <View
          style={[
            styles.widgetIcon,
            isAdded && styles.widgetIconDisabled,
            !isAdded && definition.isPremium && { backgroundColor: colors.premiumGoldMuted },
          ]}
        >
          <Ionicons
            name={definition.icon as any}
            size={24}
            color={isAdded ? colors.textTertiary : definition.isPremium ? colors.premiumGold : colors.accent}
          />
        </View>

        <View style={styles.widgetInfo}>
          <View style={styles.widgetNameRow}>
            <Text
              style={[
                styles.widgetName,
                isAdded && styles.widgetNameDisabled,
              ]}
            >
              {definition.name}
            </Text>
            {definition.isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
          </View>
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container} testID={TestIDs.Home.WidgetPickerModal}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Widget</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close widget picker"
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Widget List by Category */}
        <ScrollView
          style={styles.widgetList}
          contentContainerStyle={styles.widgetListContent}
          showsVerticalScrollIndicator={false}
        >
          {WIDGET_CATEGORIES.map((category) => {
            const categoryWidgets = widgetsByCategory[category.id] || [];

            return (
              <CollapsibleSection
                key={category.id}
                title={category.label}
                itemCount={categoryWidgets.length}
                defaultExpanded={true}
              >
                {categoryWidgets.map(renderWidgetItem)}
              </CollapsibleSection>
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
      backgroundColor: colors.bgPrimary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: colors.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.bgInteractive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    widgetList: {
      flex: 1,
    },
    widgetListContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    widgetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 16,
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
    widgetNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    widgetName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    widgetNameDisabled: {
      color: colors.textTertiary,
    },
    premiumBadge: {
      backgroundColor: colors.premiumGoldMuted,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    premiumBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.premiumGold,
      letterSpacing: 0.5,
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
