/**
 * Voice Command Handler
 * Processes voice commands and deep links from Siri Shortcuts and Google Assistant
 */

import { useWaterStore } from '@/stores/waterStore';
import { useFoodLogStore } from '@/stores/foodLogStore';
import { useWeightStore } from '@/stores/weightStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { MealType } from '@/constants/mealTypes';
import {
  VoiceCommandResult,
  MacroType,
  WeightUnit,
  DeepLinkParams,
} from '@/types/voiceAssistant';
import {
  getCurrentMealPeriod,
  getTodayDate,
  buildWaterResponse,
  buildQuickAddResponse,
  buildCalorieQueryResponse,
  buildMacroQueryResponse,
  buildWeightResponse,
  buildWaterQueryResponse,
  buildErrorResponse,
  parseCalorieAmount,
  parseWaterAmount,
  parseWeightAmount,
  parseMealType,
  parseMacroType,
  parseWeightUnit,
} from './voiceAssistantService';

// ============================================================
// Command Handlers
// ============================================================

/**
 * Handle "Add water" command
 * Logs water glasses and returns current progress
 */
export async function handleLogWaterCommand(
  amount?: number | string
): Promise<VoiceCommandResult> {
  try {
    const waterStore = useWaterStore.getState();
    const glasses = parseWaterAmount(amount);

    // Add water glasses
    for (let i = 0; i < glasses; i++) {
      await waterStore.addGlass();
    }

    // Get updated progress
    const progress = waterStore.getTodayProgress();
    const response = buildWaterResponse(glasses, progress.glasses, progress.goal);

    return {
      success: true,
      message: response.spokenText,
      data: {
        glassesAdded: glasses,
        totalGlasses: progress.glasses,
        waterGoal: progress.goal,
      },
    };
  } catch (error) {
    const response = buildErrorResponse('network');
    return {
      success: false,
      message: response.spokenText,
      error: 'network',
    };
  }
}

/**
 * Handle "Quick add X calories" command
 * Adds calories to specified or auto-detected meal
 */
export async function handleQuickAddCommand(
  calories?: number | string,
  meal?: string
): Promise<VoiceCommandResult> {
  const parsedCalories = parseCalorieAmount(calories);

  if (parsedCalories === null) {
    const response = buildErrorResponse('invalid_calories');
    return {
      success: false,
      message: response.spokenText,
      error: 'invalid_calories',
    };
  }

  try {
    const foodLogStore = useFoodLogStore.getState();
    const today = getTodayDate();

    // Determine meal type
    const targetMeal = parseMealType(meal) || getCurrentMealPeriod();

    // Add quick entry
    await foodLogStore.addQuickEntry({
      date: today,
      mealType: targetMeal,
      calories: parsedCalories,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: 'Added via voice',
    });

    const response = buildQuickAddResponse(parsedCalories, targetMeal);

    return {
      success: true,
      message: response.spokenText,
      data: {
        addedCalories: parsedCalories,
        targetMeal,
      },
    };
  } catch (error) {
    const response = buildErrorResponse('network');
    return {
      success: false,
      message: response.spokenText,
      error: 'network',
    };
  }
}

/**
 * Handle "How many calories today" command
 * Returns total calories consumed today
 */
export async function handleCalorieQueryCommand(): Promise<VoiceCommandResult> {
  try {
    const foodLogStore = useFoodLogStore.getState();
    const today = getTodayDate();

    // Ensure today's data is loaded
    if (foodLogStore.selectedDate !== today) {
      await foodLogStore.loadEntriesForDate(today);
    }

    const summary = foodLogStore.getDailySummary();
    const totalCalories = summary.totals.calories;
    const response = buildCalorieQueryResponse(totalCalories);

    return {
      success: true,
      message: response.spokenText,
      data: {
        totalCalories,
      },
    };
  } catch (error) {
    const response = buildErrorResponse('network');
    return {
      success: false,
      message: response.spokenText,
      error: 'network',
    };
  }
}

/**
 * Handle "How much protein/carbs/fat" command
 * Returns macro amount consumed today
 */
