import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';

type TextVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'caption'
  | 'overline'
  | 'metricLarge'
  | 'metricMedium'
  | 'metricSmall'
  | 'metricTiny';

type TextColor = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'accent' | 'error';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
}

export function Text({
  variant = 'bodyMedium',
  color = 'primary',
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  const getTextColor = () => {
    switch (color) {
      case 'primary':
        return colors.textPrimary;
      case 'secondary':
        return colors.textSecondary;
      case 'tertiary':
        return colors.textTertiary;
      case 'disabled':
        return colors.textDisabled;
      case 'accent':
        return colors.accent;
      case 'error':
        return colors.error;
      default:
        return colors.textPrimary;
    }
  };

  const variantStyles = getVariantStyles(variant);

  return (
    <RNText
      style={[
        variantStyles,
        { color: getTextColor() },
        style,
      ]}
      {...props}
    />
  );
}

function getVariantStyles(variant: TextVariant) {
  switch (variant) {
    case 'displayLarge':
      return typography.display.large;
    case 'displayMedium':
      return typography.display.medium;
    case 'displaySmall':
      return typography.display.small;
    case 'titleLarge':
      return typography.title.large;
    case 'titleMedium':
      return typography.title.medium;
    case 'titleSmall':
      return typography.title.small;
    case 'bodyLarge':
      return typography.body.large;
    case 'bodyMedium':
      return typography.body.medium;
    case 'bodySmall':
      return typography.body.small;
    case 'caption':
      return typography.caption;
    case 'overline':
      return typography.overline;
    case 'metricLarge':
      return typography.metric.large;
    case 'metricMedium':
      return typography.metric.medium;
    case 'metricSmall':
      return typography.metric.small;
    case 'metricTiny':
      return typography.metric.tiny;
    default:
      return typography.body.medium;
  }
}
