/**
 * Data Export Service
 * Exports user data to CSV format for backup and analysis
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
} from '@/repositories';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ExportOptions {
  includeProfile?: boolean;
  includeGoals?: boolean;
  includeFoodLogs?: boolean;
  includeWeightLogs?: boolean;
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
   * Get export statistics
   */
  async getExportStats(): Promise<{
    foodLogCount: number;
    weightLogCount: number;
    firstLogDate: string | null;
    lastLogDate: string | null;
  }> {
    const foodLogs = await logEntryRepository.getAll();
    const quickAdds = await quickAddRepository.getAll();
    const weightLogs = await weightRepository.getAll();

    const allDates = [
      ...foodLogs.map((e) => e.date),
      ...quickAdds.map((q) => q.date),
      ...weightLogs.map((w) => w.date),
    ].sort();

    return {
      foodLogCount: foodLogs.length + quickAdds.length,
      weightLogCount: weightLogs.length,
      firstLogDate: allDates[0] || null,
      lastLogDate: allDates[allDates.length - 1] || null,
    };
  },

  /**
   * Export all data to a combined file
   */
  async exportAll(options: ExportOptions = {}): Promise<ExportResult> {
    const {
      includeProfile = true,
      includeGoals = true,
      includeFoodLogs = true,
      includeWeightLogs = true,
      includeSettings = true,
      startDate,
      endDate,
    } = options;

    try {
      const sections: string[] = [];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

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
        sections.push('=== FOOD LOGS ===');
        sections.push(await this.exportFoodLogs(startDate, endDate));
        sections.push('');
      }

      // Add weight logs
      if (includeWeightLogs) {
        sections.push('=== WEIGHT LOGS ===');
        sections.push(await this.exportWeightLogs(startDate, endDate));
        sections.push('');
      }

      const content = sections.join('\n');
      const fileName = `nutritionrx-export-${timestamp}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return { success: true, filePath };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  },

  /**
   * Share exported file
   */
  async shareExport(filePath: string): Promise<boolean> {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
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

    if (result.success && result.filePath) {
      const shared = await this.shareExport(result.filePath);
      if (!shared) {
        return { ...result, error: 'Failed to share file' };
      }
    }

    return result;
  },
};
