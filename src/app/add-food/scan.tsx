import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType } from '@/constants/mealTypes';
import { openFoodFactsApi } from '@/services/openFoodFactsApi';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export default function BarcodeScanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mealType?: string;
    date?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const mealType = (params.mealType as MealType) || MealType.Snack;
  const date = params.date || new Date().toISOString().split('T')[0];

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    // Prevent double scanning
    if (scanned || isLoading || lastScannedRef.current === data) return;

    lastScannedRef.current = data;
    setScanned(true);
    setIsLoading(true);
    setError(null);

    try {
      const result = await openFoodFactsApi.fetchByBarcode(data);

      if (result.success && result.food) {
        // Navigate to food logging screen
        router.replace({
          pathname: '/add-food/log',
          params: {
            foodId: result.food.id,
            mealType,
            date,
          },
        });
      } else {
        setError(result.error || 'Product not found');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Failed to look up product');
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setScanned(false);
    setError(null);
    lastScannedRef.current = null;
  };

  const handleManualEntry = () => {
    router.replace({
      pathname: '/add-food/create',
      params: { mealType, date },
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
          <Ionicons
            name="camera-outline"
            size={64}
            color={colors.textTertiary}
          />
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need camera access to scan barcodes on food packages.
          </Text>
          <View style={styles.permissionButtons}>
            <Button
              label="Allow Camera Access"
              onPress={requestPermission}
            />
            <Pressable
              style={styles.textButton}
              onPress={() => router.back()}
            >
              <Text style={[styles.textButtonLabel, { color: colors.textSecondary }]}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <Pressable
            style={[
              styles.closeButton,
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

        {/* Scan Area */}
        <View style={styles.scanAreaContainer}>
          <View style={[styles.scanArea, { borderColor: colors.accent }]}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.accent }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.accent }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.accent }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.accent }]} />

            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Looking up product...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instructions / Error */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          {error ? (
            <View style={[styles.errorCard, { backgroundColor: colors.bgSecondary }]}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color={colors.error}
              />
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>
                {error}
              </Text>
              <View style={styles.errorButtons}>
                <Pressable
                  style={[styles.errorButton, { backgroundColor: colors.accent }]}
                  onPress={handleTryAgain}
                >
                  <Text style={styles.errorButtonText}>Scan Again</Text>
                </Pressable>
                <Pressable
                  style={[styles.errorButton, { borderColor: colors.borderDefault, borderWidth: 1 }]}
                  onPress={handleManualEntry}
                >
                  <Text style={[styles.errorButtonText, { color: colors.textPrimary }]}>
                    Enter Manually
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.instructions}>
              Point your camera at a barcode
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.6,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: borderRadius.lg,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: borderRadius.lg,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: borderRadius.lg,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: spacing[3],
    ...typography.body.medium,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    alignItems: 'center',
  },
  instructions: {
    color: '#FFFFFF',
    ...typography.body.large,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  errorCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[3],
    width: '100%',
  },
  errorText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  errorButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  errorButtonText: {
    color: '#FFFFFF',
    ...typography.body.medium,
    fontWeight: '600',
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
});
