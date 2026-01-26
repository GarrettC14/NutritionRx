# NutritionRx Backup & Data Export Specification

## Overview

NutritionRx is offline-first with no cloud sync (MVP). All data lives on the user's device. This document defines the local backup and export strategy.

**Core Principles:**
- Users own their data
- Export should be easy and complete
- Import should be possible
- No cloud required

---

## 1. Data Export

### 1.1 Export Formats

| Format | Purpose | Includes |
|--------|---------|----------|
| **JSON** | Full backup, re-import | Everything |
| **CSV** | Spreadsheet analysis | Food log, weight |

### 1.2 JSON Export Structure

```json
{
  "export_metadata": {
    "app_name": "NutritionRx",
    "app_version": "1.0.0",
    "export_version": "1",
    "exported_at": "2026-01-25T12:00:00.000Z",
    "device_platform": "ios",
    "record_counts": {
      "food_items": 342,
      "log_entries": 1205,
      "quick_add_entries": 45,
      "weight_entries": 89,
      "goals": 2,
      "weekly_reflections": 12
    },
    "date_range": {
      "earliest": "2025-10-15",
      "latest": "2026-01-25"
    }
  },
  
  "user_profile": {
    "sex": "male",
    "date_of_birth": "1990-03-15",
    "height_cm": 178,
    "activity_level": "moderately_active"
  },
  
  "settings": {
    "weight_unit": "lbs",
    "theme": "dark",
    "daily_calorie_goal": 2000,
    "daily_protein_goal": 170,
    "daily_carbs_goal": 175,
    "daily_fat_goal": 65
  },
  
  "goals": [
    {
      "id": "goal-uuid-1",
      "type": "lose",
      "target_weight_kg": 75,
      "target_rate_percent": 0.5,
      "start_date": "2025-11-01",
      "start_weight_kg": 84,
      "is_active": true,
      "initial_tdee_estimate": 2450,
      "current_tdee_estimate": 2520,
      "created_at": "2025-11-01T08:00:00.000Z"
    }
  ],
  
  "weekly_reflections": [
    {
      "id": "reflection-uuid-1",
      "goal_id": "goal-uuid-1",
      "week_number": 1,
      "week_start_date": "2025-11-01",
      "week_end_date": "2025-11-07",
      "avg_calorie_intake": 1920,
      "weight_change_kg": -0.5,
      "new_tdee_estimate": 2480,
      "created_at": "2025-11-08T09:00:00.000Z"
    }
  ],
  
  "weight_entries": [
    {
      "id": "weight-uuid-1",
      "date": "2026-01-25",
      "weight_kg": 79.5,
      "notes": null,
      "created_at": "2026-01-25T07:30:00.000Z"
    }
  ],
  
  "custom_foods": [
    {
      "id": "food-uuid-custom-1",
      "name": "Mom's Lasagna",
      "brand": null,
      "barcode": null,
      "calories": 450,
      "protein": 22,
      "carbs": 35,
      "fat": 24,
      "serving_size": 300,
      "serving_unit": "g",
      "source": "user",
      "created_at": "2025-12-15T18:00:00.000Z"
    }
  ],
  
  "food_log": [
    {
      "id": "log-uuid-1",
      "date": "2026-01-25",
      "meal_type": "breakfast",
      "food_name": "Oatmeal with Banana",
      "food_id": "food-uuid-123",
      "servings": 1.5,
      "calories": 285,
      "protein": 8,
      "carbs": 52,
      "fat": 5,
      "created_at": "2026-01-25T08:00:00.000Z"
    }
  ],
  
  "quick_adds": [
    {
      "id": "quick-uuid-1",
      "date": "2026-01-20",
      "meal_type": "lunch",
      "description": "Restaurant meal estimate",
      "calories": 800,
      "protein": 35,
      "carbs": 70,
      "fat": 40,
      "created_at": "2026-01-20T12:30:00.000Z"
    }
  ]
}
```

### 1.3 CSV Export

Two CSV files in a zip archive:

**food_log.csv:**
```csv
date,meal_type,food_name,servings,calories,protein,carbs,fat,notes
2026-01-25,breakfast,Oatmeal with Banana,1.5,285,8,52,5,
2026-01-25,lunch,Grilled Chicken Salad,1,420,45,15,22,
2026-01-25,dinner,Salmon with Rice,1,550,40,45,20,
```

**weight_log.csv:**
```csv
date,weight_kg,weight_lbs,notes
2026-01-25,79.5,175.3,
2026-01-24,79.8,175.9,
2026-01-23,79.6,175.5,Morning after workout
```

### 1.4 Export Service

