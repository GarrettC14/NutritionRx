import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

interface PremiumSettingsRowProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  href?: string;
  context?: string;
  subtitle?: string;
  testID?: string;
}

/**
 * Settings row that shows lock icon for non-premium users.
 * Tapping navigates to href if premium, or shows paywall if not.
 */
export function PremiumSettingsRow({
  label,
  icon,
  href,
  context = 'general',
  subtitle,
  testID,
}: PremiumSettingsRowProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();

  const handlePress = () => {
    if (isPremium && href) {
      router.push(href as any);
    } else {
      router.push(`/paywall?context=${context}`);
    }
  };

  return (
    <TouchableOpacity testID={testID} style={[styles.row, { backgroundColor: colors.bgSecondary }]} onPress={handlePress} accessibilityRole="button" accessibilityLabel={`${label}${!isPremium ? ', locked, tap to unlock' : ''}`}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>

      <View style={styles.trailing}>
        {!isPremium && (
          <Ionicons
            name="lock-closed"
            size={14}
            color={colors.premiumGold}
            style={styles.lockIcon}
          />
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 4,
  },
});
