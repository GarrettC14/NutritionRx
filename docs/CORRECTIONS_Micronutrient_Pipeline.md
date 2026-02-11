# NutritionRx — Micronutrient Data Pipeline: Code-Reality Corrections

## Purpose

This document corrects 8 mismatches between the Data Pipeline Rationalization prompt and the actual codebase. **Read this AFTER reading the main prompt. This overrides any conflicting information in the original.**

---

## Correction 1 [P0]: food_item_nutrients Schema — Missing Columns

**Problem:** The prompt writes `unit` and `source` columns to `food_item_nutrients`, but the table has neither.

**Real schema (from `013_micronutrients_and_photos.ts` line 34):**

```sql
-- Actual table:
CREATE TABLE IF NOT EXISTS food_item_nutrients (
  id TEXT PRIMARY KEY,           -- TEXT, not INTEGER AUTOINCREMENT
  food_item_id TEXT NOT NULL,
  nutrient_id TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL,      -- exists in current schema
  UNIQUE(food_item_id, nutrient_id),  -- composite unique constraint
  FOREIGN KEY (food_item_id) REFERENCES food_items(id)
);
```

**Real repository (from `micronutrientRepository.ts` line 44):**

Current inserts include `id` (TEXT) and `created_at`. The insert function generates these values. Match this pattern exactly.

**Fix — Add a migration:**

Create the migration in the correct location: `src/db/migrations/` (NOT `src/database/migrations/`). Register it in `src/db/migrations/index.ts` (line 20).

