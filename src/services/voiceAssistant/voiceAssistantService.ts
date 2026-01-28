/**
 * Voice Assistant Service
 * Utilities for parsing voice input and building responses
 *
 * All responses follow the "Nourished Calm" design philosophy:
 * - Warm but not overly familiar
 * - Supportive but never judgmental
 * - Clear and simple
 * - Neutral about food choices and quantities
 */

import { MealType } from '@/constants/mealTypes';
import {
  VoiceResponse,
  MacroType,
  WeightUnit,
  VoiceHapticType,
} from '@/types/voiceAssistant';

// ============================================================
// Time-Based Utilities
// ============================================================

/**
 * Get the current meal period based on time of day
 * - 5:00-10:59 → breakfast
 * - 11:00-14:59 → lunch
 * - 15:00-20:59 → dinner
 * - 21:00-4:59 → snack
 */
export function getCurrentMealPeriod(): MealType {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) return MealType.Breakfast;
  if (hour >= 11 && hour < 15) return MealType.Lunch;
  if (hour >= 15 && hour < 21) return MealType.Dinner;
  return MealType.Snack;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================
// Response Builders
// ============================================================

/**
 * Build response for water logging
 * Examples:
 * - "Added water. You've had 5 of 8 today."
 * - "Added 3 glasses. You've had 6 today."
 */
export function buildWaterResponse(
  glassesAdded: number,
  totalGlasses: number,
  goal: number
): VoiceResponse {
  let spokenText: string;

  if (glassesAdded === 1) {
    spokenText = `Added water. You've had ${totalGlasses} of ${goal} today.`;
  } else {
    spokenText = `Added ${glassesAdded} glasses. You've had ${totalGlasses} today.`;
  }

  return {
    spokenText,
    displayText: `+${glassesAdded} Water · ${totalGlasses} of ${goal}`,
  };
}

/**
 * Build response for quick add calories
 * Example: "400 calories added to lunch."
 */
export function buildQuickAddResponse(
  calories: number,
  meal: MealType | string
): VoiceResponse {
  const mealName = typeof meal === 'string' ? meal : meal;
  const spokenText = `${calories} calories added to ${mealName}.`;

  return {
    spokenText,
    displayText: `+${calories} cal · ${capitalizeFirst(mealName)}`,
  };
}

/**
 * Build response for calorie query
 * Example: "You've had 1,450 calories today."
 */
export function buildCalorieQueryResponse(totalCalories: number): VoiceResponse {
  const formattedCalories = formatNumber(totalCalories);
  const spokenText = `You've had ${formattedCalories} calories today.`;

  return {
    spokenText,
    displayText: `${formattedCalories} calories today`,
  };
}

/**
 * Build response for macro query
 * Example: "You've had 85 grams of protein."
 */
export function buildMacroQueryResponse(
  macroType: MacroType,
  amount: number
): VoiceResponse {
  const roundedAmount = Math.round(amount);
  const spokenText = `You've had ${roundedAmount} grams of ${macroType}.`;

  return {
    spokenText,
    displayText: `${roundedAmount}g ${macroType}`,
  };
}

/**
 * Build response for weight logging
 * Examples:
 * - "Weight logged: 175 pounds."
 * - "Weight logged: 79.5 kilograms."
 */
export function buildWeightResponse(
  weight: number,
  unit: WeightUnit
): VoiceResponse {
  // Pounds: no decimal, Kilograms: one decimal
  const formattedWeight =
    unit === 'pounds' ? Math.round(weight).toString() : weight.toFixed(1);

  const spokenText = `Weight logged: ${formattedWeight} ${unit}.`;

  return {
    spokenText,
    displayText: `${formattedWeight} ${unit === 'pounds' ? 'lbs' : 'kg'} logged`,
  };
}

/**
 * Build response for water query
 * Example: "You've had 5 glasses today."
 */
export function buildWaterQueryResponse(
  totalGlasses: number,
  goal: number
): VoiceResponse {
  const spokenText = `You've had ${totalGlasses} glasses today.`;

  return {
    spokenText,
    displayText: `${totalGlasses} of ${goal} glasses`,
  };
}

/**
 * Build error response based on error type
 */
