# NutritionRx: Unify EWMA Trend Weight Algorithm

## Context

NutritionRx is a React Native (Expo) nutrition tracking app using TypeScript, Zustand for state management, and SQLite for local storage. It follows a "Nourished Calm" design philosophy (sage green, soft cream, terracotta).

There are currently **four different EWMA implementations** for trend weight across the codebase, each using a different smoothing constant. This causes the trend weight shown on the chart, stored in the database, displayed on the dashboard, and returned by repository queries to silently disagree with each other. This task unifies them into a single canonical implementation.

---

## Problem: Four Divergent Implementations

### 1. Database Storage (`src/utils/trendWeight.ts`)

- Uses `EWMA_ALPHA_PER_DAY = 0.1`
- Formula: `effectiveAlpha = 1 - (1 - 0.1)^dayGap`
- Persisted in `trend_weight_kg` column
- Cascades on insert/update/delete via `recomputeEWMAFromDate()`

### 2. Chart Display (`src/components/charts/WeightTrendChart.tsx`)

- Uses `HALF_LIFE_DAYS = 7`
- Formula: `alpha = 1 - 2^(-dtDays / 7)`
- Calculated locally in-component from raw weight entries
- **Does NOT use the stored `trend_weight_kg`**

### 3. Dashboard/Reflection (`calculateTrendWeight()` — in `src/utils/trendWeight.ts`)

- Uses `BASE_ALPHA_PER_DAY = 0.2` (14-day window)
- Called from the reflection flow (`reflectionStore.ts` line 233)
- Yet another smoothing constant

### 4. Repository Fallback (`weightRepository.ts` line 74)

- `getTrendWeight()` uses `alpha = 2 / (n + 1)` (SMA-style EMA)
- `weightStore.ts` (line 99) falls back to this when stored trend is unavailable
- Yet another algorithm that disagrees with the other three

### The Result

For a 1-day gap: Database gives 10% new weight, Chart gives 8.9%, Dashboard gives 20%, Repository fallback gives something else entirely. Users see different "trend" values depending on where they look.

---

## Solution: Single Half-Life Based Implementation

**Use the half-life formulation as the single source of truth.** Half-life is intuitive: "after N days, old data has half the influence."

### Canonical Formula

```
HALF_LIFE_DAYS = 7
dayGap = (currentDate - previousDate) / MS_PER_DAY
effectiveAlpha = 1 - Math.pow(2, -dayGap / HALF_LIFE_DAYS)
trend[i] = effectiveAlpha * scaleWeight[i] + (1 - effectiveAlpha) * trend[i-1]
trend[0] = scaleWeight[0]  // seed value
```

### Why Half-Life = 7 Days

- Responsive enough to show real trends within 1–2 weeks
- Smooth enough to filter water weight, sodium, and glycogen fluctuations
- Standard choice in fitness tracking (used by Libra, Happy Scale, etc.)
- Easy to explain: "your trend reflects the last ~week of weigh-ins"

---

## Implementation Steps

### Step 1: Update `src/utils/trendWeight.ts`

This is the canonical EWMA module. All other files will depend on it.

**Important: Make this module pure first.** `trendWeight.ts` currently imports repository code (line 1). Remove this import — the module should be pure math with zero side effects or DB dependencies. This is critical because: (a) the migration will import this module, and repository imports would create circular dependencies, and (b) `calculateTrendWeight()` removal should eliminate the need for that import entirely.

1. **Remove the repository import** at line 1. After deleting `calculateTrendWeight()`, this import should no longer be needed. Verify no other function in the file depends on it.

2. **Replace all smoothing constants:**
   - Remove `EWMA_ALPHA_PER_DAY = 0.1`
   - Remove `BASE_ALPHA_PER_DAY = 0.2` (and any related constants)
   - Add a single exported constant: `export const HALF_LIFE_DAYS = 7`

3. **Update the effective alpha calculation:**

   ```typescript
   export const HALF_LIFE_DAYS = 7;

   export function computeEffectiveAlpha(dayGap: number): number {
     return 1 - Math.pow(2, -dayGap / HALF_LIFE_DAYS);
   }
   ```

4. **Update `recomputeEWMAFromDate()`** to use `computeEffectiveAlpha()` instead of the old `1 - (1 - alpha)^dayGap` formula. The function signature and cascade logic should stay the same — only the alpha calculation changes.

5. **Delete `calculateTrendWeight()`** (the third variant with `BASE_ALPHA_PER_DAY = 0.2`). Find all callers and redirect them to use the stored `trend_weight_kg` from the database instead.

