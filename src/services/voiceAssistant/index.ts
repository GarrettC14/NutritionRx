/**
 * Voice Assistant Service
 * Exports for Siri Shortcuts and Google Assistant integration
 */

export {
  // Time utilities
  getCurrentMealPeriod,
  getTodayDate,
  // Response builders
  buildWaterResponse,
  buildQuickAddResponse,
  buildCalorieQueryResponse,
  buildMacroQueryResponse,
  buildWeightResponse,
  buildWaterQueryResponse,
  buildErrorResponse,
  // Input parsers
  parseCalorieAmount,
  parseWaterAmount,
  parseWeightAmount,
  parseMealType,
  parseMacroType,
  parseWeightUnit,
  // Utilities
  capitalizeFirst,
  formatNumber,
  getHapticTypeForCommand,
} from './voiceAssistantService';

export {
  // Command handlers
  handleLogWaterCommand,
  handleQuickAddCommand,
  handleCalorieQueryCommand,
  handleMacroQueryCommand,
  handleWaterQueryCommand,
  handleLogWeightCommand,
  // Deep link processor
  processVoiceDeepLink,
} from './voiceCommandHandler';
