import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing } from '@/constants/spacing';
import { useProgressPhotoStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { PhotoComparison } from '@/components/progressPhotos';

export default function CompareScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    comparisonPhoto1Id,
    comparisonPhoto2Id,
    comparisonMode,
    getPhotoById,
    setComparisonMode,
  } = useProgressPhotoStore(useShallow((s) => ({
    comparisonPhoto1Id: s.comparisonPhoto1Id,
    comparisonPhoto2Id: s.comparisonPhoto2Id,
    comparisonMode: s.comparisonMode,
    getPhotoById: s.getPhotoById,
    setComparisonMode: s.setComparisonMode,
  })));

  const photo1 = comparisonPhoto1Id ? getPhotoById(comparisonPhoto1Id) : undefined;
  const photo2 = comparisonPhoto2Id ? getPhotoById(comparisonPhoto2Id) : undefined;

  const handleClose = () => {
    router.back();
  };

  if (!photo1 || !photo2) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.accent} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Compare</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Select two photos to compare
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Compare</Text>
        <View style={{ width: 28 }} />
      </View>

      <PhotoComparison
        photo1={photo1}
        photo2={photo2}
        mode={comparisonMode}
        onModeChange={setComparisonMode}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.title.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
});
