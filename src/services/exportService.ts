/**
 * Data Export Service
 * Exports user data to CSV or JSON format for backup and analysis
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  logEntryRepository,
  quickAddRepository,
  weightRepository,
  profileRepository,
  goalRepository,
  settingsRepository,
  waterRepository,
  DEFAULT_WATER_GOAL,
  DEFAULT_GLASS_SIZE_ML,
} from '@/repositories';
import {
  ExportFormat,
  ExportDataType,
  NutritionRxBackup,
  CustomFoodExport,
  WeightEntryExport,
  WaterEntryExport,
  SettingsExport,
  GoalsExport,
} from '@/types/nutritionImport';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  recordsExported?: number;
  error?: string;
}

export interface ExportOptions {
  format?: ExportFormat;
  includeProfile?: boolean;
  includeGoals?: boolean;
  includeFoodLogs?: boolean;
  includeWeightLogs?: boolean;
  includeWaterLogs?: boolean;
  includeSettings?: boolean;
  startDate?: string;
  endDate?: string;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const arrayToCSV = (headers: string[], rows: any[][]): string => {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map((row) => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
};

export const exportService = {
  /**
   * Export food log entries to CSV
   */
  async exportFoodLogs(startDate?: string, endDate?: string): Promise<string> {
    const entries = await logEntryRepository.getAll();
    const quickAdds = await quickAddRepository.getAll();

    // Filter by date range if specified
    const filteredEntries = entries.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    const filteredQuickAdds = quickAdds.filter((q) => {
      if (startDate && q.date < startDate) return false;
      if (endDate && q.date > endDate) return false;
      return true;
    });

    const headers = [
      'Date',
      'Meal',
      'Type',
      'Food Name',
      'Brand',
      'Servings',
      'Calories',
      'Protein (g)',
      'Carbs (g)',
      'Fat (g)',
      'Notes',
    ];

    const rows: any[][] = [];

    // Add log entries
    for (const entry of filteredEntries) {
      rows.push([
        entry.date,
        entry.mealType,
        'Food',
        entry.foodName,
        entry.foodBrand || '',
        entry.servings,
        entry.calories,
        entry.protein,
        entry.carbs,
        entry.fat,
        entry.notes || '',
      ]);
    }

    // Add quick adds
    for (const qa of filteredQuickAdds) {
      rows.push([
        qa.date,
        qa.mealType,
        'Quick Add',
        qa.description || 'Quick Add',
        '',
        1,
        qa.calories,
        qa.protein || '',
        qa.carbs || '',
        qa.fat || '',
        '',
      ]);
    }

    // Sort by date
    rows.sort((a, b) => a[0].localeCompare(b[0]));

    return arrayToCSV(headers, rows);
  },

  /**
   * Export weight entries to CSV
   */
  async exportWeightLogs(startDate?: string, endDate?: string): Promise<string> {
    const entries = await weightRepository.getAll();

    const filteredEntries = entries.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    const headers = ['Date', 'Weight (kg)', 'Weight (lbs)', 'Notes'];

    const rows = filteredEntries.map((e) => [
      e.date,
      e.weightKg.toFixed(2),
      (e.weightKg * 2.20462).toFixed(2),
      e.notes || '',
    ]);

    return arrayToCSV(headers, rows);
  },

  /**
   * Export profile data
   */
  async exportProfile(): Promise<string> {
    const profile = await profileRepository.getOrCreate();

    const headers = ['Field', 'Value'];
    const rows = [
      ['Sex', profile.sex || ''],
      ['Date of Birth', profile.dateOfBirth ? formatDate(profile.dateOfBirth) : ''],
      ['Height (cm)', profile.heightCm?.toString() || ''],
      ['Activity Level', profile.activityLevel || ''],
      ['Onboarding Completed', profile.hasCompletedOnboarding ? 'Yes' : 'No'],
      ['Created At', formatDate(profile.createdAt)],
      ['Updated At', formatDate(profile.updatedAt)],
    ];

    return arrayToCSV(headers, rows);
  },

  /**
   * Export goals data
   */
  async exportGoals(): Promise<string> {
    const activeGoal = await goalRepository.getActiveGoal();

    if (!activeGoal) {
      return 'No active goal found';
    }

    const headers = ['Field', 'Value'];
    const rows = [
      ['Goal Type', activeGoal.type],
      ['Target Weight (kg)', activeGoal.targetWeightKg?.toString() || 'Not set'],
      ['Target Rate (%/week)', activeGoal.targetRatePercent.toString()],
      ['Start Date', activeGoal.startDate],
      ['Start Weight (kg)', activeGoal.startWeightKg.toString()],
      ['Initial TDEE Estimate', activeGoal.initialTdeeEstimate.toString()],
      ['Initial Target Calories', activeGoal.initialTargetCalories.toString()],
      ['Initial Protein (g)', activeGoal.initialProteinG.toString()],
      ['Initial Carbs (g)', activeGoal.initialCarbsG.toString()],
      ['Initial Fat (g)', activeGoal.initialFatG.toString()],
      ['Current TDEE Estimate', activeGoal.currentTdeeEstimate.toString()],
      ['Current Target Calories', activeGoal.currentTargetCalories.toString()],
      ['Current Protein (g)', activeGoal.currentProteinG.toString()],
      ['Current Carbs (g)', activeGoal.currentCarbsG.toString()],
      ['Current Fat (g)', activeGoal.currentFatG.toString()],
      ['Is Active', activeGoal.isActive ? 'Yes' : 'No'],
    ];

    return arrayToCSV(headers, rows);
  },

  /**
   * Export settings
   */
  async exportSettings(): Promise<string> {
    const settings = await settingsRepository.getAll();

    const headers = ['Setting', 'Value'];
    const rows = [
      ['Daily Calorie Goal', settings.dailyCalorieGoal.toString()],
      ['Daily Protein Goal (g)', settings.dailyProteinGoal.toString()],
      ['Daily Carbs Goal (g)', settings.dailyCarbsGoal.toString()],
      ['Daily Fat Goal (g)', settings.dailyFatGoal.toString()],
      ['Weight Unit', settings.weightUnit],
      ['Theme', settings.theme],
      ['Notifications Enabled', settings.notificationsEnabled ? 'Yes' : 'No'],
      ['Reminder Time', settings.reminderTime || 'Not set'],
    ];

    return arrayToCSV(headers, rows);
  },

  /**
   * Export water log entries to CSV
   */
  async exportWaterLogs(startDate?: string, endDate?: string): Promise<string> {
    const entries = await waterRepository.getAll();

    const filteredEntries = entries.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    const headers = ['Date', 'Glasses', 'Glass Size (ml)', 'Total (ml)', 'Goal Met'];

    const rows = filteredEntries.map((e) => {
      const glassSize = DEFAULT_GLASS_SIZE_ML;
      const totalMl = e.glasses * glassSize;
      const goalMet = e.glasses >= DEFAULT_WATER_GOAL;
      return [e.date, e.glasses.toString(), glassSize.toString(), totalMl.toString(), goalMet ? 'Yes' : 'No'];
    });

    return arrayToCSV(headers, rows);
  },

  /**
   * Get export statistics
   */
  async getExportStats(): Promise<{
    foodLogCount: number;
    weightLogCount: number;
    waterLogCount: number;
    firstLogDate: string | null;
    lastLogDate: string | null;
  }> {
    const foodLogs = await logEntryRepository.getAll();
    const quickAdds = await quickAddRepository.getAll();
    const weightLogs = await weightRepository.getAll();
    const waterLogs = await waterRepository.getAll();

    const allDates = [
      ...foodLogs.map((e) => e.date),
      ...quickAdds.map((q) => q.date),
      ...weightLogs.map((w) => w.date),
      ...waterLogs.map((w) => w.date),
    ].sort();

    return {
      foodLogCount: foodLogs.length + quickAdds.length,
      weightLogCount: weightLogs.length,
      waterLogCount: waterLogs.length,
      firstLogDate: allDates[0] || null,
      lastLogDate: allDates[allDates.length - 1] || null,
    };
  },

  /**
   * Export all data to JSON format (NutritionRx Backup)
   */
  async exportToJSON(options: ExportOptions = {}): Promise<ExportResult> {
    const {
      includeGoals = true,
      includeFoodLogs = true,
      includeWeightLogs = true,
      includeWaterLogs = true,
      includeSettings = true,
      startDate,
      endDate,
    } = options;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let recordsExported = 0;

      const backup: NutritionRxBackup = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: {},
      };

      // Add food logs
      if (includeFoodLogs) {
        const entries = await logEntryRepository.getAll();
        const quickAdds = await quickAddRepository.getAll();

        const filteredEntries = entries.filter((e) => {
          if (startDate && e.date < startDate) return false;
          if (endDate && e.date > endDate) return false;
          return true;
        });

        const filteredQuickAdds = quickAdds.filter((q) => {
          if (startDate && q.date < startDate) return false;
          if (endDate && q.date > endDate) return false;
          return true;
        });

        // Group by date
        const dayMap = new Map<string, any>();
        for (const entry of filteredEntries) {
          const existing = dayMap.get(entry.date) || { date: new Date(entry.date), meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
          existing.meals.push({
            name: entry.mealType,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            foods: [{
              name: entry.foodName,
              amount: `${entry.servings} serving(s)`,
              calories: entry.calories,
              protein: entry.protein,
              carbs: entry.carbs,
              fat: entry.fat,
            }],
          });
          existing.totals.calories += entry.calories;
          existing.totals.protein += entry.protein;
          existing.totals.carbs += entry.carbs;
          existing.totals.fat += entry.fat;
          dayMap.set(entry.date, existing);
        }

        for (const qa of filteredQuickAdds) {
          const existing = dayMap.get(qa.date) || { date: new Date(qa.date), meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
          existing.meals.push({
            name: qa.mealType,
            calories: qa.calories,
            protein: qa.protein || 0,
            carbs: qa.carbs || 0,
            fat: qa.fat || 0,
          });
          existing.totals.calories += qa.calories;
          existing.totals.protein += (qa.protein || 0);
          existing.totals.carbs += (qa.carbs || 0);
          existing.totals.fat += (qa.fat || 0);
          dayMap.set(qa.date, existing);
        }

        backup.data.foodLogs = Array.from(dayMap.values());
        recordsExported += backup.data.foodLogs.length;
      }

      // Add weight entries
      if (includeWeightLogs) {
        const weightEntries = await weightRepository.getAll();
        const filteredWeights = weightEntries.filter((e) => {
          if (startDate && e.date < startDate) return false;
          if (endDate && e.date > endDate) return false;
          return true;
        });

        backup.data.weightEntries = filteredWeights.map((w) => ({
          date: w.date,
          weight: w.weightKg,
          unit: 'kg' as const,
          notes: w.notes,
        }));
        recordsExported += backup.data.weightEntries.length;
      }

      // Add water entries
      if (includeWaterLogs) {
        const waterEntries = await waterRepository.getAll();
        const filteredWater = waterEntries.filter((e) => {
          if (startDate && e.date < startDate) return false;
          if (endDate && e.date > endDate) return false;
          return true;
        });

        backup.data.waterEntries = filteredWater.map((w) => ({
          date: w.date,
          glasses: w.glasses,
          glassSize: DEFAULT_GLASS_SIZE_ML,
          unit: 'ml' as const,
        }));
        recordsExported += backup.data.waterEntries.length;
      }

      // Add settings
      if (includeSettings) {
        const settings = await settingsRepository.getAll();
        backup.data.settings = {
          weightUnit: settings.weightUnit === 'lbs' ? 'lb' : 'kg',
          waterUnit: 'ml',
          glassSize: DEFAULT_GLASS_SIZE_ML,
          dailyGlassGoal: DEFAULT_WATER_GOAL,
        };
      }

      // Add goals
      if (includeGoals) {
        const activeGoal = await goalRepository.getActiveGoal();
        if (activeGoal) {
          backup.data.goals = {
            calories: activeGoal.currentTargetCalories,
            protein: activeGoal.currentProteinG,
            carbs: activeGoal.currentCarbsG,
            fat: activeGoal.currentFatG,
          };
        }
      }

      const content = JSON.stringify(backup, null, 2);
      const fileName = `nutritionrx-backup-${timestamp}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return { success: true, filePath, fileName, recordsExported };
    } catch (error) {
      console.error('JSON export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  },

  /**
   * Export all data to a combined CSV file
   */
  async exportToCSV(options: ExportOptions = {}): Promise<ExportResult> {
    const {
      includeProfile = true,
      includeGoals = true,
      includeFoodLogs = true,
      includeWeightLogs = true,
      includeWaterLogs = true,
      includeSettings = true,
      startDate,
      endDate,
    } = options;

    try {
      const sections: string[] = [];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let recordsExported = 0;

      // Add profile
      if (includeProfile) {
        sections.push('=== PROFILE ===');
        sections.push(await this.exportProfile());
        sections.push('');
      }

      // Add goals
      if (includeGoals) {
        sections.push('=== GOALS ===');
        sections.push(await this.exportGoals());
        sections.push('');
      }

      // Add settings
      if (includeSettings) {
        sections.push('=== SETTINGS ===');
        sections.push(await this.exportSettings());
        sections.push('');
      }

      // Add food logs
      if (includeFoodLogs) {
        const entries = await logEntryRepository.getAll();
        const quickAdds = await quickAddRepository.getAll();
        const filteredCount = entries.filter((e) => {
          if (startDate && e.date < startDate) return false;
          if (endDate && e.date > endDate) return false;
          return true;
        }).length + quickAdds.filter((q) => {
          if (startDate && q.date < startDate) return false;
          if (endDate && q.date > endDate) return false;
          return true;
        }).length;
        recordsExported += filteredCount;

        sections.push('=== FOOD LOGS ===');
        sections.push(await this.exportFoodLogs(startDate, endDate));
        sections.push('');
      }

      // Add weight logs
      if (includeWeightLogs) {
        const weights = await weightRepository.getAll();
        const filteredCount = weights.filter((w) => {
          if (startDate && w.date < startDate) return false;
          if (endDate && w.date > endDate) return false;
          return true;
        }).length;
        recordsExported += filteredCount;

        sections.push('=== WEIGHT LOGS ===');
        sections.push(await this.exportWeightLogs(startDate, endDate));
        sections.push('');
      }

      // Add water logs
      if (includeWaterLogs) {
        const waterLogs = await waterRepository.getAll();
        const filteredCount = waterLogs.filter((w) => {
          if (startDate && w.date < startDate) return false;
          if (endDate && w.date > endDate) return false;
          return true;
        }).length;
        recordsExported += filteredCount;

        sections.push('=== WATER LOGS ===');
        sections.push(await this.exportWaterLogs(startDate, endDate));
        sections.push('');
      }

      const content = sections.join('\n');
      const fileName = `nutritionrx-export-${timestamp}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return { success: true, filePath, fileName, recordsExported };
    } catch (error) {
      console.error('CSV export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  },

  /**
   * Export all data to a combined file (supports both CSV and JSON)
   */
  async exportAll(options: ExportOptions = {}): Promise<ExportResult> {
    const format = options.format || 'csv';

    if (format === 'json') {
      return this.exportToJSON(options);
    }
    return this.exportToCSV(options);
  },

  /**
   * Share exported file
   */
  async shareExport(filePath: string, format: ExportFormat = 'csv'): Promise<boolean> {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device');
      }

      const mimeType = format === 'json' ? 'application/json' : 'text/csv';

      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: 'Export NutritionRx Data',
      });

      return true;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  },

  /**
   * Export and share in one step
   */
  async exportAndShare(options: ExportOptions = {}): Promise<ExportResult> {
    const result = await this.exportAll(options);
    const format = options.format || 'csv';

    if (result.success && result.filePath) {
      const shared = await this.shareExport(result.filePath, format);
      if (!shared) {
        return { ...result, error: 'Failed to share file' };
      }
    }

    return result;
  },
};
