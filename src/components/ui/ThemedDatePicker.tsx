/**
 * ThemedDatePicker — Custom calendar modal styled to match the app theme.
 *
 * Replaces the native OS date picker with a fully themed calendar grid
 * supporting light/dark mode, rounded corners, and the app's color palette.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius, shadows } from '@/constants/spacing';

// ─── Helpers ──────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

function getCalendarGrid(
  year: number,
  month: number,
  selectedDate: Date,
  today: Date,
  maxDate?: Date,
  minDate?: Date,
): CalendarDay[][] {
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month days to fill the first row
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Fill leading days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    days.push({
      date: d,
      day: prevMonthDays - i,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      isSelected: isSameDay(d, selectedDate),
      isDisabled: isDateDisabled(d, maxDate, minDate),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      day: i,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      isSelected: isSameDay(d, selectedDate),
      isDisabled: isDateDisabled(d, maxDate, minDate),
    });
  }

  // Fill trailing days from next month
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        day: i,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isSelected: isSameDay(d, selectedDate),
        isDisabled: isDateDisabled(d, maxDate, minDate),
      });
    }
  }

  // Group into weeks
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

function isDateDisabled(d: Date, maxDate?: Date, minDate?: Date): boolean {
  if (maxDate) {
    const max = new Date(maxDate);
    max.setHours(23, 59, 59, 999);
    if (d > max) return true;
  }
  if (minDate) {
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    if (d < min) return true;
  }
  return false;
}

// ─── Props ────────────────────────────────────────────────────────

export interface ThemedDatePickerProps {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

// ─── Component ────────────────────────────────────────────────────

export function ThemedDatePicker({
  visible,
  value,
  onSelect,
  onClose,
  maximumDate,
  minimumDate,
}: ThemedDatePickerProps) {
  const { colors, colorScheme } = useTheme();
  const today = useMemo(() => new Date(), []);

  // View state — which month/year is displayed
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  // Reset view when picker opens with a new value
  React.useEffect(() => {
    if (visible) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [visible, value]);

  const weeks = useMemo(
    () => getCalendarGrid(viewYear, viewMonth, value, today, maximumDate, minimumDate),
    [viewYear, viewMonth, value, today, maximumDate, minimumDate],
  );

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    // Don't go beyond max date's month
    if (maximumDate) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      if (
        nextYear > maximumDate.getFullYear() ||
        (nextYear === maximumDate.getFullYear() && nextMonth > maximumDate.getMonth())
      ) {
        return;
      }
    }
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, [viewMonth, viewYear, maximumDate]);

  const handleDayPress = useCallback(
    (day: CalendarDay) => {
      if (day.isDisabled) return;
      onSelect(day.date);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleTodayPress = useCallback(() => {
    if (maximumDate && today > maximumDate) return;
    if (minimumDate && today < minimumDate) return;
    onSelect(today);
    onClose();
  }, [today, maximumDate, minimumDate, onSelect, onClose]);

  const shadowStyle = shadows[colorScheme]?.lg ?? shadows.dark.lg;

  // Check if "next" arrow should be disabled
  const isNextDisabled = useMemo(() => {
    if (!maximumDate) return false;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    return (
      nextYear > maximumDate.getFullYear() ||
      (nextYear === maximumDate.getFullYear() && nextMonth > maximumDate.getMonth())
    );
  }, [viewMonth, viewYear, maximumDate]);

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
          {/* Month/Year header with navigation arrows */}
          <View style={styles.monthHeader}>
            <Pressable
              onPress={goToPrevMonth}
              hitSlop={12}
              style={[styles.navButton, { backgroundColor: colors.bgInteractive }]}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </Pressable>

            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>

            <Pressable
              onPress={goToNextMonth}
              hitSlop={12}
              style={[
                styles.navButton,
                { backgroundColor: colors.bgInteractive },
                isNextDisabled && { opacity: 0.3 },
              ]}
              disabled={isNextDisabled}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Day-of-week labels */}
          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((label) => (
              <View key={label} style={styles.dayLabelCell}>
                <Text style={[styles.dayLabelText, { color: colors.textTertiary }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  const isSelected = day.isSelected;
                  const isToday = day.isToday && !isSelected;

                  return (
                    <Pressable
                      key={di}
                      style={[
                        styles.dayCell,
                        isSelected && [styles.dayCellSelected, { backgroundColor: colors.accent }],
                        isToday && [styles.dayCellToday, { borderColor: colors.accent }],
                      ]}
                      onPress={() => handleDayPress(day)}
                      disabled={day.isDisabled}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: colors.textPrimary },
                          !day.isCurrentMonth && { color: colors.textDisabled },
                          day.isDisabled && { color: colors.textDisabled, opacity: 0.4 },
                          isSelected && styles.dayTextSelected,
                          isToday && { color: colors.accent, fontWeight: '700' },
                        ]}
                      >
                        {day.day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Footer: Today shortcut + Cancel */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleTodayPress}
              style={[styles.todayButton, { backgroundColor: colors.bgInteractive }]}
            >
              <Text style={[styles.todayText, { color: colors.accent }]}>Today</Text>
            </Pressable>

            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const CELL_SIZE = 40;

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
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...typography.title.medium,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  dayLabelText: {
    ...typography.caption,
    fontWeight: '600',
  },
  grid: {
    gap: spacing[1],
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: CELL_SIZE,
    borderRadius: borderRadius.full,
  },
  dayCellSelected: {
    borderRadius: borderRadius.full,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
  },
  dayText: {
    ...typography.body.small,
    fontWeight: '500',
    textAlign: 'center',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
    paddingTop: spacing[3],
  },
  todayButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  todayText: {
    ...typography.body.small,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  cancelText: {
    ...typography.body.small,
    fontWeight: '500',
  },
});
