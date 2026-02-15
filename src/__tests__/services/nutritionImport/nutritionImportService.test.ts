import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { generateId } from '@/utils/generateId';
import { quickAddRepository } from '@/repositories';
import { getDatabase } from '@/db/database';
import { detectParser, getParser } from '@/services/nutritionImport/parsers';
import {
  NutritionImportSession,
  ParsedNutritionDay,
  ImportSource,
} from '@/types/nutritionImport';
import { MealType } from '@/constants/mealTypes';

import {
  pickCSVFile,
  analyzeNutritionCSV,
  analyzeCSVContent,
  findExistingImportDates,
  reparseSession,
  executeNutritionImport,
  cleanupCachedFile,
} from '@/services/nutritionImport/nutritionImportService';

// ── Mocks ──────────────────────────────────────────────────────

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// expo-file-system is already mapped via moduleNameMapper in jest.config.js
// to src/__mocks__/expo-file-system.ts which provides jest.fn() stubs.

jest.mock('papaparse', () => ({
  __esModule: true,
  default: {
    parse: jest.fn(),
  },
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-session-id'),
}));

jest.mock('@/repositories', () => ({
  quickAddRepository: {
    createBatch: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/services/nutritionImport/parsers', () => ({
  detectParser: jest.fn(),
  getParser: jest.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────

const mockGetDocumentAsync = DocumentPicker.getDocumentAsync as jest.Mock;
const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const mockGetInfoAsync = FileSystem.getInfoAsync as jest.Mock;
const mockDeleteAsync = FileSystem.deleteAsync as jest.Mock;
const mockPapaParse = Papa.parse as jest.Mock;
const mockGenerateId = generateId as jest.Mock;
const mockGetDatabase = getDatabase as jest.Mock;
const mockDetectParser = detectParser as jest.Mock;
const mockGetParser = getParser as jest.Mock;
const mockCreateBatch = quickAddRepository.createBatch as jest.Mock;

function makeMockDb() {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn(async (cb: () => Promise<void>) => cb()),
  };
}

function makeParsedDay(dateStr: string, overrides?: Partial<ParsedNutritionDay>): ParsedNutritionDay {
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    date: new Date(year, month - 1, day),
    meals: [
      {
        name: MealType.Breakfast,
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    ],
    totals: { calories: 500, protein: 30, carbs: 60, fat: 15 },
    ...overrides,
  };
}

function makeSession(overrides?: Partial<NutritionImportSession>): NutritionImportSession {
  return {
    id: 'test-session-id',
    source: 'myfitnesspal',
    importType: 'daily_totals',
    status: 'ready',
    fileName: 'test.csv',
    parsedDays: [makeParsedDay('2025-01-15'), makeParsedDay('2025-01-16')],
    warnings: [],
    totalDays: 2,
    importedDays: 0,
    skippedDays: 0,
    duplicateDates: [],
    conflictResolution: 'skip',
    createdAt: new Date(),
    ...overrides,
  };
}

const mockParser = {
  detect: jest.fn(() => true),
  parse: jest.fn(() => ({
    days: [makeParsedDay('2025-01-15')],
    warnings: [],
  })),
};

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDatabase.mockReturnValue(makeMockDb());
  mockGenerateId.mockReturnValue('test-session-id');
});

// ── Tests ──────────────────────────────────────────────────────

describe('nutritionImportService', () => {
  // ═══════════════════════════════════════════════════════════════
  // pickCSVFile
  // ═══════════════════════════════════════════════════════════════
  describe('pickCSVFile', () => {
    it('returns { uri, name } when user picks a file', async () => {
      mockGetDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///test.csv', name: 'food_log.csv' }],
      });

      const result = await pickCSVFile();

      expect(result).toEqual({ uri: 'file:///test.csv', name: 'food_log.csv' });
      expect(mockGetDocumentAsync).toHaveBeenCalledWith({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
    });

    it('returns null when user cancels', async () => {
      mockGetDocumentAsync.mockResolvedValue({ canceled: true, assets: [] });

      const result = await pickCSVFile();

      expect(result).toBeNull();
    });

    it('returns null when assets array is empty', async () => {
      mockGetDocumentAsync.mockResolvedValue({ canceled: false, assets: [] });

      const result = await pickCSVFile();

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockGetDocumentAsync.mockRejectedValue(new Error('Permission denied'));

      const result = await pickCSVFile();

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // analyzeNutritionCSV
  // ═══════════════════════════════════════════════════════════════
  describe('analyzeNutritionCSV', () => {
    const testUri = 'file:///cache/test.csv';
    const testFileName = 'food_log.csv';
    const csvContent = 'Date,Meal,Calories\n2025-01-15,Breakfast,500';

    beforeEach(() => {
      // Default: file exists, small size, readable content
      mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      mockReadAsStringAsync.mockResolvedValue(csvContent);
      // Papa.parse calls complete callback synchronously via our mock
      mockPapaParse.mockImplementation((content: string, opts: { complete: Function }) => {
        opts.complete({
          meta: { fields: ['Date', 'Meal', 'Calories'] },
          data: [{ Date: '2025-01-15', Meal: 'Breakfast', Calories: '500' }],
        });
      });
      mockDetectParser.mockReturnValue({ source: 'myfitnesspal', parser: mockParser });
      mockParser.detect.mockReturnValue(true);
      mockParser.parse.mockReturnValue({
        days: [makeParsedDay('2025-01-15')],
        warnings: [],
      });
    });

    it('returns error when file does not exist', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: false });

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not access the selected file');
    });

    it('returns error when file is too large (>10MB)', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 11 * 1024 * 1024,
      });

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
      expect(result.error).toContain('10MB');
    });

    it('returns error when row count exceeds MAX_ROWS', async () => {
      const bigData = Array.from({ length: 50_001 }, (_, i) => ({
        Date: `2025-01-${i}`,
        Meal: 'Breakfast',
        Calories: '500',
      }));
      mockPapaParse.mockImplementation((_: string, opts: { complete: Function }) => {
        opts.complete({
          meta: { fields: ['Date', 'Meal', 'Calories'] },
          data: bigData,
        });
      });

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('50,000');
    });

    it('returns session when auto-detect succeeds', async () => {
      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session!.source).toBe('myfitnesspal');
      expect(result.session!.importType).toBe('daily_totals');
      expect(result.session!.status).toBe('ready');
      expect(result.session!.fileName).toBe(testFileName);
      expect(result.session!.id).toBe('test-session-id');
      expect(result.session!.totalDays).toBe(1);
      expect(result.session!.importedDays).toBe(0);
      expect(result.session!.skippedDays).toBe(0);
      expect(result.session!.duplicateDates).toEqual([]);
      expect(result.session!.conflictResolution).toBe('skip');
    });

    it('returns session when selected source parser succeeds', async () => {
      mockGetParser.mockReturnValue(mockParser);
      mockParser.detect.mockReturnValue(true);

      const result = await analyzeNutritionCSV(testUri, testFileName, 'cronometer');

      expect(result.success).toBe(true);
      expect(mockGetParser).toHaveBeenCalledWith('cronometer');
      // detectParser should NOT be called when source is explicitly provided
      expect(mockDetectParser).not.toHaveBeenCalled();
    });

    it('returns error when selected source parser does not match headers', async () => {
      mockGetParser.mockReturnValue(mockParser);
      mockParser.detect.mockReturnValue(false);

      const result = await analyzeNutritionCSV(testUri, testFileName, 'cronometer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cronometer');
      expect(result.error).toContain("doesn't match");
    });

    it('returns error when selected source has no parser', async () => {
      mockGetParser.mockReturnValue(null);

      const result = await analyzeNutritionCSV(testUri, testFileName, 'loseit');

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't match");
    });

    it('returns error when no parser detected in auto-detect mode', async () => {
      mockDetectParser.mockReturnValue(null);

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not detect the format');
    });

    it('returns error when parser returns no valid data', async () => {
      mockParser.parse.mockReturnValue({ days: [], warnings: [] });

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid nutrition data found');
    });

    it('skips auto-detect when selectedSource is "unknown"', async () => {
      // "unknown" should be treated same as no selectedSource (auto-detect)
      const result = await analyzeNutritionCSV(testUri, testFileName, 'unknown');

      expect(result.success).toBe(true);
      expect(mockDetectParser).toHaveBeenCalled();
      expect(mockGetParser).not.toHaveBeenCalled();
    });

    it('returns error result when readCSVFile throws', async () => {
      mockReadAsStringAsync.mockResolvedValue('');

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('returns error result when Papa.parse calls error callback', async () => {
      mockPapaParse.mockImplementation((_: string, opts: { error: Function }) => {
        opts.error(new Error('Malformed CSV'));
      });

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Malformed CSV');
    });

    it('includes warnings from parser in session', async () => {
      mockParser.parse.mockReturnValue({
        days: [makeParsedDay('2025-01-15')],
        warnings: [{ line: 3, message: 'Skipped invalid row' }],
      });

      const result = await analyzeNutritionCSV(testUri, testFileName);

      expect(result.success).toBe(true);
      expect(result.session!.warnings).toEqual([
        { line: 3, message: 'Skipped invalid row' },
      ]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // analyzeCSVContent
  // ═══════════════════════════════════════════════════════════════
  describe('analyzeCSVContent', () => {
    const testFileName = 'test.csv';
    const csvContent = 'Date,Meal,Calories\n2025-01-15,Breakfast,500';

    beforeEach(() => {
      mockPapaParse.mockImplementation((content: string, opts: Record<string, unknown>) => ({
        meta: { fields: ['Date', 'Meal', 'Calories'] },
        data: [{ Date: '2025-01-15', Meal: 'Breakfast', Calories: '500' }],
      }));
      mockDetectParser.mockReturnValue({ source: 'myfitnesspal', parser: mockParser });
      mockParser.detect.mockReturnValue(true);
      mockParser.parse.mockReturnValue({
        days: [makeParsedDay('2025-01-15')],
        warnings: [],
      });
    });

    it('returns session for valid CSV content', () => {
      const result = analyzeCSVContent(csvContent, testFileName);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session!.source).toBe('myfitnesspal');
      expect(result.session!.status).toBe('ready');
      expect(result.session!.importType).toBe('daily_totals');
    });

    it('strips UTF-8 BOM from content', () => {
      const bomContent = '\uFEFF' + csvContent;

      analyzeCSVContent(bomContent, testFileName);

      // The content passed to Papa.parse should NOT start with BOM
      const parsedContent = mockPapaParse.mock.calls[0][0];
      expect(parsedContent.charCodeAt(0)).not.toBe(0xFEFF);
    });

    it('returns error when too many rows', () => {
      const bigData = Array.from({ length: 50_001 }, () => ({
        Date: '2025-01-15',
      }));
      mockPapaParse.mockReturnValue({
        meta: { fields: ['Date'] },
        data: bigData,
      });

      const result = analyzeCSVContent(csvContent, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('50,000');
    });

    it('returns error when selected source does not match headers', () => {
      mockGetParser.mockReturnValue(mockParser);
      mockParser.detect.mockReturnValue(false);

      const result = analyzeCSVContent(csvContent, testFileName, 'cronometer');

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't match");
      expect(result.error).toContain('Cronometer');
    });

    it('returns error when selected source has no parser', () => {
      mockGetParser.mockReturnValue(null);

      const result = analyzeCSVContent(csvContent, testFileName, 'loseit');

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't match");
    });

    it('returns error when no parser detected', () => {
      mockDetectParser.mockReturnValue(null);

      const result = analyzeCSVContent(csvContent, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not detect the format');
    });

    it('returns error when parser returns empty days', () => {
      mockParser.parse.mockReturnValue({ days: [], warnings: [] });

      const result = analyzeCSVContent(csvContent, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid nutrition data found');
    });

    it('returns error result when Papa.parse throws', () => {
      mockPapaParse.mockImplementation(() => {
        throw new Error('Parse explosion');
      });

      const result = analyzeCSVContent(csvContent, testFileName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parse explosion');
    });

    it('treats "unknown" selectedSource as auto-detect', () => {
      const result = analyzeCSVContent(csvContent, testFileName, 'unknown');

      expect(result.success).toBe(true);
      expect(mockDetectParser).toHaveBeenCalled();
      expect(mockGetParser).not.toHaveBeenCalled();
    });

    it('uses selected source parser when provided', () => {
      mockGetParser.mockReturnValue(mockParser);
      mockParser.detect.mockReturnValue(true);

      const result = analyzeCSVContent(csvContent, testFileName, 'macrofactor');

      expect(result.success).toBe(true);
      expect(mockGetParser).toHaveBeenCalledWith('macrofactor');
      expect(mockDetectParser).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // findExistingImportDates
  // ═══════════════════════════════════════════════════════════════
  describe('findExistingImportDates', () => {
    it('returns empty array for empty input', async () => {
      const result = await findExistingImportDates([]);

      expect(result).toEqual([]);
      // Should not even call getDatabase
      expect(mockGetDatabase).not.toHaveBeenCalled();
    });

    it('returns found dates from database', async () => {
      const mockDb = makeMockDb();
      mockDb.getAllAsync.mockResolvedValue([
        { date: '2025-01-15' },
        { date: '2025-01-17' },
      ]);
      mockGetDatabase.mockReturnValue(mockDb);

      const result = await findExistingImportDates([
        '2025-01-15',
        '2025-01-16',
        '2025-01-17',
      ]);

      expect(result).toEqual(['2025-01-15', '2025-01-17']);
      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(1);
      // Verify the query uses placeholders
      const queryCall = mockDb.getAllAsync.mock.calls[0];
      expect(queryCall[0]).toContain('SELECT DISTINCT date');
      expect(queryCall[0]).toContain('Imported from');
      expect(queryCall[1]).toEqual(['2025-01-15', '2025-01-16', '2025-01-17']);
    });

    it('batches queries in chunks of 500', async () => {
      const mockDb = makeMockDb();
      // First batch returns some dates, second returns different dates
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ date: '2025-01-01' }])
        .mockResolvedValueOnce([{ date: '2025-02-15' }]);
      mockGetDatabase.mockReturnValue(mockDb);

      // Create 600 dates (> 500 = 2 batches)
      const dates = Array.from({ length: 600 }, (_, i) => {
        const d = i + 1;
        const month = Math.ceil(d / 28);
        const day = ((d - 1) % 28) + 1;
        return `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      });

      const result = await findExistingImportDates(dates);

      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(2);
      // First batch should have 500 placeholders
      const firstQuery = mockDb.getAllAsync.mock.calls[0];
      expect(firstQuery[1]).toHaveLength(500);
      // Second batch should have 100 placeholders
      const secondQuery = mockDb.getAllAsync.mock.calls[1];
      expect(secondQuery[1]).toHaveLength(100);
      // Both results combined
      expect(result).toEqual(['2025-01-01', '2025-02-15']);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reparseSession
  // ═══════════════════════════════════════════════════════════════
  describe('reparseSession', () => {
    const testUri = 'file:///cache/test.csv';

    beforeEach(() => {
      mockReadAsStringAsync.mockResolvedValue('Date,Meal,Calories\n2025-01-15,Breakfast,500');
      mockPapaParse.mockImplementation((content: string, opts: { complete: Function }) => {
        opts.complete({
          meta: { fields: ['Date', 'Meal', 'Calories'] },
          data: [{ Date: '2025-01-15', Meal: 'Breakfast', Calories: '500' }],
        });
      });
    });

    it('re-parses session with new import type', async () => {
      const originalSession = makeSession({ importType: 'daily_totals', source: 'cronometer' });
      const newDays = [makeParsedDay('2025-01-15'), makeParsedDay('2025-01-16')];
      const reparsedParser = {
        detect: jest.fn(() => true),
        parse: jest.fn(() => ({ days: newDays, warnings: [{ line: 2, message: 'warn' }] })),
      };
      mockGetParser.mockReturnValue(reparsedParser);

      const result = await reparseSession(testUri, originalSession, 'individual_foods');

      expect(mockGetParser).toHaveBeenCalledWith('cronometer');
      expect(reparsedParser.parse).toHaveBeenCalledWith(
        expect.any(Array),
        'individual_foods'
      );
      expect(result.importType).toBe('individual_foods');
      expect(result.parsedDays).toEqual(newDays);
      expect(result.totalDays).toBe(2);
      expect(result.warnings).toEqual([{ line: 2, message: 'warn' }]);
      // Other session fields should be preserved
      expect(result.id).toBe(originalSession.id);
      expect(result.source).toBe('cronometer');
    });

    it('throws when no parser found for source', async () => {
      mockGetParser.mockReturnValue(null);
      const session = makeSession({ source: 'myfitnesspal' });

      await expect(reparseSession(testUri, session, 'individual_foods')).rejects.toThrow(
        'No parser found for source: myfitnesspal'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // executeNutritionImport
  // ═══════════════════════════════════════════════════════════════
  describe('executeNutritionImport', () => {
    it('imports all meals when no duplicates', async () => {
      const mockDb = makeMockDb();
      mockGetDatabase.mockReturnValue(mockDb);
      const session = makeSession({
        parsedDays: [makeParsedDay('2025-01-15'), makeParsedDay('2025-01-16')],
        totalDays: 2,
        duplicateDates: [],
      });

      const result = await executeNutritionImport(session);

      expect(result.success).toBe(true);
      expect(result.importedDays).toBe(2);
      expect(result.skippedDays).toBe(0);
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
      // Verify meal data shape
      const batchArg = mockCreateBatch.mock.calls[0][0];
      expect(batchArg).toHaveLength(2); // 1 meal per day * 2 days
      expect(batchArg[0]).toEqual({
        date: '2025-01-15',
        mealType: MealType.Breakfast,
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
        description: 'Imported from MyFitnessPal',
      });
    });

    it('skips duplicate days with skip resolution', async () => {
      const mockDb = makeMockDb();
      mockGetDatabase.mockReturnValue(mockDb);
      const session = makeSession({
        parsedDays: [makeParsedDay('2025-01-15'), makeParsedDay('2025-01-16')],
        totalDays: 2,
        duplicateDates: ['2025-01-15'],
        conflictResolution: 'skip',
      });

      const result = await executeNutritionImport(session);

      expect(result.success).toBe(true);
      expect(result.importedDays).toBe(1);
      expect(result.skippedDays).toBe(1);
      // Only 1 meal inserted (from non-duplicate day)
      const batchArg = mockCreateBatch.mock.calls[0][0];
      expect(batchArg).toHaveLength(1);
      expect(batchArg[0].date).toBe('2025-01-16');
    });

    it('overwrites duplicate days with overwrite resolution', async () => {
      const mockDb = makeMockDb();
      mockGetDatabase.mockReturnValue(mockDb);
      const session = makeSession({
        parsedDays: [makeParsedDay('2025-01-15'), makeParsedDay('2025-01-16')],
        totalDays: 2,
        duplicateDates: ['2025-01-15'],
        conflictResolution: 'overwrite',
      });

      const result = await executeNutritionImport(session);

      expect(result.success).toBe(true);
      expect(result.importedDays).toBe(2);
      expect(result.skippedDays).toBe(0);
      // Should delete the overwrite date first
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM quick_add_entries'),
        ['2025-01-15']
      );
      // Both days should be inserted
      const batchArg = mockCreateBatch.mock.calls[0][0];
      expect(batchArg).toHaveLength(2);
    });

    it('reports progress via onProgress callback', async () => {
      const mockDb = makeMockDb();
      mockGetDatabase.mockReturnValue(mockDb);
      const session = makeSession({ totalDays: 2 });
      const onProgress = jest.fn();

      await executeNutritionImport(session, onProgress);

      expect(onProgress).toHaveBeenCalledWith({
        current: 2,
        total: 2,
      });
    });

    it('returns error result when transaction throws', async () => {
      const mockDb = makeMockDb();
      mockDb.withTransactionAsync.mockRejectedValue(new Error('DB write failed'));
      mockGetDatabase.mockReturnValue(mockDb);
      const session = makeSession();

      const result = await executeNutritionImport(session);

      expect(result.success).toBe(false);
      expect(result.importedDays).toBe(0);
      expect(result.skippedDays).toBe(0);
      expect(result.error).toContain('Import failed');
      expect(result.error).toContain('DB write failed');
    });

    it('rounds calorie and macro values', async () => {
      const mockDb = makeMockDb();
      mockGetDatabase.mockReturnValue(mockDb);
      const dayWithDecimals = makeParsedDay('2025-01-15', {
        meals: [
          {
            name: MealType.Lunch,
            calories: 523.7,
            protein: 31.2,
            carbs: 62.8,
            fat: 14.3,
          },
        ],
      });
      const session = makeSession({ parsedDays: [dayWithDecimals], totalDays: 1 });

      await executeNutritionImport(session);

      const batchArg = mockCreateBatch.mock.calls[0][0];
      expect(batchArg[0].calories).toBe(524);
      expect(batchArg[0].protein).toBe(31);
      expect(batchArg[0].carbs).toBe(63);
      expect(batchArg[0].fat).toBe(14);
    });

    it('uses correct source display name in description', async () => {
      const mockDb = makeMockDb();
      mockGetDatabase.mockReturnValue(mockDb);
      const session = makeSession({ source: 'cronometer' });

      await executeNutritionImport(session);

      const batchArg = mockCreateBatch.mock.calls[0][0];
      expect(batchArg[0].description).toBe('Imported from Cronometer');
    });

    it('handles multiple meals per day', async () => {
      const mockDb = makeMockDb();
      mockGetDatabase.mockReturnValue(mockDb);
      const multiMealDay: ParsedNutritionDay = {
        date: new Date(2025, 0, 15),
        meals: [
          { name: MealType.Breakfast, calories: 400, protein: 25, carbs: 50, fat: 10 },
          { name: MealType.Lunch, calories: 600, protein: 35, carbs: 70, fat: 20 },
          { name: MealType.Dinner, calories: 700, protein: 40, carbs: 80, fat: 25 },
        ],
        totals: { calories: 1700, protein: 100, carbs: 200, fat: 55 },
      };
      const session = makeSession({ parsedDays: [multiMealDay], totalDays: 1 });

      await executeNutritionImport(session);

      const batchArg = mockCreateBatch.mock.calls[0][0];
      expect(batchArg).toHaveLength(3);
      expect(batchArg[0].mealType).toBe(MealType.Breakfast);
      expect(batchArg[1].mealType).toBe(MealType.Lunch);
      expect(batchArg[2].mealType).toBe(MealType.Dinner);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanupCachedFile
  // ═══════════════════════════════════════════════════════════════
  describe('cleanupCachedFile', () => {
    it('is a no-op for null uri', async () => {
      await cleanupCachedFile(null);

      expect(mockGetInfoAsync).not.toHaveBeenCalled();
      expect(mockDeleteAsync).not.toHaveBeenCalled();
    });

    it('deletes file when it exists', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: true });

      await cleanupCachedFile('file:///cache/test.csv');

      expect(mockGetInfoAsync).toHaveBeenCalledWith('file:///cache/test.csv');
      expect(mockDeleteAsync).toHaveBeenCalledWith('file:///cache/test.csv', {
        idempotent: true,
      });
    });

    it('does not attempt delete when file does not exist', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: false });

      await cleanupCachedFile('file:///cache/gone.csv');

      expect(mockGetInfoAsync).toHaveBeenCalledWith('file:///cache/gone.csv');
      expect(mockDeleteAsync).not.toHaveBeenCalled();
    });

    it('swallows errors without throwing', async () => {
      mockGetInfoAsync.mockRejectedValue(new Error('FS error'));

      // Should not throw
      await expect(cleanupCachedFile('file:///cache/test.csv')).resolves.toBeUndefined();
    });

    it('swallows delete errors without throwing', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockDeleteAsync.mockRejectedValue(new Error('Delete failed'));

      await expect(cleanupCachedFile('file:///cache/test.csv')).resolves.toBeUndefined();
    });
  });
});
