/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for voice commands and app interactions
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { VoiceHapticType } from '@/types/voiceAssistant';

/**
 * Trigger haptic feedback by type
 */
export async function triggerHaptic(type: VoiceHapticType): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    switch (type) {
      case 'waterAdded':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case 'waterGoalReached':
        // Double haptic for goal reached
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 100);
        break;

      case 'quickAddComplete':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;

      case 'queryResponse':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case 'weightLogged':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;

      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;

      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    // Silently fail - haptics are not critical
    console.warn('Haptic feedback failed:', error);
  }
}

/**
 * Light impact haptic
 */
export async function hapticLight(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Medium impact haptic
 */
export async function hapticMedium(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Heavy impact haptic
 */
export async function hapticHeavy(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/**
 * Success notification haptic
 */
export async function hapticSuccess(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Warning notification haptic
 */
export async function hapticWarning(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * Error notification haptic
 */
export async function hapticError(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Selection changed haptic (subtle tap)
 */
export async function hapticSelection(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.selectionAsync();
}
