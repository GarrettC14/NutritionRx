import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/spacing';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  ...props
}: CardProps) {
  const { colors, isDark } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing[2];
      case 'lg':
        return spacing[5];
      default:
        return spacing[4];
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            variant === 'elevated' ? colors.bgElevated : colors.bgSecondary,
          padding: getPadding(),
        },
        variant === 'elevated' && (isDark ? styles.shadowDark : styles.shadowLight),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
