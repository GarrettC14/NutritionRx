/**
 * DatePickerModal — Wraps ThemedDatePicker with a title and confirm/cancel actions.
 * Used for "Copy Meal..." and "Copy Day..." flows where the user picks a target date.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius, shadows } from '@/constants/spacing';
import { ThemedDatePicker } from '@/components/ui/ThemedDatePicker';

export interface DatePickerModalProps {
  visible: boolean;
  title: string;
  initialDate?: Date;
  disabledDate?: string; // YYYY-MM-DD — source date cannot be selected
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export function DatePickerModal({
  visible,
  title,
  initialDate,
  disabledDate,
  onConfirm,
  onCancel,
}: DatePickerModalProps) {
  // Default to tomorrow if no initial date provided
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ?? getDefaultDate());

  // Reset selected date when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate ?? getDefaultDate());
    }
  }, [visible, initialDate]);

  const handleSelect = (date: Date) => {
    // Check if the selected date matches the disabled date
    if (disabledDate) {
      const selectedStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (selectedStr === disabledDate) {
        return; // Don't allow selecting the source date
      }
    }
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  // ThemedDatePicker manages its own modal, so we use it directly
  // but we need to manage the flow: visible controls our wrapper,
  // and ThemedDatePicker's onSelect triggers our selection
  return (
    <ThemedDatePicker
      visible={visible}
      value={selectedDate}
      onSelect={(date) => {
        // Check disabled date before confirming
        if (disabledDate) {
          const selectedStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          if (selectedStr === disabledDate) {
            return;
          }
        }
        onConfirm(date);
      }}
      onClose={onCancel}
    />
  );
}
