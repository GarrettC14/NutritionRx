import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';

const TERMS_SECTIONS = [
  {
    title: '1. Agreement to Terms',
    body: 'By downloading, installing, or using NutritionRx ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.\n\nThese Terms constitute a legally binding agreement between you and Cascade Software Solutions LLC ("Company," "we," "us," or "our").',
  },
  {
    title: '2. Description of Service',
    body: 'NutritionRx is a nutrition tracking application that allows users to:\n\n• Log food and beverages consumed\n• Track calories and macronutrients\n• Scan barcodes to find food nutrition information\n• Track water intake and hydration\n• Monitor weight over time\n• Set and track nutritional goals\n• Access home screen widgets for quick logging',
  },
  {
    title: '3. Eligibility',
    body: 'You must be at least 13 years old to use the App. If you are under 18, you represent that you have your parent or guardian\'s permission to use the App.\n\nSpecial Note: If you have a history of eating disorders, please consult with a healthcare professional before using any calorie tracking app.',
  },
  {
    title: '4. User Data',
    body: 'Your nutrition data is stored locally on your device. You are responsible for maintaining backups of your data. We are not responsible for any loss of data due to device failure, app deletion, or other causes.\n\nYou retain ownership of all nutrition data you create within the App.',
  },
  {
    title: '5. Acceptable Use',
    body: 'You agree NOT to:\n\n• Use the App for any unlawful purpose\n• Attempt to reverse engineer the App\n• Use the App to transmit any viruses or malicious code\n• Interfere with the App\'s functionality\n• Resell or redistribute the App',
  },
  {
    title: '6. Health and Medical Disclaimer',
    body: 'THE APP IS NOT INTENDED TO PROVIDE MEDICAL, NUTRITIONAL, OR DIETARY ADVICE. The calorie calculations, macro tracking, and goal suggestions are for informational and tracking purposes only.\n\nBefore making significant changes to your diet, you should consult with a qualified healthcare provider, registered dietitian, or nutrition professional.\n\nWe make no guarantees about weight loss, weight gain, health improvements, or any other results from using the App.',
  },
  {
    title: '7. Eating Disorder Awareness',
    body: 'Calorie tracking is not appropriate for everyone. If you experience obsessive thoughts about food, anxiety related to eating, or restrictive eating patterns, please stop using the App and consult a mental health professional.\n\nNEDA Helpline: 1-800-931-2237',
  },
  {
    title: '8. Intellectual Property',
    body: 'The App, including its design, features, and content (excluding your user data), is owned by Cascade Software Solutions LLC and is protected by copyright and trademark laws.\n\nWe grant you a limited, non-exclusive, non-transferable license to use the App for personal, non-commercial purposes.',
  },
  {
    title: '9. Third-Party Services',
    body: 'The App may access third-party food databases. We are not responsible for the accuracy or availability of this data.\n\nBarcode scanning relies on third-party databases. Not all products may be available, and some information may be inaccurate.',
  },
  {
    title: '10. Disclaimers',
    body: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.\n\nWe do not warrant that:\n• The App will be uninterrupted or error-free\n• Nutritional information will be accurate\n• The App will meet your specific dietary needs\n• Using the App will result in weight loss or health improvements',
  },
  {
    title: '11. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING ANY DAMAGES RELATED TO DIETARY DECISIONS MADE USING THE APP OR ANY HEALTH CONDITIONS OR OUTCOMES RELATED TO YOUR DIET.',
  },
  {
    title: '12. Dispute Resolution',
    body: 'These Terms shall be governed by the laws of the State of Oregon, USA. Any disputes shall be resolved through binding arbitration.',
  },
  {
    title: '13. Contact Us',
    body: 'If you have questions about these Terms, please contact us:\n\nCascade Software Solutions LLC\nWebsite: https://www.cascademobile.dev/\nEmail: garrett@cascademobile.dev\nAddress: 5441 S Macadam Ave, Ste N, Portland, OR 97239, USA',
  },
];

export default function TermsOfServiceScreen() {
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
          Terms of Service
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
