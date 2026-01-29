import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
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

  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(300, { duration: 150 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

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
    cancelLabel = 'Cancel',
    confirmStyle = 'default',
  } = config;

  const isDestructive = confirmStyle === 'destructive';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={styles.overlayPress} onPress={handleCancel}>
          <Animated.View
            style={[
              styles.card,
              cardStyle,
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
              <View style={styles.actions}>
                <Pressable
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
                <Pressable
                  style={[
                    styles.actionButton,
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
          </Animated.View>
        </Pressable>
      </Animated.View>
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
  actionButton: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    minWidth: 100,
  },
  actionText: {
    ...typography.body.medium,
    fontWeight: '600',
    textAlign: 'center',
  },
});
