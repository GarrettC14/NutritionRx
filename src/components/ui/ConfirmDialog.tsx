import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { TestIDs } from '@/constants/testIDs';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string | null; // Pass null to hide cancel button (for info dialogs)
  confirmStyle?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmDialogProps {
  visible: boolean;
  config: ConfirmDialogConfig | null;
  onDismiss: () => void;
}

export function ConfirmDialog({ visible, config, onDismiss }: ConfirmDialogProps) {
  const { colors } = useTheme();

  const handleConfirm = () => {
    onDismiss();
    config?.onConfirm();
  };

  const handleCancel = () => {
    onDismiss();
    config?.onCancel?.();
  };

  if (!config) {
    return null;
  }

  const {
    title,
    message,
    icon,
    confirmLabel = 'Confirm',
    cancelLabel,
    confirmStyle = 'default',
  } = config;

  const isDestructive = confirmStyle === 'destructive';
  const showCancelButton = cancelLabel !== null;

  return (
    <Modal
      testID={TestIDs.UI.ConfirmDialog}
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPress} onPress={handleCancel}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgElevated,
                shadowColor: colors.textPrimary,
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Icon */}
              {icon && <Text style={styles.icon}>{icon}</Text>}

              {/* Title */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {title}
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message}
              </Text>

              {/* Actions */}
              <View style={[styles.actions, !showCancelButton && styles.singleAction]}>
                {showCancelButton && (
                  <Pressable
                    testID={TestIDs.UI.ConfirmDialogCancel}
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.bgInteractive },
                    ]}
                    onPress={handleCancel}
                  >
                    <Text
                      style={[styles.actionText, { color: colors.textPrimary }]}
                    >
                      {cancelLabel}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  testID={TestIDs.UI.ConfirmDialogConfirm}
                  style={[
                    styles.actionButton,
                    !showCancelButton && styles.singleActionButton,
                    {
                      backgroundColor: isDestructive
                        ? colors.error
                        : colors.accent,
                    },
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={[styles.actionText, { color: '#FFFFFF' }]}>
                    {confirmLabel}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayPress: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typography.title.medium,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  message: {
    ...typography.body.medium,
    textAlign: 'center',
    marginBottom: spacing[5],
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
  },
  singleAction: {
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    minWidth: 100,
  },
  singleActionButton: {
    flex: 0,
    minWidth: 140,
  },
  actionText: {
    ...typography.body.medium,
    fontWeight: '600',
    textAlign: 'center',
  },
});
