/**
 * NutrientTargetEditor
 * Modal for editing custom nutrient targets
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientDefinition, NutrientTarget } from '@/types/micronutrients';
import { useMicronutrientStore } from '@/stores/micronutrientStore';
import { Button } from '@/components/ui';

interface NutrientTargetEditorProps {
  visible: boolean;
  nutrient: NutrientDefinition | null;
  currentTarget: NutrientTarget | null;
  onClose: () => void;
}

export function NutrientTargetEditor({
  visible,
  nutrient,
  currentTarget,
  onClose,
}: NutrientTargetEditorProps) {
  const { colors } = useTheme();
  const setCustomTarget = useMicronutrientStore(s => s.setCustomTarget);
  const removeCustomTarget = useMicronutrientStore(s => s.removeCustomTarget);

  const upperLimitRef = useRef<TextInput>(null);

  const [targetValue, setTargetValue] = useState('');
  const [upperLimitValue, setUpperLimitValue] = useState('');

  useEffect(() => {
    if (visible && currentTarget) {
      setTargetValue(String(currentTarget.targetAmount));
      setUpperLimitValue(currentTarget.upperLimit ? String(currentTarget.upperLimit) : '');
    }
  }, [visible, currentTarget]);

  if (!nutrient) return null;

  const defaultTarget = currentTarget && !currentTarget.isCustom
    ? currentTarget.targetAmount
    : null;

  const handleSave = async () => {
    const targetAmount = parseFloat(targetValue);
    if (isNaN(targetAmount) || targetAmount < 1) return;

    const upperLimit = parseFloat(upperLimitValue);
    await setCustomTarget(nutrient.id, {
      targetAmount,
      upperLimit: isNaN(upperLimit) ? undefined : upperLimit,
    });
    onClose();
  };

  const handleReset = async () => {
    await removeCustomTarget(nutrient.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.bgElevated }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Edit Target: {nutrient.shortName}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Daily Target
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="decimal-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => upperLimitRef.current?.focus()}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.unit, { color: colors.textTertiary }]}>
                {nutrient.unit}
              </Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Max Threshold (optional)
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={upperLimitRef}
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}
                value={upperLimitValue}
                onChangeText={setUpperLimitValue}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                placeholder="—"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.unit, { color: colors.textTertiary }]}>
                {nutrient.unit}
              </Text>
            </View>
          </View>

          {defaultTarget && (
            <Text style={[styles.defaultNote, { color: colors.textTertiary }]}>
              Default (DRI): {defaultTarget} {nutrient.unit}
            </Text>
          )}

          <View style={styles.buttons}>
            {currentTarget?.isCustom && (
              <Button
                label="Reset to Default"
                variant="ghost"
                size="sm"
                onPress={handleReset}
              />
            )}
            <View style={styles.buttonRow}>
              <Button
                label="Cancel"
                variant="secondary"
                size="md"
                onPress={onClose}
              />
              <Button
                label="Save"
                variant="primary"
                size="md"
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: spacing[4],
  },
  container: {
    width: '100%',
    maxWidth: Math.min(Dimensions.get('window').width * 0.85, 480),
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    gap: spacing[4],
  },
  title: {
    ...typography.title.medium,
  },
  field: {
    gap: spacing[1],
  },
  label: {
    ...typography.body.small,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    ...typography.body.large,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  unit: {
    ...typography.body.medium,
    minWidth: 30,
  },
  defaultNote: {
    ...typography.caption,
  },
  buttons: {
    gap: spacing[2],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});
