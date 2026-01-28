import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface CategoryChipProps {
  label: string;
  iconName?: string;
  isSelected: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, iconName, isSelected, onPress }: CategoryChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isSelected ? colors.accent : colors.bgSecondary,
          borderColor: isSelected ? colors.accent : colors.borderDefault,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {iconName && (
        <Ionicons
          name={iconName as any}
          size={14}
          color={isSelected ? '#FFFFFF' : colors.textSecondary}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing[1],
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
  },
});