```typescript
// src/db/migrations/0XX_micronutrient_pipeline.ts
// (replace XX with the next available number)

import { SQLiteDatabase } from "expo-sqlite";

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE food_item_nutrients ADD COLUMN unit TEXT NOT NULL DEFAULT 'mg';
    ALTER TABLE food_item_nutrients ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown';
  `);
}
```

**Then register it in `src/db/migrations/index.ts` (line 20):**

```typescript
// Add to the migrations array — follow the existing import/registration pattern:
import { up as up0XX } from "./0XX_micronutrient_pipeline";
// ... add to migrations array in order
```

**Then update all writes in the prompt:**

```typescript
// micronutrientRepository.ts — update the insert function.
// IMPORTANT: Match the existing pattern which includes id (TEXT) and created_at.
async function insertFoodItemNutrient(data: {
  food_item_id: string;
  nutrient_id: string;
  amount: number;
  unit: string;
  source: string; // 'open_food_facts' | 'ai_photo' | 'usda' | 'user'
}): Promise<void> {
  const id = generateId(); // match whatever ID generation the existing function uses
  await db.runAsync(
    `INSERT INTO food_item_nutrients (id, food_item_id, nutrient_id, amount, unit, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.food_item_id,
      data.nutrient_id,
      data.amount,
      data.unit,
      data.source,
      new Date().toISOString(),
    ],
  );
}
```

**Note the UNIQUE constraint:** `UNIQUE(food_item_id, nutrient_id)` means you cannot insert the same nutrient twice for the same food item. For barcode re-scans or AI re-analysis, use `INSERT OR REPLACE` or delete-then-insert.

**Existing rows:** The `DEFAULT` clauses handle existing data. All pre-migration rows get `unit='mg'` and `source='unknown'`. Verify what unit convention the existing USDA write path assumes — if it stores amounts in each nutrient's canonical unit without recording which unit, `DEFAULT ''` may be more honest.

**Discovery command:**

```bash
# Verify migration path and registration pattern:
ls src/db/migrations/
cat src/db/migrations/index.ts
# Check existing insert pattern (id generation, created_at):
grep -A 15 "insertFoodItemNutrient\|INSERT.*food_item_nutrients" src/**/micronutrientRepository.ts
```

---

## Correction 2 [P0]: AI-Photo FK Bug + Missing DataSource Type

**Problem:** The FK bug is confirmed. Additionally, `DataSource` type doesn't include `'ai_photo'`, so adding it requires a type update.

**Real state (from `ai-photo.tsx` line 273, `database.ts` line 5, `domain.ts` line 7):**

```typescript
// domain.ts (line 7) — current DataSource type:
type DataSource = "open_food_facts" | "usda" | "user" | "seed";
// Note: 'open_food_facts' NOT 'openfoodfacts'
// 'ai_photo' is NOT included

// ai-photo.tsx (line 273) — current bug:
// Writes foodItemId: `ai_*` directly to log_entries
// No corresponding food_items row exists → FK violation
```

**Fix — three changes:**

### A. Extend DataSource (in BOTH files)

```typescript
// domain.ts (line 7) — add 'ai_photo':
type DataSource = "open_food_facts" | "usda" | "user" | "seed" | "ai_photo";

// database.ts (line 5) — update here too (may have its own DataSource reference):
// Check and add 'ai_photo' to match
```

Then fix every exhaustive check on DataSource:

```bash
grep -rn "DataSource\|dataSource\|data_source\|open_food_facts\|switch.*source" src/ --include="*.ts" --include="*.tsx" | head -20
```

**IMPORTANT:** Throughout this entire corrections doc and the main spec, use `'open_food_facts'` (with underscores), NOT `'openfoodfacts'`. This applies to every `source` parameter in `insertFoodItemNutrient` calls, transaction examples, etc.

### B. Create food_items row via foodRepository, then log_entries

Use `foodRepository.ts` (line 104) to create the `food_items` row. This centralizes required columns and defaults rather than writing raw SQL. Then use the returned ID for nutrient inserts and log entry.

```typescript
// ai-photo.tsx — corrected flow:
import { createFoodItem } from "@/repositories/foodRepository"; // line 104
import { insertFoodItemNutrient } from "@/repositories/micronutrientRepository";
import { addLogEntry } from "@/repositories/logRepository"; // or wherever log writes live

// 1. Create food_items row via repository (handles required columns + defaults)
const foodItem = await createFoodItem({
  name: gptResult.name,
  source: "ai_photo",
  calories: gptResult.calories,
  protein: gptResult.protein,
  carbs: gptResult.carbs,
  fat: gptResult.fat,
  // ... map remaining GPT fields to whatever createFoodItem expects
  // Check foodRepository.ts line 104 for the full parameter list
});
// foodItem.id is now a valid FK target

// 2. Write micronutrients
for (const micro of parsedMicronutrients) {
  await insertFoodItemNutrient({
    food_item_id: foodItem.id,
    nutrient_id: micro.nutrientId,
    amount: micro.amount,
    unit: micro.unit,
    source: "ai_photo",
  });
}

// 3. NOW create log entry (FK is satisfied)
await addLogEntry({
  food_item_id: foodItem.id,
  // ... other log entry fields
});
```

**Discovery — verify createFoodItem signature:**

```bash
grep -A 20 "createFoodItem\|export.*function.*food" src/**/foodRepository.ts
```

---

## Correction 3 [P1]: no_data Blast Radius

**Problem:** Adding `'no_data'` to `NutrientStatus` breaks more than just `micronutrients.tsx`. There are at least 5 files with exhaustive type usage.

**Files that need `no_data` handling (from audit):**

| File                      | Line | What breaks                                                                                             |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------------- |
| `micronutrients.ts`       | 69   | Status label/icon/color maps (`Record<NutrientStatus, ...>`)                                            |
| `statusDisplay.ts`        | 10   | `STATUS_DISPLAY_LABELS`, `STATUS_ICONS`, `STATUS_TO_COLOR_KEY` maps                                     |
| `useFilteredNutrients.ts` | 20   | Filter/sort logic — `no_data` nutrients need to sort last or be excluded from status counts             |
| `NutrientDetailSheet.tsx` | 87   | Detail sheet defaults to 'adequate' when status is missing — needs `no_data` case                       |
| `micronutrients.tsx`      | 424  | The fallback we're already fixing                                                                       |
| `micronutrientStore.ts`   | 396  | `getStatusForIntake()` returns `'adequate'` when no RDA target exists — must return `'no_data'` instead |

**Fix — update all locations:**

```typescript
// 1. statusDisplay.ts (add to all Record<NutrientStatus, ...> maps):
export const STATUS_DISPLAY_LABELS: Record<NutrientStatus, string> = {
  // ... existing 6 statuses ...
  no_data: "No data yet",
};

export const STATUS_ICONS: Record<NutrientStatus, string> = {
  // ... existing 6 ...
  no_data: "help-circle-outline",
};

export const STATUS_TO_COLOR_KEY: Record<NutrientStatus, StatusColorKey> = {
  // ... existing 6 ...
  no_data: "noData", // add to statusColors too
};
```

```typescript
// 2. statusColors.ts — add noData token:
export const statusColorsDark = {
  // ... existing ...
  noData: "#484F58", // muted grey, lowest visual weight
};
export const statusColorsLight = {
  // ... existing ...
  noData: "#9CA3AF",
};
```

```typescript
// 3. useFilteredNutrients.ts — exclude no_data from status counts,
//    sort no_data nutrients to the bottom:
const statusOrder: Record<NutrientStatus, number> = {
  deficient: 0,
  low: 1,
  adequate: 2,
  optimal: 3,
  high: 4,
  excessive: 5,
  no_data: 99, // always last
};

// If there's a count per status, exclude no_data:
const statusCounts = nutrients.reduce(
  (acc, n) => {
    if (n.status !== "no_data") {
      acc[n.status] = (acc[n.status] || 0) + 1;
    }
    return acc;
  },
  {} as Record<NutrientStatus, number>,
);
```

```typescript
// 4. NutrientDetailSheet.tsx (line 87) — handle no_data:
// Find the default/fallback. Replace 'adequate' with proper handling:
const status = nutrient?.status ?? "no_data";

// In the detail sheet rendering, show a different treatment for no_data:
if (status === "no_data") {
  // Show "No intake data logged today" message
  // Grey out the progress bar
  // Hide the contributors section (nothing to show)
}
```

```typescript
// 5. micronutrients.ts (line 69) — update any switch/map:
// Find what's at this line and add no_data case
```

```typescript
// 6. micronutrientStore.ts (line 396) — getStatusForIntake():
// This function currently returns 'adequate' when no RDA target exists for a nutrient.
// That's the deepest source of the "lying adequate" bug — it must return 'no_data' instead.
//
// BEFORE:
// if (!target) return 'adequate';  // ← the lie
//
// AFTER:
// if (!target) return 'no_data';   // ← honest
```

**Discovery command to find ALL exhaustive NutrientStatus usages:**

```bash
grep -rn "NutrientStatus\|Record<NutrientStatus\|switch.*status.*case\|deficient.*low.*adequate" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".d.ts"
```

Fix every match. TypeScript will also flag these as errors after adding `no_data` to the union type — but only if the code uses exhaustive pattern matching. Some usages may silently fall through, which is worse. Search manually.

---

## Correction 4 [P1]: Store Aggregation Still Uses ALL_NUTRIENTS

**Problem:** The store's status generation in `micronutrientStore.ts` (line 226) iterates `ALL_NUTRIENTS` (76 items) and uses defaults for nutrients without targets. Even if the screen filters to 25, the store still computes and stores status for all 76, including garbage defaults.

**Real state (from `micronutrientStore.ts` line 226, `rdaTables.ts` line 734):**

The store:

1. Queries `food_item_nutrients` for the day
2. Iterates ALL nutrients (76)
3. For each, looks up RDA target
4. If no target → assigns a default status (probably 'adequate')
5. Stores the full 76-nutrient result

**Fix — rationalize at the store level, not just the screen:**

```typescript
// In micronutrientStore.ts, the aggregation function should:

// 1. Import the 25-nutrient list
import {
  TRACKED_NUTRIENTS,
  TRACKED_NUTRIENT_MAP,
} from "@/constants/trackedNutrients";

// 2. Only iterate tracked nutrients
async function loadDailyIntake(date: string): Promise<DailyIntakeMap> {
  const rawIntake = await queryDailyNutrients(date); // DB query — unchanged

  const result: DailyIntakeMap = {};

  for (const nutrient of TRACKED_NUTRIENTS) {
    const intake = rawIntake[nutrient.id];
    const target = getTargetForNutrient(nutrient.id, userProfile);

    if (!target) {
      // This shouldn't happen for the 25 tracked nutrients after RDA fix,
      // but handle gracefully:
      continue;
    }

    if (intake != null && intake > 0) {
      result[nutrient.id] = {
        amount: intake,
        status: calculateStatus(intake, target),
      };
    }
    // If no intake data → omit from result entirely.
    // The screen-level code (Correction 3) will treat missing keys as 'no_data'.
  }

  return result;
}
```

**Key change:** Don't iterate `ALL_NUTRIENTS`. Don't assign default statuses. Missing = missing. The screen handles display of missing data.

**Also check `rdaTables.ts` line 734** — there may be a fallback target generator for unknown nutrients. If so, remove or restrict it to only return targets for tracked nutrients.

---

## Correction 5 [P1]: Two UI Areas Assume USDA-Only

**Problem:** `log.tsx` (line 452) and `MicronutrientSnapshotWidget.tsx` (line 28) have hardcoded assumptions about micronutrient data only coming from USDA search entries.

**Fix — update both:**

### log.tsx (line 452)

Check what this code does. It likely:

- Shows/hides a micronutrient indicator badge on log entries
- Only shows it for entries with source='usda'

After the pipeline expansion, entries from `open_food_facts` and `ai_photo` will also have micronutrient data. Update the condition:

```typescript
// BEFORE (probably):
const hasMicronutrients = entry.source === "usda";

// AFTER:
const hasMicronutrients = ["usda", "open_food_facts", "ai_photo"].includes(
  entry.source,
);
// OR check food_item_nutrients directly:
const hasMicronutrients = entry.nutrientCount > 0;
```

### MicronutrientSnapshotWidget.tsx (line 28)

Check what assumption exists. It likely:

- Only counts USDA foods when computing "X of Y nutrients tracked"
- Or shows a message like "Log foods via search for micronutrient data"

Update to reflect that barcode and AI photo now contribute too:

```typescript
// Update any messaging:
// BEFORE: "Search foods by name for micronutrient tracking"
// AFTER: "Micronutrient data from barcode scans, food search, and photo analysis"
```

**Discovery:**

```bash
sed -n '440,465p' src/**/log.tsx 2>/dev/null || grep -n -B 2 -A 5 "micro\|usda\|source.*nutrient" src/**/log.tsx | head -30
sed -n '20,40p' src/**/MicronutrientSnapshotWidget.tsx 2>/dev/null || grep -n -B 2 -A 5 "usda\|source\|priority" src/**/MicronutrientSnapshotWidget.tsx | head -20
```

---

## Correction 6 [P1]: RDA Gaps Confirmed

**Problem:** Phosphorus, copper, and manganese are confirmed missing from `rdaTables.ts` (line 622). The spec correctly identifies this. No change to the spec needed — just confirming the fix is required.

**Fix (from original spec, unchanged):**

| Nutrient   | Male RDA    | Female RDA  | Upper Limit |
| ---------- | ----------- | ----------- | ----------- |
| phosphorus | 700 mg      | 700 mg      | 4000 mg     |
| copper     | 0.9 mg      | 0.9 mg      | 10 mg       |
| manganese  | 2.3 mg (AI) | 1.8 mg (AI) | 11 mg       |

Also verify choline:

```bash
grep -n "choline\|phosphorus\|copper\|manganese" src/**/rdaTables.ts
```

Add any missing entries following the existing format in the file.

---

## Correction 7 [P2]: TypeScript Ship Gate Is Broken

**Problem:** `npx tsc --noEmit` produces many pre-existing errors unrelated to this spec. The tsconfig includes test files that have their own type issues.

**Fix — replace the ship gate in all phases:**

```bash
# INSTEAD OF:
npx tsc --noEmit  # ❌ broken, pre-existing errors

# USE ONE OF:

# Option A (preferred): Create a scoped tsconfig for app-only checking
# Create tsconfig.app.json that excludes test files:
# { "extends": "./tsconfig.json", "exclude": ["**/*.test.*", "**/__tests__/**", "tests/**"] }
npx tsc --noEmit --project tsconfig.app.json

# Option B: Build gate — verify the app actually bundles
npx expo export --platform ios 2>&1 | tail -20
```

**Do NOT use `npx tsc --noEmit 2>&1 | grep ...` to filter by filename** — this hides real errors in unchanged files that your changes may have introduced (e.g., a type export used elsewhere).

**Update all "Verify: TypeScript compiles" steps in the prompt to use Option A or B.**

**Discovery:**

```bash
# Check if there's a separate app tsconfig:
ls tsconfig*.json
# Check what's included:
grep -A 5 "include\|exclude" tsconfig.json
```

---

## Correction 8 [P2]: Wrap Multi-Step Writes in Transactions

**Problem:** Phase 2 (barcode) and Phase 3 (AI photo) do multi-step writes that can leave orphaned rows on crash.

**Important scope clarification:** The barcode scan flow does NOT write `log_entries` during the scan step. `scan.tsx` (line 55) fetches the food data from OpenFoodFacts and then navigates to the log screen, where the user confirms and creates the log entry separately. So the barcode transaction wraps food_items + food_item_nutrients only, inside `openFoodFactsApi.ts`. The AI photo flow DOES create the log entry in the same step, so its transaction wraps all three.

**Real transaction support (from `database.ts` line 47):**

Check what transaction API is available:

```bash
grep -n "transaction\|withTransaction\|execAsync\|BEGIN\|COMMIT" src/**/database.ts
```

**Fix — wrap both save flows:**

### Barcode scan save (Phase 2) — in `openFoodFactsApi.ts`:

The transaction wraps food item creation + micronutrient writes. Log entry creation happens later in a separate screen.

```typescript
// In openFoodFactsApi.ts — when saving parsed OFF product:
await db.withTransactionAsync(async () => {
  // 1. Create/update food_items row (may already exist for this barcode)
  await upsertFoodItem(foodItem);

  // 2. Write micronutrients
  for (const micro of extractedMicronutrients) {
    await insertFoodItemNutrient({
      food_item_id: foodItem.id,
      nutrient_id: micro.nutrientId,
      amount: micro.amount,
      unit: micro.unit,
      source: "open_food_facts", // correct literal
    });
  }

  // NOTE: No log entry here — that happens in the log screen after user confirms
});
```

### AI photo save (Phase 3) — in `ai-photo.tsx`:

The transaction wraps food item + micronutrients + log entry (all three happen in one step here).

```typescript
await db.withTransactionAsync(async () => {
  // 1. Create food_items row via repository (handles required columns + defaults)
  //    Use foodRepository.ts (line 104) — NOT raw SQL
  const foodItem = await createFoodItem({
    name: gptResult.name,
    source: 'ai_photo',
    calories: gptResult.calories,
    protein: gptResult.protein,
    carbs: gptResult.carbs,
    fat: gptResult.fat,
    // ... check createFoodItem signature for full param list
  });

  // 2. Write micronutrients
  for (const micro of parsedMicronutrients) {
    await insertFoodItemNutrient({
      food_item_id: foodItem.id,   // use the id returned by createFoodItem
      nutrient_id: micro.nutrientId,
      amount: micro.amount,
      unit: micro.unit,
      source: 'ai_photo',
    });
  }

  // 3. Create log entry (FK now satisfied)
  await addLogEntry({ food_item_id: foodItem.id, ... });
});
```

**If `withTransactionAsync` doesn't exist**, use raw SQL:

```typescript
await db.execAsync("BEGIN TRANSACTION");
try {
  // ... all writes ...
  await db.execAsync("COMMIT");
} catch (error) {
  await db.execAsync("ROLLBACK");
  throw error;
}
```

**Check the exact API:**

```bash
grep -n "withTransaction\|execAsync\|runAsync" src/**/database.ts | head -10
```

---

## Updated Phase Order With Corrections

The original 4-phase structure is correct, but each phase now has additional steps:

### Phase 1 (Data Model Cleanup) — add:

- Step 0: Create migration in `src/db/migrations/`, register in `index.ts` (line 20), adding `unit` and `source` columns to `food_item_nutrients` **(Correction 1)**
- Step 3 expanded: Fix `no_data` in ALL 6 files including `getStatusForIntake()` at `micronutrientStore.ts` line 396 **(Correction 3)**
- Step 4 expanded: Rationalize store aggregation to iterate `TRACKED_NUTRIENTS` only **(Correction 4)**
- Step 5 added: Update `log.tsx` and `MicronutrientSnapshotWidget.tsx` USDA assumptions **(Correction 5)**
- All ship gates: Use scoped tsconfig or `expo export`, not bare `npx tsc --noEmit` **(Correction 7)**

### Phase 2 (Barcode Scanner) — add:

- Wrap food_items + food_item_nutrients writes in transaction inside `openFoodFactsApi.ts` — do NOT include log_entries (that happens in a separate screen) **(Correction 8)**
- Pass `source: 'open_food_facts'` to `insertFoodItemNutrient` **(Correction 1)**
- Include `id` (TEXT) and `created_at` in all inserts matching existing repository pattern **(Correction 1)**

### Phase 3 (AI Photo) — add:

- Extend `DataSource` type in BOTH `domain.ts` (line 7) AND `database.ts` (line 5) to include `'ai_photo'` **(Correction 2)**
- Use `createFoodItem` from `foodRepository.ts` (line 104) to create `food_items` row — NOT raw SQL **(Correction 2)**
- Wrap food_items + food_item_nutrients + log_entries in transaction **(Correction 8)**
- Pass `source: 'ai_photo'` to `insertFoodItemNutrient` **(Correction 1)**

### Phase 4 (Integration Testing) — add:

- Verify `no_data` renders correctly in detail sheet, filter chips, status counts **(Correction 3)**
- Verify weight of `no_data` nutrients in snapshot widget **(Correction 5)**

---

## Checklist: Verify All 8 Corrections Applied

- [ ] **C1:** Migration file is in `src/db/migrations/`, registered in `index.ts` (line 20); adds `unit` and `source` columns to `food_item_nutrients`; all INSERT statements include `id` (TEXT), `created_at`, `unit`, and `source`; respects `UNIQUE(food_item_id, nutrient_id)` constraint
- [ ] **C2:** `DataSource` type includes `'ai_photo'` in BOTH `domain.ts` (line 7) AND `database.ts` (line 5); AI photo uses `createFoodItem` from `foodRepository.ts` (line 104) to create `food_items` row before `log_entries`; all exhaustive DataSource checks handle the new value; source literals use `'open_food_facts'` (not `'openfoodfacts'`) everywhere
- [ ] **C3:** `no_data` added to `NutrientStatus`; all 6 files updated (`micronutrients.ts`, `statusDisplay.ts`, `useFilteredNutrients.ts`, `NutrientDetailSheet.tsx`, `micronutrients.tsx`, `micronutrientStore.ts`); `getStatusForIntake()` (line 396) returns `'no_data'` when no target exists; `no_data` sorts last in lists; excluded from status counts; detail sheet has distinct rendering
- [ ] **C4:** `micronutrientStore` aggregation iterates `TRACKED_NUTRIENTS` (25), not `ALL_NUTRIENTS` (76); no default status assignment for missing nutrients
- [ ] **C5:** `log.tsx` shows micronutrient badge for `open_food_facts` and `ai_photo` entries, not just USDA; `MicronutrientSnapshotWidget` messaging reflects all three data sources
- [ ] **C6:** `rdaTables.ts` has targets for phosphorus (700mg), copper (0.9mg), manganese (2.3/1.8mg), and choline (550/425mg)
- [ ] **C7:** Ship gates use scoped tsconfig (`tsconfig.app.json` excluding tests) or `expo export` build gate; no grep-filtering of tsc output
- [ ] **C8:** Barcode transaction wraps food_items + food_item_nutrients in `openFoodFactsApi.ts` (NOT log_entries — those happen in a separate screen); AI photo transaction wraps food_items + food_item_nutrients + log_entries in `ai-photo.tsx`; both use `foodRepository.ts` create path
