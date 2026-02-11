import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useTooltipContext, TooltipAction } from '@/contexts/TooltipContext';
import { TestIDs } from '@/constants/testIDs';

export function TooltipModal() {
  const { colors } = useTheme();
  const { activeTooltip, hideTooltip } = useTooltipContext();

  const handleAction = (action: TooltipAction) => {
    hideTooltip();
    action.onPress();
  };

  const handleDefaultDismiss = () => {
    hideTooltip();
  };

  if (!activeTooltip) {
    return null;
  }

  const { icon, content, actions, position = 'center' } = activeTooltip;

  // Default action if none provided
  const displayActions: TooltipAction[] = actions || [
    { label: 'Got it', onPress: () => {}, primary: true },
  ];

  return (
    <Modal
      testID={TestIDs.UI.TooltipModal}
      visible={!!activeTooltip}
      transparent
      animationType="none"
      onRequestClose={handleDefaultDismiss}
    >
      <View style={styles.overlay}>
        <Pressable testID={TestIDs.UI.TooltipDismiss} style={styles.overlayPress} onPress={handleDefaultDismiss} accessibilityRole="button" accessibilityLabel="Dismiss tooltip">
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgElevated,
              },
              position === 'top' && styles.cardTop,
              position === 'bottom' && styles.cardBottom,
              position === 'center' && styles.cardCenter,
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Icon */}
              {icon && <View style={styles.iconContainer}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={40} color={colors.textPrimary} /></View>}

              {/* Content */}
              <Text style={[styles.content, { color: colors.textPrimary }]}>
                {content}
              </Text>

              {/* Actions */}
              <View style={styles.actions}>
                {displayActions.map((action, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.actionButton,
                      action.primary
                        ? { backgroundColor: colors.accent }
                        : { backgroundColor: 'transparent' },
                    ]}
                    onPress={() => handleAction(action)}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: action.primary
                            ? '#FFFFFF'
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
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
  },
  cardTop: {
    position: 'absolute',
    top: spacing[8],
  },
  cardBottom: {
    position: 'absolute',
    bottom: spacing[8],
  },
  cardCenter: {},
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  content: {
    ...typography.body.large,
    textAlign: 'center',
    marginBottom: spacing[5],
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
  },
  actionButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
    minWidth: 100,
  },
  actionText: {
    ...typography.body.medium,
    fontWeight: '600',
    textAlign: 'center',
  },
});
