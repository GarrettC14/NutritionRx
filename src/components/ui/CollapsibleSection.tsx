import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  itemCount: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  emptyMessage?: string;
}

export function CollapsibleSection({
  title,
  itemCount,
  defaultExpanded = true,
  children,
  emptyMessage = 'No items',
}: CollapsibleSectionProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotation = useSharedValue(defaultExpanded ? 0 : -90);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(isExpanded ? -90 : 0, { duration: 200 });
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleToggle} style={styles.header}>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </Animated.View>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {title}
        </Text>
        <Text style={[styles.count, { color: colors.textTertiary }]}>
          ({itemCount})
        </Text>
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {itemCount > 0 ? (
            children
          ) : (
            <Text style={[styles.emptyMessage, { color: colors.textTertiary }]}>
              {emptyMessage}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  title: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  count: {
    ...typography.caption,
  },
  content: {
    marginTop: spacing[1],
    gap: spacing[2],
  },
  emptyMessage: {
    ...typography.body.small,
    paddingVertical: spacing[4],
    textAlign: 'center',
  },
});
