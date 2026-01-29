/**
 * Dashboard Screen
 * Main customizable dashboard with draggable widgets
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { DashboardWidget } from '@/types/dashboard';
import { useDashboardStore } from '@/stores/dashboardStore';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetPickerModal } from './WidgetPickerModal';

export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const { widgets, isEditMode, setEditMode, reorderWidgets } = useDashboardStore();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const visibleWidgets = widgets
    .filter((w) => w.isVisible)
    .sort((a, b) => a.position - b.position);

  const handleDragEnd = useCallback(
    ({ data }: { data: DashboardWidget[] }) => {
      const reorderedIds = data.map((w) => w.id);
      reorderWidgets(reorderedIds);
    },
    [reorderWidgets]
  );

  const handleLongPress = useCallback(async () => {
    if (!isEditMode) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setEditMode(true);
    }
  }, [isEditMode, setEditMode]);

  const handleDoneEditing = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditMode(false);
  }, [setEditMode]);

  const handleAddWidget = useCallback(() => {
    setIsPickerVisible(true);
  }, []);

  const renderWidget = useCallback(
    ({ item, drag, isActive }: RenderItemParams<DashboardWidget>) => (
      <ScaleDecorator>
        <WidgetRenderer
          widget={item}
          isEditMode={isEditMode}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    ),
    [isEditMode]
  );

  const keyExtractor = useCallback((item: DashboardWidget) => item.id, []);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerActions}>
          {isEditMode ? (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddWidget}
              >
                <Ionicons name="add" size={22} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleDoneEditing}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <View style={styles.editBanner}>
          <Ionicons name="information-circle" size={18} color={colors.accent} />
          <Text style={styles.editBannerText}>
            Long press and drag to reorder. Tap X to remove.
          </Text>
        </View>
      )}

      {/* Widget List */}
      {visibleWidgets.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="grid-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyTitle}>No Widgets</Text>
          <Text style={styles.emptyDescription}>
            Add widgets to customize your dashboard
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={handleAddWidget}
          >
            <Ionicons name="add" size={20} color={'#fff'} />
            <Text style={styles.emptyAddButtonText}>Add Widget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DraggableFlatList
          data={visibleWidgets}
          renderItem={renderWidget}
          keyExtractor={keyExtractor}
          onDragEnd={handleDragEnd}
          onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          contentContainerStyle={styles.widgetList}
          showsVerticalScrollIndicator={false}
          activationDistance={isEditMode ? 0 : 10000}
          dragItemOverflow={false}
          ListFooterComponent={
            isEditMode ? (
              <TouchableOpacity
                style={styles.addWidgetCard}
                onPress={handleAddWidget}
              >
                <Ionicons name="add-circle" size={32} color={colors.accent} />
                <Text style={styles.addWidgetText}>Add Widget</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Widget Picker Modal */}
      <WidgetPickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
      />
    </SafeAreaView>
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
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 + 8 : 8,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    editButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bgInteractive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.accent,
    },
    doneButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    editBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.accent}15`,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 12,
      gap: 8,
    },
    editBannerText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
    },
    widgetList: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      gap: 8,
    },
    emptyAddButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    addWidgetCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.borderDefault,
      paddingVertical: 24,
      gap: 10,
      marginTop: 4,
    },
    addWidgetText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
    },
  });
