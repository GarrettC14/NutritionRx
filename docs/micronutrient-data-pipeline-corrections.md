# NutritionRx — Micronutrient Data Pipeline: Code-Reality Corrections

## Purpose

This document corrects 8 mismatches between the Data Pipeline Rationalization prompt and the actual codebase. **Read this AFTER reading the main prompt. This overrides any conflicting information in the original.**

---

## Correction 1 [P0]: `food_item_nutrients` Schema — Missing Columns

**Problem:** The prompt writes `unit` and `source` columns to `food_item_nutrients`, but the table has neither.

**Real schema (from `013_micronutrients_and_photos.ts` line 34):**

```sql
-- Actual table:
CREATE TABLE IF NOT EXISTS food_item_nutrients (
  id TEXT PRIMARY KEY,                 -- TEXT, not INTEGER AUTOINCREMENT
  food_item_id TEXT NOT NULL,
  nutrient_id TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
  UNIQUE (food_item_id, nutrient_id)
);
```

**Real repository (from `micronutrientRepository.ts` line 44):**

Current inserts include `id` (TEXT) and `created_at`. The insert function generates these values. Match this pattern exactly.

**Fix — Add a migration:**

Create the migration in the correct location: `src/db/migrations/` (NOT `src/database/migrations/`). Register it in `src/db/migrations/index.ts` and bump schema version.

```typescript
// src/db/migrations/018_micronutrient_pipeline.ts
import { SQLiteDatabase } from 'expo-sqlite';

export async function migration018MicronutrientPipeline(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE food_item_nutrients ADD COLUMN unit TEXT NOT NULL DEFAULT 'mg';
    ALTER TABLE food_item_nutrients ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown';

    INSERT INTO schema_version (version) VALUES (18);
  `);
}
```

**Then register it in `src/db/migrations/index.ts`:**

```typescript
import { migration018MicronutrientPipeline } from './018_micronutrient_pipeline';

export const CURRENT_SCHEMA_VERSION = 18;

export const migrations = [
  // ...existing migrations...
  migration018MicronutrientPipeline,
];
```

**Then update all writes in the prompt:**

```typescript
// micronutrientRepository.ts — update insert logic.
// IMPORTANT: Match existing pattern with id (TEXT) + created_at.
async function insertFoodItemNutrient(data: {
  food_item_id: string;
  nutrient_id: string;
  amount: number;
  unit: string;
  source: string; // 'open_food_facts' | 'ai_photo' | 'usda' | 'user'
}): Promise<void> {
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO food_item_nutrients
      (id, food_item_id, nutrient_id, amount, unit, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.food_item_id, data.nutrient_id, data.amount, data.unit, data.source, now]
  );
}
```

**Note the UNIQUE constraint:** `UNIQUE(food_item_id, nutrient_id)` means same nutrient for same food item must upsert, not blindly insert.

**Existing rows:** `DEFAULT` clauses backfill old rows as `unit='mg'`, `source='unknown'`. Keep in mind historical rows may have mixed implied units.

---

## Correction 2 [P0]: AI-Photo FK Bug + Missing DataSource Type

**Problem:** The FK bug is confirmed. `DataSource` also lacks `'ai_photo'`.

**Real state (from `ai-photo.tsx` line ~273, `domain.ts` line 7, `types/database.ts` line 5):**

```typescript
// current DataSource:
type DataSource = 'open_food_facts' | 'usda' | 'user' | 'seed';
// 'ai_photo' not included

// ai-photo.tsx currently writes ai_* IDs to log_entries
// without creating a food_items row first => FK violation
```

**Fix — three changes:**

### A. Extend DataSource in BOTH type files

```typescript
// src/types/domain.ts
export type DataSource = 'open_food_facts' | 'usda' | 'user' | 'seed' | 'ai_photo';

// src/types/database.ts
export type DataSource = 'open_food_facts' | 'usda' | 'user' | 'seed' | 'ai_photo';
```

Then fix exhaustive source switches:

```bash
grep -rn "DataSource\|switch.*source\|open_food_facts" src/ --include="*.ts" --include="*.tsx"
```

### B. Create `food_items` row before `log_entries`

Use repository functions already in this codebase:
- `foodRepository.create` (`src/repositories/foodRepository.ts`)
- `addLogEntry` from `useFoodLogStore` OR `logEntryRepository.create`

```typescript
// 1. Create food row first
const foodItem = await foodRepository.create({
  name: gptResult.name,
  source: 'ai_photo',
  calories: gptResult.calories,
  protein: gptResult.protein,
  carbs: gptResult.carbs,
  fat: gptResult.fat,
  servingSize: 1,
  servingUnit: 'serving',
  isVerified: false,
  isUserCreated: false,
});

// 2. Write micronutrients for foodItem.id
// 3. Create log entry referencing foodItem.id
```

### C. Literal consistency

Use `'open_food_facts'` (with underscores) everywhere. Do not introduce `'openfoodfacts'`.

---

## Correction 3 [P1]: `no_data` Blast Radius

**Problem:** Adding `'no_data'` to `NutrientStatus` impacts more than `micronutrients.tsx`.

**Files requiring updates:**

| File | Why |
|---|---|
| `src/types/micronutrients.ts` | Add union member |
| `src/constants/statusDisplay.ts` | Exhaustive label/icon/color maps |
| `src/theme/statusColors.ts` | Add `noData` token |
| `src/features/micronutrients/hooks/useFilteredNutrients.ts` | Sort/count behavior |
| `src/features/micronutrients/components/NutrientDetailSheet.tsx` | Default status fallback currently `'adequate'` |
| `src/app/micronutrients.tsx` | Row fallback currently `'adequate'` |
| `src/stores/micronutrientStore.ts` | `getStatusForIntake()` fallback currently `'adequate'` |

**Fix highlights:**

```typescript
// NutrientStatus union
type NutrientStatus =
  | 'deficient'
  | 'low'
  | 'adequate'
  | 'optimal'
  | 'high'
  | 'excessive'
  | 'no_data';
