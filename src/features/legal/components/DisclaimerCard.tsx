import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface DisclaimerCardProps {
  icon: string;
  title: string;
  body: string | string[];
}

export function DisclaimerCard({ icon, title, body }: DisclaimerCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.textSecondary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>

      {Array.isArray(body) ? (
        <View style={styles.bulletList}>
          {body.map((item, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
          {body}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  cardTitle: {
    ...typography.body.medium,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardBody: {
    ...typography.body.medium,
    lineHeight: 22,
  },
  bulletList: {
    gap: spacing[2],
  },
  bulletItem: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  bullet: {
    ...typography.body.medium,
    lineHeight: 22,
  },
});
