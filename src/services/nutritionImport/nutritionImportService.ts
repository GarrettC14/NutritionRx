import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { generateId } from '@/utils/generateId';
import { quickAddRepository, CreateQuickAddInput } from '@/repositories';
import { getDatabase } from '@/db/database';
import {
  NutritionImportSession,
  ParsedNutritionDay,
  ImportSource,
  ImportType,
  ImportProgress,
  ConflictResolution,
} from '@/types/nutritionImport';
import { detectParser, getParser } from './parsers';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 50_000;

export interface AnalyzeResult {
  success: boolean;
  session?: NutritionImportSession;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  importedDays: number;
  skippedDays: number;
  error?: string;
}

/**
 * Pick a CSV or JSON file using the document picker
 */
export async function pickCSVFile(): Promise<{ uri: string; name: string } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'text/csv',
        'text/comma-separated-values',
        'application/csv',
        '*/*',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name };
  } catch (error) {
    if (__DEV__) console.error('Error picking file:', error);
    return null;
  }
}

/**
 * Read and parse a CSV file
 */
async function readCSVFile(uri: string): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const rawContent = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Strip UTF-8 BOM if present (common in Excel/MFP exports)
  const content = rawContent.charCodeAt(0) === 0xFEFF ? rawContent.slice(1) : rawContent;

  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
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
 * Analyze a CSV or JSON file and create an import session
 */
export async function analyzeNutritionCSV(
  uri: string,
  fileName: string,
  selectedSource?: ImportSource
): Promise<AnalyzeResult> {
  try {
    // Check file size before reading
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'This file is too large (max 10MB). Try exporting a smaller date range from your app.',
      };
    }

    // Parse as CSV
    const { headers, data } = await readCSVFile(uri);

    // Check row count
    if (data.length > MAX_ROWS) {
      return {
        success: false,
        error: `This file has ${data.length.toLocaleString()} rows, which exceeds the maximum of ${MAX_ROWS.toLocaleString()}. Try exporting a smaller date range.`,
      };
    }

    // Detect or use the selected parser
    let source: ImportSource;
    let parser;

    if (selectedSource && selectedSource !== 'unknown') {
      // User explicitly selected a source — use that parser directly
      const selectedParser = getParser(selectedSource);
      if (!selectedParser || !selectedParser.detect(headers)) {
        return {
          success: false,
          error: `This file doesn't match the expected ${getSourceDisplayName(selectedSource)} format. Make sure you exported from ${getSourceDisplayName(selectedSource)} and selected the correct file.`,
        };
      }
      source = selectedSource;
      parser = selectedParser;
    } else {
      // Auto-detect
      const detected = detectParser(headers);
      if (!detected) {
        return {
          success: false,
          error: 'Could not detect the format of this file. Please select your source app and try again.',
        };
      }
      source = detected.source;
      parser = detected.parser;
    }

    // Parse the data
    const parseResult = parser.parse(data);

    if (parseResult.days.length === 0) {
      return {
        success: false,
        error: 'No valid nutrition data found in this file. Please check that the file contains food entries.',
      };
    }

    const session: NutritionImportSession = {
      id: generateId(),
      source,
      importType: 'daily_totals',
      status: 'ready',
      fileName,
      parsedDays: parseResult.days,
      warnings: parseResult.warnings,
      totalDays: parseResult.days.length,
      importedDays: 0,
      skippedDays: 0,
      duplicateDates: [],
      conflictResolution: 'skip',
      createdAt: new Date(),
    };

    return { success: true, session };
  } catch (error) {
    if (__DEV__) console.error('Error analyzing file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze file',
    };
  }
}

/**
 * Check which import dates already have imported data in the database
 */
export async function findExistingImportDates(dates: string[]): Promise<string[]> {
  if (dates.length === 0) return [];

  const db = getDatabase();
  // Batch query in chunks of 500 to avoid SQLite variable limits
  const allFound: string[] = [];
  for (let i = 0; i < dates.length; i += 500) {
    const batch = dates.slice(i, i + 500);
    const placeholders = batch.map(() => '?').join(',');
    const results = await db.getAllAsync<{ date: string }>(
      `SELECT DISTINCT date FROM quick_add_entries
       WHERE date IN (${placeholders})
       AND description LIKE 'Imported from%'`,
      batch
    );
    allFound.push(...results.map((r) => r.date));
  }
  return allFound;
}

/**
 * Analyze raw CSV content directly (used by dev test loader to bypass file picker)
 */
