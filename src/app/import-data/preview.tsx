import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { ImportPreviewCard, ImportSampleDay } from '@/components/nutritionImport';
import { useNutritionImportStore } from '@/stores/nutritionImportStore';
import { ImportPreviewSkeleton } from '@/components/ui/Skeleton';

export default function ImportPreviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { currentSession } = useNutritionImportStore();

  if (!currentSession) {
    router.replace('/import-data');
    // Show skeleton while redirecting to prevent white flash
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <ImportPreviewSkeleton />
      </SafeAreaView>
    );
  }

  // Get a sample of days to preview (first 3)
  const sampleDays = currentSession.parsedDays.slice(0, 3);

  const handleImport = () => {
    router.push('/import-data/progress');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Preview</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Card */}
        <ImportPreviewCard session={currentSession} />

        {/* Sample Days Section */}
        <View style={styles.sampleSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SAMPLE OF YOUR DATA
          </Text>
          <View style={styles.sampleDaysContainer}>
            {sampleDays.map((day, index) => (
              <ImportSampleDay key={index} day={day} />
            ))}
          </View>
          {currentSession.totalDays > 3 && (
            <Text style={[styles.moreText, { color: colors.textTertiary }]}>
              + {currentSession.totalDays - 3} more days
            </Text>
          )}
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Imported data will be added as quick entries to your diary. Your existing entries won't be affected.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button label="Start Import" variant="primary" size="lg" fullWidth onPress={handleImport} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    ...typography.body.large,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  sampleSection: {
    marginTop: spacing[6],
  },
  sectionTitle: {
    ...typography.overline,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  sampleDaysContainer: {
    gap: spacing[3],
  },
  moreText: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[3],
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[6],
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
