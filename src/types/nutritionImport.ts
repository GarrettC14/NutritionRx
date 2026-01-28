import { MealType } from '@/constants/mealTypes';

// ============================================================
// Nutrition Import Types
// ============================================================

export type ImportSource = 'myfitnesspal' | 'cronometer' | 'loseit' | 'unknown';
export type ImportType = 'daily_totals' | 'individual_foods';
export type ImportStatus = 'pending' | 'analyzing' | 'ready' | 'importing' | 'completed' | 'error';

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ParsedFood {
  name: string;
  amount?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ParsedMeal {
  name: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods?: ParsedFood[];
}

export interface ParsedNutritionDay {
  date: Date;
  meals: ParsedMeal[];
  totals: NutritionTotals;
}

export interface NutritionImportSession {
  id: string;
  source: ImportSource;
  importType: ImportType;
  status: ImportStatus;
  fileName?: string;
  parsedDays: ParsedNutritionDay[];
  totalDays: number;
  importedDays: number;
  error?: string;
  createdAt: Date;
}

// ============================================================
// Import Source Configuration
// ============================================================

export interface ImportSourceConfig {
  id: ImportSource;
  name: string;
  description: string;
  icon: string;
  supportsIndividualFoods: boolean;
  exportInstructions: string[];
}

export const IMPORT_SOURCES: ImportSourceConfig[] = [
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    description: 'Import meal totals from your MFP diary export',
    icon: 'nutrition-outline',
    supportsIndividualFoods: false,
    exportInstructions: [
      'Go to MyFitnessPal website (not the app)',
      'Click on "My Home" → "Food Diary"',
      'Select the date range you want to export',
      'Click "Export to Spreadsheet"',
      'Save the CSV file to your device',
    ],
  },
  {
    id: 'cronometer',
    name: 'Cronometer',
    description: 'Import from Cronometer with detailed food data',
    icon: 'analytics-outline',
    supportsIndividualFoods: true,
    exportInstructions: [
      'Open Cronometer on web or desktop',
      'Go to Settings → Account',
      'Click "Export Data"',
      'Select "Servings" for detailed food data',
      'Choose your date range and export',
    ],
  },
  {
    id: 'loseit',
    name: 'Lose It!',
    description: 'Import your food history from Lose It!',
    icon: 'trending-down-outline',
    supportsIndividualFoods: false,
    exportInstructions: [
      'Open Lose It! on the web',
      'Go to Settings → Export Data',
      'Select "Food Log" as the export type',
      'Choose your date range',
      'Download the CSV file',
    ],
  },
];

// ============================================================
// Import Progress
// ============================================================

export interface ImportProgress {
  current: number;
  total: number;
  currentDate?: string;
}