export function analyzeCSVContent(
  content: string,
  fileName: string,
  selectedSource?: ImportSource
): AnalyzeResult {
  try {
    // Strip BOM
    const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

    const parsed = Papa.parse(cleanContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    const headers = parsed.meta.fields || [];
    const data = parsed.data as Record<string, string>[];

    if (data.length > MAX_ROWS) {
      return {
        success: false,
        error: `This file has ${data.length.toLocaleString()} rows, which exceeds the maximum of ${MAX_ROWS.toLocaleString()}. Try exporting a smaller date range.`,
      };
    }

    // Detect or use the selected parser
    let source: ImportSource;
    let parser;

    if (selectedSource && selectedSource !== 'unknown') {
      const selectedParser = getParser(selectedSource);
      if (!selectedParser || !selectedParser.detect(headers)) {
        return {
          success: false,
          error: `This file doesn't match the expected ${getSourceDisplayName(selectedSource)} format.`,
        };
      }
      source = selectedSource;
      parser = selectedParser;
    } else {
      const detected = detectParser(headers);
      if (!detected) {
        return {
          success: false,
          error: 'Could not detect the format of this file.',
        };
      }
      source = detected.source;
      parser = detected.parser;
    }

    const parseResult = parser.parse(data);

    if (parseResult.days.length === 0) {
      return {
        success: false,
        error: 'No valid nutrition data found in this file.',
      };
    }

    const session: NutritionImportSession = {
      id: generateId(),
      source,
      importType: 'daily_totals',
      status: 'ready',
      fileName,
      parsedDays: parseResult.days,
      warnings: parseResult.warnings,
      totalDays: parseResult.days.length,
      importedDays: 0,
      skippedDays: 0,
      duplicateDates: [],
      conflictResolution: 'skip',
      createdAt: new Date(),
    };

    return { success: true, session };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze content',
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

  const parseResult = parser.parse(data, importType);

  return {
    ...session,
    importType,
    parsedDays: parseResult.days,
    warnings: parseResult.warnings,
    totalDays: parseResult.days.length,
  };
}

/**
 * Execute the import, saving data to the database inside a transaction
 */
export async function executeNutritionImport(
  session: NutritionImportSession,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const db = getDatabase();
  let importedDays = 0;
  let skippedDays = 0;
  const duplicateSet = new Set(session.duplicateDates);
  const resolution = session.conflictResolution;

  try {
    // Collect all meals for batch insert
    const allMeals: CreateQuickAddInput[] = [];
    const overwriteDates: string[] = [];

    for (let i = 0; i < session.parsedDays.length; i++) {
      const day = session.parsedDays[i];
      const dateStr = formatDateForStorage(day.date);

      // Handle duplicates
      if (duplicateSet.has(dateStr)) {
        if (resolution === 'skip') {
          skippedDays++;
          continue;
        } else if (resolution === 'overwrite') {
          overwriteDates.push(dateStr);
        }
      }

      for (const meal of day.meals) {
        allMeals.push({
          date: dateStr,
          mealType: meal.name,
          calories: Math.round(meal.calories),
          protein: Math.round(meal.protein),
          carbs: Math.round(meal.carbs),
          fat: Math.round(meal.fat),
          description: `Imported from ${getSourceDisplayName(session.source)}`,
        });
      }

      importedDays++;
    }

    await db.withTransactionAsync(async () => {
      // Delete overwrite dates first
      for (const dateStr of overwriteDates) {
        await db.runAsync(
          `DELETE FROM quick_add_entries WHERE date = ? AND description LIKE 'Imported from%'`,
          [dateStr]
        );
      }

      // Batch insert all meals
      await quickAddRepository.createBatch(allMeals);
    });

    // Report final progress
    onProgress?.({
      current: session.totalDays,
      total: session.totalDays,
    });

    return {
      success: true,
      importedDays,
      skippedDays,
    };
  } catch (error) {
    if (__DEV__) console.error('Error executing import:', error);
    return {
      success: false,
      importedDays: 0,
      skippedDays: 0,
      error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}. No data was saved.`,
    };
  }
}

/**
 * Delete the cached CSV file after import
 */
export async function cleanupCachedFile(uri: string | null): Promise<void> {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Cleanup failure is not critical — ignore
  }
}

/**
 * Format a date for storage (YYYY-MM-DD) using local date components
 */
function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    case 'macrofactor':
      return 'MacroFactor';
    case 'nutritionrx':
      return 'NutritionRx Backup';
    default:
      return 'Unknown';
  }
}
