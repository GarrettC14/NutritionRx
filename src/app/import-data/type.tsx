import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { ImportTypeOption } from '@/components/nutritionImport';
import { useNutritionImportStore } from '@/stores/nutritionImportStore';
import { TestIDs } from '@/constants/testIDs';

export default function ImportTypeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { currentSession, setImportType, isLoading } = useNutritionImportStore();

  if (!currentSession) {
    router.replace('/import-data');
    return null;
  }

  const handleTypeSelect = async (type: 'daily_totals' | 'individual_foods') => {
    await setImportType(type);
  };

  return (
    <SafeAreaView testID={TestIDs.Import.TypeScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.Import.TypeBackButton} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Import Type</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        testID={TestIDs.Import.TypeScrollView}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          How would you like to import?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose how detailed you want your imported data to be
        </Text>

        <View style={styles.optionsContainer}>
          <ImportTypeOption
            title="Daily Totals"
            description="Import your daily calorie and macro totals for each meal. Simpler and faster."
            icon="today-outline"
            selected={currentSession.importType === 'daily_totals'}
            onPress={() => handleTypeSelect('daily_totals')}
            recommended
          />

          <ImportTypeOption
            title="Individual Foods"
            description="Import each food item separately. More detailed but takes longer."
            icon="list-outline"
            selected={currentSession.importType === 'individual_foods'}
            onPress={() => handleTypeSelect('individual_foods')}
          />
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          testID={TestIDs.Import.TypeContinueButton}
          label="Continue"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          onPress={() => router.push('/import-data/preview')}
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
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.medium,
    marginBottom: spacing[6],
  },
  optionsContainer: {
    gap: spacing[4],
  },
  bottomActions: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
