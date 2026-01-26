import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useProfileStore, useSettingsStore } from '@/stores';
import { ActivityLevel, Sex } from '@/types/domain';
import { ACTIVITY_OPTIONS } from '@/constants/defaults';

const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

const feetInchesToCm = (feet: number, inches: number): number => {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54);
};

export default function ProfileSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, updateProfile, isLoading, loadProfile } = useProfileStore();
  const { settings } = useSettingsStore();

  const [sex, setSex] = useState<Sex | undefined>(profile?.sex);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(profile?.dateOfBirth);
  const [heightCm, setHeightCm] = useState(profile?.heightCm || 170);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>(
    profile?.activityLevel
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [useFeetInches, setUseFeetInches] = useState(settings.weightUnit === 'lbs');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setSex(profile.sex);
      setDateOfBirth(profile.dateOfBirth);
      setHeightCm(profile.heightCm || 170);
      setActivityLevel(profile.activityLevel);
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        sex,
        dateOfBirth,
        heightCm,
        activityLevel,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleHeightAdjust = (delta: number) => {
    const newHeight = Math.max(100, Math.min(250, heightCm + delta));
    setHeightCm(newHeight);
  };

  const getAge = (): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  };

  const formatHeight = (): string => {
    if (useFeetInches) {
      const { feet, inches } = cmToFeetInches(heightCm);
      return `${feet}'${inches}"`;
    }
    return `${heightCm} cm`;
  };

  const getActivityLabel = (): string => {
    const option = ACTIVITY_OPTIONS.find(o => o.value === activityLevel);
    return option?.label || 'Not set';
  };

  const getActivityDescription = (): string => {
    const option = ACTIVITY_OPTIONS.find(o => o.value === activityLevel);
    return option?.description || '';
  };

  const sexOptions: { value: Sex; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'male', label: 'Male', icon: 'male' },
    { value: 'female', label: 'Female', icon: 'female' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Profile',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* View Mode */}
          {!isEditing ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                YOUR PROFILE
              </Text>
              <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>Sex</Text>
                  <Text style={[styles.profileValue, { color: colors.textPrimary }]}>
                    {sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : 'Not set'}
                  </Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>Age</Text>
                  <Text style={[styles.profileValue, { color: colors.textPrimary }]}>
                    {getAge() ? `${getAge()} years old` : 'Not set'}
                  </Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>Height</Text>
                  <Text style={[styles.profileValue, { color: colors.textPrimary }]}>
                    {formatHeight()}
                  </Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                    Activity Level
                  </Text>
                  <Text style={[styles.profileValue, { color: colors.textPrimary }]}>
                    {getActivityLabel()}
                  </Text>
                </View>

                <Button
                  label="Edit Profile"
                  variant="secondary"
                  onPress={() => setIsEditing(true)}
                  fullWidth
                />
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.bgInteractive }]}>
                <Ionicons name="information-circle" size={20} color={colors.accent} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Your profile is used to calculate your daily calorie and macro targets. Keeping it
                  up to date helps ensure accurate recommendations.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Edit Mode */}
              {/* Sex Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SEX</Text>
                <View style={styles.optionRow}>
                  {sexOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.sexOption,
                        {
                          backgroundColor:
                            sex === option.value ? colors.accent + '20' : colors.bgSecondary,
                          borderColor: sex === option.value ? colors.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setSex(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={sex === option.value ? colors.accent : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.sexLabel,
                          {
                            color: sex === option.value ? colors.accent : colors.textPrimary,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Birthday */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BIRTHDAY</Text>
                <Pressable
                  style={[styles.dateButton, { backgroundColor: colors.bgSecondary }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={24} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                    {dateOfBirth
                      ? dateOfBirth.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Select your birthday'}
                  </Text>
                  {getAge() && (
                    <Text style={[styles.ageText, { color: colors.textSecondary }]}>
                      {getAge()} years old
                    </Text>
                  )}
                </Pressable>
                {showDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={dateOfBirth || new Date(1990, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1920, 0, 1)}
                      textColor={colors.textPrimary}
                    />
                    {Platform.OS === 'ios' && (
                      <Button
                        label="Done"
                        variant="secondary"
                        onPress={() => setShowDatePicker(false)}
                        style={{ marginTop: spacing[3] }}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Height */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HEIGHT</Text>
                  <Pressable onPress={() => setUseFeetInches(!useFeetInches)}>
                    <Text style={[styles.unitToggle, { color: colors.accent }]}>
                      {useFeetInches ? 'Use cm' : 'Use ft/in'}
                    </Text>
                  </Pressable>
                </View>
                <View style={[styles.heightCard, { backgroundColor: colors.bgSecondary }]}>
                  <View style={styles.heightControls}>
                    <Pressable
                      style={[styles.heightButton, { backgroundColor: colors.bgInteractive }]}
                      onPress={() => handleHeightAdjust(useFeetInches ? -3 : -1)}
                    >
                      <Ionicons name="remove" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <View style={styles.heightDisplay}>
                      <Text style={[styles.heightValue, { color: colors.textPrimary }]}>
                        {formatHeight()}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.heightButton, { backgroundColor: colors.bgInteractive }]}
                      onPress={() => handleHeightAdjust(useFeetInches ? 3 : 1)}
                    >
                      <Ionicons name="add" size={24} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Activity Level */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  ACTIVITY LEVEL
                </Text>
                <View style={styles.activityOptions}>
                  {ACTIVITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.activityOption,
                        {
                          backgroundColor:
                            activityLevel === option.value
                              ? colors.accent + '20'
                              : colors.bgSecondary,
                          borderColor:
                            activityLevel === option.value ? colors.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setActivityLevel(option.value as ActivityLevel)}
                    >
                      <View style={styles.activityContent}>
                        <Text
                          style={[
                            styles.activityLabel,
                            {
                              color:
                                activityLevel === option.value
                                  ? colors.accent
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>
                          {option.description}
                        </Text>
                      </View>
                      {activityLevel === option.value && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        {isEditing && (
          <View style={styles.footer}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setIsEditing(false)}
              fullWidth
              style={{ marginBottom: spacing[3] }}
            />
            <Button label="Save Changes" onPress={handleSave} loading={isLoading} fullWidth />
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: componentSpacing.screenEdgePadding,
    gap: spacing[6],
    paddingBottom: spacing[8],
  },
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  profileLabel: {
    ...typography.body.medium,
  },
  profileValue: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  sexOption: {
    flex: 1,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 2,
  },
  sexLabel: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  dateText: {
    ...typography.body.medium,
    flex: 1,
  },
  ageText: {
    ...typography.body.small,
  },
  datePickerContainer: {
    marginTop: spacing[2],
  },
  unitToggle: {
    ...typography.body.small,
    fontWeight: '600',
  },
  heightCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  heightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  heightButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heightDisplay: {
    minWidth: 100,
    alignItems: 'center',
  },
  heightValue: {
    ...typography.metric.large,
  },
  activityOptions: {
    gap: spacing[3],
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing[3],
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  activityDescription: {
    ...typography.body.small,
  },
  footer: {
    padding: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
});
