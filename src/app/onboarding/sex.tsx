import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores';
import { Sex } from '@/types/domain';

export default function SexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { updateProfile } = useProfileStore();
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null);

  const handleContinue = async () => {
    if (!selectedSex) return;
    await updateProfile({ sex: selectedSex });
    router.push('/onboarding/birthday');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '11%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>1 of 9</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          What's your biological sex?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This helps us calculate your metabolism more accurately.
        </Text>

        <View style={styles.options}>
          <Pressable
            style={[
              styles.option,
              {
                backgroundColor: selectedSex === 'male' ? colors.accent : colors.bgSecondary,
                borderColor: selectedSex === 'male' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setSelectedSex('male')}
          >
            <Ionicons
              name="male"
              size={48}
              color={selectedSex === 'male' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: selectedSex === 'male' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Male
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.option,
              {
                backgroundColor: selectedSex === 'female' ? colors.accent : colors.bgSecondary,
                borderColor: selectedSex === 'female' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setSelectedSex('female')}
          >
            <Ionicons
              name="female"
              size={48}
              color={selectedSex === 'female' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: selectedSex === 'female' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Female
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!selectedSex}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...typography.caption,
  },
  content: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[8],
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[8],
  },
  options: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  option: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  optionLabel: {
    ...typography.title.medium,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
