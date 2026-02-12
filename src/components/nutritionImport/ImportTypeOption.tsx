import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface ImportTypeOptionProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress: () => void;
  recommended?: boolean;
}

export function ImportTypeOption({
  title,
  description,
  icon,
  selected = false,
  onPress,
  recommended = false,
}: ImportTypeOptionProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: selected ? colors.bgInteractive : colors.bgSecondary,
          borderColor: selected ? colors.accent : colors.borderDefault,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons name={icon} size={24} color={selected ? colors.accent : colors.textSecondary} />
        </View>
        {recommended && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>Recommended</Text>
          </View>
        )}
        <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.borderDefault }]}>
          {selected && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    marginLeft: spacing[3],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  radio: {
    marginLeft: 'auto',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    paddingLeft: spacing[1],
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  description: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
});