export function buildErrorResponse(errorType: string): VoiceResponse {
  let spokenText: string;

  switch (errorType) {
    case 'network':
      spokenText = "Couldn't save that right now. Try opening NutritionRx.";
      break;
    case 'invalid_calories':
      spokenText = "I didn't catch the calorie amount. Try saying a number.";
      break;
    case 'invalid_weight':
      spokenText = "I didn't catch the weight. Try saying a number.";
      break;
    case 'invalid_macro_type':
      spokenText = "I didn't understand which macro. Try protein, carbs, or fat.";
      break;
    case 'unknown_command':
      spokenText = "I'm not sure what you meant. Try opening NutritionRx.";
      break;
    default:
      spokenText = 'Something went wrong. Try opening NutritionRx.';
  }

  return {
    spokenText,
    displayText: spokenText,
  };
}

// ============================================================
// Input Parsers
// ============================================================

/**
 * Parse calorie amount from voice input
 * Valid range: 1-10000
 * Returns null if invalid
 */
export function parseCalorieAmount(input: string | number | undefined): number | null {
  if (input === undefined || input === null || input === '') {
    return null;
  }

  // Handle string input (may have commas)
  let value: number;
  if (typeof input === 'string') {
    const cleaned = input.replace(/,/g, '').trim();
    value = parseFloat(cleaned);
  } else {
    value = input;
  }

  // Validate
  if (isNaN(value) || value <= 0 || value > 10000) {
    return null;
  }

  return Math.round(value);
}

/**
 * Parse weight amount from voice input
 * Valid range: 1-1000 (covers both lb and kg)
 * Returns null if invalid
 */
export function parseWeightAmount(input: string | number | undefined): number | null {
  if (input === undefined || input === null || input === '') {
    return null;
  }

  let value: number;
  if (typeof input === 'string') {
    const cleaned = input.replace(/,/g, '').trim();
    value = parseFloat(cleaned);
  } else {
    value = input;
  }

  // Validate
  if (isNaN(value) || value <= 0 || value > 1000) {
    return null;
  }

  return value;
}

/**
 * Parse water amount from voice input
 * Defaults to 1 if not specified
 * Clamps to 1-20 range
 */
export function parseWaterAmount(input: string | number | undefined | null): number {
  if (input === undefined || input === null || input === '') {
    return 1;
  }

  let value: number;
  if (typeof input === 'string') {
    value = parseInt(input, 10);
  } else {
    value = input;
  }

  if (isNaN(value)) {
    return 1;
  }

  // Round and clamp
  value = Math.round(value);
  return Math.max(1, Math.min(20, value));
}

/**
 * Parse meal type from voice input
 * Returns null if invalid
 */
export function parseMealType(input: string | undefined): MealType | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  switch (normalized) {
    case 'breakfast':
      return MealType.Breakfast;
    case 'lunch':
      return MealType.Lunch;
    case 'dinner':
    case 'supper':
      return MealType.Dinner;
    case 'snack':
    case 'snacks':
      return MealType.Snack;
    default:
      return null;
  }
}

/**
 * Parse macro type from voice input
 * Handles variations like "carbohydrates", "carb", "fats", etc.
 * Returns null if invalid
 */
export function parseMacroType(input: string | undefined): MacroType | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  // Protein variations
  if (normalized === 'protein' || normalized === 'proteins') {
    return 'protein';
  }

  // Carb variations
  if (
    normalized === 'carbs' ||
    normalized === 'carb' ||
    normalized === 'carbohydrates' ||
    normalized === 'carbohydrate'
  ) {
    return 'carbs';
  }

  // Fat variations
  if (normalized === 'fat' || normalized === 'fats') {
    return 'fat';
  }

  return null;
}

/**
 * Parse weight unit from voice input
 * Handles variations like "lbs", "lb", "kg", etc.
 * Returns null if invalid
 */
export function parseWeightUnit(input: string | undefined): WeightUnit | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  // Pounds variations
  if (
    normalized === 'pounds' ||
    normalized === 'pound' ||
    normalized === 'lbs' ||
    normalized === 'lb'
  ) {
    return 'pounds';
  }

  // Kilograms variations
  if (
    normalized === 'kilograms' ||
    normalized === 'kilogram' ||
    normalized === 'kgs' ||
    normalized === 'kg'
  ) {
    return 'kilograms';
  }

  return null;
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Capitalize first letter of a string
 */
export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Get the appropriate haptic type for a voice command
 */
export function getHapticTypeForCommand(
  commandType: string,
  options?: { goalReached?: boolean }
): VoiceHapticType {
  switch (commandType) {
    case 'water':
      return options?.goalReached ? 'waterGoalReached' : 'waterAdded';
    case 'quickAdd':
      return 'quickAddComplete';
    case 'query':
      return 'queryResponse';
    case 'weight':
      return 'weightLogged';
    case 'error':
      return 'error';
    default:
      return 'queryResponse';
  }
}
