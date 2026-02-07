# NutritionRx CSV Import — Bug Fixes & Hardening Spec

> **Purpose:** Implementation prompt for Claude Code. Addresses all issues found in the NutritionRx CSV import audit.
>
> **Priority:** Pre-launch blocker — importing from MyFitnessPal is the #1 acquisition channel for nutrition apps.

---

## Table of Contents

1. [Fix 1: NutritionRxBackup Type Missing](#fix-1-nutritionrxbackup-type-missing)
2. [Fix 2: File Size Limit](#fix-2-file-size-limit)
3. [Fix 3: Duplicate Detection](#fix-3-duplicate-detection)
4. [Fix 4: Database Transaction Wrapping](#fix-4-database-transaction-wrapping)
5. [Fix 5: Silent Row Skipping](#fix-5-silent-row-skipping)
6. [Fix 6: Timezone Date Bug](#fix-6-timezone-date-bug)
7. [Fix 7: Back Navigation / State Cleanup](#fix-7-back-navigation--state-cleanup)
8. [Fix 8: BOM Character Handling](#fix-8-bom-character-handling)
9. [Fix 9: Parser Detection Collision](#fix-9-parser-detection-collision)
10. [Fix 10: Import Performance — Batch Inserts](#fix-10-import-performance--batch-inserts)
11. [Fix 11: Cached File Cleanup](#fix-11-cached-file-cleanup)
12. [Fix 12: ImportResult Type Shadow](#fix-12-importresult-type-shadow)
13. [Testing: Mock CSV Files](#testing-mock-csv-files)
14. [Testing: Manual QA Checklist](#testing-manual-qa-checklist)

---

## Fix 1: NutritionRxBackup Type Missing

**Severity:** Critical (compile-time failure)
**File:** Types file that references `NutritionRxBackup`

### Problem

The `NutritionRxBackup` type is imported but never defined. The JSON backup import path will fail at compile time.

### Fix

**For v1: Remove the dead import.** NutritionRx JSON backup import is not a v1 feature. The CSV-based NutritionRx parser already handles NutritionRx's own export format via `test_nutritionrx_backup.csv` pattern (detect headers: `Date, Meal, Type, Food Name`).

```typescript
// 1. Search for all references to NutritionRxBackup
// 2. Remove the import and any code paths that handle source === 'nutritionrx-backup'
// 3. Keep only the CSV-based NutritionRx parser (which detects Date, Meal, Type, Food Name)
```

### Acceptance Criteria

- [ ] App compiles with no TypeScript errors related to `NutritionRxBackup`
- [ ] `grep -r NutritionRxBackup src/` returns zero results
- [ ] The CSV-based NutritionRx parser still works for NutritionRx exports

---

## Fix 2: File Size Limit

**Severity:** High
**File:** `nutritionImportService.ts`

### Problem

No file size limit. The entire file is read into memory with `readAsStringAsync()`. A large CSV (100MB+) could crash the app. Nutrition CSVs from heavy MFP users (5+ years of daily logging) can be 20-50MB.

### Fix

Add a file size check before reading content, same pattern as GymRx:

```typescript
// In the file reading function, before readAsStringAsync

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 50_000; // ~10 years of daily logging with 4 meals/day × 3 items

const fileInfo = await FileSystem.getInfoAsync(uri);
if (fileInfo.exists && fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
  return {
    success: false,
    error:
      "This file is too large (max 10MB). Try exporting a smaller date range from your app.",
  };
}

// After PapaParse completes:
if (results.data.length > MAX_ROWS) {
  return {
    success: false,
    error: `This file has ${results.data.length.toLocaleString()} rows, which exceeds the maximum of ${MAX_ROWS.toLocaleString()}. Try exporting a smaller date range.`,
  };
}
```

**Why 50,000 rows?** Nutrition CSVs have more rows per day than workout CSVs. A user logging 15 food items/day × 365 days/year × 10 years = ~55,000 items. 50K is a generous cap that covers most real exports.

### Acceptance Criteria

- [ ] Files >10MB show a clear error before any parsing
- [ ] Files >50,000 rows show a clear error after parsing headers
- [ ] Error messages suggest exporting a smaller date range

---

## Fix 3: Duplicate Detection

**Severity:** High
**Files:** `nutritionImportService.ts`, new or updated repository method

### Problem

Importing the same file twice creates duplicate entries with no warning. The `ConflictResolution` type exists in `types/nutritionImport.ts:158` but is never used (dead code — see Fix 12). The `ImportResult` interface in the types file has `skippedDays` and `mergedDays` fields that are never populated.

**Date storage format** (from audit): Dates stored as `YYYY-MM-DD` strings via `date.toISOString().split('T')[0]` in the `date` column of `quick_add_entries`. Duplicate query pattern: `SELECT * FROM quick_add_entries WHERE date = ? AND description LIKE 'Imported from%'`.

### Fix

#### Step 1: Check for existing imported data before import

```typescript
// In nutritionImportService.ts — new function

async function findExistingImportDates(dates: string[]): Promise<Set<string>> {
  if (dates.length === 0) return new Set();

  // Single batched query — same pattern as GymRx's findCompletedDateStrings()
  const placeholders = dates.map(() => "?").join(",");
  const results = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date FROM quick_add_entries
     WHERE date IN (${placeholders})
     AND description LIKE 'Imported from%'`,
    dates,
  );
  return new Set(results.map((r) => r.date));
}
```

#### Step 2: Surface conflicts on the preview/confirm screen

Before the user taps "Import", check for overlapping dates and show a toggle:

```typescript
// On the confirm/preview screen

const allDates = session.parsedDays.map((d) => formatDateForStorage(d.date));
const existingDates = await findExistingImportDates(allDates);

if (existingDates.size > 0) {
  // Show UI: "X days already have imported data"
  // Toggle: "Skip days with existing data" (default: on)
  // Or: "Replace existing imported data"
}
```

#### Step 3: Apply conflict resolution during import

```typescript
// In executeNutritionImport

for (const day of session.parsedDays) {
  const dateStr = formatDateForStorage(day.date);

  if (duplicateDates.has(dateStr)) {
    if (conflictResolution === "skip") {
      skippedDays++;
      continue;
    } else if (conflictResolution === "overwrite") {
      // Delete existing imported entries for this date
      await db.runAsync(
        `DELETE FROM quick_add_entries
         WHERE date = ? AND description LIKE 'Imported from%'`,
        [dateStr],
      );
    }
    // 'merge' = just add alongside existing (current behavior)
  }

  // ... insert meals
}
```

### Acceptance Criteria

- [ ] Importing the same file twice shows a duplicate warning
- [ ] "Skip" option skips dates that already have imported data
- [ ] "Replace" option deletes old imported entries before inserting new ones
- [ ] `skippedDays` count is shown on the success screen
- [ ] First-time import (no conflicts) works without any extra prompts

---

## Fix 4: Database Transaction Wrapping

**Severity:** Medium
**File:** `nutritionImportService.ts` — lines 191-243

### Problem

The actual write loop (from audit):

```typescript
// nutritionImportService.ts:191-243
for (let i = 0; i < session.parsedDays.length; i++) {
  const day = session.parsedDays[i];
  for (const meal of day.meals) {
    await quickAddRepository.create(input); // ← one INSERT per meal, no transaction
  }
  importedDays++;
  await new Promise((resolve) => setTimeout(resolve, 10)); // ← 10ms delay per DAY
}
```

If import fails at day 50 of 100, 50 days of meals are already committed with no rollback. The user gets a partial import with no way to undo it. The 10ms delay is per day (not per meal as the original audit misstated).

### Fix

Wrap the entire import in a transaction and remove the 10ms delay:

```typescript
// In executeNutritionImport

export async function executeNutritionImport(
  session: NutritionImportSession,
  conflictResolution: ConflictResolution,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  let importedDays = 0;
  let skippedDays = 0;
  const errors: ImportError[] = [];

  try {
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < session.parsedDays.length; i++) {
        const day = session.parsedDays[i];
        const dateStr = formatDateForStorage(day.date);

        // Report progress
        onProgress?.({
          current: i + 1,
          total: session.totalDays,
          currentDate: formatDateForDisplay(day.date),
        });

        // Handle duplicates
        if (duplicateDates.has(dateStr)) {
          if (conflictResolution === "skip") {
            skippedDays++;
            continue;
          } else if (conflictResolution === "overwrite") {
            await db.runAsync(
              `DELETE FROM quick_add_entries WHERE date = ? AND description LIKE 'Imported from%'`,
              [dateStr],
            );
          }
        }

        // Insert all meals for this day
        for (const meal of day.meals) {
          await quickAddRepository.create({
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
    });

    return { success: true, importedDays, skippedDays, errors };
  } catch (error) {
    // Transaction automatically rolls back on error
    return {
      success: false,
      importedDays: 0,
      skippedDays: 0,
      error: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}. No data was saved.`,
      errors,
    };
  }
}
```

**Note on progress reporting inside transactions:** The `onProgress` callback still fires during the transaction, but the data isn't committed until the transaction completes. The UI progress bar works normally — the user just won't see partial data if they check the diary mid-import (which is fine).

**Note on the 10ms delay:** Remove the `await new Promise(resolve => setTimeout(resolve, 10))` delay. It was presumably there to yield the main thread for UI updates, but inside a transaction it just slows things down. The `onProgress` callback handles UI updates without needing artificial delays.

### Acceptance Criteria

- [ ] Failed import at any point results in zero data written (full rollback)
- [ ] Error message says "No data was saved" to reassure the user
- [ ] The 10ms delay per day is removed
- [ ] Progress bar still updates during import

---

## Fix 5: Silent Row Skipping

**Severity:** Medium
**Files:** All parsers

### Problem

Rows with unparseable dates are silently dropped. Users have no idea how many rows were lost or why. This erodes trust — if someone imports 2 years of MFP data and 50 days are silently missing, they may not notice until later.

### Fix

Track skipped rows and surface them on the preview screen.

```typescript
// In each parser's parse() method — collect warnings instead of silently skipping

interface ParseWarning {
  line: number;
  message: string;
  raw?: string; // the original row data for debugging
}

interface ParseResult {
  days: ParsedNutritionDay[];
  warnings: ParseWarning[];
}

// Example in MFP parser:
const warnings: ParseWarning[] = [];

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const date = parseDate(row["Date"]);

  if (!date || isNaN(date.getTime())) {
    warnings.push({
      line: i + 2, // +2 for 1-indexed + header row
      message: `Could not parse date: "${row["Date"]}"`,
    });
    continue;
  }

  const calories = parseNumber(row["Calories"]);
  if (calories === 0 && !row["Calories"]) {
    warnings.push({
      line: i + 2,
      message: `Missing calorie data for ${row["Date"]}`,
    });
    // Still import the row with 0 calories — it's valid data
  }

  // ... rest of parsing
}

return { days: parsedDays, warnings };
```

**Surface on preview screen:**

```typescript
// On the preview/confirm screen
if (warnings.length > 0) {
  // Show a collapsible section:
  // "⚠️ X rows had issues and were skipped"
  // Expandable list showing the first 10 warnings
  // "These rows had dates we couldn't read or were missing required data."
}
```

### Acceptance Criteria

- [ ] Skipped rows are counted and shown on the preview screen
- [ ] Warning messages explain why each row was skipped
- [ ] Valid rows still import even if some rows are skipped
- [ ] Empty calorie fields don't cause row to be skipped (0 is valid)

---

## Fix 6: Timezone Date Bug

**Severity:** Medium
**Files:** `nutritionImportService.ts`, all parsers

### Problem

From the audit — dates are stored via:

```typescript
formatDateForStorage(day.date); // → date.toISOString().split('T')[0]
```

`toISOString()` converts to UTC. For users in negative UTC offsets (UTC-5 through UTC-12), a local date like `2024-01-15T12:00:00-05:00` becomes `2024-01-15T17:00:00.000Z` which is fine, but `2024-01-15T00:00:00-12:00` becomes `2024-01-15T12:00:00.000Z` — still safe. However, if any parser constructs dates without the T12:00:00 midday anchor (e.g., `new Date('2024-01-15')` which is treated as UTC midnight), the split would work but the Date object itself would represent midnight UTC, and `getDate()` would return 14 in UTC-5.

The core issue: **using `toISOString()` for local date storage is a ticking time bomb.** Even if it works today, any parser change that constructs a Date at midnight instead of noon breaks it silently.

### Fix

Never use `toISOString()` for date-only values. Store the date components directly:

```typescript
// BEFORE (buggy):
function formatDateForStorage(date: Date): string {
  return date.toISOString().split("T")[0]; // UTC conversion — can shift day
}

// AFTER (safe):
function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // Local date — no timezone shift
}
```

**Also fix each parser's date parsing** to construct local dates:

```typescript
// MFP dates: "2024-01-15"
function parseMFPDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // Local date constructor
}

// Cronometer dates: "2024-01-15" (same format)
// Lose It! dates: "01/15/2024" (MM/DD/YYYY) or "2024-01-15"
function parseLoseItDate(dateStr: string): Date {
  // Handle both MM/DD/YYYY and YYYY-MM-DD
  if (dateStr.includes("/")) {
    const [month, day, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// MacroFactor: "2024-01-15" or "01/15/2024"
// Same handling as Lose It!
```

### Acceptance Criteria

- [ ] Dates are stored as local dates, never converted through UTC
- [ ] A food logged on Jan 15 is stored as "2024-01-15" regardless of timezone
- [ ] `formatDateForStorage` uses `getFullYear()/getMonth()/getDate()`, not `toISOString()`
- [ ] All 5 parsers construct dates with `new Date(year, month - 1, day)`

---

## Fix 7: Back Navigation / State Cleanup

**Severity:** Medium
**Files:** Import flow screens, `nutritionImportStore.ts`

### Problem

From the audit — `cancelSession()` at `nutritionImportStore.ts:150-158`:

```typescript
cancelSession: () => {
  set({
    currentSession: null,
    currentFileUri: null,
    progress: null,
    isLoading: false,
    error: null,
  });
},
```

**Only called in one place:** `success.tsx:23`, after successful import when user taps "View My Diary".

**NOT called on:**

- Back navigation from any screen (source, type, preview, progress)
- Modal dismiss
- Hardware back button
- `startSession()` does reset, but only fires when selecting a source — not on back nav

Same bug pattern as GymRx — if a user navigates back from preview or progress, stale session persists in Zustand. Next entry into the import flow shows old parsed data.

### Fix

Same approach as GymRx: reset on mount of the entry screen.

```typescript
// In the first screen of the import flow (welcome or source selection)

import { useEffect } from "react";
import { useNutritionImportStore } from "@/features/nutritionImport/stores/nutritionImportStore";

export default function ImportWelcome() {
  const cancelSession = useNutritionImportStore((s) => s.cancelSession);

  // Reset stale state every time this screen mounts
  useEffect(() => {
    cancelSession();
  }, []);

  // ... rest of component
}
```

**Also add a confirmation dialog on the preview screen** (where the user has already parsed a file and might lose progress):

```typescript
// On the preview screen — confirm before discarding
useEffect(() => {
  const unsubscribe = navigation.addListener("beforeRemove", (e) => {
    if (!currentSession?.parsedDays?.length) return;

    e.preventDefault();
    Alert.alert(
      "Discard Import?",
      "Going back will discard your parsed data. You can re-select your file.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.dispatch(e.data.action),
        },
      ],
    );
  });
  return unsubscribe;
}, [navigation, currentSession]);
```

### Acceptance Criteria

- [ ] Entering the import flow always starts with a clean state
- [ ] Back navigation from any screen resets the store on next entry
- [ ] Preview screen shows confirmation before discarding parsed data
- [ ] Dismissing modal doesn't leave zombie state

---

## Fix 8: BOM Character Handling

**Severity:** Medium
**File:** `nutritionImportService.ts`

### Problem

Same issue as GymRx — PapaParse doesn't strip UTF-8 BOM. MyFitnessPal's premium export sends a zip file with CSVs that may have BOM characters (especially if the user opens and re-saves in Excel). The BOM corrupts the first header name, causing parser detection to fail.

### Fix

Strip BOM before passing to PapaParse (identical to the GymRx fix):

```typescript
// After reading file content, before parsing
const content = await FileSystem.readAsStringAsync(uri);
const cleanContent =
  content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

const parsed = Papa.parse(cleanContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header: string) => header.trim(),
});
```

### Acceptance Criteria

- [ ] CSVs with UTF-8 BOM parse correctly
- [ ] First header detection works (e.g., `"Date"` not `"\uFEFFDate"`)
- [ ] CSVs without BOM are unaffected

---

## Fix 9: Parser Detection Collision

**Severity:** Low-Medium
**File:** Parser detection logic

### Problem

From the audit — parsers are checked in order: **MFP → Cronometer → Lose It! → MacroFactor → NutritionRx**. All detection is case-insensitive via `normalizeHeader()`.

Collision risks:

- **Lose It!** detects on `Date + Name + Type` — could false-match other formats that happen to have a `Type` column
- **MacroFactor** has broad detection: `Date + (Food Name|Food|Name) + (Calories|Energy|kcal)` — could match many formats
- **MFP** detects on `Date + Meal + Calories` — could match NutritionRx (which also has Date, Meal, plus Type and Food Name)

The **user explicitly selects their source app** on the source selection screen, but the auto-detection still runs and the user's selection may be ignored if a different parser matches first.

### Fix

When the user explicitly selects a source app, **skip auto-detection and use that parser directly**. Only use auto-detection for an "Auto-detect" or "Other" option:

```typescript
// In the parsing function

function getParser(
  source: NutritionSource,
  headers: string[],
): NutritionCSVParser | null {
  // If user explicitly selected a source, use that parser
  if (source !== "auto") {
    const parser = parserMap[source]; // { mfp: MFPParser, cronometer: CronometerParser, ... }
    if (parser && parser.detect(headers)) {
      return parser;
    }
    // User selected a source but headers don't match
    return null; // Will show error: "This doesn't look like a [Source] export"
  }

  // Auto-detection: check in order
  for (const parser of parsersInOrder) {
    if (parser.detect(headers)) return parser;
  }
  return null;
}
```

**When user-selected source doesn't match headers**, show a specific error:

```typescript
if (!parser) {
  return {
    success: false,
    error:
      source !== "auto"
        ? `This file doesn't match the expected ${getSourceDisplayName(source)} format. ` +
          `Make sure you exported from ${getSourceDisplayName(source)} and selected the correct file.`
        : "We couldn't detect the format of this CSV. Please select your source app manually.",
  };
}
```

### Acceptance Criteria

- [ ] User-selected source uses that parser directly (no auto-detection race)
- [ ] Wrong file for selected source shows a helpful error
- [ ] Auto-detect option (if present) still uses ordered detection
- [ ] MFP file with "MacroFactor" selected doesn't silently parse as MFP

---

## Fix 10: Import Performance — Batch Inserts

**Severity:** Medium
**File:** `nutritionImportService.ts`

### Problem

Each meal is a separate `INSERT` statement. For a power user with 4 meals/day × 365 days × 3 years = ~4,380 inserts, this is slow even inside a transaction. The 10ms delay per day adds 10+ seconds on top.

### Fix

Use batch inserts within the transaction. SQLite supports multi-value INSERT:

```typescript
// Batch insert meals — up to 100 at a time
const BATCH_SIZE = 100;
const allMeals: CreateQuickAddInput[] = [];

for (const day of session.parsedDays) {
  const dateStr = formatDateForStorage(day.date);

  // Handle duplicates (skip/overwrite)
  if (duplicateDates.has(dateStr) && conflictResolution === "skip") {
    skippedDays++;
    continue;
  }
  if (duplicateDates.has(dateStr) && conflictResolution === "overwrite") {
    await db.runAsync(
      `DELETE FROM quick_add_entries WHERE date = ? AND description LIKE 'Imported from%'`,
      [dateStr],
    );
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

// Batch insert
for (let i = 0; i < allMeals.length; i += BATCH_SIZE) {
  const batch = allMeals.slice(i, i + BATCH_SIZE);
  await quickAddRepository.createBatch(batch);

  // Progress update per batch (not per meal)
  onProgress?.({
    current: Math.min(i + BATCH_SIZE, allMeals.length),
    total: allMeals.length,
    currentDate: batch[batch.length - 1].date,
  });
}
```

**New repository method:**

```typescript
// In quickAddRepository.ts

async createBatch(inputs: CreateQuickAddInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const placeholders = inputs.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
  const values = inputs.flatMap((i) => [
    i.date, i.mealType, i.calories, i.protein, i.carbs, i.fat, i.description,
  ]);

  await db.runAsync(
    `INSERT INTO quick_add_entries (date, meal_type, calories, protein, carbs, fat, description)
     VALUES ${placeholders}`,
    values
  );
}
```

### Acceptance Criteria

- [ ] 3 years of daily data (4,000+ meals) imports in under 5 seconds
- [ ] The 10ms per-day delay is removed
- [ ] Progress bar updates during batch inserts
- [ ] Batch size of 100 prevents SQLite variable limit issues (max 999 variables)

---

## Fix 11: Cached File Cleanup

**Severity:** Low
**File:** `nutritionImportService.ts`

### Problem

`copyToCacheDirectory: true` in the document picker copies the file to the app's cache but it's never deleted after import completes.

### Fix

Delete the cached file after import (success or failure):

```typescript
// After import completes (in the store action or service)

async function cleanupCachedFile(uri: string | null): Promise<void> {
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

// Call after import success or failure:
await cleanupCachedFile(session.fileUri);
```

### Acceptance Criteria

- [ ] Cached CSV file is deleted after successful import
- [ ] Cached CSV file is deleted after failed import
- [ ] Missing/already-deleted file doesn't cause errors

---

## Fix 12: ImportResult Type Shadow

**Severity:** Low
**File:** `nutritionImportService.ts` line 21-25, `types/nutritionImport.ts` lines 158-180

### Problem

`types/nutritionImport.ts:158-180` defines the full types (from audit):

```typescript
export type ConflictResolution = "skip" | "overwrite" | "merge";

export interface ImportResult {
  success: boolean;
  importedDays: number;
  skippedDays: number; // ← never populated
  mergedDays: number; // ← never populated
  errors: ImportError[]; // ← never populated
}
```

But `nutritionImportService.ts:21-25` **shadows it** with a simpler version:

```typescript
export interface ImportResult {
  success: boolean;
  importedDays: number;
  error?: string;
}
```

The service never imports the types file version. All the conflict infrastructure (`ConflictResolution`, `ImportConflict`, `ImportError`) is dead code.

### Fix

Remove the local `ImportResult` from `nutritionImportService.ts` and import the full version from types:

```typescript
// In nutritionImportService.ts

// REMOVE this:
export interface ImportResult {
  success: boolean;
  importedDays: number;
  error?: string;
}

// IMPORT this instead:
import {
  ImportResult,
  ImportError,
  ConflictResolution,
} from "../types/nutritionImport";
```

Then update the service to populate all fields:

```typescript
return {
  success: true,
  importedDays,
  skippedDays,
  mergedDays: 0, // Not implemented in v1
  errors,
};
```

### Acceptance Criteria

- [ ] Single `ImportResult` type used across the codebase
- [ ] `skippedDays` is populated from the duplicate check
- [ ] Success screen shows skipped/error counts when relevant

---

## Testing: Mock CSV Files

Create test CSV files for each parser plus edge cases.

### File 1: `test_mfp_happy_path.csv` — MyFitnessPal

```csv
Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g),Cholesterol (mg),Sodium (mg),Sugars (g),Fiber (g)
2024-01-15,Breakfast,450,15,30,45,120,600,10,5
2024-01-15,Lunch,650,22,40,60,85,800,15,8
2024-01-15,Dinner,700,25,45,55,150,900,12,6
2024-01-15,Snacks,200,8,10,22,30,150,12,2
2024-01-16,Breakfast,400,12,28,42,100,550,8,4
2024-01-16,Lunch,600,20,38,58,80,750,14,7
2024-01-16,Dinner,750,28,42,62,160,950,10,5
2024-01-17,Breakfast,500,18,32,48,130,650,11,6
2024-01-17,Lunch,550,18,35,52,75,700,13,7
2024-01-17,Dinner,680,24,44,50,140,880,9,5
2024-01-17,Snacks,180,6,8,20,25,120,10,2
```

Tests: Standard MFP format, 3 days, 4 meal types, extra micronutrient columns (should be ignored).

### File 2: `test_mfp_with_bom.csv` — MFP with UTF-8 BOM

Same as File 1 but prepend `\xEF\xBB\xBF`. Tests BOM stripping.

### File 3: `test_cronometer_format.csv` — Cronometer

```csv
Day,Group,Food Name,Amount,Energy (kcal),Protein (g),Carbs (g),Fat (g),Fiber (g),Sugars (g)
2024-01-15,Breakfast,Oatmeal,"1 cup",300,10,54,6,4,1
2024-01-15,Breakfast,Banana,"1 medium",105,1.3,27,0.4,3.1,14
2024-01-15,Lunch,Grilled Chicken Breast,"6 oz",280,52,0,6,0,0
2024-01-15,Lunch,Brown Rice,"1 cup",215,5,45,1.8,3.5,0.7
2024-01-15,Lunch,Steamed Broccoli,"1 cup",55,3.7,11,0.6,5.1,2.2
2024-01-15,Dinner,Salmon Fillet,"5 oz",290,40,0,13,0,0
2024-01-15,Dinner,Sweet Potato,"1 medium",103,2.3,24,0.1,3.8,7.4
2024-01-16,Breakfast,Greek Yogurt,"1 cup",150,20,9,4,0,7
2024-01-16,Breakfast,Blueberries,"0.5 cup",42,0.5,11,0.2,1.8,7.4
2024-01-16,Lunch,Turkey Sandwich,"1 sandwich",420,28,38,16,3,5
2024-01-16,Dinner,"Pasta with Marinara, Homemade","2 cups",480,16,72,12,6,10
```

Tests: Cronometer format, `Energy (kcal)` header, `Group` for meal type, individual food items (not daily totals), commas in food names (quoted field).

### File 4: `test_loseit_format.csv` — Lose It!

```csv
Date,Name,Type,Calories,Fat (g),Protein (g),Carbohydrates (g),Saturated Fat (g),Cholesterol (mg),Sodium (mg),Sugars (g),Fiber (g)
01/15/2024,Oatmeal,Breakfast,300,6,10,54,1,0,150,1,4
01/15/2024,Banana,Breakfast,105,0.4,1.3,27,0.1,0,1,14,3.1
01/15/2024,Grilled Chicken,Lunch,280,6,52,0,1.5,130,75,0,0
01/15/2024,Running 30 min,Exercise,-300,0,0,0,0,0,0,0,0
01/15/2024,Salmon,Dinner,290,13,40,0,2.5,80,60,0,0
01/16/2024,Greek Yogurt,Breakfast,150,4,20,9,2.5,15,70,7,0
01/16/2024,Turkey Sub,Lunch,450,18,30,42,5,60,1200,6,3
01/16/2024,Cycling 45 min,Exercise,-400,0,0,0,0,0,0,0,0
01/16/2024,Steak,Dinner,500,28,55,0,11,150,80,0,0
```

Tests: Lose It! format, MM/DD/YYYY dates, Exercise rows that should be filtered out, extra columns.

### File 5: `test_macrofactor_format.csv` — MacroFactor

```csv
Date,Food Name,Calories,Protein (g),Carbs (g),Fat (g),Time,Servings
2024-01-15,Oatmeal,300,10,54,6,07:30,1
2024-01-15,Protein Shake,250,40,12,4,08:00,1
2024-01-15,Chicken & Rice Bowl,550,45,55,12,12:30,1
2024-01-15,Apple,95,0.5,25,0.3,15:00,1
2024-01-15,Salmon with Vegetables,480,42,18,22,19:00,1
2024-01-16,Eggs and Toast,380,22,28,18,07:45,1
2024-01-16,Burrito Bowl,620,38,62,20,12:00,1
2024-01-16,Protein Bar,220,20,24,8,15:30,1
2024-01-16,Pasta Bolognese,650,35,68,22,19:30,1
```

Tests: MacroFactor format, `Time` column for meal inference, `Servings` column.

### File 6: `test_nutritionrx_backup.csv` — NutritionRx own format

```csv
Date,Meal,Type,Food Name,Brand,Servings,Calories,Protein (g),Carbs (g),Fat (g)
2024-01-15,Breakfast,quick_add,Morning Shake,,1,350,30,35,10
2024-01-15,Lunch,food_entry,Chicken Breast,Kirkland,2,280,52,0,6
2024-01-15,Dinner,quick_add,Evening Meal,,1,600,40,50,22
2024-01-16,Breakfast,food_entry,Greek Yogurt,Fage,1.5,225,30,13.5,6
2024-01-16,Lunch,quick_add,Lunch Total,,1,550,38,48,18
2024-01-16,Dinner,food_entry,Salmon,Wild Caught,1,290,40,0,13
```

Tests: NutritionRx's own export format, `Type` column, `Brand` column.

### File 7: `test_empty.csv` — Empty file

```csv

```

### File 8: `test_headers_only.csv` — MFP headers, no data

```csv
Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)
```

### File 9: `test_malformed_rows.csv` — Mixed valid/invalid

```csv
Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)
2024-01-15,Breakfast,450,15,30,45
not-a-date,Lunch,650,22,40,60
2024-01-15,Dinner,,25,45,55
2024-01-15,,200,8,10,22
2024-01-16,Breakfast,abc,12,28,42
2024-01-16,Lunch,600,20,38,58
,,,,,,
2024-01-16,Dinner,750,28,42,62
```

Tests: Invalid date, missing calories, missing meal name, non-numeric calories, empty row.

### File 10: `test_special_characters.csv` — Unicode and quotes

```csv
Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)
2024-01-15,Breakfast,450,15,30,45
2024-01-15,Lunch,650,22,40,60
2024-01-15,Dinner,700,25,45,55
2024-01-15,Snacks,200,8,10,22
```

Note: also include food-name test in a Cronometer-format variant:

### File 10b: `test_cronometer_special_chars.csv`

```csv
Day,Group,Food Name,Amount,Energy (kcal),Protein (g),Carbs (g),Fat (g)
2024-01-15,Breakfast,"Müsli mit Früchten","1 cup",320,12,52,8
2024-01-15,Lunch,"Farmer's Market Salad","1 bowl",280,18,22,14
2024-01-15,Dinner,"Chicken ""Parmesan""","8 oz",520,42,28,24
```

Tests: Unicode (German umlauts), apostrophes, escaped quotes in food names.

### File 11: `test_wrong_format.csv` — Not nutrition data

```csv
Name,Email,Phone,Company
John Doe,john@example.com,555-1234,Acme Corp
Jane Smith,jane@example.com,555-5678,Globex
```

### File 12: `test_large_file.csv` — 60,000 rows

Generated programmatically — exceeds 50K row limit.

### File 13: `test_loseit_date_format.csv` — Lose It! with mixed dates

```csv
Date,Name,Type,Calories,Fat (g),Protein (g),Carbohydrates (g)
01/15/2024,Oatmeal,Breakfast,300,6,10,54
1/5/2024,Banana,Breakfast,105,0.4,1.3,27
2024-01-16,Chicken,Lunch,280,6,52,0
```

Tests: MM/DD/YYYY, M/D/YYYY (no zero-padding), YYYY-MM-DD mixed in same file.

### File 14: `test_duplicate_import.csv` — Small file for duplicate testing

```csv
Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)
2024-01-15,Breakfast,450,15,30,45
2024-01-15,Lunch,650,22,40,60
```

Tests: Import this file twice to verify duplicate detection triggers on second import.

---

## Testing: Manual QA Checklist

### Happy Path

- [ ] Import MFP CSV → preview shows correct day count, calorie totals → import → success
- [ ] Import Cronometer CSV → food names preserved → correct macro totals per day
- [ ] Import Lose It! CSV → Exercise rows filtered out → only food data imported
- [ ] Import MacroFactor CSV → meal times correctly categorized
- [ ] Import NutritionRx backup CSV → types and brands preserved
- [ ] Imported data appears in food diary on correct dates
- [ ] Imported data shows "Imported from [Source]" description

### Error Handling

- [ ] Empty file → user-friendly error
- [ ] Headers-only file → user-friendly error
- [ ] Wrong file format → clear "couldn't detect format" message
- [ ] File >10MB → file size error
- [ ] File >50,000 rows → row count error
- [ ] CSV with BOM → parses correctly
- [ ] Malformed rows → valid rows import, warnings shown on preview

### Duplicate Detection

- [ ] First import → no duplicate warning, all days import
- [ ] Second import of same file → duplicate warning shown
- [ ] "Skip" option → skipped days count shown on success
- [ ] "Replace" option → old data deleted, new data inserted
- [ ] Import different source for same dates → treated as separate (no conflict)

### Data Integrity

- [ ] Failed import halfway → no partial data (transaction rollback)
- [ ] Dates are correct across timezones (no off-by-one day shift)
- [ ] Lose It! exercise rows are not imported as food
- [ ] Zero-calorie entries are imported (not skipped)
- [ ] Macros round correctly (no floating point artifacts)

### Navigation & State

- [ ] Back from preview → re-entering shows clean state
- [ ] Dismiss modal → re-entering shows clean state
- [ ] Preview screen shows confirmation before discarding
- [ ] Cached file is cleaned up after import

### Performance

- [ ] 3 years of MFP data (4,000+ meals) imports in under 5 seconds
- [ ] Progress bar updates smoothly during import
- [ ] No 10ms delay per day

---

## Implementation Priority

| Fix                         | Priority | Effort | Risk if Skipped              |
| --------------------------- | -------- | ------ | ---------------------------- |
| Fix 1: Missing type         | **P0**   | Tiny   | Compile failure              |
| Fix 2: File size limit      | **P0**   | Small  | App crash on large files     |
| Fix 8: BOM handling         | **P0**   | Tiny   | Silent parse failure         |
| Fix 6: Timezone date bug    | **P0**   | Small  | Dates shift by 1 day         |
| Fix 3: Duplicate detection  | **P1**   | Medium | Accidental double-imports    |
| Fix 4: DB transaction       | **P1**   | Medium | Partial data on failure      |
| Fix 5: Silent row skipping  | **P1**   | Medium | Lost data without warning    |
| Fix 7: State cleanup        | **P1**   | Small  | Confusing stale state        |
| Fix 9: Parser collision     | **P1**   | Small  | Wrong parser used silently   |
| Fix 12: Type shadow         | **P2**   | Tiny   | Dead code confusion          |
| Fix 10: Batch inserts       | **P2**   | Medium | Slow imports for power users |
| Fix 11: Cached file cleanup | **P3**   | Tiny   | Minor storage waste          |

**Recommended approach:** All P0 and P1 before launch. P2/P3 in a fast-follow.
