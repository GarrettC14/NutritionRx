import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { WeightUnit } from '@/repositories';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;
const MIN_KG = 30;
const MAX_KG = 300;

interface WeightInputSectionProps {
  /** Current input weight in kg (internal) */
  inputWeightKg: number | null;
  /** Called with weight in kg */
  onWeightChange: (weightKg: number) => void;
  /** User's unit preference */
  unit: WeightUnit;
  /** Previous reflection weight in kg, or null if first */
  lastReflectionWeightKg: number | null;
  /** Date string of last reflection */
  lastReflectionDate: string | null;
  /** Trend weight in kg */
  trendWeightKg: number | null;
  /** Whether this is the first reflection */
  isFirstReflection: boolean;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
}

function kgToDisplay(kg: number, unit: WeightUnit): string {
  if (unit === 'kg') return (Math.round(kg * 10) / 10).toString();
  return Math.round(kg * KG_TO_LBS).toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WeightInputSection({
  inputWeightKg,
  onWeightChange,
  unit,
  lastReflectionWeightKg,
  lastReflectionDate,
  trendWeightKg,
  isFirstReflection,
  autoFocus = true,
}: WeightInputSectionProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Initialize display value from inputWeightKg
  useEffect(() => {
    if (inputWeightKg != null) {
      setDisplayValue(kgToDisplay(inputWeightKg, unit));
    }
  }, []);

  // Auto-focus
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleChangeText = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimals
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned;

    setDisplayValue(sanitized);

    const numericValue = parseFloat(sanitized);
    if (!isNaN(numericValue) && numericValue > 0) {
      const kg = unit === 'kg' ? numericValue : numericValue * LBS_TO_KG;
      if (kg >= MIN_KG && kg <= MAX_KG) {
        onWeightChange(kg);
      }
    }
  };

  const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
  const minDisplay = unit === 'kg' ? MIN_KG : Math.round(MIN_KG * KG_TO_LBS);
  const maxDisplay = unit === 'kg' ? MAX_KG : Math.round(MAX_KG * KG_TO_LBS);

  // Validation
  const numVal = parseFloat(displayValue);
  const displayKg = !isNaN(numVal) ? (unit === 'kg' ? numVal : numVal * LBS_TO_KG) : null;
  const isValid = displayKg != null && displayKg >= MIN_KG && displayKg <= MAX_KG;
  const showError = displayValue.length > 0 && !isValid && !isFocused;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        Your weight this week
      </Text>

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: showError ? colors.error : isFocused ? colors.accent : colors.borderDefault,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.textPrimary }]}
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Enter weight"
          placeholderTextColor={colors.textTertiary}
          keyboardType="decimal-pad"
          returnKeyType="done"
          accessibilityLabel={`Enter your current weight in ${unitLabel}`}
        />
        <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>
          {unitLabel}
        </Text>
      </View>

      {showError && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          Enter a weight between {minDisplay} and {maxDisplay} {unitLabel}
        </Text>
      )}

      {/* Context lines */}
      <View style={styles.contextLines}>
        {isFirstReflection ? (
          <Text style={[styles.contextText, { color: colors.textTertiary }]}>
            This is your first reflection!
          </Text>
        ) : (
          <>
            {lastReflectionWeightKg != null && lastReflectionDate && (
              <Text style={[styles.contextText, { color: colors.textTertiary }]}>
                Last reflection: {kgToDisplay(lastReflectionWeightKg, unit)} {unitLabel}
                {' '}({formatDate(lastReflectionDate)})
              </Text>
            )}
            {trendWeightKg != null && (
              <Text style={[styles.contextText, { color: colors.textTertiary }]}>
                Your trend: ~{kgToDisplay(trendWeightKg, unit)} {unitLabel}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  label: {
    ...typography.title.small,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
  },
  input: {
    flex: 1,
    ...typography.title.large,
    paddingVertical: spacing[4],
  },
  unitLabel: {
    ...typography.body.large,
    fontWeight: '500',
    marginLeft: spacing[2],
  },
  errorText: {
    ...typography.caption,
  },
  contextLines: {
    gap: spacing[1],
    marginTop: spacing[1],
  },
  contextText: {
    ...typography.body.small,
  },
});