```typescript
// services/exportService.ts

export interface ExportOptions {
  format: 'json' | 'csv';
  includeCustomFoods: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export async function exportData(options: ExportOptions): Promise<string> {
  const { format, includeCustomFoods, dateRange } = options;
  
  // Gather all data
  const profile = await profileRepository.get();
  const settings = await settingsRepository.getAll();
  const goals = await goalRepository.getAll();
  const reflections = await reflectionRepository.getAll();
  const weights = await weightRepository.getAll(dateRange);
  const logEntries = await logRepository.getAll(dateRange);
  const quickAdds = await quickAddRepository.getAll(dateRange);
  const customFoods = includeCustomFoods 
    ? await foodRepository.getUserCreated() 
    : [];
  
  if (format === 'json') {
    return exportAsJson({
      profile,
      settings,
      goals,
      reflections,
      weights,
      logEntries,
      quickAdds,
      customFoods,
    });
  } else {
    return exportAsCsv({
      weights,
      logEntries,
      quickAdds,
    });
  }
}

async function exportAsJson(data: ExportData): Promise<string> {
  const exportObj = {
    export_metadata: {
      app_name: 'NutritionRx',
      app_version: APP_VERSION,
      export_version: '1',
      exported_at: new Date().toISOString(),
      device_platform: Platform.OS,
      record_counts: {
        food_items: data.customFoods.length,
        log_entries: data.logEntries.length,
        quick_add_entries: data.quickAdds.length,
        weight_entries: data.weights.length,
        goals: data.goals.length,
        weekly_reflections: data.reflections.length,
      },
      date_range: calculateDateRange(data),
    },
    user_profile: data.profile,
    settings: data.settings,
    goals: data.goals,
    weekly_reflections: data.reflections,
    weight_entries: data.weights,
    custom_foods: data.customFoods,
    food_log: data.logEntries,
    quick_adds: data.quickAdds,
  };
  
  return JSON.stringify(exportObj, null, 2);
}
```

### 1.5 Export UI

```
┌─────────────────────────────────────────────────────────────┐
│  ← Export Your Data                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Format                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ● JSON (Full backup - recommended)                 │   │
│  │  ○ CSV (Spreadsheet-friendly)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Date Range                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ● All data                                         │   │
│  │  ○ Custom range                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Include                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [✓] Custom foods I created                         │   │
│  │  [✓] Goals and progress data                        │   │
│  │  [✓] Weight history                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your export will include:                                 │
│  • 1,205 food log entries                                  │
│  • 89 weight entries                                       │
│  • 42 custom foods                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Export Data]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.6 Sharing Export

```typescript
// After export is generated
async function shareExport(content: string, format: 'json' | 'csv'): Promise<void> {
  const filename = `nutritionrx-export-${formatDate(new Date())}.${format}`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  
  await FileSystem.writeAsStringAsync(fileUri, content);
  
  await Sharing.shareAsync(fileUri, {
    mimeType: format === 'json' ? 'application/json' : 'text/csv',
    dialogTitle: 'Save your NutritionRx data',
    UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
  });
}
```

---

## 2. Data Import

### 2.1 Import Flow

```
┌─────────────────────────────────────────────────────────────┐
│  ← Import Data                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                      📁                                    │
│                                                             │
│            Import from a backup file                       │
│                                                             │
│     Select a NutritionRx JSON export file to restore      │
│     your data.                                             │
│                                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Select File]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ⚠️ Important:                                             │
│  • Only JSON exports from NutritionRx are supported       │
│  • Importing will add to your existing data               │
│  • Duplicate entries will be skipped                      │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Import Confirmation

```
┌─────────────────────────────────────────────────────────────┐
│  ← Import Data                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ready to import                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  File: nutritionrx-export-2026-01-20.json          │   │
│  │  Exported: Jan 20, 2026                             │   │
│  │  From: iPhone 15 Pro                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  This file contains:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • 1,205 food log entries                          │   │
│  │  • 89 weight entries                                │   │
│  │  • 42 custom foods                                  │   │
│  │  • 2 goals with progress data                       │   │
│  │                                                     │   │
│  │  Date range: Oct 15, 2025 → Jan 20, 2026           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Import options:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [✓] Food log entries                               │   │
│  │  [✓] Weight entries                                 │   │
│  │  [✓] Custom foods                                   │   │
│  │  [ ] Goals and settings (will overwrite current)    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Import Selected]                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [Cancel]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Import Service

```typescript
// services/importService.ts

export interface ImportOptions {
  importFoodLog: boolean;
  importWeights: boolean;
  importCustomFoods: boolean;
  importGoalsAndSettings: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    logEntries: number;
    weights: number;
    customFoods: number;
    goals: number;
  };
  skipped: {
    duplicates: number;
    errors: number;
  };
  errors: string[];
}