6. **Export a utility** for any component that needs a one-off trend calculation (e.g., for preview purposes):
   ```typescript
   export function computeTrendSeries(
     entries: Array<{ date: string; weight_kg: number }>,
   ): Array<{ date: string; weight_kg: number; trend_kg: number }> {
     // Uses HALF_LIFE_DAYS, same formula as DB storage
   }
   ```

### Step 2: Update `src/components/charts/WeightTrendChart.tsx`

1. **Remove the local EWMA calculation entirely.** Delete the in-component half-life constant, the local alpha computation, and the loop that recalculates trend from raw weights.

2. **Read `trend_weight_kg` from the data passed to the chart.** The chart should receive pre-computed trend values from the store/repository, not calculate them. The data shape should already include `trend_weight_kg` from the database — just use it.

3. **Keep all rendering logic unchanged:** SVG paths, theming, pinch-to-zoom, pan, tooltips, preset pills (1W/1M/3M/6M/1Y), data point circles for ≤30 points — none of this changes.

4. **Unit conversion:** The chart converts weight to display units at line 246 (kg → lb if user prefers imperial). When mapping in `trend_weight_kg`, apply the **same unit multiplier** to trend values as is applied to scale weight values. Both lines must use the same conversion or the trend line will be in the wrong unit.

5. **Edge case:** If `trend_weight_kg` is null for any entry (shouldn't happen, but defensive), fall back to `weight_kg` for that point.

### Step 3: Fix Reflection Flow (`src/stores/reflectionStore.ts`) — CRITICAL

**This is a P1 issue.** The reflection flow writes weight directly via SQL (line 219) and then calls `calculateTrendWeight()` at line 233 to get a trend value. If we delete `calculateTrendWeight()` and switch to reading stored `trend_weight_kg`, the value will be **stale or null** because the trend column hasn't been updated for the just-inserted weight.

**Key fact: `recomputeEWMAFromDate()` is pure.** It does not touch the database itself — it takes entries in, returns computed trend values. The caller is responsible for writing them. This means the reflection flow must orchestrate the full cycle.

Fix — the reflection flow must do this **using the same `db` handle** it uses for the weight insert:

1. Insert/update today's weight (existing SQL at line 219)
2. Fetch all weight entries sorted by date: `SELECT date, weight_kg FROM weight_entries ORDER BY date ASC`
3. Call `recomputeEWMAFromDate(allEntries, todayDate)` — this returns updated trend values from today forward
4. Write the updated `trend_weight_kg` values back: `UPDATE weight_entries SET trend_weight_kg = ? WHERE date = ?` for each affected row
5. Now read the stored `trend_weight_kg` for today (replacing the old `calculateTrendWeight()` call at line 233)

All of steps 1–5 must use the same `db` handle to ensure consistency. If the existing code uses a transaction wrapper, keep all steps inside it.

**Delete the `calculateTrendWeight()` call at line 233** and replace with the stored value read from step 5.

### Step 3b: Remove Repository Fallback (`weightRepository.ts` line 74) — CRITICAL

**This is a P1 issue.** `getTrendWeight()` in the repository implements yet another algorithm (`alpha = 2/(n+1)`), and `weightStore.ts` (line 99) falls back to it when stored trend is unavailable.

1. **Delete `getTrendWeight()`** from `weightRepository.ts` (or replace its body with a simple query for the latest `trend_weight_kg`).

2. **Remove the fallback in `weightStore.ts`** (line 99). After the migration recomputes all values, `trend_weight_kg` should never be null for any entry. The fallback masks data integrity issues — remove it.

3. If a convenience method is needed for "current trend weight as a single number," add to the weight store:
   ```typescript
   getLatestTrendWeight(): number | null
   ```
   This just queries the most recent entry's `trend_weight_kg`. No computation.

### Step 4: Database Migration for Recomputation

Since the formula is changing, all stored `trend_weight_kg` values need recomputation.

1. **Update the old migration `src/db/migrations/017_trend_weight.ts`:** This file (line 3) still references `EWMA_ALPHA_PER_DAY`. Update the constant name/value to use `HALF_LIFE_DAYS` so that the DoD grep passes. Note: this migration has already run for existing users, so changing its computation logic is cosmetic — the new migration below is what actually recomputes values.

2. **Add a new migration file** (next sequential number after the latest in `src/db/migrations/`). The migration should:
   - Call `recomputeEWMAFromDate()` starting from the user's earliest weight entry
   - This will cascade through all entries, overwriting `trend_weight_kg` with the new half-life formula

3. **Register the migration in `src/db/migrations/index.ts`:**
   - Add the new migration to the imports (around line 21)
   - Add it to the migrations array (around line 23)
   - **Bump `CURRENT_SCHEMA_VERSION` to 19** (or whatever the next sequential version is after the latest)
   - **Without both the array entry AND the version bump, the migration will never run.**

4. **Inside the new migration file, insert into `schema_version`** — follow the same pattern as `018_micronutrient_pipeline.ts` (line 8). `runMigrations()` reads `MAX(version)` from `schema_version` (index.ts line 49) to determine which migrations have run. If the new migration doesn't write its version number, it will re-run on every app startup.

5. **Migration pattern** — follow the existing migration conventions in the codebase. The migration should be idempotent (safe to run twice).

6. The column schema (`trend_weight_kg REAL`) does NOT change — only the stored values change.

### Step 5: Verify Store Layer (`src/stores/weightStore.ts`)

1. Ensure the Zustand weight store exposes `trend_weight_kg` alongside `weight_kg` when returning weight entries.

2. Ensure that when new weight entries are added/updated/deleted, the store calls `recomputeEWMAFromDate()` (which it likely already does — just verify the call chain still works with the updated function).

3. **Remove the `getTrendWeight()` fallback** at line 99 (addressed in Step 3b). After migration, stored trend values are always available.

4. Add `getLatestTrendWeight()` selector if it doesn't exist.

### Step 6: Verify Repository Layer (`src/repositories/weightRepository.ts`)

1. Confirm that `recomputeEWMAFromDate()` is called correctly on insert, update, and delete operations.

2. Confirm that queries returning weight entries include `trend_weight_kg` in the SELECT.

---

## Files to Modify

| File                                          | Changes                                                                                                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/trendWeight.ts`                    | Remove repository import (line 1), replace all constants with `HALF_LIFE_DAYS = 7`, update `computeEffectiveAlpha()`, delete `calculateTrendWeight()`, update `recomputeEWMAFromDate()` |
| `src/components/charts/WeightTrendChart.tsx`  | Remove local EWMA calculation, use stored `trend_weight_kg` from data, ensure unit conversion applies to trend values (line 246)                                                        |
| `src/stores/reflectionStore.ts`               | Call `recomputeEWMAFromDate()` after weight insert (line 219), replace `calculateTrendWeight()` call (line 233) with stored trend read, use same db handle throughout                   |
| `src/components/ReflectionModal.tsx`          | Verify it reads trend from store (no local computation) — likely no changes needed but confirm                                                                                          |
| `src/repositories/weightRepository.ts`        | Delete or replace `getTrendWeight()` (line 74), verify `trend_weight_kg` included in queries, cascade still works                                                                       |
| `src/stores/weightStore.ts`                   | Remove `getTrendWeight()` fallback (line 99), add `getLatestTrendWeight()` selector, verify trend data flows through                                                                    |
| `src/db/migrations/017_trend_weight.ts`       | Update `EWMA_ALPHA_PER_DAY` reference (line 3) to `HALF_LIFE_DAYS`                                                                                                                      |
| `src/db/migrations/XXX_unify_trend_weight.ts` | New migration to recompute all trend values                                                                                                                                             |
| `src/db/migrations/index.ts`                  | Import new migration, add to migrations array, bump `CURRENT_SCHEMA_VERSION` to 19                                                                                                      |

### Test Files Requiring Updates

These test files depend on the deprecated algorithms and constants. They will fail after the refactor and must be updated to match the new half-life formula:

| Test File                             | Affected Area                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `weightRepository.test.ts` (line 162) | Tests `getTrendWeight()` with old alpha — delete or rewrite for stored trend read   |
| `weightStore.test.ts` (line 193)      | Tests fallback behavior — remove fallback tests, add `getLatestTrendWeight()` tests |
| `stores.test.ts` (line 215)           | Integration test using old constants — update expected values                       |
| `repositories.test.ts` (line 213)     | Repository trend tests — update expected values                                     |

---

## Search Commands to Find All Usages

Run these before starting to map the full blast radius:

```bash
# Find all EWMA/trend constants (must find ALL FOUR variants)
grep -rn "EWMA_ALPHA\|BASE_ALPHA\|HALF_LIFE\|alpha.*per.*day\|2.*n.*1" src/

# Find all trend weight calculations
grep -rn "calculateTrendWeight\|computeEWMA\|recomputeEWMA\|trendWeight\|trend_weight\|getTrendWeight" src/

# Find all imports from trendWeight.ts (check for repository import coupling)
grep -rn "from.*trendWeight\|require.*trendWeight" src/

# Find reflection flow weight handling
grep -rn "trend\|weight.*insert\|weight.*update" src/stores/reflectionStore.ts

# Find dashboard/screen trend display
grep -rn "trend.*weight\|trendWeight" src/components/ src/screens/

# Find test files that will break
grep -rn "EWMA_ALPHA\|BASE_ALPHA\|getTrendWeight\|calculateTrendWeight\|trend_weight" src/**/*.test.* tests/
```

---

## Testing Checklist

### Unit Tests

- [ ] `computeEffectiveAlpha(1)` returns `1 - 2^(-1/7)` ≈ 0.0943
- [ ] `computeEffectiveAlpha(7)` returns exactly 0.5 (half-life definition)
- [ ] `computeEffectiveAlpha(0)` returns 0 (same-day entry)
- [ ] `computeEffectiveAlpha(14)` returns 0.75 (two half-lives)
- [ ] Trend series with single entry: trend === scale weight
- [ ] Trend series with uniform daily entries converges as expected
- [ ] Trend series with gaps handles multi-day gaps correctly

### Integration Tests

- [ ] Add a weight entry → `trend_weight_kg` is computed and stored
- [ ] Update a weight entry → all subsequent `trend_weight_kg` values recompute
- [ ] Delete a weight entry → all subsequent `trend_weight_kg` values recompute
- [ ] **Reflection flow: enter weight via daily reflection → `trend_weight_kg` is computed before it's read** (P1 regression test)
- [ ] **No fallback to `getTrendWeight()` — removed code path should not exist**
- [ ] Chart displays the same trend value as stored in DB
- [ ] Reflection trend display matches chart
- [ ] Migration runs without error and recomputes all values
- [ ] Migration is registered in `index.ts` and runs on app startup

### Test File Updates

- [ ] `weightRepository.test.ts` (line 162) — updated for new formula or removed
- [ ] `weightStore.test.ts` (line 193) — fallback tests removed, new selector tests added
- [ ] `stores.test.ts` (line 215) — expected values updated for half-life formula
- [ ] `repositories.test.ts` (line 213) — expected values updated for half-life formula

### Manual Verification

- [ ] Enter 5+ weight entries across different dates
- [ ] Verify chart trend line matches stored `trend_weight_kg` values (log both to console temporarily)
- [ ] Verify reflection trend display matches chart
- [ ] **Enter weight via daily reflection flow — verify trend updates immediately, not stale**
- [ ] Delete a middle entry — trend line updates correctly
- [ ] Edit an old entry — all subsequent trend values update
- [ ] Verify unit conversion: switch between kg and lb, confirm trend line stays correct

---

## What NOT to Change

- Weight entry UI (input, date picker, etc.)
- Chart rendering (SVG paths, theming, interactions, animations)
- Chart time range pills and zoom behavior
- Database schema (column stays `trend_weight_kg REAL`)
- Repository CRUD operations (only the EWMA math changes)
- Any nutrition-related code

---

## Definition of Done

1. `grep -rn "EWMA_ALPHA\|BASE_ALPHA" src/` returns zero results (including `017_trend_weight.ts`)
2. `grep -rn "getTrendWeight" src/` returns zero results (repository fallback removed)
3. Only one `HALF_LIFE_DAYS` constant exists, exported from `src/utils/trendWeight.ts`
4. `trendWeight.ts` has zero repository/database imports (pure math module)
5. `WeightTrendChart.tsx` contains zero EWMA math — it reads pre-computed values
6. Chart, reflection flow, and database all show identical trend values for the same entry
7. Reflection flow: entering weight computes trend before reading it (no stale/null trend)
8. All existing weight entries have been recomputed via migration
9. Migration is registered in `src/db/migrations/index.ts` and inserts into `schema_version` table
10. `CURRENT_SCHEMA_VERSION` in `index.ts` is bumped to 19
11. All test files pass with updated expected values
12. No TypeScript errors introduced

---

## Confirmed Blast Radius for Trend Readouts

Trend weight is read/displayed in exactly two places (confirmed from codebase review):

1. **`WeightTrendChart.tsx`** — chart trend line
2. **Reflection flow** — `ReflectionModal.tsx` + `reflectionStore.ts`

There is no separate standalone "dashboard trend number" component. The files listed in the modification table are the complete blast radius.
