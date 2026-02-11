import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Paths, copyAsync, getInfoAsync, makeDirectoryAsync } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useProgressPhotoStore } from '@/stores';
import { PhotoCategory } from '@/types/progressPhotos';
import { Button } from '@/components/ui/Button';

const PHOTO_DIR = Paths.document.uri + 'progress-photos/';

type Step = 'capture' | 'preview' | 'form';

const CATEGORIES: { label: string; value: PhotoCategory }[] = [
  { label: 'Front', value: 'front' },
  { label: 'Side', value: 'side' },
  { label: 'Back', value: 'back' },
  { label: 'Other', value: 'other' },
];

export default function CaptureScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const addPhoto = useProgressPhotoStore((s) => s.addPhoto);

  const [step, setStep] = useState<Step>('capture');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [category, setCategory] = useState<PhotoCategory>('front');
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setStep('preview');
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedUri(result.assets[0].uri);
        setStep('preview');
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setStep('capture');
  };

  const handleUsePhoto = () => {
    setStep('form');
  };

  const handleSave = async () => {
    if (!capturedUri) return;

    setIsSaving(true);
    try {
      // Ensure directory exists
      const dirInfo = await getInfoAsync(PHOTO_DIR);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
      }

      // Copy image to app directory
      const timestamp = Date.now();
      const filename = `photo_${timestamp}.jpg`;
      const destUri = PHOTO_DIR + filename;
      await copyAsync({ from: capturedUri, to: destUri });

      // Generate thumbnail
      const thumbnailFilename = `thumb_${timestamp}.jpg`;
      const thumbnailUri = PHOTO_DIR + thumbnailFilename;
      const manipulated = await manipulateAsync(
        destUri,
        [{ resize: { width: 200 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      await copyAsync({ from: manipulated.uri, to: thumbnailUri });

      // Save to store
      const today = new Date().toISOString().split('T')[0];
      const weightNum = weight ? parseFloat(weight) : undefined;

      await addPhoto({
        localUri: destUri,
        thumbnailUri,
        date: today,
        timestamp,
        category,
        notes: notes.trim() || undefined,
        weight: weightNum && !isNaN(weightNum) ? weightNum : undefined,
        isPrivate: false,
      });

      router.back();
    } catch (error) {
      console.error('Failed to save photo:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need camera access to take progress photos.
          </Text>
          <View style={styles.permissionButtons}>
            <Button onPress={requestPermission}>Allow Camera Access</Button>
            <Pressable style={styles.textButton} onPress={() => router.back()}>
              <Text style={[styles.textButtonLabel, { color: colors.textSecondary }]}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Capture step
  if (step === 'capture') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="front"
          enableTorch={flashOn}
        />

        <View style={styles.overlay}>
          {/* Header */}
          <View style={[styles.cameraHeader, { paddingTop: insets.top + 12 }]}>
            <Pressable
              style={[styles.headerButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.cameraTitle}>Progress Photo</Text>
            <Pressable
              style={[
                styles.headerButton,
                { backgroundColor: flashOn ? colors.accent : 'rgba(0,0,0,0.5)' },
              ]}
              onPress={() => setFlashOn(!flashOn)}
            >
              <Ionicons
                name={flashOn ? 'flashlight' : 'flashlight-outline'}
                size={24}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {/* Bottom controls */}
          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable
              style={[styles.galleryButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={handlePickFromGallery}
            >
              <Ionicons name="images-outline" size={28} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.captureButton} onPress={handleTakePhoto}>
              <View style={[styles.captureButtonInner, { backgroundColor: colors.accent }]} />
            </Pressable>
            <View style={{ width: 60 }} />
          </View>
        </View>
      </View>
    );
  }

  // Preview step
  if (step === 'preview' && capturedUri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <Image
          source={{ uri: capturedUri }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        <View style={[styles.cameraHeader, { paddingTop: insets.top + 12, position: 'absolute', top: 0, left: 0, right: 0 }]}>
          <Pressable
            style={[styles.headerButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={handleRetake}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.cameraTitle}>Preview</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={[styles.previewActions, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable
            style={[styles.previewButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={handleRetake}
          >
            <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
            <Text style={styles.previewButtonText}>Retake</Text>
          </Pressable>
          <Pressable
            style={[styles.previewButton, { backgroundColor: colors.accent }]}
            onPress={handleUsePhoto}
          >
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.previewButtonText}>Use Photo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Form step
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.formHeader}>
          <Pressable onPress={() => setStep('preview')}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Photo Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo preview */}
          {capturedUri && (
            <View style={styles.formPreview}>
              <Image
                source={{ uri: capturedUri }}
                style={styles.formPreviewImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Category picker */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: category === cat.value ? colors.accent : colors.bgSecondary,
                    },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: category === cat.value ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.bgSecondary, color: colors.textPrimary, borderColor: colors.borderDefault }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Morning, post-workout..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Weight */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>WEIGHT (OPTIONAL)</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={[styles.weightInput, { backgroundColor: colors.bgSecondary, color: colors.textPrimary, borderColor: colors.borderDefault }]}
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>kg</Text>
            </View>
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <Button
            label="Save Photo"
            onPress={handleSave}
            loading={isSaving}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraTitle: {
    ...typography.title.medium,
    color: '#FFFFFF',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: componentSpacing.screenEdgePadding,
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: componentSpacing.screenEdgePadding,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
  },
  previewButtonText: {
    color: '#FFFFFF',
    ...typography.body.medium,
    fontWeight: '600',
  },
  // Permission
  permissionContainer: {
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    gap: spacing[4],
  },
  permissionTitle: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  permissionButtons: {
    gap: spacing[3],
    marginTop: spacing[4],
    width: '100%',
    alignItems: 'center',
  },
  textButton: {
    paddingVertical: spacing[2],
  },
  textButtonLabel: {
    ...typography.body.medium,
  },
  // Form
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  formTitle: {
    ...typography.title.medium,
  },
  scrollView: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[4],
    gap: spacing[4],
  },
  formPreview: {
    alignItems: 'center',
  },
  formPreviewImage: {
    width: 160,
    height: 213,
    borderRadius: borderRadius.lg,
  },
  formSection: {
    gap: spacing[2],
  },
  formLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  categoryChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  categoryChipText: {
    ...typography.body.small,
    fontWeight: '600',
  },
  notesInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    minHeight: 60,
    textAlignVertical: 'top',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  weightInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    flex: 1,
  },
  weightUnit: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
