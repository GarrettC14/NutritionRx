import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores';

export default function BirthdayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { updateProfile } = useProfileStore();

  // Default to 30 years ago
  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 30);

  const [date, setDate] = useState(defaultDate);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(date);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleContinue = async () => {
    const dateStr = date.toISOString().split('T')[0];
    await updateProfile({ dateOfBirth: dateStr });
    router.push('/onboarding/height');
  };

  const isValid = age >= 13 && age <= 120;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '22%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>2 of 9</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          When were you born?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your age affects your metabolic rate calculation.
        </Text>

        <View style={[styles.ageDisplay, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.ageValue, { color: colors.textPrimary }]}>{age}</Text>
          <Text style={[styles.ageLabel, { color: colors.textSecondary }]}>years old</Text>
        </View>

        {Platform.OS === 'android' && !showPicker && (
          <Pressable
            style={[styles.dateButton, { backgroundColor: colors.bgSecondary }]}
            onPress={() => setShowPicker(true)}
          >
            <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Pressable>
        )}

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            themeVariant="dark"
            style={styles.picker}
          />
        )}

        {!isValid && (
          <Text style={[styles.warning, { color: colors.warning }]}>
            Please enter a valid age (13-120 years)
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!isValid}
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
    alignItems: 'center',
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
    alignSelf: 'flex-start',
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[8],
    alignSelf: 'flex-start',
  },
  ageDisplay: {
    alignItems: 'center',
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    marginBottom: spacing[6],
  },
  ageValue: {
    ...typography.metric.large,
  },
  ageLabel: {
    ...typography.body.large,
    marginTop: spacing[1],
  },
  dateButton: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  dateButtonText: {
    ...typography.body.large,
  },
  picker: {
    width: '100%',
  },
  warning: {
    ...typography.body.medium,
    marginTop: spacing[4],
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
