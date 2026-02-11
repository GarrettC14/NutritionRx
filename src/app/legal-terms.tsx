import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { TestIDs } from '@/constants/testIDs';

const TERMS_SECTIONS = [
  {
    title: '1. Agreement to Terms',
    body: 'By downloading, installing, or using NutritionRx ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.\n\nThese Terms constitute a legally binding agreement between you and Cascade Software Solutions LLC ("Company," "we," "us," or "our").',
  },
  {
    title: '2. Description of Service',
    body: 'NutritionRx is a nutrition tracking application that allows users to:\n\n• Log food and beverages consumed\n• Track calories, macronutrients (protein, carbs, fat), and micronutrients\n• Scan barcodes to quickly find food nutrition information\n• Track water intake and hydration\n• Monitor weight and body measurements over time\n• Set and track nutritional goals\n• View nutrition history and trends\n• Access home screen widgets for quick logging\n\nThe App is designed for personal, non-commercial use to help you track your nutrition journey.',
  },
  {
    title: '3. Eligibility',
    body: 'You must be at least 13 years old to use the App. If you are under 18, you represent that you have your parent or guardian\'s permission to use the App. By using the App, you acknowledge that you meet these eligibility requirements.\n\nSpecial Note: If you have a history of eating disorders or disordered eating, please consult with a healthcare professional before using any calorie or nutrition tracking app.',
  },
  {
    title: '4. User Accounts and Data',
    body: '4.1 Account Information\nYou may be asked to provide certain information such as your name, weight, height, and nutrition preferences. You agree to provide accurate information and to update it as necessary.\n\n4.2 Data Storage\nYour nutrition data is stored locally on your device. You are responsible for maintaining backups of your data. We are not responsible for any loss of data due to device failure, app deletion, or other causes.\n\n4.3 Data Ownership\nYou retain ownership of all nutrition data you create within the App. By using the App, you grant us a limited license to process this data solely to provide the App\'s functionality.',
  },
  {
    title: '5. Acceptable Use',
    body: 'You agree NOT to:\n\n• Use the App for any unlawful purpose\n• Attempt to reverse engineer, decompile, or disassemble the App\n• Remove or alter any proprietary notices or labels on the App\n• Use the App to transmit any viruses or malicious code\n• Interfere with or disrupt the App\'s functionality\n• Use the App in any way that could damage or impair the App\n• Resell, redistribute, or sublicense the App\n• Use the App to promote unhealthy eating behaviors',
  },
  {
    title: '6. Health, Nutrition, and Medical Disclaimer',
    body: '6.1 Not Medical or Nutritional Advice\nTHE APP IS NOT INTENDED TO PROVIDE MEDICAL, NUTRITIONAL, OR DIETARY ADVICE. The calorie calculations, macro tracking, goal suggestions, and any other features are for informational and tracking purposes only.\n\n6.2 Consult a Professional\nBefore making significant changes to your diet, you should consult with a qualified healthcare provider, registered dietitian, or nutrition professional. This is especially important if you:\n\n• Have any pre-existing health conditions\n• Have diabetes or blood sugar concerns\n• Are pregnant or nursing\n• Have food allergies or intolerances\n• Have a history of eating disorders\n• Are under 18 years of age\n• Are taking medications affected by diet\n\n6.3 Nutritional Information Accuracy\nWhile we strive to provide accurate nutritional information, we cannot guarantee the accuracy of:\n\n• Third-party food database entries\n• Barcode scan results\n• User-submitted foods\n• Restaurant menu items\n• Recipe calculations\n\nAlways verify nutritional information when accuracy is critical, especially for medical conditions like diabetes.\n\n6.4 No Guaranteed Results\nWe make no guarantees about weight loss, weight gain, health improvements, or any other results from using the App. Individual results vary based on many factors beyond nutrition tracking.\n\n6.5 Eating Disorder Awareness\nCalorie tracking is not appropriate for everyone. If you experience:\n\n• Obsessive thoughts about food or calories\n• Anxiety related to eating or tracking\n• Restrictive eating patterns\n• Binge eating behaviors\n• Negative body image issues\n\nPlease stop using the App and consult a mental health professional. Resources are available at the National Eating Disorders Association (NEDA): 1-800-931-2237.',
  },
  {
    title: '7. Intellectual Property',
    body: '7.1 Our Property\nThe App, including its design, features, graphics, and content (excluding your user data and third-party food data), is owned by Cascade Software Solutions LLC and is protected by copyright, trademark, and other intellectual property laws.\n\n7.2 Food Database\nThe App may include nutritional data from third-party sources including USDA FoodData Central (public domain) and other databases. Such data is subject to its own terms and licenses.\n\n7.3 Limited License\nWe grant you a limited, non-exclusive, non-transferable, revocable license to use the App for personal, non-commercial purposes in accordance with these Terms.\n\n7.4 Feedback\nAny feedback, suggestions, or ideas you provide about the App may be used by us without any obligation to compensate you.',
  },
  {
    title: '8. Third-Party Services and Data',
    body: '8.1 Food Databases\nThe App may access third-party food databases to provide nutritional information. We are not responsible for the accuracy or availability of this data.\n\n8.2 Barcode Scanning\nBarcode scanning relies on third-party databases. Not all products may be available, and some information may be inaccurate or outdated.\n\n8.3 Health App Integration\nThe App may integrate with third-party services (such as Apple Health or Google Fit). Your use of such services is subject to their respective terms and privacy policies.',
  },
  {
    title: '9. Updates and Changes',
    body: '9.1 App Updates\nWe may release updates to the App from time to time. Some updates may be required for continued use. We are not obligated to provide any updates or to maintain backward compatibility.\n\n9.2 Food Database Updates\nNutritional information may be updated periodically. Historical logs will retain the nutritional values at the time of logging.\n\n9.3 Terms Updates\nWe may modify these Terms at any time. We will notify you of material changes through the App or by other means. Your continued use of the App after changes constitutes acceptance of the modified Terms.',
  },
  {
    title: '10. Termination',
    body: '10.1 By You\nYou may stop using the App at any time by deleting it from your device.\n\n10.2 By Us\nWe may terminate or suspend your access to the App at any time, for any reason, without notice.\n\n10.3 Effect of Termination\nUpon termination, your license to use the App ends. Sections that by their nature should survive termination will survive.',
  },
  {
    title: '11. Disclaimers',
    body: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:\n\n• WARRANTIES OF MERCHANTABILITY\n• FITNESS FOR A PARTICULAR PURPOSE\n• NON-INFRINGEMENT\n• ACCURACY OR COMPLETENESS OF NUTRITIONAL INFORMATION\n• SUITABILITY FOR ANY PARTICULAR DIETARY NEED\n\nWE DO NOT WARRANT THAT:\n• The App will be uninterrupted or error-free\n• Nutritional information will be accurate\n• The App will meet your specific dietary needs\n• Using the App will result in weight loss or health improvements',
  },
  {
    title: '12. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CASCADE SOFTWARE SOLUTIONS LLC AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:\n\n• ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES\n• ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL\n• ANY DAMAGES RELATED TO YOUR USE OR INABILITY TO USE THE APP\n• ANY DAMAGES RELATED TO DIETARY DECISIONS MADE USING THE APP\n• ANY HEALTH CONDITIONS OR OUTCOMES RELATED TO YOUR DIET\n• ANY DAMAGES FROM INACCURATE NUTRITIONAL INFORMATION\n\nOUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.',
  },
  {
    title: '13. Indemnification',
    body: 'You agree to indemnify, defend, and hold harmless Cascade Software Solutions LLC and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney\'s fees) arising from:\n\n• Your use of the App\n• Your violation of these Terms\n• Your violation of any rights of another party\n• Dietary decisions made while using the App\n• Health outcomes related to your use of the App',
  },
  {
    title: '14. Dispute Resolution',
    body: '14.1 Governing Law\nThese Terms shall be governed by the laws of the State of Oregon, USA, without regard to conflict of law principles.\n\n14.2 Arbitration\nAny disputes arising from these Terms or your use of the App shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, rather than in court. You waive any right to a jury trial or to participate in a class action.\n\n14.3 Exceptions\nNotwithstanding the above, either party may seek injunctive relief in any court of competent jurisdiction.',
  },
  {
    title: '15. General Provisions',
    body: '15.1 Entire Agreement\nThese Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the App.\n\n15.2 Severability\nIf any provision of these Terms is found unenforceable, the remaining provisions will continue in effect.\n\n15.3 Waiver\nOur failure to enforce any provision of these Terms does not constitute a waiver of that provision.\n\n15.4 Assignment\nYou may not assign your rights under these Terms. We may assign our rights without restriction.',
  },
  {
    title: '16. Contact Us',
    body: 'If you have questions about these Terms, please contact us:\n\nCascade Software Solutions LLC\nWebsite: https://www.cascademobile.dev/\nEmail: garrett@cascademobile.dev\nAddress: 5441 S Macadam Ave, Ste N, Portland, OR 97239, USA',
  },
];

export default function LegalTermsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['top', 'bottom']}
      testID={TestIDs.LegalTerms.Screen}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          testID={TestIDs.LegalTerms.BackButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Terms of Service
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID={TestIDs.LegalTerms.ScrollView}
      >
        {/* Last Updated */}
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
          Last Updated: January 27, 2026
        </Text>

        {/* Sections */}
        {TERMS_SECTIONS.map((section, index) => (
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
