import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { DisclaimerCard } from '@/features/legal/components/DisclaimerCard';
import { NUTRITION_DISCLAIMER_CONTENT } from '@/features/legal/content/nutritionrx';
import { useLegalAcknowledgment } from '@/features/legal/hooks/useLegalAcknowledgment';
import { TestIDs } from '@/constants/testIDs';

export default function HealthNoticeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { acknowledgedAt } = useLegalAcknowledgment();

  const content = NUTRITION_DISCLAIMER_CONTENT;

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return 'Unknown';
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['bottom']}
      testID={TestIDs.SettingsHealthNotice.Screen}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} testID={TestIDs.SettingsHealthNotice.BackButton}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Health & Safety Notice
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID={TestIDs.SettingsHealthNotice.ScrollView}
      >
        {/* Disclaimer Sections */}
        {content.sections.map((section, index) => (
          <DisclaimerCard
            key={index}
            icon={section.icon}
            title={section.title}
            body={section.body}
          />
        ))}

        {/* Acknowledged Info */}
        <View style={[styles.acknowledgedInfo, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={colors.success}
          />
          <Text style={[styles.acknowledgedText, { color: colors.textSecondary }]}>
            You acknowledged this notice on {formatDate(acknowledgedAt)}
          </Text>
        </View>
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
  acknowledgedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    marginTop: spacing[2],
  },
  acknowledgedText: {
    ...typography.body.small,
    flex: 1,
  },
});