export async function handleMacroQueryCommand(
  macroType?: string
): Promise<VoiceCommandResult> {
  const parsedMacro = parseMacroType(macroType);

  if (parsedMacro === null) {
    const response = buildErrorResponse('invalid_macro_type');
    return {
      success: false,
      message: response.spokenText,
      error: 'invalid_macro_type',
    };
  }

  try {
    const foodLogStore = useFoodLogStore.getState();
    const today = getTodayDate();

    // Ensure today's data is loaded
    if (foodLogStore.selectedDate !== today) {
      await foodLogStore.loadEntriesForDate(today);
    }

    const summary = foodLogStore.getDailySummary();
    let macroAmount: number;

    switch (parsedMacro) {
      case 'protein':
        macroAmount = summary.totals.protein;
        break;
      case 'carbs':
        macroAmount = summary.totals.carbs;
        break;
      case 'fat':
        macroAmount = summary.totals.fat;
        break;
    }

    const response = buildMacroQueryResponse(parsedMacro, macroAmount);

    return {
      success: true,
      message: response.spokenText,
      data: {
        macroType: parsedMacro,
        macroAmount,
      },
    };
  } catch (error) {
    const response = buildErrorResponse('network');
    return {
      success: false,
      message: response.spokenText,
      error: 'network',
    };
  }
}

/**
 * Handle "What's my water count" command
 * Returns water glasses consumed today
 */
export async function handleWaterQueryCommand(): Promise<VoiceCommandResult> {
  try {
    const waterStore = useWaterStore.getState();
    const progress = waterStore.getTodayProgress();
    const response = buildWaterQueryResponse(progress.glasses, progress.goal);

    return {
      success: true,
      message: response.spokenText,
      data: {
        totalGlasses: progress.glasses,
        waterGoal: progress.goal,
      },
    };
  } catch (error) {
    const response = buildErrorResponse('network');
    return {
      success: false,
      message: response.spokenText,
      error: 'network',
    };
  }
}

/**
 * Handle "Log my weight as X" command
 * Records weight entry
 */
export async function handleLogWeightCommand(
  weight?: number | string,
  unit?: string
): Promise<VoiceCommandResult> {
  const parsedWeight = parseWeightAmount(weight);

  if (parsedWeight === null) {
    const response = buildErrorResponse('invalid_weight');
    return {
      success: false,
      message: response.spokenText,
      error: 'invalid_weight',
    };
  }

  try {
    const weightStore = useWeightStore.getState();
    const settingsStore = useSettingsStore.getState();

    // Determine unit (use parsed or default from settings)
    const parsedUnit = parseWeightUnit(unit);
    // TODO [POST_LAUNCH_WEAR]: Unit mismatch — WeightUnit is 'pounds'|'kilograms' but
    // settingsStore.settings.weightUnit is 'lbs'|'kg'. This fallback will never match,
    // so the default 'pounds' is always used. Convert settings value before comparing.
    const targetUnit: WeightUnit = parsedUnit || settingsStore.settings.weightUnit || 'pounds';

    // Convert to kg for storage if needed
    const weightKg =
      targetUnit === 'pounds' ? parsedWeight * 0.453592 : parsedWeight;

    // Add weight entry
    const today = getTodayDate();
    await weightStore.addEntry({
      weightKg,
      date: today,
      notes: 'Added via voice',
    });

    const response = buildWeightResponse(parsedWeight, targetUnit);

    return {
      success: true,
      message: response.spokenText,
      data: {
        weight: parsedWeight,
        unit: targetUnit,
      },
    };
  } catch (error) {
    const response = buildErrorResponse('network');
    return {
      success: false,
      message: response.spokenText,
      error: 'network',
    };
  }
}

// ============================================================
// Deep Link Processor
// ============================================================

/**
 * Process a deep link from voice assistant
 * Routes to appropriate command handler
 */
export async function processVoiceDeepLink(
  path: string,
  params: DeepLinkParams
): Promise<VoiceCommandResult> {
  // Normalize path
  const normalizedPath = path.replace(/^\//, '').toLowerCase();

  switch (normalizedPath) {
    case 'water/add':
      return handleLogWaterCommand(params.waterAmount);

    case 'water/query':
      return handleWaterQueryCommand();

    case 'quickadd':
      return handleQuickAddCommand(params.calories, params.meal);

    case 'query/calories':
      return handleCalorieQueryCommand();

    case 'query/macros':
      return handleMacroQueryCommand(params.queryType);

    case 'weight/log':
      return handleLogWeightCommand(params.weight, params.unit);

    default:
      const response = buildErrorResponse('unknown_command');
      return {
        success: false,
        message: response.spokenText,
        error: 'unknown_command',
      };
  }
}
