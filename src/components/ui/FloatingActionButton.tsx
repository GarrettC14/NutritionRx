/**
 * FloatingActionButton Component
 * FAB with expandable menu for multiple actions
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius, shadows } from '@/constants/spacing';
import { TestIDs } from '@/constants/testIDs';

interface FABMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface FloatingActionButtonProps {
  primaryIcon: keyof typeof Ionicons.glyphMap;
  primaryLabel: string;
  onPrimaryPress: () => void;
  menuItems?: FABMenuItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Separate component for menu items to properly use hooks
interface AnimatedMenuItemProps {
  item: FABMenuItem;
  index: number;
  totalItems: number;
  expandProgress: SharedValue<number>;
  onPress: (item: FABMenuItem) => void;
  colors: any;
  shadowStyle: any;
}

function AnimatedMenuItem({
  item,
  index,
  totalItems,
  expandProgress,
  onPress,
  colors,
  shadowStyle,
}: AnimatedMenuItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const delay = (totalItems - 1 - index) * 0.1;
    const progress = Math.max(0, Math.min(1, expandProgress.value - delay));
    return {
      opacity: interpolate(progress, [0, 0.5, 1], [0, 0.5, 1]),
      transform: [
        { translateY: interpolate(progress, [0, 1], [20, 0]) },
        { scale: interpolate(progress, [0, 1], [0.8, 1]) },
      ],
    };
  });

  return (
    <AnimatedPressable
      style={[styles.menuItemContainer, animatedStyle]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.menuItemLabel, { backgroundColor: colors.bgElevated }]}>
        <Text style={[styles.menuItemLabelText, { color: colors.textPrimary }]}>
          {item.label}
        </Text>
      </View>
      <View
        style={[
          styles.menuItemButton,
          { backgroundColor: colors.bgElevated },
          shadowStyle,
        ]}
      >
        <Ionicons name={item.icon} size={22} color={colors.accent} />
      </View>
    </AnimatedPressable>
  );
}

export function FloatingActionButton({
  primaryIcon,
  primaryLabel,
  onPrimaryPress,
  menuItems = [],
  isExpanded,
  onToggleExpand,
}: FloatingActionButtonProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const expandProgress = useSharedValue(0);

  React.useEffect(() => {
    expandProgress.value = reducedMotion
      ? (isExpanded ? 1 : 0)
      : withSpring(isExpanded ? 1 : 0, {
          damping: 15,
          stiffness: 200,
        });
  }, [isExpanded]);

  const handlePrimaryPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (menuItems.length > 0) {
      onToggleExpand();
    } else {
      onPrimaryPress();
    }
  };

  const handleMenuItemPress = async (item: FABMenuItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleExpand();
    // Small delay so user sees the menu closing
    setTimeout(() => {
      item.onPress();
    }, 100);
  };

  const handleBackdropPress = () => {
    onToggleExpand();
  };

  // Animation for the plus/close icon rotation
  const iconRotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(expandProgress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const shadowStyle = isDark ? shadows.dark.lg : shadows.light.lg;

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <Modal visible={isExpanded} transparent animationType="none">
          <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
            <View style={styles.fabContainer}>
              {/* Menu Items */}
              {menuItems.map((item, index) => (
                <AnimatedMenuItem
                  key={item.label}
                  item={item}
                  index={index}
                  totalItems={menuItems.length}
                  expandProgress={expandProgress}
                  onPress={handleMenuItemPress}
                  colors={colors}
                  shadowStyle={shadowStyle}
                />
              ))}

              {/* Primary FAB Button */}
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.accent },
                  shadowStyle,
                ]}
                onPress={handlePrimaryPress}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Animated.View style={iconRotateStyle}>
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </Animated.View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* FAB when not expanded */}
      {!isExpanded && (
        <View style={styles.fabContainerFixed}>
          <Pressable
            testID={TestIDs.UI.FloatingActionButton}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.accent },
              shadowStyle,
            ]}
            onPress={handlePrimaryPress}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Ionicons name={primaryIcon} size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    alignItems: 'flex-end',
  },
  fabContainerFixed: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    alignItems: 'flex-end',
  },
  primaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  menuItemLabel: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    marginRight: spacing[3],
  },
  menuItemLabelText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  menuItemButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
