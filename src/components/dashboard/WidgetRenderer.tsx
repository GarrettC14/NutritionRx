/**
 * Widget Renderer
 * Renders a widget based on its type with edit mode controls
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { DashboardWidget } from '@/types/dashboard';
import { getWidgetDefinition } from '@/constants/widgetDefinitions';
import { useDashboardStore } from '@/stores/dashboardStore';

interface WidgetRendererProps {
  widget: DashboardWidget;
  isEditMode: boolean;
  drag?: () => void;
  isActive?: boolean;
}

export function WidgetRenderer({
  widget,
  isEditMode,
  drag,
  isActive,
}: WidgetRendererProps) {
  const { colors } = useTheme();
  const { removeWidget } = useDashboardStore();

  const definition = getWidgetDefinition(widget.type);

  if (!definition || !widget.isVisible) {
    return null;
  }

  const WidgetComponent = definition.component;

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeWidget(widget.id);
  };

  const handleDragStart = () => {
    if (isEditMode && drag) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      drag();
    }
  };

  const styles = createStyles(colors, isEditMode, isActive);

  return (
    <View style={styles.container}>
      {isEditMode && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${definition.name} widget`}
        >
          <View style={styles.deleteButtonInner}>
            <Ionicons name="remove" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.widgetTouchable}>
        <View style={styles.widgetWrapper}>
          <WidgetComponent
            config={widget.config}
            isEditMode={isEditMode}
          />
        </View>

        {isEditMode && (
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={handleDragStart}
            delayLongPress={150}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Reorder ${definition.name} widget, long press to drag`}
          >
            <Ionicons name="menu" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: any, isEditMode: boolean, isActive?: boolean) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      marginBottom: 12,
    },
    widgetTouchable: {
      borderRadius: 16,
      overflow: 'hidden',
      ...(isEditMode && {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.borderDefault,
      }),
      ...(isActive && {
        opacity: 0.8,
        transform: [{ scale: 1.02 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      }),
    },
    widgetWrapper: {
      opacity: isEditMode ? 0.9 : 1,
    },
    deleteButton: {
      position: 'absolute',
      top: -8,
      left: -8,
      zIndex: 10,
    },
    deleteButtonInner: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    },
    dragHandle: {
      position: 'absolute',
      top: '50%',
      right: 0,
      width: 36,
      height: 36,
      marginTop: -18, // Half of height to center vertically
      borderTopLeftRadius: 18,
      borderBottomLeftRadius: 18,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderRightWidth: 0,
      borderColor: colors.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
