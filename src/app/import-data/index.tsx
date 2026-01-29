import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { seedMicronutrientData, clearSeedData } from '@/services/seedDataService';

export default function ImportWelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const result = await seedMicronutrientData();
      if (result.success) {
        Alert.alert(
          'Data Seeded',
          'Mock data has been added for the past 7 days. Go to the Progress tab to see micronutrient tracking.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to seed data');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearSeedData = async () => {
    Alert.alert(
      'Clear Seed Data',
      'This will remove all seeded test data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const result = await clearSeedData();
              if (result.success) {
                Alert.alert('Success', 'Seed data cleared');
              } else {
                Alert.alert('Error', result.error || 'Failed to clear data');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const features = [
    {
      icon: 'cloud-download-outline' as const,
      title: 'Import your history',
      description: 'Bring your food logging data from other apps',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Your data stays private',
      description: 'Everything is processed on your device',
    },
    {
      icon: 'flash-outline' as const,
      title: 'Quick and easy',
      description: 'Just select your CSV export file',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
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

        {/* Developer Section - Seed Data for Testing */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={[styles.devSectionTitle, { color: colors.textSecondary }]}>
              DEVELOPER OPTIONS
            </Text>
            <View style={[styles.devCard, { backgroundColor: colors.bgSecondary }]}>
              <View style={styles.devCardContent}>
                <View style={[styles.devIcon, { backgroundColor: colors.bgInteractive }]}>
                  <Ionicons name="flask" size={24} color={colors.accent} />
                </View>
                <View style={styles.devTextContent}>
                  <Text style={[styles.devTitle, { color: colors.textPrimary }]}>
                    Seed Test Data
                  </Text>
                  <Text style={[styles.devDescription, { color: colors.textSecondary }]}>
                    Populate 7 days of food logs with micronutrient data for testing premium features
                  </Text>
                </View>
              </View>
              <View style={styles.devButtons}>
                <Pressable
                  style={[styles.devButton, { backgroundColor: colors.accent }]}
                  onPress={handleSeedData}
                  disabled={isSeeding}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.devButtonText}>
                    {isSeeding ? 'Seeding...' : 'Seed Data'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.devButton, styles.devButtonSecondary, { borderColor: colors.borderDefault }]}
                  onPress={handleClearSeedData}
                  disabled={isClearing}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.devButtonTextSecondary, { color: colors.textSecondary }]}>
                    {isClearing ? 'Clearing...' : 'Clear'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
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
  devSectionTitle: {
    ...typography.overline,
    marginBottom: spacing[2],
  },
  devCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  devCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  devIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devTextContent: {
    flex: 1,
  },
  devTitle: {
    ...typography.body.large,
    fontWeight: '600',
  },
  devDescription: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  devButtons: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  devButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  devButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  devButtonTextSecondary: {
    fontWeight: '600',
    fontSize: 14,
  },
});
