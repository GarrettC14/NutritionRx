import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { ImportProgressBar } from '@/components/nutritionImport';
import { useNutritionImportStore } from '@/stores/nutritionImportStore';
import { TestIDs } from '@/constants/testIDs';

export default function ImportProgressScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { currentSession, progress, executeImport, error } = useNutritionImportStore();

  useEffect(() => {
    if (!currentSession) {
      router.replace('/import-data');
      return;
    }

    const runImport = async () => {
      const success = await executeImport();
      if (success) {
        router.replace('/import-data/success');
      }
    };

    runImport();
  }, []);

  if (!currentSession) {
    return null;
  }

  if (error) {
    return (
      <SafeAreaView testID={TestIDs.Import.ProgressScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={[styles.errorIcon, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Import Failed</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID={TestIDs.Import.ProgressScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.bgInteractive }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>

        {/* Text */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Importing Your Data</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please wait while we add your nutrition history...
        </Text>

        {/* Progress */}
        {progress && (
          <View style={styles.progressContainer}>
            <ImportProgressBar progress={progress} />
          </View>
        )}

        {/* Tips */}
        <View style={[styles.tipBox, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="bulb-outline" size={20} color={colors.accent} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Tip: Imported meals will appear as quick entries in your food diary.
          </Text>
        </View>
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
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...typography.display.small,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.medium,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[8],
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing[8],
  },
  tipBox: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[4],
  },
  tipText: {
    ...typography.body.small,
    flex: 1,
  },
});
