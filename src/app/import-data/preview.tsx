import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { ImportPreviewCard, ImportSampleDay } from '@/components/nutritionImport';
import { useNutritionImportStore } from '@/stores/nutritionImportStore';
import { NutritionImportSession, ConflictResolution } from '@/types/nutritionImport';
import { ImportPreviewSkeleton } from '@/components/ui/Skeleton';
import { TestIDs } from '@/constants/testIDs';

function DuplicateWarning({ session }: { session: NutritionImportSession }) {
  const { colors } = useTheme();
  const setConflictResolution = useNutritionImportStore((s) => s.setConflictResolution);
  const count = session.duplicateDates.length;
  const resolution = session.conflictResolution;

  const options: { value: ConflictResolution; label: string }[] = [
    { value: 'skip', label: 'Skip duplicates' },
    { value: 'overwrite', label: 'Replace existing' },
    { value: 'merge', label: 'Import alongside' },
  ];

  return (
    <View style={[styles.warningsBox, { backgroundColor: colors.warningBg ?? colors.bgSecondary }]}>
      <View style={styles.warningsHeader}>
        <Ionicons name="copy-outline" size={20} color={colors.warning} />
        <Text style={[styles.warningsTitle, { color: colors.warning }]}>
          {count} {count === 1 ? 'day' : 'days'} already have imported data
        </Text>
      </View>
      <View style={styles.conflictOptions}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.conflictOption,
              { backgroundColor: resolution === opt.value ? colors.accent + '20' : colors.bgSecondary,
                borderColor: resolution === opt.value ? colors.accent : colors.borderDefault },
            ]}
            onPress={() => setConflictResolution(opt.value)}
          >
            <Ionicons
              name={resolution === opt.value ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={resolution === opt.value ? colors.accent : colors.textTertiary}
            />
            <Text style={[styles.conflictLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function WarningsSection({ warnings }: { warnings: { line: number; message: string }[] }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const displayWarnings = expanded ? warnings.slice(0, 20) : [];

  return (
    <View style={[styles.warningsBox, { backgroundColor: colors.warningBg ?? colors.bgSecondary }]}>
      <Pressable style={styles.warningsHeader} onPress={() => setExpanded(!expanded)}>
        <Ionicons name="warning-outline" size={20} color={colors.warning} />
        <Text style={[styles.warningsTitle, { color: colors.warning }]}>
          {warnings.length} {warnings.length === 1 ? 'row' : 'rows'} skipped
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.warning} />
      </Pressable>
      {expanded && (
        <View style={styles.warningsList}>
          {displayWarnings.map((w, i) => (
            <Text key={i} style={[styles.warningItem, { color: colors.textSecondary }]}>
              Line {w.line}: {w.message}
            </Text>
          ))}
          {warnings.length > 20 && (
            <Text style={[styles.warningItem, { color: colors.textTertiary }]}>
              + {warnings.length - 20} more...
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

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
    <SafeAreaView testID={TestIDs.Import.PreviewScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.Import.PreviewBackButton} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Preview</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        testID={TestIDs.Import.PreviewScrollView}
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

        {/* Duplicate Warning */}
        {currentSession.duplicateDates.length > 0 && (
          <DuplicateWarning session={currentSession} />
        )}

        {/* Warnings Section */}
        {currentSession.warnings.length > 0 && (
          <WarningsSection warnings={currentSession.warnings} />
        )}

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
        <Button testID={TestIDs.Import.PreviewImportButton} label="Start Import" variant="primary" size="lg" fullWidth onPress={handleImport} />
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
  conflictOptions: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  conflictOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  conflictLabel: {
    ...typography.body.small,
  },
  warningsBox: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginTop: spacing[6],
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  warningsTitle: {
    ...typography.body.medium,
    fontWeight: '600',
    flex: 1,
  },
  warningsList: {
    marginTop: spacing[3],
    gap: spacing[1],
  },
  warningItem: {
    ...typography.body.small,
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
