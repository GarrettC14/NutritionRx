import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <Ionicons name="warning-outline" size={64} color={colors.textTertiary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Page Not Found
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This page doesn't exist.
        </Text>
        <Link href="/" asChild>
          <Pressable style={[styles.button, { backgroundColor: colors.accent }]}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </Pressable>
        </Link>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  title: {
    ...typography.title.large,
    marginTop: spacing[4],
  },
  subtitle: {
    ...typography.body.medium,
    marginTop: spacing[2],
  },
  button: {
    marginTop: spacing[6],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  buttonText: {
    ...typography.body.large,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
