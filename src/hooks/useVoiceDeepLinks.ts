/**
 * useVoiceDeepLinks Hook
 * Handles deep links from Siri Shortcuts and Google Assistant
 */

import { useEffect, useCallback, useRef } from 'react';
import { Linking, AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { processVoiceDeepLink, getHapticTypeForCommand } from '@/services/voiceAssistant';
import { useVoiceToast } from '@/components/voice';
import { triggerHaptic } from '@/utils/haptics';
import { DeepLinkParams, VoiceCommandResult } from '@/types/voiceAssistant';

const DEEP_LINK_SCHEME = 'nutritionrx://';

/**
 * Parse a deep link URL into path and params
 */
function parseDeepLink(url: string): { path: string; params: DeepLinkParams } | null {
  if (!url) return null;

  // Remove scheme
  let pathAndParams = url;
  if (url.startsWith(DEEP_LINK_SCHEME)) {
    pathAndParams = url.slice(DEEP_LINK_SCHEME.length);
  } else if (url.includes('://')) {
    const [, rest] = url.split('://');
    pathAndParams = rest || '';
  }

  // Split path and query string
  const [path, queryString] = pathAndParams.split('?');

  // Parse query params
  const params: DeepLinkParams = {};
  if (queryString) {
    queryString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        (params as Record<string, string>)[key] = decodeURIComponent(value);
      }
    });
  }

  return { path: path || '', params };
}

/**
 * Hook to handle voice assistant deep links
 */
export function useVoiceDeepLinks() {
  const router = useRouter();
  const {
    showWaterAddedToast,
    showQuickAddToast,
    showWeightLoggedToast,
    showCalorieQueryToast,
    showMacroQueryToast,
    showWaterQueryToast,
    showErrorToast,
  } = useVoiceToast();

  const processingRef = useRef(false);

  /**
   * Show appropriate toast for command result
   */
  const showResultToast = useCallback(
    (result: VoiceCommandResult, commandType: string) => {
      if (!result.success) {
        showErrorToast(result.message);
        return;
      }

      const data = result.data;

      switch (commandType) {
        case 'water/add':
          if (data?.glassesAdded && data?.totalGlasses && data?.waterGoal) {
            showWaterAddedToast(data.glassesAdded, data.totalGlasses, data.waterGoal);
          }
          break;

        case 'water/query':
          if (data?.totalGlasses !== undefined && data?.waterGoal) {
            showWaterQueryToast(data.totalGlasses, data.waterGoal);
          }
          break;

        case 'quickadd':
          if (data?.addedCalories && data?.targetMeal) {
            showQuickAddToast(data.addedCalories, data.targetMeal as string);
          }
          break;

        case 'query/calories':
          if (data?.totalCalories !== undefined) {
            showCalorieQueryToast(data.totalCalories);
          }
          break;

        case 'query/macros':
          if (data?.macroType && data?.macroAmount !== undefined) {
            showMacroQueryToast(data.macroType, data.macroAmount);
          }
          break;

        case 'weight/log':
          if (data?.weight && data?.unit) {
            showWeightLoggedToast(data.weight, data.unit);
          }
          break;
      }
    },
    [
      showWaterAddedToast,
      showQuickAddToast,
      showWeightLoggedToast,
      showCalorieQueryToast,
      showMacroQueryToast,
      showWaterQueryToast,
      showErrorToast,
    ]
  );

  /**
   * Handle a deep link URL
   */
  const handleDeepLink = useCallback(
    async (url: string) => {
      // Prevent duplicate processing
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        const parsed = parseDeepLink(url);
        if (!parsed) return;

        const { path, params } = parsed;

        // Check if this is a voice command deep link
        const voiceCommandPaths = [
          'water/add',
          'water/query',
          'quickadd',
          'query/calories',
          'query/macros',
          'weight/log',
        ];

        const normalizedPath = path.toLowerCase();
        const isVoiceCommand = voiceCommandPaths.some(
          (p) => normalizedPath === p || normalizedPath.startsWith(p + '/')
        );

        if (isVoiceCommand) {
          // Process voice command
          const result = await processVoiceDeepLink(path, params);

          // Trigger haptic feedback
          const hapticType = result.success
            ? getHapticTypeForCommand(
                normalizedPath.includes('water') ? 'water' :
                normalizedPath.includes('quickadd') ? 'quickAdd' :
                normalizedPath.includes('query') ? 'query' :
                normalizedPath.includes('weight') ? 'weight' : 'query',
                { goalReached: result.data?.totalGlasses === result.data?.waterGoal }
              )
            : 'error';

          await triggerHaptic(hapticType);

          // Show toast
          showResultToast(result, normalizedPath);
        }
      } finally {
        // Allow processing again after a short delay
        setTimeout(() => {
          processingRef.current = false;
        }, 500);
      }
    },
    [showResultToast]
  );

  useEffect(() => {
    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  return { handleDeepLink };
}
