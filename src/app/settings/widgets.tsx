import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { usePinToWidget, PinnedItem } from '@/modules/widgets';

const WIDGET_TYPES = [
  {
    id: 'today-summary',
    name: 'Today Summary',
    description: 'Shows daily calories and macro progress',
    icon: 'pie-chart-outline' as const,
  },
  {
    id: 'water-tracking',
    name: 'Water Tracking',
    description: 'Track water intake with quick +8oz button',
    icon: 'water-outline' as const,
  },
  {
    id: 'quick-add',
    name: 'Quick Add',
    description: 'Fast access to log meals by type',
    icon: 'flash-outline' as const,
  },
];

export default function WidgetsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    pinnedItems,
    isLoading,
    unpinItem,
    clearAll,
    maxItems,
  } = usePinToWidget();

  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemoveItem = async (item: PinnedItem) => {
    setRemovingId(item.id);
    try {
      await unpinItem(item.id);
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearAll = () => {
    if (pinnedItems.length === 0) return;

    Alert.alert(
      'Clear All Pinned Items',
      'Are you sure you want to remove all pinned foods from your widgets?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
          },
        },
      ]
    );
  };

  const instructions = Platform.select({
    ios: [
      'Long-press on your home screen',
      'Tap the "+" button in the top corner',
      'Search for "NutritionRx"',
      'Choose a widget size and tap "Add Widget"',
    ],
    android: [
      'Long-press on your home screen',
      'Tap "Widgets"',
      'Find "NutritionRx" in the list',
      'Drag the widget to your home screen',
    ],
    default: [
      'Long-press on your home screen',
      'Select "Add Widget"',
      'Search for "NutritionRx"',
      'Choose your preferred widget',
    ],
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['bottom']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Widgets
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Setup Instructions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ADD TO HOME SCREEN
          </Text>
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.instructionsHeader}>
              <Ionicons
                name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-android'}
                size={24}
                color={colors.accent}
              />
              <Text style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
                {Platform.OS === 'ios' ? 'iOS' : 'Android'} Instructions
              </Text>
            </View>
            {instructions.map((step, index) => (
              <View key={index} style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Available Widgets */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            AVAILABLE WIDGETS
          </Text>
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            {WIDGET_TYPES.map((widget, index) => (
              <View
                key={widget.id}
                style={[
                  styles.widgetItem,
                  index < WIDGET_TYPES.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderDefault,
                  },
                ]}
              >
                <View style={[styles.widgetIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name={widget.icon} size={24} color={colors.accent} />
                </View>
                <View style={styles.widgetInfo}>
                  <Text style={[styles.widgetName, { color: colors.textPrimary }]}>
                    {widget.name}
                  </Text>
                  <Text style={[styles.widgetDescription, { color: colors.textSecondary }]}>
                    {widget.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Pinned Foods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              PINNED FOODS ({pinnedItems.length}/{maxItems})
            </Text>
            {pinnedItems.length > 0 && (
              <Pressable onPress={handleClearAll}>
                <Text style={[styles.clearButton, { color: colors.error }]}>
                  Clear All
                </Text>
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <View style={[styles.card, styles.loadingCard, { backgroundColor: colors.bgSecondary }]}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : pinnedItems.length === 0 ? (
            <View style={[styles.card, styles.emptyCard, { backgroundColor: colors.bgSecondary }]}>
              <Ionicons name="pin-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No Pinned Foods
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
                Pin your favorite foods when logging to quickly add them from the Quick Add widget.
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
              {pinnedItems.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.pinnedItem,
                    index < pinnedItems.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderDefault,
                    },
                  ]}
                >
                  <View style={styles.pinnedItemInfo}>
                    <Text style={[styles.pinnedItemName, { color: colors.textPrimary }]}>
                      {item.iconEmoji} {item.name}
                    </Text>
                    <Text style={[styles.pinnedItemDetails, { color: colors.textSecondary }]}>
                      {item.calories} cal · {item.servingSize} {item.servingUnit}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveItem(item)}
                    disabled={removingId === item.id}
                    style={styles.removeButton}
                  >
                    {removingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.textTertiary} />
                    ) : (
                      <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.pinnedHint, { color: colors.textTertiary }]}>
            To pin foods, tap the pin icon when logging a meal.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    ...typography.title.medium,
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  clearButton: {
    ...typography.body.small,
    fontWeight: '600',
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  loadingCard: {
    padding: spacing[8],
    alignItems: 'center',
  },
  emptyCard: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  emptyTitle: {
    ...typography.title.small,
    marginTop: spacing[2],
  },
  emptyDescription: {
    ...typography.body.small,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  instructionsTitle: {
    ...typography.title.small,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...typography.body.small,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  instructionText: {
    ...typography.body.medium,
    flex: 1,
  },
  widgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  widgetIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetInfo: {
    flex: 1,
  },
  widgetName: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  widgetDescription: {
    ...typography.body.small,
    marginTop: 2,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  pinnedItemInfo: {
    flex: 1,
  },
  pinnedItemName: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  pinnedItemDetails: {
    ...typography.body.small,
    marginTop: 2,
  },
  removeButton: {
    padding: spacing[1],
  },
  pinnedHint: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[3],
  },
});
