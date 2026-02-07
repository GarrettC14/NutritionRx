import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useNutritionImportStore } from '@/stores/nutritionImportStore';
import { analyzeCSVContent } from '@/services/nutritionImport';
import { ImportSource } from '@/types/nutritionImport';
import { TestIDs } from '@/constants/testIDs';

export default function ImportWelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const cancelSession = useNutritionImportStore((s) => s.cancelSession);

  const [showTestFiles, setShowTestFiles] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // Reset stale state every time this screen mounts
  useEffect(() => {
    cancelSession();
  }, []);

  const handleLoadTestFile = (testFile: { name: string; content: string; expectedSource?: string }) => {
    setTestLoading(true);
    try {
      const source = (testFile.expectedSource as ImportSource) || undefined;
      const result = analyzeCSVContent(testFile.content, testFile.name, source);
      if (!result.success || !result.session) {
        Alert.alert('Test Load Failed', result.error || 'Unknown error');
        setTestLoading(false);
        return;
      }
      useNutritionImportStore.setState({
        currentSession: result.session,
        currentFileUri: null,
        isLoading: false,
        error: null,
      });
      setTestLoading(false);
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

  const features = [
    {
      icon: 'cloud-download-outline' as const,
      title: 'Import your history',
      description: 'Bring your food logging data from other apps',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Secure import',
      description: 'Your files are processed securely',
    },
    {
      icon: 'flash-outline' as const,
      title: 'Quick and easy',
      description: 'Just select your CSV export file',
    },
  ];

  return (
    <SafeAreaView testID={TestIDs.Import.IndexScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.Import.IndexBackButton} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        testID={TestIDs.Import.IndexScrollView}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, { backgroundColor: colors.bgInteractive }]}>
            <Ionicons name="swap-horizontal" size={48} color={colors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Import Your Data
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Seamlessly transfer your nutrition history from MyFitnessPal, Cronometer, or Lose It!
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.bgInteractive }]}>
                <Ionicons name={feature.icon} size={24} color={colors.accent} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            You'll need to export your data as a CSV file from your current app first. We'll guide you through the process.
          </Text>
        </View>

        {__DEV__ && (
          <View style={styles.devSection}>
            <Pressable
              style={[styles.devToggle, { backgroundColor: colors.bgSecondary }]}
              onPress={() => setShowTestFiles(!showTestFiles)}
            >
              <Ionicons name="bug-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.devToggleText, { color: colors.textSecondary }]}>
                DEV: Test Each Flow
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
                      <View style={styles.devFileInfo}>
                        <Text style={[styles.devFileName, { color: colors.textPrimary }]}>
                          {file.label}
                        </Text>
                        <Text style={[styles.devFileSource, { color: colors.textTertiary }]}>
                          {file.expectedSource || 'auto-detect'}
                        </Text>
                      </View>
                      <Ionicons name="play-outline" size={16} color={colors.accent} />
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
          testID={TestIDs.Import.IndexGetStartedButton}
          label="Get Started"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/import-data/source')}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[8],
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  heroTitle: {
    ...typography.display.medium,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  heroSubtitle: {
    ...typography.body.large,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  featuresSection: {
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body.large,
    fontWeight: '600',
  },
  featureDescription: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
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
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  devFileInfo: {
    flex: 1,
  },
  devFileName: {
    ...typography.body.small,
    fontWeight: '500',
  },
  devFileSource: {
    ...typography.body.small,
    marginTop: 2,
  },
});
