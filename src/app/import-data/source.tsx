import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { ImportSourceCard } from '@/components/nutritionImport';
import { IMPORT_SOURCES, ImportSource } from '@/types/nutritionImport';
import { useNutritionImportStore } from '@/stores/nutritionImportStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { TestIDs } from '@/constants/testIDs';
import { analyzeCSVContent } from '@/services/nutritionImport';

export default function ImportSourceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium } = useSubscriptionStore();
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const { pickAndAnalyzeFile, currentSession, isLoading, error, clearError } =
    useNutritionImportStore();
  const [showTestFiles, setShowTestFiles] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const selectedConfig = IMPORT_SOURCES.find((s) => s.id === selectedSource);

  const handleSourceSelect = (sourceId: ImportSource) => {
    const source = IMPORT_SOURCES.find((s) => s.id === sourceId);
    if (source?.isPremium && !isPremium) {
      // Redirect to paywall for premium sources
      router.push('/paywall?context=analytics');
      return;
    }
    setSelectedSource(sourceId);
  };

  const handleContinue = async () => {
    if (!selectedSource) return;

    // Double check premium status for premium sources
    const source = IMPORT_SOURCES.find((s) => s.id === selectedSource);
    if (source?.isPremium && !isPremium) {
      router.push('/paywall?context=analytics');
      return;
    }

    const success = await pickAndAnalyzeFile(selectedSource);
    if (success) {
      const session = useNutritionImportStore.getState().currentSession;
      // If it's Cronometer and it supports individual foods, show type selection
      if (session?.source === 'cronometer') {
        router.push('/import-data/type');
      } else {
        router.push('/import-data/preview');
      }
    }
  };

  const handleLoadTestFile = async (testFile: { name: string; content: string; expectedSource?: string }) => {
    setTestLoading(true);
    try {
      const source = (testFile.expectedSource as ImportSource) || undefined;
      const result = analyzeCSVContent(testFile.content, testFile.name, source);
      if (!result.success || !result.session) {
        Alert.alert('Test Load Failed', result.error || 'Unknown error');
        setTestLoading(false);
        return;
      }
      // Put session into the store
      useNutritionImportStore.setState({
        currentSession: result.session,
        currentFileUri: null,
        isLoading: false,
        error: null,
      });
      setTestLoading(false);
      setShowTestFiles(false);
      if (result.session.source === 'cronometer') {
        router.push('/import-data/type');
      } else {
        router.push('/import-data/preview');
      }
    } catch (e) {
      setTestLoading(false);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load test file');
    }
  };

  if (showInstructions && selectedConfig) {
    return (
      <SafeAreaView testID={TestIDs.Import.SourceScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable testID={TestIDs.Import.SourceInstructionsBackButton} onPress={() => setShowInstructions(false)} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Export from {selectedConfig.name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          testID={TestIDs.Import.SourceInstructionsScrollView}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.instructionsContainer}>
            <Text style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
              How to export your data
            </Text>
            <Text style={[styles.instructionsSubtitle, { color: colors.textSecondary }]}>
              Follow these steps to download your data from {selectedConfig.name}
            </Text>

            <View style={styles.stepsContainer}>
              {selectedConfig.exportInstructions.map((instruction, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.textPrimary }]}>
                    {instruction}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomActions}>
          <Button
            testID={TestIDs.Import.SourceCSVButton}
            label="I Have My CSV File"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            onPress={handleContinue}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID={TestIDs.Import.SourceScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.Import.SourceBackButton} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Select Source</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        testID={TestIDs.Import.SourceScrollView}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          WHERE IS YOUR DATA COMING FROM?
        </Text>

        <View style={styles.sourcesContainer}>
          {IMPORT_SOURCES.map((source) => (
            <ImportSourceCard
              key={source.id}
              source={source}
              selected={selectedSource === source.id}
              isPremiumUser={isPremium}
              onPress={() => handleSourceSelect(source.id)}
            />
          ))}
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <Pressable testID={TestIDs.Import.ClearErrorButton} onPress={clearError}>
              <Ionicons name="close" size={20} color={colors.error} />
            </Pressable>
          </View>
        )}

        {__DEV__ && (
          <View style={styles.devSection}>
            <Pressable
              style={[styles.devToggle, { backgroundColor: colors.bgSecondary }]}
              onPress={() => setShowTestFiles(!showTestFiles)}
            >
              <Ionicons name="bug-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.devToggleText, { color: colors.textSecondary }]}>
                DEV: Load Test CSV
              </Text>
              <Ionicons
                name={showTestFiles ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>

            {showTestFiles && (
              <View style={[styles.devFileList, { backgroundColor: colors.bgSecondary }]}>
                {require('@/test-data/csv').TEST_CSV_FILES.map(
                  (file: { name: string; label: string; content: string; expectedSource?: string }) => (
                    <Pressable
                      key={file.name}
                      style={[styles.devFileRow, { borderBottomColor: colors.borderDefault }]}
                      onPress={() => handleLoadTestFile(file)}
                      disabled={testLoading}
                    >
                      <Text style={[styles.devFileName, { color: colors.textPrimary }]}>
                        {file.label}
                      </Text>
                      <Text style={[styles.devFileSource, { color: colors.textTertiary }]}>
                        {file.expectedSource || 'auto-detect'}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          testID={TestIDs.Import.SourceContinueButton}
          label="Continue"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedSource}
          onPress={() => setShowInstructions(true)}
        />
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
    paddingBottom: spacing[8],
  },
  sectionTitle: {
    ...typography.overline,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  sourcesContainer: {
    gap: spacing[3],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[4],
  },
  errorText: {
    ...typography.body.small,
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
  instructionsContainer: {
    paddingTop: spacing[4],
  },
  instructionsTitle: {
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  instructionsSubtitle: {
    ...typography.body.medium,
    marginBottom: spacing[6],
  },
  stepsContainer: {
    gap: spacing[4],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepText: {
    ...typography.body.medium,
    flex: 1,
    paddingTop: spacing[1],
  },
  devSection: {
    marginTop: spacing[6],
  },
  devToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  devToggleText: {
    ...typography.body.small,
    fontWeight: '600',
    flex: 1,
  },
  devFileList: {
    marginTop: spacing[2],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  devFileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  devFileName: {
    ...typography.body.small,
    fontWeight: '500',
  },
  devFileSource: {
    ...typography.body.small,
  },
});
