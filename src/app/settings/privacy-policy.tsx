import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';

const PRIVACY_SECTIONS = [
  {
    title: 'Introduction',
    body: 'Cascade Software Solutions LLC ("Company," "we," "us," or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you use the NutritionRx application.',
  },
  {
    title: 'Information We Collect',
    body: 'When you use NutritionRx, you may provide us with:\n\n• Name/Nickname (optional) - for personalization\n• Body weight (optional) - for progress tracking\n• Height (optional) - for BMR/TDEE calculations\n• Age (optional) - for calorie calculations\n• Nutrition goals (optional) - for personalized targets\n• Unit preferences (required) - for display preferences',
  },
  {
    title: 'Nutrition Data',
    body: 'The core data you create in the App includes:\n\n• Food logs (foods eaten, portions, timestamps)\n• Water intake logs\n• Meal categorization\n• Favorite foods and custom foods\n• Weight history\n• Nutrition goals and targets',
  },
  {
    title: 'Data Storage and Security',
    body: 'Your nutrition data is stored locally on your device. We use SQLite database for structured data and secure device storage provided by your operating system.\n\nBy default, your data remains on your device and is not transmitted to our servers.',
  },
  {
    title: 'We Do Not Sell Your Data',
    body: 'We do NOT sell, rent, or trade your personal information to third parties for marketing purposes.',
  },
  {
    title: 'Your Rights',
    body: 'Depending on your location, you may have the right to:\n\n• Access - Request a copy of your data\n• Correction - Correct inaccurate data\n• Deletion - Delete your data\n• Portability - Export your data in a readable format\n\nHow to Exercise Your Rights:\n• Access/Export: Use the "Export Data" feature in Settings\n• Deletion: Delete the app (removes all local data)\n• Other requests: Contact us at garrett@cascademobile.dev',
  },
  {
    title: 'Children\'s Privacy',
    body: 'NutritionRx is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.',
  },
  {
    title: 'Contact Us',
    body: 'If you have questions about this Privacy Policy, please contact us:\n\nCascade Software Solutions LLC\nWebsite: https://www.cascademobile.dev/\nEmail: garrett@cascademobile.dev\nAddress: 5441 S Macadam Ave, Ste N, Portland, OR 97239, USA',
  },
];

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['bottom']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Privacy Policy
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Last Updated */}
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
          Last Updated: January 27, 2026
        </Text>

        {/* Sections */}
        {PRIVACY_SECTIONS.map((section, index) => (
          <View
            key={index}
            style={[styles.sectionCard, { backgroundColor: colors.bgSecondary }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    ...typography.title.medium,
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  lastUpdated: {
    ...typography.body.small,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  sectionCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...typography.title.small,
    marginBottom: spacing[2],
  },
  sectionBody: {
    ...typography.body.medium,
    lineHeight: 22,
  },
});
