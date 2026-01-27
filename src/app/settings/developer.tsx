import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { getDatabase } from '@/db/database';
import { seedMockData } from '@/db/migrations/006_seed_mock_data';

interface DatabaseStats {
  foodItems: number;
  logEntries: number;
  quickAddEntries: number;
  weightEntries: number;
  goals: number;
  weeklyReflections: number;
}

export default function DeveloperScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadStats = async () => {
    try {
      const db = getDatabase();
      const [foodItems, logEntries, quickAddEntries, weightEntries, goals, weeklyReflections] =
        await Promise.all([
          db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM food_items'),
          db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM log_entries'),
          db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM quick_add_entries'),
          db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM weight_entries'),
          db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM goals'),
          db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM weekly_reflections'),
        ]);

      setStats({
        foodItems: foodItems?.count ?? 0,
        logEntries: logEntries?.count ?? 0,
        quickAddEntries: quickAddEntries?.count ?? 0,
        weightEntries: weightEntries?.count ?? 0,
        goals: goals?.count ?? 0,
        weeklyReflections: weeklyReflections?.count ?? 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSeedData = async () => {
    Alert.alert(
      'Seed Mock Data',
      'This will add mock data to the database. Existing data will NOT be deleted. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed Data',
          onPress: async () => {
            setIsSeeding(true);
            try {
              const db = getDatabase();
              await seedMockData(db);
              await loadStats();
              Alert.alert('Success', 'Mock data has been seeded successfully.');
            } catch (error) {
              console.error('Failed to seed data:', error);
              Alert.alert('Error', 'Failed to seed mock data. Check console for details.');
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ]
    );
  };

  const handleClearUserData = async () => {
    Alert.alert(
      'Clear User Data',
      'This will delete all log entries, weight entries, quick adds, and goals. Food items will be preserved. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const db = getDatabase();
              await db.runAsync('DELETE FROM log_entries');
              await db.runAsync('DELETE FROM quick_add_entries');
              await db.runAsync('DELETE FROM weight_entries');
              await db.runAsync('DELETE FROM weekly_reflections');
              await db.runAsync('DELETE FROM daily_metabolism');
              await db.runAsync('DELETE FROM goals');
              await loadStats();
              Alert.alert('Success', 'User data has been cleared.');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data. Check console for details.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleResetApp = async () => {
    Alert.alert(
      'Reset App',
      'This will delete ALL data including food items and reset the app to a fresh state. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const db = getDatabase();
              await db.runAsync('DELETE FROM log_entries');
              await db.runAsync('DELETE FROM quick_add_entries');
              await db.runAsync('DELETE FROM weight_entries');
              await db.runAsync('DELETE FROM weekly_reflections');
              await db.runAsync('DELETE FROM daily_metabolism');
              await db.runAsync('DELETE FROM goals');
              await db.runAsync('DELETE FROM food_items WHERE source = ?', ['user']);
              await db.runAsync('UPDATE food_items SET usage_count = 0, last_used_at = NULL');
              await db.runAsync('DELETE FROM user_profile');
              await db.runAsync('DELETE FROM user_settings');
              await loadStats();
              Alert.alert('Success', 'App has been reset. Please restart the app.');
            } catch (error) {
              console.error('Failed to reset app:', error);
              Alert.alert('Error', 'Failed to reset app. Check console for details.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Developer Tools',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Warning Banner */}
          <View style={[styles.warningBanner, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Developer tools. Use with caution.
            </Text>
          </View>

          {/* Database Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              DATABASE STATS
            </Text>
            <View style={[styles.statsCard, { backgroundColor: colors.bgSecondary }]}>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : stats ? (
                <>
                  <StatRow label="Food items" value={stats.foodItems} colors={colors} />
                  <StatRow label="Log entries" value={stats.logEntries} colors={colors} />
                  <StatRow label="Quick add entries" value={stats.quickAddEntries} colors={colors} />
                  <StatRow label="Weight entries" value={stats.weightEntries} colors={colors} />
                  <StatRow label="Goals" value={stats.goals} colors={colors} />
                  <StatRow
                    label="Weekly reflections"
                    value={stats.weeklyReflections}
                    colors={colors}
                    isLast
                  />
                </>
              ) : (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Failed to load stats
                </Text>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ACTIONS
            </Text>
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={handleSeedData}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="leaf" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Seed Mock Data</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={handleClearUserData}
                disabled={isClearing}
              >
                {isClearing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Clear User Data</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={handleResetApp}
                disabled={isClearing}
              >
                {isClearing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Reset App</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.bgSecondary }]}
                onPress={loadStats}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                  Refresh Stats
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Mock data includes 45 days of weight entries, 14 days of food logs, sample goals, and
              weekly reflections for testing the app's features.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function StatRow({
  label,
  value,
  colors,
  isLast = false,
}: {
  label: string;
  value: number;
  colors: any;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.statRow,
        !isLast && { borderBottomColor: colors.borderDefault, borderBottomWidth: 1 },
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.body.small,
    flex: 1,
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing[2],
  },
  statsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  statLabel: {
    ...typography.body.medium,
  },
  statValue: {
    ...typography.body.medium,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  errorText: {
    ...typography.body.medium,
    padding: spacing[4],
    textAlign: 'center',
  },
  actionsContainer: {
    gap: spacing[2],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  actionButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
});
