/**
 * Voice Assistant Types
 * Types for Siri Shortcuts and Google Assistant integration
 */

import { MealType } from '@/constants/mealTypes';

// ============================================================
// Voice Command Types
// ============================================================

export type VoiceCommandType =
  | 'LOG_WATER'
  | 'QUICK_ADD'
  | 'QUERY_CALORIES'
  | 'QUERY_MACROS'
  | 'QUERY_WATER'
  | 'LOG_WEIGHT';

export type MacroType = 'protein' | 'carbs' | 'fat';
export type WeightUnit = 'pounds' | 'kilograms';

// ============================================================
// Command Result Types
// ============================================================

export interface VoiceCommandResult {
  success: boolean;
  message: string;
  error?: string;
  data?: VoiceCommandData;
}

export interface VoiceCommandData {
  // Water logging
  totalGlasses?: number;
  waterGoal?: number;
  glassesAdded?: number;

  // Quick add
  addedCalories?: number;
  targetMeal?: MealType | string;

  // Calorie query
  totalCalories?: number;

  // Macro query
  macroType?: MacroType;
  macroAmount?: number;

  // Weight logging
  weight?: number;
  unit?: WeightUnit;
}

// ============================================================
// Voice Response Types
// ============================================================

export interface VoiceResponse {
  /** Text to be spoken by Siri/Google Assistant */
  spokenText: string;
  /** Text to display on screen (may include formatting) */
  displayText: string;
}

// ============================================================
// Haptic Feedback Types
// ============================================================

export type VoiceHapticType =
  | 'waterAdded'
  | 'waterGoalReached'
  | 'quickAddComplete'
  | 'queryResponse'
  | 'weightLogged'
  | 'error';

// ============================================================
// Shortcut Donation Types
// ============================================================

export type ShortcutType =
  | 'LOG_WATER'
  | 'QUICK_ADD'
  | 'QUERY_CALORIES'
  | 'QUERY_MACROS'
  | 'LOG_WEIGHT'
  | 'LOG_FOOD';

export interface ShortcutDonationData {
  LOG_WATER: {
    amount?: number;
  };
  QUICK_ADD: {
    calories?: number;
    meal?: MealType | string;
  };
  QUERY_CALORIES: Record<string, never>;
  QUERY_MACROS: {
    macroType?: MacroType;
  };
  LOG_WEIGHT: {
    weight?: number;
    unit?: WeightUnit;
  };
  LOG_FOOD: {
    foodId: string;
    foodName: string;
  };
}

export interface ShortcutDonation<T extends ShortcutType> {
  type: T;
  data: ShortcutDonationData[T];
}

// ============================================================
// Toast Types
// ============================================================

export interface VoiceToastData {
  icon: string;
  title: string;
  subtitle?: string;
}

export interface VoiceToastState extends VoiceToastData {
  visible: boolean;
}

// ============================================================
// Deep Link Types
// ============================================================

export interface DeepLinkParams {
  // Water
  waterAmount?: string;

  // Quick add
  calories?: string;
  meal?: string;

  // Query
  queryType?: string;

  // Weight
  weight?: string;
  unit?: string;
}

// ============================================================
// Settings Types
// ============================================================

export interface VoiceAssistantSettings {
  /** Default calorie amount for quick add shortcut */
  defaultQuickAddCalories: number;
  /** Whether to play haptic feedback */
  hapticFeedbackEnabled: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceAssistantSettings = {
  defaultQuickAddCalories: 400,
  hapticFeedbackEnabled: true,
};
