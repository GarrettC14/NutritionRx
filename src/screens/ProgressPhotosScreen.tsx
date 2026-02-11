import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useProgressPhotoStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { PhotoTimeline } from '@/components/progressPhotos';
import { PhotoCategory, ProgressPhoto } from '@/types/progressPhotos';
import { Toast, useToast } from '@/components/ui/Toast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FilterCategory = PhotoCategory | 'all';

const FILTER_OPTIONS: { label: string; value: FilterCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'Front', value: 'front' },
  { label: 'Side', value: 'side' },
  { label: 'Back', value: 'back' },
];

export function ProgressPhotosScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { toastState, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirmDialog();

  const {
    timeline,
    photos,
    filter,
    loadPhotos,
    setFilter,
    isLoading,
    isLoaded,
    deletePhoto,
    updatePhoto,
    setComparisonPhoto1,
    setComparisonPhoto2,
    comparisonPhoto1Id,
    comparisonPhoto2Id,
    getPhotoById,
  } = useProgressPhotoStore(useShallow((s) => ({
    timeline: s.timeline,
    photos: s.photos,
    filter: s.filter,
    loadPhotos: s.loadPhotos,
    setFilter: s.setFilter,
    isLoading: s.isLoading,
    isLoaded: s.isLoaded,
    deletePhoto: s.deletePhoto,
    updatePhoto: s.updatePhoto,
    setComparisonPhoto1: s.setComparisonPhoto1,
    setComparisonPhoto2: s.setComparisonPhoto2,
    comparisonPhoto1Id: s.comparisonPhoto1Id,
    comparisonPhoto2Id: s.comparisonPhoto2Id,
    getPhotoById: s.getPhotoById,
  })));

  const [comparisonMode, setComparisonMode] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<ProgressPhoto | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [optionsPhoto, setOptionsPhoto] = useState<ProgressPhoto | null>(null);
  const [editNotesPhoto, setEditNotesPhoto] = useState<ProgressPhoto | null>(null);
  const [editNotesText, setEditNotesText] = useState('');

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Reload when screen regains focus (e.g. after capture)
  useFocusEffect(
    useCallback(() => {
      // Reset loaded flag and reload to pick up new photos
      useProgressPhotoStore.setState({ isLoaded: false });
      loadPhotos();
    }, [loadPhotos])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    useProgressPhotoStore.setState({ isLoaded: false });
    await loadPhotos();
    setIsRefreshing(false);
  }, [loadPhotos]);

  const handleFilterChange = (category: FilterCategory) => {
    setFilter({ category });
  };

  const handlePhotoPress = (photoId: string) => {
    if (comparisonMode) {
      // In comparison mode, select photos for comparison
      if (!comparisonPhoto1Id) {
        setComparisonPhoto1(photoId);
      } else if (!comparisonPhoto2Id && photoId !== comparisonPhoto1Id) {
        setComparisonPhoto2(photoId);
      } else if (photoId === comparisonPhoto1Id) {
        setComparisonPhoto1(comparisonPhoto2Id);
        setComparisonPhoto2(null);
      } else if (photoId === comparisonPhoto2Id) {
        setComparisonPhoto2(null);
      }
      return;
    }

    // Normal mode — open full-screen viewer
    const photo = getPhotoById(photoId);
    if (photo) {
      setViewerPhoto(photo);
    }
  };

  const handlePhotoLongPress = (photoId: string) => {
    const photo = getPhotoById(photoId);
    if (photo) setOptionsPhoto(photo);
  };

  const handleDeleteFromOptions = () => {
    const photoId = optionsPhoto?.id;
    setOptionsPhoto(null);
    if (!photoId) return;

    showConfirm({
      title: 'Delete Photo',
      message: 'This photo will be permanently deleted.',
      icon: 'trash-outline',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        try {
          await deletePhoto(photoId);
          showSuccess('Photo deleted');
        } catch {
          showError("Something went wrong. Let's try again.");
        }
      },
    });
  };

  const handleEditNotesFromOptions = () => {
    const photo = optionsPhoto;
    setOptionsPhoto(null);
    if (!photo) return;
    setEditNotesText(photo.notes || '');
    setEditNotesPhoto(photo);
  };

  const handleSaveNotes = async () => {
    if (!editNotesPhoto) return;
    const photoId = editNotesPhoto.id;
    const text = editNotesText.trim();
    setEditNotesPhoto(null);
    try {
      await updatePhoto(photoId, { notes: text || undefined });
      showSuccess('Notes updated');
    } catch {
      showError("Something went wrong. Let's try again.");
    }
  };

  const handleCompareToggle = () => {
    if (comparisonMode) {
      // Exit comparison mode
      setComparisonMode(false);
      setComparisonPhoto1(null);
      setComparisonPhoto2(null);
    } else {
      setComparisonMode(true);
    }
  };

  const handleViewComparison = () => {
    if (comparisonPhoto1Id && comparisonPhoto2Id) {
      router.push('/progress-photos/compare');
      setComparisonMode(false);
    }
  };

  const hasPhotos = photos.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} accessibilityRole="header">
          Progress Photos
        </Text>
        <Pressable
          onPress={() => router.push('/progress-photos/capture')}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          <Ionicons name="camera-outline" size={24} color={colors.accent} />
        </Pressable>
      </View>

      {/* Compare toggle */}
      {hasPhotos && (
        <View style={styles.toolbar}>
          <Pressable
            style={[
              styles.compareToggle,
              comparisonMode && { backgroundColor: colors.accent },
              !comparisonMode && { backgroundColor: colors.bgInteractive },
            ]}
            onPress={handleCompareToggle}
          >
            <Ionicons
              name="git-compare-outline"
              size={16}
              color={comparisonMode ? '#FFFFFF' : colors.accent}
            />
            <Text
              style={[
                styles.compareToggleText,
                { color: comparisonMode ? '#FFFFFF' : colors.accent },
              ]}
            >
              {comparisonMode ? 'Cancel' : 'Compare'}
            </Text>
          </Pressable>

          {comparisonMode && comparisonPhoto1Id && comparisonPhoto2Id && (
            <Pressable
              style={[styles.viewComparisonButton, { backgroundColor: colors.accent }]}
              onPress={handleViewComparison}
            >
              <Text style={styles.viewComparisonText}>View Comparison</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Comparison mode instructions */}
      {comparisonMode && (!comparisonPhoto1Id || !comparisonPhoto2Id) && (
        <View style={[styles.instructionBanner, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            {!comparisonPhoto1Id
              ? 'Tap the first photo to compare'
              : 'Now tap the second photo'}
          </Text>
        </View>
      )}

      {/* Category filter */}
      {hasPhotos && (
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.filterChip,
                filter.category === option.value && { backgroundColor: colors.bgInteractive },
              ]}
              onPress={() => handleFilterChange(option.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: filter.category === option.value
                      ? colors.textPrimary
                      : colors.textTertiary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Content */}
      {isLoading && !isRefreshing && !isLoaded ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {hasPhotos ? (
          <PhotoTimeline
            timeline={timeline}
            onPhotoPress={handlePhotoPress}
            onPhotoLongPress={handlePhotoLongPress}
            comparisonMode={comparisonMode}
            comparisonPhoto1Id={comparisonPhoto1Id}
            comparisonPhoto2Id={comparisonPhoto2Id}
          />
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No photos yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Take your first progress photo to start tracking your journey
            </Text>
            <Pressable
              style={[styles.takeFirstButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/progress-photos/capture')}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.takeFirstButtonText}>Take First Photo</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      )}

      {/* Full-screen image viewer */}
      <Modal
        visible={viewerPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerPhoto(null)}
      >
        <View style={styles.viewerContainer}>
          <Pressable
            style={styles.viewerClose}
            onPress={() => setViewerPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Close viewer"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {viewerPhoto && (
            <>
              <Image
                source={{ uri: viewerPhoto.localUri }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
              <View style={styles.viewerInfo}>
                <Text style={styles.viewerDate}>
                  {new Date(viewerPhoto.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                {viewerPhoto.notes && (
                  <Text style={styles.viewerNotes}>{viewerPhoto.notes}</Text>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Photo options sheet */}
      <Modal
        visible={optionsPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsPhoto(null)}
      >
        <View style={styles.dialogOverlay}>
          <Pressable style={styles.dialogOverlayPress} onPress={() => setOptionsPhoto(null)}>
            <View style={[styles.dialogCard, { backgroundColor: colors.bgElevated }]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.dialogIconContainer}>
                  <Ionicons name="ellipsis-horizontal-circle" size={40} color={colors.textSecondary} />
                </View>
                <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
                  Photo Options
                </Text>

                <View style={styles.dialogActions}>
                  <Pressable
                    style={[styles.dialogActionButton, { backgroundColor: colors.error }]}
                    onPress={handleDeleteFromOptions}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={[styles.dialogActionText, { color: '#FFFFFF' }]}>Delete</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.dialogActionButton, { backgroundColor: colors.accent }]}
                    onPress={handleEditNotesFromOptions}
                  >
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text style={[styles.dialogActionText, { color: '#FFFFFF' }]}>Edit Notes</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.dialogActionButton, { backgroundColor: colors.bgInteractive }]}
                    onPress={() => setOptionsPhoto(null)}
                  >
                    <Text style={[styles.dialogActionText, { color: colors.textPrimary }]}>Cancel</Text>
                  </Pressable>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Modal>

      {/* Edit notes modal */}
      <Modal
        visible={editNotesPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNotesPhoto(null)}
      >
        <View style={styles.dialogOverlay}>
          <Pressable style={styles.dialogOverlayPress} onPress={() => setEditNotesPhoto(null)}>
            <View style={[styles.dialogCard, { backgroundColor: colors.bgElevated }]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.dialogIconContainer}>
                  <Ionicons name="create-outline" size={40} color={colors.textSecondary} />
                </View>
                <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
                  Edit Notes
                </Text>
                <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
                  Update the notes for this photo
                </Text>

                <TextInput
                  style={[
                    styles.dialogInput,
                    {
                      backgroundColor: colors.bgSecondary,
                      color: colors.textPrimary,
                      borderColor: colors.borderDefault,
                    },
                  ]}
                  value={editNotesText}
                  onChangeText={setEditNotesText}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  autoFocus
                />

                <View style={styles.dialogButtonRow}>
                  <Pressable
                    style={[styles.dialogRowButton, { backgroundColor: colors.bgInteractive }]}
                    onPress={() => setEditNotesPhoto(null)}
                  >
                    <Text style={[styles.dialogActionText, { color: colors.textPrimary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.dialogRowButton, { backgroundColor: colors.accent }]}
                    onPress={handleSaveNotes}
                  >
                    <Text style={[styles.dialogActionText, { color: '#FFFFFF' }]}>Save</Text>
                  </Pressable>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Modal>

      <Toast {...toastState} onDismiss={hideToast} />
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[2],
  },
  compareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  compareToggleText: {
    ...typography.body.small,
    fontWeight: '600',
  },
  viewComparisonButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  viewComparisonText: {
    color: '#FFFFFF',
    ...typography.body.small,
    fontWeight: '600',
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[2],
    marginHorizontal: componentSpacing.screenEdgePadding,
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  instructionText: {
    ...typography.body.small,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  filterChipText: {
    ...typography.body.small,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[8],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
    marginTop: spacing[8],
  },
  emptyTitle: {
    ...typography.title.medium,
  },
  emptySubtitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  takeFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  takeFirstButtonText: {
    color: '#FFFFFF',
    ...typography.body.medium,
    fontWeight: '600',
  },
  // Full-screen viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  viewerInfo: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing[1],
  },
  viewerDate: {
    color: '#FFFFFF',
    ...typography.body.medium,
    fontWeight: '500',
  },
  viewerNotes: {
    color: 'rgba(255,255,255,0.7)',
    ...typography.body.small,
  },
  // Themed dialog styles (matches ConfirmDialog)
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialogOverlayPress: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCard: {
    width: '85%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
  },
  dialogIconContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  dialogTitle: {
    ...typography.title.medium,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  dialogMessage: {
    ...typography.body.medium,
    textAlign: 'center',
    marginBottom: spacing[5],
    lineHeight: 22,
  },
  dialogActions: {
    gap: spacing[2],
  },
  dialogActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  dialogActionText: {
    ...typography.body.medium,
    fontWeight: '600',
    textAlign: 'center',
  },
  dialogInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing[5],
  },
  dialogButtonRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dialogRowButton: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
});
