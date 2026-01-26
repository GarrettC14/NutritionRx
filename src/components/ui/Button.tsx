import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  children?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  textStyle,
  onPress,
  ...props
}: ButtonProps) {
  const buttonText = children ?? label ?? '';
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.bgInteractive;
    switch (variant) {
      case 'primary':
        return colors.accent;
      case 'secondary':
        return colors.bgInteractive;
      case 'ghost':
        return 'transparent';
      case 'danger':
        return colors.error;
      default:
        return colors.accent;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textDisabled;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.textPrimary;
      case 'ghost':
        return colors.accent;
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: spacing[2],
            paddingHorizontal: spacing[3],
          },
          text: typography.body.small,
        };
      case 'lg':
        return {
          container: {
            paddingVertical: spacing[4],
            paddingHorizontal: spacing[6],
          },
          text: typography.body.large,
        };
      default:
        return {
          container: {
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[5],
          },
          text: typography.body.medium,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const handlePress = async (e: any) => {
    if (!disabled && !loading) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(e);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        sizeStyles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity: pressed && !disabled ? 0.8 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={disabled || loading}
      onPress={handlePress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            sizeStyles.text,
            { color: getTextColor() },
            textStyle,
          ]}
        >
          {buttonText}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
  },
});