```

```typescript
// store fallback
if (!target) return 'no_data';
```

```typescript
// screen row fallback
const status: NutrientStatus = hasData ? dailyIntake[nutrient.id].status : 'no_data';
```

Sort `no_data` last and exclude it from "status quality" chips/counts where that count is intended to reflect only measured statuses.

---

## Correction 4 [P1]: Store Aggregation Still Uses `ALL_NUTRIENTS`

**Problem:** `micronutrientStore.ts` iterates `ALL_NUTRIENTS` (76). Even if UI shows 25, store logic still computes across 76.

**Fix:**
1. Introduce/import `TRACKED_NUTRIENTS`.
2. Iterate tracked nutrients only in `loadDailyIntake`.
3. Stop assigning fake default status for missing data.
4. Let UI represent missing as `'no_data'`.
5. Recheck any fallback target behavior in `rdaTables` defaults.

---

## Correction 5 [P1]: Two UI Areas Assume USDA-Only

**Problem:** `log.tsx` and `MicronutrientSnapshotWidget.tsx` assume micronutrients are effectively USDA-only.

**Fix — update both:**

### `log.tsx`
- Always attempt `micronutrientRepository.getFoodNutrients(item.id)` first.
- Only fallback to USDA network fetch when cache is empty and `item.usdaFdcId` exists.
- Remove USDA-only wording in UI.

### `MicronutrientSnapshotWidget.tsx`
- Update source messaging to include barcode + AI photo + USDA.
- Revisit priority list so it matches the tracked-25 model.

---

## Correction 6 [P1]: RDA Gaps Confirmed

**Problem:** `phosphorus`, `copper`, `manganese` are missing; `choline` must be verified.

**Fix values:**

| Nutrient | Male RDA | Female RDA | UL |
|---|---|---|---|
| phosphorus | 700 mg | 700 mg | 4000 mg |
| copper | 0.9 mg | 0.9 mg | 10 mg |
| manganese | 2.3 mg (AI) | 1.8 mg (AI) | 11 mg |
| choline | 550 mg (AI) | 425 mg (AI) | 3500 mg |

---

## Correction 7 [P2]: TypeScript Ship Gate Is Broken

**Problem:** `npx tsc --noEmit` fails due to many pre-existing unrelated errors.

**Fix — replace ship gate:**

```bash
# preferred if added:
npx tsc --noEmit --project tsconfig.app.json

# build gate:
npx expo export --platform ios
```

Do not gate by grepping `tsc` output.

---

## Correction 8 [P2]: Wrap Multi-Step Writes in Transactions

**Problem:** Multi-step writes can leave partial state.

**Important scope note:** Barcode scan does not create `log_entries` in scan step. It fetches/saves food, then navigates to log screen for user confirmation.

**Fix:**

### Barcode (`openFoodFactsApi.ts`)
Wrap:
- `foodRepository.create` (or upsert path)
- micronutrient writes

Do not include `log_entries` here.

### AI photo (`ai-photo.tsx`)
Wrap:
- `foodRepository.create`
- micronutrient writes
- `addLogEntry` / `logEntryRepository.create`

Use `withTransaction` from `src/db/database.ts` or `db.withTransactionAsync`.

---

## Updated Phase Order With Corrections

### Phase 1 (Data model)
- Add migration 018 in `src/db/migrations/` and register it.
- Apply `no_data` changes across all exhaustive consumers.
- Switch store aggregation to `TRACKED_NUTRIENTS`.
- Remove USDA-only UI assumptions.

### Phase 2 (Barcode)
- Add OFF micronutrient extraction.
- Persist nutrients with `source='open_food_facts'`.
- Transaction wraps food + nutrients only.

### Phase 3 (AI photo)
- Extend datasource unions with `ai_photo`.
- Create `food_items` row via `foodRepository.create`.
- Persist micronutrients with `source='ai_photo'`.
- Create log entry after food row exists.
- Transaction wraps all three.

### Phase 4 (Integration)
- Verify `no_data` rendering/ordering/count behavior.
- Verify mixed-source aggregation (USDA + OFF + AI).

---

## Checklist: Verify All 8 Corrections Applied

- [ ] **C1:** Migration 018 added under `src/db/migrations/`, registered in `index.ts`, schema version bumped to 18
- [ ] **C1:** `food_item_nutrients` inserts now include `id`, `created_at`, `unit`, `source`, and use upsert semantics
- [ ] **C2:** `DataSource` includes `'ai_photo'` in `src/types/domain.ts` and `src/types/database.ts`
- [ ] **C2:** AI flow creates `food_items` row before log entry
- [ ] **C3:** `NutrientStatus` includes `no_data` and all exhaustive maps/sorts updated
- [ ] **C3:** `getStatusForIntake()` no-target fallback returns `no_data`, not `adequate`
- [ ] **C4:** Store aggregation iterates tracked 25 nutrients only
- [ ] **C5:** `log.tsx` and snapshot widget no longer USDA-only
- [ ] **C6:** `rdaTables.ts` includes phosphorus/copper/manganese/choline
- [ ] **C7:** Ship gate uses scoped tsconfig or expo build gate
- [ ] **C8:** Barcode transaction wraps food+nutrients; AI transaction wraps food+nutrients+log entry