export async function importData(
  jsonString: string,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: { logEntries: 0, weights: 0, customFoods: 0, goals: 0 },
    skipped: { duplicates: 0, errors: 0 },
    errors: [],
  };
  
  try {
    const data = JSON.parse(jsonString);
    
    // Validate export format
    if (!data.export_metadata?.app_name === 'NutritionRx') {
      throw new Error('Invalid export file format');
    }
    
    // Import in transaction
    await database.withTransaction(async () => {
      
      // Import custom foods first (others may reference them)
      if (options.importCustomFoods && data.custom_foods) {
        for (const food of data.custom_foods) {
          try {
            const exists = await foodRepository.exists(food.id);
            if (!exists) {
              await foodRepository.insert(food);
              result.imported.customFoods++;
            } else {
              result.skipped.duplicates++;
            }
          } catch (e) {
            result.skipped.errors++;
            result.errors.push(`Food: ${food.name} - ${e.message}`);
          }
        }
      }
      
      // Import weight entries
      if (options.importWeights && data.weight_entries) {
        for (const weight of data.weight_entries) {
          try {
            const exists = await weightRepository.existsForDate(weight.date);
            if (!exists) {
              await weightRepository.insert(weight);
              result.imported.weights++;
            } else {
              result.skipped.duplicates++;
            }
          } catch (e) {
            result.skipped.errors++;
          }
        }
      }
      
      // Import food log
      if (options.importFoodLog && data.food_log) {
        for (const entry of data.food_log) {
          try {
            const exists = await logRepository.exists(entry.id);
            if (!exists) {
              await logRepository.insert(entry);
              result.imported.logEntries++;
            } else {
              result.skipped.duplicates++;
            }
          } catch (e) {
            result.skipped.errors++;
          }
        }
      }
      
      // Import goals and settings (overwrites)
      if (options.importGoalsAndSettings) {
        if (data.user_profile) {
          await profileRepository.update(data.user_profile);
        }
        if (data.goals) {
          // Deactivate current goals first
          await goalRepository.deactivateAll();
          for (const goal of data.goals) {
            await goalRepository.insert(goal);
            result.imported.goals++;
          }
        }
      }
    });
    
    result.success = true;
  } catch (error) {
    result.errors.push(error.message);
  }
  
  return result;
}
```

---

## 3. Automatic Backups (Future)

### 3.1 Strategy

For V2, consider automatic local backups:

```typescript
const BACKUP_CONFIG = {
  // Create backup every N days
  intervalDays: 7,
  
  // Keep last N backups
  maxBackups: 4,
  
  // Backup on significant events
  triggers: [
    'goal_completed',
    'settings_changed',
    'before_import',
  ],
};
```

### 3.2 Backup Storage

```
/Documents/
  /backups/
    nutritionrx-backup-2026-01-25.json
    nutritionrx-backup-2026-01-18.json
    nutritionrx-backup-2026-01-11.json
    nutritionrx-backup-2026-01-04.json
```

---

## 4. Delete All Data

### 4.1 Warning Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ← Delete All Data                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      ⚠️                                    │
│                                                             │
│            Are you sure?                                   │
│                                                             │
│     This will permanently delete all your data:           │
│                                                             │
│     • 1,205 food log entries                               │
│     • 89 weight entries                                    │
│     • 42 custom foods                                      │
│     • All goals and progress                               │
│                                                             │
│     This cannot be undone.                                 │
│                                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           [Export Backup First]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           [Delete Everything]                       │   │  ← Red
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [Cancel]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Confirmation

Require typing "DELETE" to confirm:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Type DELETE to confirm                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           [Permanently Delete]                      │   │  ← Disabled until typed
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Health Platform Sync (Future)

### 5.1 Apple Health / Health Connect

For V2, sync with platform health apps:

**Write to Health:**
- Weight entries
- Nutrition data (calories, macros)
- Water intake (if added)

**Read from Health:**
- Weight (from other apps/devices)
- Active energy (for TDEE adjustment)

### 5.2 Implementation Notes

```typescript
// Future: services/healthSyncService.ts

export interface HealthSyncConfig {
  enabled: boolean;
  syncWeight: boolean;
  syncNutrition: boolean;
  readWeight: boolean;
  lastSyncAt: string | null;
}

// Write nutrition to Apple Health
async function syncNutritionToHealth(date: string): Promise<void> {
  const totals = await getDailyTotals(date);
  
  await AppleHealthKit.saveFood({
    foodName: 'NutritionRx Daily Total',
    date: new Date(date),
    energy: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  });
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial backup/export specification |
