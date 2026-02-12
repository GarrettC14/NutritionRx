import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { TestIDs } from '@/constants/testIDs';

const PRIVACY_SECTIONS = [
  {
    title: 'Introduction',
    body: 'Cascade Software Solutions LLC ("Company," "we," "us," or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you use the NutritionRx application ("App").\n\nPlease read this Privacy Policy carefully. By using the App, you agree to the collection and use of information in accordance with this policy.',
  },
  {
    title: 'Information We Collect',
    body: 'Information You Provide\nWhen you use NutritionRx, you may provide us with:\n\n• Name/Nickname (optional) - for personalization\n• Body weight (optional) - for progress tracking, calorie calculations\n• Height (optional) - for BMR/TDEE calculations\n• Age (optional) - for calorie calculations\n• Nutrition goals (optional) - for personalized targets\n• Unit preferences (required) - for display preferences (lbs/kg, cal/kJ)\n\nNutrition Data\nThe core data you create in the App includes:\n\n• Food logs (foods eaten, portions, timestamps)\n• Water intake logs\n• Meal categorization (breakfast, lunch, dinner, snacks)\n• Favorite foods\n• Custom foods you create\n• Weight history\n• Nutrition goals and targets\n• Notes and comments\n\nAutomatically Collected Information\nWe may automatically collect:\n\n• Device Information: Device type, operating system version, unique device identifiers\n• App Usage Data: Features used, session duration, crash reports\n• Performance Data: App performance metrics to improve functionality\n\nBarcode Scanning\nWhen you use barcode scanning:\n\n• The camera is used only to read barcodes\n• Barcode numbers are sent to food databases to retrieve nutritional information\n• We do not store images from your camera\n• Camera access can be revoked in device settings\n\nInformation We Do NOT Collect\nWe do NOT collect:\n\n• Precise location data\n• Contacts or address book\n• Photos (except barcode scanning, which doesn\'t store images)\n• Microphone or audio data\n• Financial or payment information (for free version)\n• Social media account information\n• Biometric data',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your information to:\n\n• Track your nutrition and provide calorie counts\n• Calculate personalized nutrition goals\n• Provide food search and barcode lookup\n• Store your food diary and history\n• Improve the App\'s functionality\n• Send important updates about the App\n• Respond to your support requests\n• Comply with legal obligations\n\nWe do NOT use your information to:\n\n• Sell to third parties\n• Target advertising\n• Build marketing profiles\n• Share with social networks\n• Make health decisions on your behalf',
  },
  {
    title: 'Data Storage and Security',
    body: 'Local Storage\nYour nutrition data is stored locally on your device. We use SQLite database for structured data (food logs, settings) and secure device storage provided by your operating system.\n\nData Security Measures\nWe implement appropriate security measures including:\n\n• Encryption of sensitive data at rest\n• Secure coding practices\n• Regular security assessments\n• Minimal data collection principles\n\nNo Cloud Storage (Default)\nBy default, your data remains on your device and is not transmitted to our servers. This means:\n\n• Maximum privacy - your data stays with you\n• Works offline (except barcode lookup)\n• Data is lost if you delete the app or lose your device\n• Data does not sync between devices\n\nThird-Party Food Database Queries\nWhen you search for foods or scan barcodes:\n\n• Queries are sent to food database providers\n• Only the search term or barcode is transmitted\n• No personal information is included in these queries\n• Results are cached locally for offline access\n\nOptional Cloud Features\nIf we offer optional cloud backup or sync features in the future, we will:\n\n• Clearly disclose this before enabling\n• Require your explicit consent\n• Use industry-standard encryption\n• Allow you to delete cloud data at any time',
  },
  {
    title: 'Data Sharing',
    body: 'We Do Not Sell Your Data\nWe do NOT sell, rent, or trade your personal information to third parties for marketing purposes.\n\nLimited Sharing\nWe may share your information only in these circumstances:\n\n• Food database providers - Food lookup (search terms, barcodes only)\n• Analytics providers - App improvement (anonymized usage data)\n• Crash reporting services - Bug fixes (crash logs, no personal data)\n• Legal authorities - Legal compliance (as required by law)\n• Business transfers - Merger/acquisition (all data, with notice)\n\nThird-Party Integrations\nIf you choose to connect NutritionRx with third-party services (e.g., Apple Health, Google Fit), your data will be shared according to those services\' privacy policies. We encourage you to review their policies.\n\nFood Database Providers\nWe may use the following food data sources:\n\n• USDA FoodData Central: Public domain government database\n• Open Food Facts: Open-source, crowd-sourced database\n• Other providers: As disclosed in the App\n\nEach has its own privacy practices for any data they may collect.',
  },
  {
    title: 'Your Rights and Choices',
    body: 'Your Rights\nDepending on your location, you may have the right to:\n\n• Access - Request a copy of your data\n• Correction - Correct inaccurate data\n• Deletion - Delete your data\n• Objection - Object to certain processing\n• Restriction - Limit how we use your data\n• Withdraw Consent - Withdraw consent at any time\n\nHow to Exercise Your Rights\n\n• Deletion: Use \u2018Delete My Data\u2019 in Settings, or delete the app (removes all local data)\n• Camera Access: Manage in device Settings \u2192 NutritionRx \u2192 Camera\n• Other requests: Contact us at garrett@cascademobile.dev\n\nWe will respond to requests within 30 days.\n\nData Retention\n\n• Local data: Stored until you delete it or uninstall the App\n• Analytics data: Retained for up to 24 months in anonymized form\n• Support correspondence: Retained for up to 3 years',
  },
  {
    title: 'Sensitive Health Information',
    body: 'Special Category Data\nNutrition and weight data may be considered health-related information in some jurisdictions. We treat this data with extra care:\n\n• Stored only on your device by default\n• Never sold or shared for marketing\n• You control what you enter and can delete at any time\n• Not used to make health decisions about you\n\nEating Disorder Considerations\nWe recognize that nutrition tracking apps can be harmful for individuals with eating disorders. We:\n\n• Do not promote restrictive eating\n• Use non-judgmental language ("over" not "bad")\n• Allow tracking without specific calorie goals\n• Encourage professional support when appropriate\n\nIf you\'re struggling with disordered eating, please contact:\n• NEDA Helpline: 1-800-931-2237\n• Crisis Text Line: Text "NEDA" to 741741',
  },
  {
    title: 'Children\'s Privacy',
    body: 'NutritionRx is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.\n\nIf you are a parent or guardian and believe your child has provided us with personal information, please contact us at garrett@cascademobile.dev. If we discover we have collected personal information from a child under 13, we will delete it immediately.\n\nFor users between 13 and 18:\n• Parental consent is recommended\n• Calorie tracking may not be appropriate for growing children\n• Consult a pediatrician before using nutrition tracking apps',
  },
  {
    title: 'International Data Transfers',
    body: 'If you use the App from outside the United States, your information may be transferred to and processed in the United States. By using the App, you consent to this transfer.\n\nWe ensure appropriate safeguards are in place for any international transfers, including:\n\n• Standard contractual clauses\n• Privacy Shield certification (where applicable)\n• Adequacy decisions',
  },
  {
    title: 'California Privacy Rights (CCPA)',
    body: 'If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):\n\n• Right to Know: What personal information we collect and how we use it\n• Right to Delete: Request deletion of your personal information\n• Right to Opt-Out: Opt out of the sale of personal information (we don\'t sell your data)\n• Right to Non-Discrimination: We won\'t discriminate against you for exercising your rights\n\nCategories of Information Collected:\n• Identifiers (name, device ID)\n• Health-related information (nutrition logs, weight)\n• Usage data\n\nWe do NOT sell personal information.\n\nTo exercise these rights, contact us at garrett@cascademobile.dev.',
  },
  {
    title: 'European Privacy Rights (GDPR)',
    body: 'If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):\n\n• All rights listed in "Your Rights and Choices" above\n• Right to lodge a complaint with a supervisory authority\n• Right to withdraw consent at any time\n\nLegal Bases for Processing:\n• Contract performance (providing the App\'s features)\n• Legitimate interests (improving the App, security)\n• Legal obligations (complying with laws)\n• Consent (optional features, health data processing)\n\nData Controller: Cascade Software Solutions LLC, 5441 S Macadam Ave, Ste N, Portland, OR 97239, USA\n\nSpecial Category Data: Health-related data is processed based on your explicit consent when you choose to enter it into the App.',
  },
  {
    title: 'Cookies and Tracking',
    body: 'The App does not use cookies. We may use similar technologies for:\n\n• Remembering your preferences\n• Analytics (anonymized)\n• Crash reporting\n\nYou can limit tracking through your device settings:\n• iOS: Settings \u2192 Privacy \u2192 Tracking\n• Android: Settings \u2192 Privacy \u2192 Ads',
  },
  {
    title: 'Changes to This Privacy Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of any changes by:\n\n• Posting the new Privacy Policy in the App\n• Updating the "Last Updated" date\n• Sending a notification for material changes\n\nYour continued use of the App after changes constitutes acceptance of the updated Privacy Policy.',
  },
  {
    title: 'Contact Us',
    body: 'If you have questions about this Privacy Policy or our privacy practices, please contact us:\n\nCascade Software Solutions LLC\nWebsite: https://www.cascademobile.dev/\nEmail: garrett@cascademobile.dev\nAddress: 5441 S Macadam Ave, Ste N, Portland, OR 97239, USA',
  },
];

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['bottom']}
      testID={TestIDs.SettingsPrivacyPolicy.Screen}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} testID={TestIDs.SettingsPrivacyPolicy.BackButton}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
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
        testID={TestIDs.SettingsPrivacyPolicy.ScrollView}
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
