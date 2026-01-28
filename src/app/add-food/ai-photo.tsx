import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { useAIPhotoStore, useFoodLogStore } from '@/stores';
import { analyzeFood } from '@/services/aiPhoto';
import {
  AIPhotoAnalysis,
  DetectedFood,
  AIPhotoScreenState,
  ProcessedImage,
} from '@/types/ai-photo';
import { Button } from '@/components/ui/Button';

const { width, height } = Dimensions.get('window');

// API Key - In production, this should come from secure storage or environment
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export default function AIPhotoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const params = useLocalSearchParams<{
    mealType?: string;
    date?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const {
    quota,
    isLoaded: quotaLoaded,
    loadQuota,
    incrementUsage,
    canUseAIPhoto,
    getRemainingDaily,
  } = useAIPhotoStore();
  const { addLogEntry } = useFoodLogStore();

  // Screen state
  const [screenState, setScreenState] = useState<AIPhotoScreenState>({
    step: 'capture',
    selectedFoods: [],
  });
  const [flashOn, setFlashOn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFood, setEditingFood] = useState<DetectedFood | null>(null);

  const mealType = (params.mealType as MealType) || MealType.Snack;
  const date = params.date || new Date().toISOString().split('T')[0];

  // Load quota on mount
  useEffect(() => {
    loadQuota();
  }, []);

  // Take photo handler
  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setScreenState({
          ...screenState,
          step: 'preview',
          capturedImage: {
            uri: photo.uri,
            base64: '',
            width: photo.width,
            height: photo.height,
            mimeType: 'image/jpeg',
          },
        });
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  // Pick from gallery handler
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setScreenState({
          ...screenState,
          step: 'preview',
          capturedImage: {
            uri: asset.uri,
            base64: '',
            width: asset.width || 0,
            height: asset.height || 0,
            mimeType: 'image/jpeg',
          },
        });
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Analyze image handler
  const handleAnalyze = async () => {
    if (!screenState.capturedImage) return;

    // Check quota
    if (!canUseAIPhoto()) {
      Alert.alert(
        'Limit Reached',
        "You've reached your daily AI photo limit. Try again tomorrow or upgrade to Premium for more.",
        [{ text: 'OK' }]
      );
      return;
    }

    // Check API key
    if (!OPENAI_API_KEY) {
      Alert.alert(
        'Configuration Error',
        'OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your environment.',
        [{ text: 'OK' }]
      );
      return;
    }

    setScreenState({ ...screenState, step: 'analyzing' });

    try {
      // Increment usage
      const canContinue = await incrementUsage();
      if (!canContinue) {
        throw new Error('Failed to update quota');
      }

      // Analyze the image
      const analysis = await analyzeFood(
        OPENAI_API_KEY,
        screenState.capturedImage.uri
      );

      if (analysis.status === 'completed' && analysis.detectedFoods.length > 0) {
        setScreenState({
          ...screenState,
          step: 'results',
          analysis,
          selectedFoods: [...analysis.detectedFoods], // Select all by default
        });
      } else if (analysis.status === 'no_food_detected') {
        Alert.alert(
          'No Food Detected',
          "We couldn't identify any food in this image. Try taking another photo with better lighting.",
          [
            { text: 'Try Again', onPress: () => setScreenState({ ...screenState, step: 'capture' }) },
          ]
        );
      } else {
        throw new Error(analysis.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        'Failed to analyze the image. Please try again.',
        [
          { text: 'Try Again', onPress: () => setScreenState({ ...screenState, step: 'capture' }) },
          { text: 'Cancel', onPress: () => router.back() },
        ]
      );
    }
  };

  // Toggle food selection
  const toggleFoodSelection = (food: DetectedFood) => {
    const isSelected = screenState.selectedFoods.some((f) => f.id === food.id);
    if (isSelected) {
      setScreenState({
        ...screenState,
        selectedFoods: screenState.selectedFoods.filter((f) => f.id !== food.id),
      });
    } else {
      setScreenState({
        ...screenState,
        selectedFoods: [...screenState.selectedFoods, food],
      });
    }
  };

  // Open edit modal
  const handleEditFood = (food: DetectedFood) => {
    setEditingFood({ ...food });
    setEditModalVisible(true);
  };

  // Save edited food
  const handleSaveEdit = () => {
    if (!editingFood) return;

    setScreenState({
      ...screenState,
      selectedFoods: screenState.selectedFoods.map((f) =>
        f.id === editingFood.id ? editingFood : f
      ),
      analysis: screenState.analysis
        ? {
            ...screenState.analysis,
            detectedFoods: screenState.analysis.detectedFoods.map((f) =>
              f.id === editingFood.id ? editingFood : f
            ),
          }
        : undefined,
    });
    setEditModalVisible(false);
    setEditingFood(null);
  };

  // Log selected foods
  const handleLogFoods = async () => {
    if (screenState.selectedFoods.length === 0) {
      Alert.alert('No Foods Selected', 'Please select at least one food to log.');
      return;
    }

    setIsSaving(true);

    try {
      // Log each selected food
      for (const food of screenState.selectedFoods) {
        await addLogEntry({
          foodItemId: `ai_${food.id}`,
          date,
          mealType,
          servings: 1,
          calories: food.nutrition.calories,
          protein: food.nutrition.protein,
          carbs: food.nutrition.carbs,
          fat: food.nutrition.fat,
        });
      }

      // Navigate back
      router.dismiss();
    } catch (error) {
      console.error('Failed to log foods:', error);
      Alert.alert('Error', 'Failed to log foods. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setScreenState({
      step: 'capture',
      selectedFoods: [],
    });
  };

  // Permission not yet determined
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
            We need camera access to take photos of your food for AI analysis.
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
  if (screenState.step === 'capture') {
    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={flashOn}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Pressable
              style={[styles.headerButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>AI Food Photo</Text>
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

          {/* Guide frame */}
          <View style={styles.guideContainer}>
            <View style={[styles.guideFrame, { borderColor: colors.accent }]}>
              <Ionicons name="restaurant-outline" size={48} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.guideText}>
              Center your food in the frame
            </Text>
          </View>

          {/* Quota indicator */}
          {quotaLoaded && (
            <View style={styles.quotaContainer}>
              <Text style={styles.quotaText}>
                {getRemainingDaily()} scans remaining today
              </Text>
            </View>
          )}

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
  if (screenState.step === 'preview' && screenState.capturedImage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <Image
          source={{ uri: screenState.capturedImage.uri }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12, position: 'absolute', top: 0, left: 0, right: 0 }]}>
          <Pressable
            style={[styles.headerButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={handleRetake}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Preview</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Bottom actions */}
        <View style={[styles.previewActions, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable
            style={[styles.previewButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={handleRetake}
          >
            <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
            <Text style={styles.previewButtonText}>Retake</Text>
          </Pressable>
          <Pressable
            style={[styles.previewButton, styles.analyzeButton, { backgroundColor: colors.accent }]}
            onPress={handleAnalyze}
          >
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            <Text style={styles.previewButtonText}>Analyze</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Analyzing step
  if (screenState.step === 'analyzing') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <Animated.View entering={FadeIn} style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.analyzingTitle, { color: colors.textPrimary }]}>
            Analyzing your food...
          </Text>
          <Text style={[styles.analyzingSubtitle, { color: colors.textSecondary }]}>
            Our AI is identifying foods and estimating nutrition
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Results step
  if (screenState.step === 'results' && screenState.analysis) {
    const { analysis, selectedFoods } = screenState;
    const totalNutrition = selectedFoods.reduce(
      (acc, food) => ({
        calories: acc.calories + food.nutrition.calories,
        protein: acc.protein + food.nutrition.protein,
        carbs: acc.carbs + food.nutrition.carbs,
        fat: acc.fat + food.nutrition.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        {/* Header */}
        <View style={styles.resultsHeader}>
          <Pressable onPress={handleRetake}>
            <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>
            Food Detected
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Preview thumbnail */}
          {screenState.capturedImage && (
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: screenState.capturedImage.uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Detected foods list */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            DETECTED FOODS
          </Text>
          <View style={styles.foodsList}>
            {analysis.detectedFoods.map((food) => {
              const isSelected = selectedFoods.some((f) => f.id === food.id);
              return (
                <Animated.View
                  key={food.id}
                  entering={SlideInUp.delay(100)}
                  style={[
                    styles.foodCard,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor: isSelected ? colors.accent : colors.borderDefault,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Pressable
                    style={styles.foodCardContent}
                    onPress={() => toggleFoodSelection(food)}
                  >
                    <View style={styles.foodCardCheckbox}>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={isSelected ? colors.accent : colors.textTertiary}
                      />
                    </View>
                    <View style={styles.foodCardInfo}>
                      <Text style={[styles.foodName, { color: colors.textPrimary }]}>
                        {food.name}
                      </Text>
                      <Text style={[styles.foodPortion, { color: colors.textSecondary }]}>
                        {food.estimatedPortion.description}
                      </Text>
                      <View style={styles.foodNutrition}>
                        <Text style={[styles.foodCalories, { color: colors.textPrimary }]}>
                          {food.nutrition.calories} cal
                        </Text>
                        <Text style={[styles.foodMacros, { color: colors.textTertiary }]}>
                          P: {food.nutrition.protein}g · C: {food.nutrition.carbs}g · F: {food.nutrition.fat}g
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => handleEditFood(food)}
                    >
                      <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </Pressable>
                  {/* Confidence indicator */}
                  <View style={styles.confidenceContainer}>
                    <View
                      style={[
                        styles.confidenceDot,
                        {
                          backgroundColor:
                            food.confidence > 0.8
                              ? colors.success
                              : food.confidence > 0.6
                              ? colors.warning
                              : colors.error,
                        },
                      ]}
                    />
                    <Text style={[styles.confidenceText, { color: colors.textTertiary }]}>
                      {food.confidence > 0.8 ? 'High' : food.confidence > 0.6 ? 'Medium' : 'Low'} confidence
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Total summary */}
          {selectedFoods.length > 0 && (
            <View style={[styles.totalCard, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                TOTAL ({selectedFoods.length} items)
              </Text>
              <View style={styles.totalRow}>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                    {totalNutrition.calories}
                  </Text>
                  <Text style={[styles.totalUnit, { color: colors.textSecondary }]}>cal</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: colors.protein + '20' }]}>
                  <Text style={[styles.totalValue, { color: colors.protein }]}>
                    {totalNutrition.protein}g
                  </Text>
                  <Text style={[styles.totalUnit, { color: colors.protein }]}>protein</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: colors.carbs + '20' }]}>
                  <Text style={[styles.totalValue, { color: colors.carbs }]}>
                    {totalNutrition.carbs}g
                  </Text>
                  <Text style={[styles.totalUnit, { color: colors.carbs }]}>carbs</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: colors.fat + '20' }]}>
                  <Text style={[styles.totalValue, { color: colors.fat }]}>
                    {totalNutrition.fat}g
                  </Text>
                  <Text style={[styles.totalUnit, { color: colors.fat }]}>fat</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom action */}
        <View style={[styles.resultsFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            onPress={handleLogFoods}
            loading={isSaving}
            disabled={selectedFoods.length === 0}
            fullWidth
          >
            {`Add to ${MEAL_TYPE_LABELS[mealType]}`}
          </Button>
        </View>

        {/* Edit Modal */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditModalVisible(false)}
          >
            <Pressable
              style={[styles.editModal, { backgroundColor: colors.bgPrimary }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>
                  Edit Food
                </Text>
                <Pressable onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              {editingFood && (
                <ScrollView style={styles.editModalContent}>
                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Name</Text>
                    <TextInput
                      style={[
                        styles.editInput,
                        { backgroundColor: colors.bgSecondary, color: colors.textPrimary },
                      ]}
                      value={editingFood.name}
                      onChangeText={(text) =>
                        setEditingFood({ ...editingFood, name: text })
                      }
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Calories</Text>
                    <TextInput
                      style={[
                        styles.editInput,
                        { backgroundColor: colors.bgSecondary, color: colors.textPrimary },
                      ]}
                      value={String(editingFood.nutrition.calories)}
                      onChangeText={(text) =>
                        setEditingFood({
                          ...editingFood,
                          nutrition: {
                            ...editingFood.nutrition,
                            calories: parseInt(text) || 0,
                          },
                        })
                      }
                      keyboardType="number-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  <View style={styles.editRow}>
                    <View style={[styles.editField, { flex: 1 }]}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Protein (g)</Text>
                      <TextInput
                        style={[
                          styles.editInput,
                          { backgroundColor: colors.bgSecondary, color: colors.textPrimary },
                        ]}
                        value={String(editingFood.nutrition.protein)}
                        onChangeText={(text) =>
                          setEditingFood({
                            ...editingFood,
                            nutrition: {
                              ...editingFood.nutrition,
                              protein: parseInt(text) || 0,
                            },
                          })
                        }
                        keyboardType="number-pad"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={[styles.editField, { flex: 1 }]}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Carbs (g)</Text>
                      <TextInput
                        style={[
                          styles.editInput,
                          { backgroundColor: colors.bgSecondary, color: colors.textPrimary },
                        ]}
                        value={String(editingFood.nutrition.carbs)}
                        onChangeText={(text) =>
                          setEditingFood({
                            ...editingFood,
                            nutrition: {
                              ...editingFood.nutrition,
                              carbs: parseInt(text) || 0,
                            },
                          })
                        }
                        keyboardType="number-pad"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={[styles.editField, { flex: 1 }]}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Fat (g)</Text>
                      <TextInput
                        style={[
                          styles.editInput,
                          { backgroundColor: colors.bgSecondary, color: colors.textPrimary },
                        ]}
                        value={String(editingFood.nutrition.fat)}
                        onChangeText={(text) =>
                          setEditingFood({
                            ...editingFood,
                            nutrition: {
                              ...editingFood.nutrition,
                              fat: parseInt(text) || 0,
                            },
                          })
                        }
                        keyboardType="number-pad"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  <Button onPress={handleSaveEdit} fullWidth>
                    Save Changes
                  </Button>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
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
  guideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFrame: {
    width: width * 0.8,
    height: width * 0.8,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    color: '#FFFFFF',
    ...typography.body.medium,
    marginTop: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  quotaContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  quotaText: {
    color: 'rgba(255,255,255,0.7)',
    ...typography.caption,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
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
  analyzeButton: {
    paddingHorizontal: spacing[8],
  },
  previewButtonText: {
    color: '#FFFFFF',
    ...typography.body.medium,
    fontWeight: '600',
  },
  analyzingContainer: {
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: componentSpacing.screenEdgePadding,
  },
  analyzingTitle: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  resultsTitle: {
    ...typography.title.medium,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[4],
  },
  thumbnailContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  thumbnail: {
    width: width * 0.5,
    height: width * 0.4,
    borderRadius: borderRadius.lg,
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  foodsList: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  foodCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  foodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
  },
  foodCardCheckbox: {
    marginRight: spacing[3],
  },
  foodCardInfo: {
    flex: 1,
  },
  foodName: {
    ...typography.body.large,
    fontWeight: '600',
  },
  foodPortion: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  foodNutrition: {
    marginTop: spacing[2],
  },
  foodCalories: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  foodMacros: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  editButton: {
    padding: spacing[2],
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[1],
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    ...typography.caption,
  },
  totalCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  totalLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  totalRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalUnit: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  resultsFooter: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[3],
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModal: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: height * 0.7,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  editModalTitle: {
    ...typography.title.medium,
  },
  editModalContent: {
    padding: spacing[4],
  },
  editField: {
    marginBottom: spacing[4],
  },
  editLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  editInput: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    ...typography.body.medium,
  },
  editRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
});
