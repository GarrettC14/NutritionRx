import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useWeightStore, useSettingsStore } from '@/stores';
import { Button } from '@/components/ui/Button';

// Convert kg to lbs
const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
// Convert lbs to kg
const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;

export default function LogWeightScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { addEntry, latestEntry, loadLatest, getEntryByDate } = useWeightStore();
  const { settings } = useSettingsStore();

  const isLbs = settings.weightUnit === 'lbs';

  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);

  // Track if we've initialized the weight to prevent re-setting on store updates
  const hasInitialized = useRef(false);

  const today = new Date().toISOString().split('T')[0];

  // Load latest weight and check for existing entry - only initialize once
  useEffect(() => {
    const loadData = async () => {
      if (hasInitialized.current) return;

      await loadLatest();
      const existing = await getEntryByDate(today);

      if (existing) {
        setExistingEntry(existing);
        const displayWeight = isLbs ? kgToLbs(existing.weightKg) : existing.weightKg;
        setWeight(displayWeight.toFixed(1));
        setNotes(existing.notes || '');
        hasInitialized.current = true;
      } else {
        // Get latest from store after loading
        const store = useWeightStore.getState();
        if (store.latestEntry) {
          const displayWeight = isLbs ? kgToLbs(store.latestEntry.weightKg) : store.latestEntry.weightKg;
          setWeight(displayWeight.toFixed(1));
        }
        hasInitialized.current = true;
      }
    };
    loadData();
  }, []);

  const handleWeightChange = (value: string) => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setWeight(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setWeight(cleaned);
    }
  };

  const handleIncrement = (amount: number) => {
    const current = parseFloat(weight) || 0;
    const newValue = Math.max(0, current + amount);
    setWeight(newValue.toFixed(1));
  };

  const handleSave = async () => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) return;

    setIsSaving(true);
    try {
      const weightKg = isLbs ? lbsToKg(weightValue) : weightValue;
      await addEntry({
        date: today,
        weightKg,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save weight:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const weightNum = parseFloat(weight) || 0;
  const isValid = weightNum > 0 && weightNum < 1000;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {existingEntry ? 'Update Weight' : 'Log Weight'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Date */}
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {/* Weight Input */}
          <View style={[styles.weightCard, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.weightInputRow}>
              <Pressable
                style={[styles.adjustButton, { backgroundColor: colors.bgInteractive }]}
                onPress={() => handleIncrement(-0.5)}
              >
                <Ionicons name="remove" size={24} color={colors.textPrimary} />
              </Pressable>

              <View style={styles.weightDisplay}>
                <TextInput
                  style={[styles.weightInput, { color: colors.textPrimary }]}
                  value={weight}
                  onChangeText={handleWeightChange}
                  keyboardType="decimal-pad"
                  placeholder={isLbs ? '150.0' : '68.0'}
                  placeholderTextColor={colors.textTertiary}
                  selectTextOnFocus
                  autoFocus
                />
                <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>
                  {isLbs ? 'lbs' : 'kg'}
                </Text>
              </View>

              <Pressable
                style={[styles.adjustButton, { backgroundColor: colors.bgInteractive }]}
                onPress={() => handleIncrement(0.5)}
              >
                <Ionicons name="add" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Quick adjust buttons */}
            <View style={styles.quickAdjustRow}>
              {[-1, -0.5, 0.5, 1].map((amount) => (
                <Pressable
                  key={amount}
                  style={[styles.quickAdjustButton, { borderColor: colors.borderDefault }]}
                  onPress={() => handleIncrement(amount)}
                >
                  <Text style={[styles.quickAdjustText, { color: colors.textSecondary }]}>
                    {amount > 0 ? '+' : ''}
                    {amount}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.notesCard, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
              Notes (optional)
            </Text>
            <TextInput
              style={[styles.notesInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., After morning workout..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Previous Weight */}
          {latestEntry && !existingEntry && (
            <View style={styles.previousWeight}>
              <Text style={[styles.previousLabel, { color: colors.textTertiary }]}>
                Previous weight:{' '}
                <Text style={{ color: colors.textSecondary }}>
                  {isLbs
                    ? `${kgToLbs(latestEntry.weightKg).toFixed(1)} lbs`
                    : `${latestEntry.weightKg.toFixed(1)} kg`}
                </Text>
                {' on '}
                {new Date(latestEntry.date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {/* Update notice */}
          {existingEntry && (
            <View style={styles.updateNotice}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.updateNoticeText, { color: colors.textTertiary }]}>
                You already logged weight today. Saving will update that entry.
              </Text>
            </View>
          )}
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            label={existingEntry ? 'Update Weight' : 'Save Weight'}
            onPress={handleSave}
            loading={isSaving}
            disabled={!isValid}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.title.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  dateText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  weightCard: {
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    gap: spacing[4],
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  adjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  weightInput: {
    ...typography.metric.large,
    textAlign: 'center',
    minWidth: 100,
  },
  weightUnit: {
    ...typography.title.large,
  },
  quickAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
  },
  quickAdjustButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quickAdjustText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  notesCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  notesLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    minHeight: 60,
    textAlignVertical: 'top',
  },
  previousWeight: {
    alignItems: 'center',
  },
  previousLabel: {
    ...typography.body.small,
  },
  updateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  updateNoticeText: {
    ...typography.caption,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
