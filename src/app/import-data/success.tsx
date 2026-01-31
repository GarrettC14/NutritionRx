import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useNutritionImportStore } from '@/stores/nutritionImportStore';
import { useFoodLogStore } from '@/stores/foodLogStore';
import { TestIDs } from '@/constants/testIDs';

export default function ImportSuccessScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { currentSession, cancelSession } = useNutritionImportStore();
  const refreshCurrentDate = useFoodLogStore((state) => state.refreshCurrentDate);

  const handleDone = async () => {
    // Refresh the food log to show imported data
    await refreshCurrentDate();
    cancelSession();
    router.replace('/(tabs)');
  };

  const importedDays = currentSession?.importedDays ?? 0;

  return (
    <SafeAreaView testID={TestIDs.Import.SuccessScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.successBg }]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>

        {/* Text */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Import Complete!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Successfully imported {importedDays} {importedDays === 1 ? 'day' : 'days'} of nutrition
          history.
        </Text>

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.statRow}>
            <View style={[styles.statIcon, { backgroundColor: colors.bgInteractive }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {importedDays} days
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>imported</Text>
            </View>
          </View>
        </View>

        {/* Encouragement */}
        <View style={[styles.encouragementBox, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <Text style={[styles.encouragementText, { color: colors.textSecondary }]}>
            Your imported data is now part of your nutrition journey. Keep going!
          </Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button testID={TestIDs.Import.SuccessDoneButton} label="View My Diary" variant="primary" size="lg" fullWidth onPress={handleDone} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...typography.display.medium,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[8],
  },
  statsCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    ...typography.body.large,
    fontWeight: '600',
  },
  statLabel: {
    ...typography.body.small,
  },
  encouragementBox: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  encouragementText: {
    ...typography.body.medium,
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
