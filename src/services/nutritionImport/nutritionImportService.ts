import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { generateId } from '@/utils/generateId';
import { quickAddRepository, CreateQuickAddInput } from '@/repositories';
import {
  NutritionImportSession,
  ParsedNutritionDay,
  ImportSource,
  ImportType,
  ImportProgress,
} from '@/types/nutritionImport';
import { detectParser, getParser } from './parsers';

export interface AnalyzeResult {
  success: boolean;
  session?: NutritionImportSession;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  importedDays: number;
  error?: string;
}

/**
 * Pick a CSV file using the document picker
 */
export async function pickCSVFile(): Promise<{ uri: string; name: string } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name };
  } catch (error) {
    console.error('Error picking CSV file:', error);
    return null;
  }
}

/**
 * Read and parse a CSV file
 */
async function readCSVFile(uri: string): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];
        resolve({ headers, data });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

/**
 * Analyze a CSV file and create an import session
 */
export async function analyzeNutritionCSV(
  uri: string,
  fileName: string
): Promise<AnalyzeResult> {
  try {
    const { headers, data } = await readCSVFile(uri);

    // Detect the source
    const detected = detectParser(headers);
    if (!detected) {
      return {
        success: false,
        error: 'Could not detect the format of this CSV file. Please ensure you exported from MyFitnessPal, Cronometer, or Lose It!',
      };
    }

    // Parse the data
    const parsedDays = detected.parser.parse(data);

    if (parsedDays.length === 0) {
      return {
        success: false,
        error: 'No valid nutrition data found in this file. Please check that the file contains food entries.',
      };
    }

    const session: NutritionImportSession = {
      id: generateId(),
      source: detected.source,
      importType: 'daily_totals',
      status: 'ready',
      fileName,
      parsedDays,
      totalDays: parsedDays.length,
      importedDays: 0,
      createdAt: new Date(),
    };

    return { success: true, session };
  } catch (error) {
    console.error('Error analyzing CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze CSV file',
    };
  }
}

/**
 * Re-parse a session with a different import type (for Cronometer)
 */
export async function reparseSession(
  uri: string,
  session: NutritionImportSession,
  importType: ImportType
): Promise<NutritionImportSession> {
  const { data } = await readCSVFile(uri);
  const parser = getParser(session.source);

  if (!parser) {
    throw new Error(`No parser found for source: ${session.source}`);
  }

  const parsedDays = parser.parse(data, importType);

  return {
    ...session,
    importType,
    parsedDays,
    totalDays: parsedDays.length,
  };
}

/**
 * Execute the import, saving data to the database
 */
export async function executeNutritionImport(
  session: NutritionImportSession,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  try {
    let importedDays = 0;

    for (let i = 0; i < session.parsedDays.length; i++) {
      const day = session.parsedDays[i];

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: session.totalDays,
          currentDate: formatDateForDisplay(day.date),
        });
      }

      // Import each meal as a quick add entry
      for (const meal of day.meals) {
        const input: CreateQuickAddInput = {
          date: formatDateForStorage(day.date),
          mealType: meal.name,
          calories: Math.round(meal.calories),
          protein: Math.round(meal.protein),
          carbs: Math.round(meal.carbs),
          fat: Math.round(meal.fat),
          description: `Imported from ${getSourceDisplayName(session.source)}`,
        };

        await quickAddRepository.create(input);
      }

      importedDays++;

      // Small delay to allow UI updates and prevent overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return {
      success: true,
      importedDays,
    };
  } catch (error) {
    console.error('Error executing import:', error);
    return {
      success: false,
      importedDays: 0,
      error: error instanceof Error ? error.message : 'Failed to import data',
    };
  }
}

/**
 * Format a date for storage (YYYY-MM-DD)
 */
function formatDateForStorage(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a date for display
 */
function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get display name for an import source
 */
function getSourceDisplayName(source: ImportSource): string {
  switch (source) {
    case 'myfitnesspal':
      return 'MyFitnessPal';
    case 'cronometer':
      return 'Cronometer';
    case 'loseit':
      return 'Lose It!';
    default:
      return 'Unknown';
  }
}
