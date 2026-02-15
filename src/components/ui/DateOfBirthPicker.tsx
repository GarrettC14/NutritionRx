/**
 * DateOfBirthPicker — Year → Month → Day drill-down date picker.
 *
 * Designed specifically for date-of-birth selection where a traditional
 * calendar grid would require scrolling through hundreds of months.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius, shadows } from '@/constants/spacing';

// ─── Constants ────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type Step = 'year' | 'month' | 'day';

// ─── Props ────────────────────────────────────────────────────────

export interface DateOfBirthPickerProps {
  visible: boolean;
  value: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

// ─── Component ────────────────────────────────────────────────────

export function DateOfBirthPicker({
  visible,
  value,
  onSelect,
  onClose,
  maximumDate,
  minimumDate,
}: DateOfBirthPickerProps) {
  const { colors, colorScheme } = useTheme();

  // Default to 30 years ago when no value provided
  const defaultYear = useMemo(() => new Date().getFullYear() - 30, []);

  const [step, setStep] = useState<Step>('year');
  const [selectedYear, setSelectedYear] = useState<number | null>(
    value?.getFullYear() ?? defaultYear,
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    value != null ? value.getMonth() : 0,
  );

  // Reset to year step when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedYear(value?.getFullYear() ?? defaultYear);
      setSelectedMonth(value != null ? value.getMonth() : 0);
      setStep('year');
    }
  }, [visible, defaultYear]);

  const today = useMemo(() => new Date(), []);
  const maxDate = maximumDate ?? today;
  const minYear = minimumDate ? minimumDate.getFullYear() : 1920;
  const maxYear = maxDate.getFullYear();

  // ─── Year list (newest first) ─────────────────────────────────

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  // ─── Month list ───────────────────────────────────────────────

  const months = useMemo(() => {
    if (selectedYear == null) return [];
    return MONTH_NAMES.map((name, i) => {
      // Disable months beyond max date
      let disabled = false;
      if (selectedYear === maxDate.getFullYear() && i > maxDate.getMonth()) {
        disabled = true;
      }
      if (minimumDate && selectedYear === minimumDate.getFullYear() && i < minimumDate.getMonth()) {
        disabled = true;
      }
      return { index: i, name, short: MONTH_SHORT[i], disabled };
    });
  }, [selectedYear, maxDate, minimumDate]);

  // ─── Day list ─────────────────────────────────────────────────

  const days = useMemo(() => {
    if (selectedYear == null || selectedMonth == null) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const list: { day: number; disabled: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedYear, selectedMonth, d);
      let disabled = false;
      if (date > maxDate) disabled = true;
      if (minimumDate && date < minimumDate) disabled = true;
      list.push({ day: d, disabled });
    }
    return list;
  }, [selectedYear, selectedMonth, maxDate, minimumDate]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleYearSelect = useCallback((year: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedYear(year);
    setStep('month');
  }, []);

  const handleMonthSelect = useCallback((month: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedMonth(month);
    setStep('day');
  }, []);

  const handleDaySelect = useCallback(
    (day: number) => {
      if (selectedYear == null || selectedMonth == null) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const date = new Date(selectedYear, selectedMonth, day);
      onSelect(date);
      onClose();
    },
    [selectedYear, selectedMonth, onSelect, onClose],
  );

  const handleBack = useCallback(() => {
    if (step === 'day') setStep('month');
    else if (step === 'month') setStep('year');
  }, [step]);

  const handleDone = useCallback(() => {
    const year = selectedYear ?? defaultYear;
    const month = selectedMonth ?? 0;
    const day = value?.getDate() ?? 1;
    const date = new Date(year, month, day);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect(date);
    onClose();
  }, [selectedYear, selectedMonth, defaultYear, value, onSelect, onClose]);

  const shadowStyle = shadows[colorScheme]?.lg ?? shadows.dark.lg;

  // ─── Header text ──────────────────────────────────────────────

  const headerText = useMemo(() => {
    if (step === 'year') return 'Select year';
    if (step === 'month' && selectedYear != null) return `Select month`;
    if (step === 'day' && selectedYear != null && selectedMonth != null) {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
    return 'Select date';
  }, [step, selectedYear, selectedMonth]);

  const breadcrumb = useMemo(() => {
    if (step === 'month' && selectedYear != null) return String(selectedYear);
    if (step === 'day' && selectedYear != null && selectedMonth != null) {
      return `${selectedYear} > ${MONTH_SHORT[selectedMonth]}`;
    }
    return null;
  }, [step, selectedYear, selectedMonth]);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.bgElevated }, shadowStyle]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            {step !== 'year' ? (
              <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </Pressable>
            ) : (
              <View style={styles.backButton} />
            )}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {headerText}
              </Text>
              {breadcrumb && (
                <Text style={[styles.breadcrumb, { color: colors.textTertiary }]}>
                  {breadcrumb}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Content */}
          {step === 'year' && (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.yearGrid}
              showsVerticalScrollIndicator={false}
            >
              {years.map((year) => {
                const isSelected = year === value?.getFullYear();
                return (
                  <Pressable
                    key={year}
                    style={[
                      styles.yearCell,
                      { backgroundColor: colors.bgSecondary },
                      isSelected && { backgroundColor: colors.accent },
                    ]}
                    onPress={() => handleYearSelect(year)}
                  >
                    <Text
                      style={[
                        styles.yearText,
                        { color: colors.textPrimary },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {step === 'month' && (
            <View style={styles.monthGrid}>
              {months.map((m) => {
                const isSelected =
                  m.index === value?.getMonth() &&
                  selectedYear === value?.getFullYear();
                return (
                  <Pressable
                    key={m.index}
                    style={[
                      styles.monthCell,
                      { backgroundColor: colors.bgSecondary },
                      isSelected && { backgroundColor: colors.accent },
                      m.disabled && { opacity: 0.3 },
                    ]}
                    onPress={() => !m.disabled && handleMonthSelect(m.index)}
                    disabled={m.disabled}
                  >
                    <Text
                      style={[
                        styles.monthText,
                        { color: colors.textPrimary },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {m.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 'day' && (
            <View style={styles.dayGrid}>
              {days.map((d) => {
                const isSelected =
                  d.day === value?.getDate() &&
                  selectedMonth === value?.getMonth() &&
                  selectedYear === value?.getFullYear();
                return (
                  <Pressable
                    key={d.day}
                    style={[
                      styles.dayCell,
                      { backgroundColor: colors.bgSecondary },
                      isSelected && { backgroundColor: colors.accent },
                      d.disabled && { opacity: 0.3 },
                    ]}
                    onPress={() => !d.disabled && handleDaySelect(d.day)}
                    disabled={d.disabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: colors.textPrimary },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {d.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Done button — confirms current selection */}
          <Pressable
            onPress={handleDone}
            style={[styles.doneButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.title.medium,
  },
  breadcrumb: {
    ...typography.caption,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Year grid — scrollable, 3 columns
  scrollArea: {
    maxHeight: 320,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  yearCell: {
    width: '31%',
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  yearText: {
    ...typography.body.medium,
    fontWeight: '500',
  },

  // Month grid — 3 columns, no scroll needed
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  monthCell: {
    width: '31%',
    paddingVertical: spacing[4],
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  monthText: {
    ...typography.body.medium,
    fontWeight: '500',
  },

  // Day grid — 7 columns
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  doneButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  doneText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
