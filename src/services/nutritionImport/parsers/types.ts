import { ParsedNutritionDay, ImportType } from '@/types/nutritionImport';

/**
 * Interface for CSV parsers that detect and parse nutrition data
 * from different app export formats.
 */
export interface NutritionCSVParser {
  /**
   * Detect if the CSV headers match this parser's expected format
   */
  detect(headers: string[]): boolean;

  /**
   * Parse the CSV data into standardized nutrition days
   */
  parse(data: Record<string, string>[], importType?: ImportType): ParsedNutritionDay[];
}

/**
 * Utility functions for parsing CSV data
 */
export const parserUtils = {
  /**
   * Safely parse a number from a string, returning 0 for invalid values
   */
  parseNumber(value: string | undefined | null): number {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Parse a date string in various formats
   * Supports: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
   */
  parseDate(value: string): Date | null {
    if (!value) return null;

    // Try YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    // Try MM/DD/YYYY format (US format)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [month, day, year] = value.split('/').map(Number);
      return new Date(year, month - 1, day);
    }

    // Try parsing as ISO date
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  },

  /**
   * Normalize a header string for comparison
   */
  normalizeHeader(header: string): string {
    return header.toLowerCase().trim();
  },

  /**
   * Check if headers contain all required fields (case-insensitive)
   */
  hasRequiredHeaders(headers: string[], required: string[]): boolean {
    const normalizedHeaders = headers.map((h) => this.normalizeHeader(h));
    return required.every((req) =>
      normalizedHeaders.some((h) => h.includes(this.normalizeHeader(req)))
    );
  },

  /**
   * Get value from row by column name (case-insensitive)
   */
  getValue(row: Record<string, string>, ...possibleKeys: string[]): string {
    for (const key of possibleKeys) {
      // Try exact match first
      if (row[key] !== undefined) return row[key];

      // Try case-insensitive match
      const lowerKey = key.toLowerCase();
      for (const [rowKey, value] of Object.entries(row)) {
        if (rowKey.toLowerCase() === lowerKey) {
          return value;
        }
      }
    }
    return '';
  },
};
