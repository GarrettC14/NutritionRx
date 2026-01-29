import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ImportSourceConfig } from '@/types/nutritionImport';

interface ImportSourceCardProps {
  source: ImportSourceConfig;
  onPress: () => void;
  selected?: boolean;
  isPremiumUser?: boolean;
}

export function ImportSourceCard({
  source,
  onPress,
  selected = false,
  isPremiumUser = false,
}: ImportSourceCardProps) {
  const { colors } = useTheme();
  const showLock = source.isPremium && !isPremiumUser;

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: selected ? colors.bgInteractive : colors.bgSecondary,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.bgInteractive }]}>
        <Ionicons
          name={source.icon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={colors.accent}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{source.name}</Text>
          {showLock && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="lock-closed" size={12} color={colors.accent} />
              <Text style={[styles.premiumText, { color: colors.accent }]}>Premium</Text>
            </View>
          )}
        </View>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {source.description}
        </Text>
      </View>
      <View style={styles.chevronContainer}>
        {showLock ? (
          <Ionicons name="lock-closed" size={20} color={colors.textTertiary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  chevronContainer: {
    paddingLeft: spacing[2],
  },
});
