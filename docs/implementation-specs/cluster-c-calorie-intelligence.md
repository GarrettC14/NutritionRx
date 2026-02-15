# Cluster C: Calorie Intelligence — Claude Code Implementation Checklist

**Audited:** 4 passes against live repo
**Branch:** `feature/calorie-intelligence`
**Working Dir:** `/Users/garrettcoughlin/Desktop/NutritionRx`
**Schema Baseline:** v21 (`CURRENT_SCHEMA_VERSION = 21`, latest = `021_log_entries_meal_food_index`)
**Migration Slot:** 022

> **Migration Collision Note:** If another branch targets 022, coordinate before merging. DB sequence must be monotonic.

---

## Codebase Conventions (verified — follow exactly)

| Concern | Convention |
|---------|-----------|
| Macro-cycle types | `src/types/planning.ts` |
| DB columns | `snake_case` → `camelCase` mapping in repository layer |
| Settings store | Nested `settings: UserSettings` object |
| Settings persistence | `settingsRepository.getSetting()` / `.setSetting()` key/value |
| Dashboard widgets | `src/components/dashboard/widgets/` |
| Widget registration | `dashboard.ts` (type union) + `widgetDefinitions.ts` (definitions) + `index.ts` (export/register) |
| Migration signature | Named export `(db: SQLiteDatabase) => Promise<void>` from `expo-sqlite` |
| `useDailyNutrition` return | `{ totals, entriesByMeal, isLoading, isLoaded }` — NO `entries`/`quickEntries` arrays |
| Log entry types | No `fiber` field — always default `fiber = 0` |
| Detail/edit screen | `src/app/log-entry/[id].tsx` |
| Settings hub (row list) | `src/app/settings.tsx` (NOT `goals.tsx`, which is a form) |

---

## Step 0 — Pre-flight

Run these and capture output before writing any code:

```bash
grep -rn "useDailyNutrition" src/ --include="*.ts" --include="*.tsx"
grep -rn "training_rest\|high_low_carb\|even_distribution\|pattern_type\|patternType\|PatternType" src/ --include="*.ts" --include="*.tsx"
```

Confirm:
- `src/db/migrations/index.ts` shows `CURRENT_SCHEMA_VERSION = 21`
- Latest migration is `migration021LogEntriesMealFoodIndex`
- No `022_*.ts` file exists in `src/db/migrations/`

---

## Step 1 — Create migration 022

**Create:** `src/db/migrations/022_redistribution.ts`

```typescript
import { SQLiteDatabase } from 'expo-sqlite';

export async function migration022Redistribution(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE macro_cycle_config
      ADD COLUMN locked_days TEXT NOT NULL DEFAULT '[]';
  `);
  await db.execAsync(`
    ALTER TABLE macro_cycle_config
      ADD COLUMN redistribution_start_day INTEGER NOT NULL DEFAULT 0;
  `);
}
```

> Separate `execAsync` calls — SQLite on some platforms rejects multiple ALTER TABLE in one string.

---

## Step 2 — Register migration, bump schema

**Edit:** `src/db/migrations/index.ts`

```typescript
import { migration022Redistribution } from './022_redistribution';

// Append to migrations array after migration021LogEntriesMealFoodIndex:
export const migrations = [
  // ...existing through migration021LogEntriesMealFoodIndex,
  migration022Redistribution,
];

export const CURRENT_SCHEMA_VERSION = 22;
```

---

## Step 3 — Extend macro-cycle types

**Edit:** `src/types/planning.ts`

Update `MacroCyclePatternType` union:
```typescript
export type MacroCyclePatternType =
  | 'training_rest'
  | 'high_low_carb'
  | 'even_distribution'
  | 'custom'
  | 'redistribution';
```

Add interfaces:
```typescript
export interface RedistributionState {
  weekStartDate: string;
  days: DayBudget[];
  weeklyTotal: number;
  proteinFloor: number;
}

export interface DayBudget {
  date: string;
  dayOfWeek: number;       // 0 (Sun) – 6 (Sat)
  dayLabel: string;         // "Sun", "Mon", etc.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  locked: boolean;
  isToday: boolean;
  isPast: boolean;
}
```

Add to existing `MacroCycleConfig` interface:
```typescript
lockedDays: number[];
redistributionStartDay: number;
```

Add to existing `MacroCycleConfigRow` interface:
```typescript
locked_days: string;
redistribution_start_day: number;
```

---

## Step 4 — Create macro calorie utility

**Create:** `src/utils/calculateMacroCalories.ts`

```typescript
/**
 * Atwater factor calorie calculation.
 * Current log entries have no fiber field — callers pass fiber=0.
 * Degrades gracefully to basic 4-4-9 formula.
 */
export function calculateMacroCalories(
  protein: number,
  carbs: number,
  fat: number,
  fiber = 0,
  alcohol = 0
): number {
  const safeFiber = Math.max(0, fiber);
  const netCarbs = Math.max(0, carbs - safeFiber);
  const fiberCalories = safeFiber * 2;
  return Math.round(
    protein * 4 + netCarbs * 4 + fiberCalories + fat * 9 + alcohol * 7
  );
}

/**
 * Delta between label and macro-calculated calories.
 * Positive = macro is higher than label.
 */
export function getCalorieDelta(
  labelCalories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber = 0
): number {
  return calculateMacroCalories(protein, carbs, fat, fiber) - labelCalories;
}
```

---

## Step 5 — Add settings persistence key + hydration

**Edit:** `src/repositories/settingsRepository.ts`

Add key constant (wherever other setting keys are defined):
```typescript
CALORIE_CALCULATION_METHOD: 'calorie_calculation_method',
```

In hydration path (`getAll()` or equivalent load method):
```typescript
calorieCalculationMethod: (await this.getSetting('calorie_calculation_method', 'label')) as 'label' | 'macro',
```

In update/persist path (when `updates.calorieCalculationMethod` is present):
```typescript
if (updates.calorieCalculationMethod !== undefined) {
  await this.setSetting(SETTING_KEYS.CALORIE_CALCULATION_METHOD, updates.calorieCalculationMethod);
}
```

---

## Step 6 — Extend settings store

**Edit:** `src/stores/settingsStore.ts`

Add type:
```typescript
type CalorieCalculationMethod = 'label' | 'macro';
```

Add to `UserSettings` interface:
```typescript
calorieCalculationMethod: CalorieCalculationMethod;
```

In initialization defaults:
```typescript
calorieCalculationMethod: 'label',
```

Add action signature + implementation:
```typescript
setCalorieCalculationMethod: async (method) => {
  await settingsRepository.setSetting('calorie_calculation_method', method);
  set({
    settings: { ...get().settings, calorieCalculationMethod: method },
  });
},
```

---

## Step 7 — Create adjusted daily nutrition hook

**Create:** `src/hooks/useAdjustedDailyNutrition.ts`

**CRITICAL:** `useDailyNutrition` returns `{ totals, entriesByMeal, isLoading, isLoaded }`. No separate `entries`/`quickEntries`. The hook flattens `entriesByMeal`, computes macro calories, then infers quick-add calories as the difference between `totals.calories` and sum of individual entry label calories.

```typescript
import { useMemo } from 'react';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useSettingsStore } from '@/stores/settingsStore';
import { calculateMacroCalories } from '@/utils/calculateMacroCalories';

export function useAdjustedDailyNutrition(
  ...args: Parameters<typeof useDailyNutrition>
): ReturnType<typeof useDailyNutrition> {
  const daily = useDailyNutrition(...args);
  const method = useSettingsStore((s) => s.settings.calorieCalculationMethod);

  return useMemo(() => {
    if (method === 'label') return daily;

    const allEntries = Object.values(daily.entriesByMeal ?? {}).flat();

    // Macro-calculated calories for log entries
    const macroCalories = allEntries.reduce(
      (sum, e) =>
        sum +
        calculateMacroCalories(
          e.protein ?? 0,
          e.carbs ?? 0,
          e.fat ?? 0,
          0 // fiber not available on entry types
        ),
      0
    );

    // Label calories from those same entries
    const labelCaloriesFromEntries = allEntries.reduce(
      (sum, e) => sum + (e.calories ?? 0),
      0
    );

    // Quick-add calories = totals minus individual entry label calories
    // These are user-provided and should NOT be recalculated
    const quickAddCalories = Math.max(
      0,
      (daily.totals?.calories ?? 0) - labelCaloriesFromEntries
    );

    return {
      ...daily,
      totals: {
        ...daily.totals,
        calories: macroCalories + quickAddCalories,
      },
    };
  }, [daily, method]);
}
```

---

## Step 8 — Swap all `useDailyNutrition` consumers

**Run grep from Step 0.** At minimum, update these in `src/components/dashboard/widgets/`:

1. **`CalorieRingWidget.tsx`** — swap
2. **`MacroBarsWidget.tsx`** — swap
3. **`NutritionOverviewWidget.tsx`** — swap
4. **`ProteinFocusWidget.tsx`** — swap
5. **`TodaysMealsWidget.tsx`** — swap if it reads `totals.calories`; if it only renders per-entry calories from `entriesByMeal`, add comment: `// Uses entriesByMeal entry calories (label values) directly — calorie method adjustment applies at totals level only.`

**Plus any other consumers the grep reveals.**

Swap pattern:
```typescript
// Before:
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
// After:
import { useAdjustedDailyNutrition as useDailyNutrition } from '@/hooks/useAdjustedDailyNutrition';
```

**No consumer that reads `totals.calories` may be left on the raw hook.**

---

## Step 9 — Add label vs. macro comparison to entry detail

**Edit:** `src/app/log-entry/[id].tsx`

Import `getCalorieDelta` and `calculateMacroCalories` from `@/utils/calculateMacroCalories`.

In the nutrition display section, always render both values:

```
Label: 190 cal
Macro: 208 cal (+18)
```

- Active method = primary (larger, bold, `#2D3436`)
- Inactive method = secondary (smaller, muted `#8B9A8E`)
- Delta in parentheses with +/- sign
- If delta === 0: "Label and macro calories match" in muted text
- Pass `fiber = 0` (field absent on entry types)

---

## Step 10 — Add calorie method selector to settings

**Edit:** `src/app/settings/nutrition.tsx`

Add radio/selection section using existing settings control patterns:

```
── Calorie Calculation ──────────────────

How should daily totals be calculated?

○ Label Calories (default)
  Uses the calorie value from the food
  label or database.

● Macro Calories
  Recalculates from macros: P×4 + C×4 + F×9.
  Often more accurate due to FDA rounding.

ℹ Your logged data is not modified — this
  only changes how totals are displayed.
```

Wire to `setCalorieCalculationMethod` action. **Not premium-gated.**

---

## Step 11 — Extend macro-cycle repository

**Edit:** `src/repositories/macroCycleRepository.ts`

**Config row mapper (load):**
```typescript
lockedDays: JSON.parse(row.locked_days || '[]'),
redistributionStartDay: row.redistribution_start_day ?? 0,
```

**Config save/update:**
```typescript
locked_days: JSON.stringify(config.lockedDays ?? []),
redistribution_start_day: config.redistributionStartDay ?? 0,
```

**`getDayType()` or equivalent pattern switch:** Add `case 'redistribution':` — treat like `'custom'` (reads date-based overrides).

**Add methods** (match existing ID generation, transaction conventions, error handling):

```typescript
/**
 * Saves 7 redistribution overrides. Transactional DELETE + INSERT
 * to handle UNIQUE(date) constraint on macro_cycle_overrides.
 */
async saveRedistributionOverrides(
  overrides: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>
): Promise<void> {
  // 1. Extract 7 dates
  // 2. BEGIN TRANSACTION
  // 3. DELETE FROM macro_cycle_overrides WHERE date IN (?,?,?,?,?,?,?)
  // 4. INSERT 7 rows with generated IDs (match existing ID gen pattern)
  // 5. COMMIT
  // 6. On error: ROLLBACK
}

async getRedistributionConfig(): Promise<{
  lockedDays: number[];
  redistributionStartDay: number;
}> {
  // Read from macro_cycle_config (single row)
  // Parse locked_days JSON
}

async setRedistributionConfig(params: {
  lockedDays: number[];
  redistributionStartDay: number;
}): Promise<void> {
  // UPDATE macro_cycle_config SET
  //   locked_days = JSON.stringify(params.lockedDays),
  //   redistribution_start_day = params.redistributionStartDay,
  //   last_modified = CURRENT_TIMESTAMP
}
```

---

## Step 12 — Create redistribution algorithm

**Create:** `src/utils/redistribution.ts`

```typescript
import { DayBudget } from '@/types/planning';

const ABSOLUTE_MIN_CALORIES = 800;
const SOFT_WARNING_CALORIES = 1200;

/**
 * Proportional redistribution with iterative clamping.
 * Preserves weekly total as invariant.
 * Returns null if adjustment is impossible.
 */
export function redistributeCalories(
  days: DayBudget[],
  changedIndex: number,
  newCalories: number,
  proteinFloor: number
): DayBudget[] | null {
  const weeklyTotal = days.reduce((sum, d) => sum + d.calories, 0);
  const delta = newCalories - days[changedIndex].calories;
  if (delta === 0) return days.map((d) => ({ ...d }));

  const result = days.map((d) => ({ ...d }));
  result[changedIndex].calories = newCalories;

  let remainingDelta = -delta;
  let iterations = 5;

  while (Math.abs(remainingDelta) > 0 && iterations-- > 0) {
    const adjustable = result
      .map((d, i) => ({ ...d, index: i }))
      .filter(
        (d) =>
          d.index !== changedIndex &&
          !d.locked &&
          !d.isPast &&
          (remainingDelta > 0 || d.calories > ABSOLUTE_MIN_CALORIES)
      );

    if (adjustable.length === 0) return null;

    const totalCal = adjustable.reduce((s, d) => s + d.calories, 0);
    let distributed = 0;

    for (let i = 0; i < adjustable.length; i++) {
      const d = adjustable[i];
      const isLast = i === adjustable.length - 1;
      const proportion = d.calories / (totalCal || 1);
      const dayDelta = isLast
        ? remainingDelta - distributed
        : Math.round(remainingDelta * proportion);

      const newCal = Math.max(ABSOLUTE_MIN_CALORIES, d.calories + dayDelta);
      distributed += newCal - d.calories;
      result[d.index].calories = newCal;
    }

    const actual = result.reduce((s, d) => s + d.calories, 0);
    remainingDelta = weeklyTotal - actual;
    if (Math.abs(remainingDelta) <= 1) remainingDelta = 0;
  }

  // Recalculate macros for all changed days
  for (let i = 0; i < result.length; i++) {
    if (result[i].calories !== days[i].calories) {
      const m = recalculateMacros(result[i].calories, days[i], proteinFloor);
      Object.assign(result[i], m);
    }
  }

  return result;
}

/**
 * Macro cascade: protein preserved (≥ floor), fat maintains %, carbs absorb remainder.
 */
export function recalculateMacros(
  newCalories: number,
  originalDay: DayBudget,
  proteinFloor: number
): { protein: number; carbs: number; fat: number } {
  const protein = Math.max(originalDay.protein, proteinFloor);
  const proteinCal = protein * 4;
  const origFatPct =
    originalDay.calories > 0
      ? (originalDay.fat * 9) / originalDay.calories
      : 0.3;
  const fatCal = Math.max(
    Math.round(newCalories * origFatPct),
    Math.round(newCalories * 0.15)
  );
  const fat = Math.round(fatCal / 9);
  const carbCal = Math.max(0, newCalories - proteinCal - fatCal);
  const carbs = Math.round(carbCal / 4);
  return { protein, carbs, fat };
}

/**
 * Generate initial 7-day budget from base daily targets.
 */
export function generateInitialBudget(
  baseCalories: number,
  baseProtein: number,
  baseCarbs: number,
  baseFat: number,
  weekStartDate: string,
  _startDayOfWeek: number
): DayBudget[] {
  const today = new Date().toISOString().split('T')[0];
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const start = new Date(weekStartDate);
  const days: DayBudget[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const dow = d.getDay();
    days.push({
      date: iso,
      dayOfWeek: dow,
      dayLabel: labels[dow],
      calories: baseCalories,
      protein: baseProtein,
      carbs: baseCarbs,
      fat: baseFat,
      locked: false,
      isToday: iso === today,
      isPast: iso < today,
    });
  }
  return days;
}

/** Warning text for extreme day values. */
export function getDayWarning(
  calories: number,
  dailyAverage: number
): string | null {
  if (calories <= ABSOLUTE_MIN_CALORIES)
    return 'This is at the minimum (800 cal). Your health comes first.';
  if (calories < SOFT_WARNING_CALORIES)
    return 'Very low-calorie days can leave you feeling drained.';
  if (calories > dailyAverage * 1.5)
    return 'This day is significantly above average. Make sure lighter days still feel sustainable.';
  return null;
}

/** ±% deviation from daily average. */
export function getDeviationPercent(
  calories: number,
  weeklyTotal: number
): number {
  const avg = weeklyTotal / 7;
  if (avg === 0) return 0;
  return Math.round(((calories - avg) / avg) * 100);
}
```

---

## Step 13 — Extend macro-cycle store

**Edit:** `src/stores/macroCycleStore.ts`

Import from `@/types/planning` and `@/utils/redistribution`.

Add state:
```typescript
redistributionDays: DayBudget[];
weeklyTotal: number;
isRedistributionActive: boolean;
```

Add actions:

```typescript
initializeRedistribution(
  baseCalories: number, baseProtein: number,
  baseCarbs: number, baseFat: number,
  proteinFloor: number, startDay: number
): void;
// Calls generateInitialBudget(), sets state

loadRedistribution(): Promise<void>;
// 1. Compute current week's 7 dates from redistributionStartDay
// 2. Query overrides for those dates
// 3. If 7 exist → populate state from overrides + config lockedDays
// 4. If <7 AND patternType === 'redistribution' → check previous week,
//    copy day-of-week template to new dates, auto-save
// 5. If none → generate fresh from base targets

adjustDay(
  dayIndex: number, newCalories: number, proteinFloor: number
): DayBudget[] | null;
// Calls redistributeCalories(). Updates state only (no DB).
// Returns null → UI should reject and revert.

toggleDayLock(dayIndex: number): void;

resetRedistribution(): void;
// All days → weeklyTotal/7, unlock all.

setRedistributionStartDay(day: number): void;

saveRedistribution(): Promise<void>;
// 1. Update macro_cycle_config: enabled=1, patternType='redistribution',
//    lockedDays, redistributionStartDay
// 2. Call repository.saveRedistributionOverrides() (transactional delete+insert)
```

---

## Step 14 — Create budget components

**Create:** `src/components/budget/BudgetBarChart.tsx`

Custom component using `react-native-reanimated` + `react-native-gesture-handler`. **No charting library.**

- 7 bars, evenly spaced, height proportional to calories (scaled to maxDay × 1.2)
- `withTiming` 300ms height transitions
- Colors: unlocked `#7C9A8E` (sage), locked `#C8CCC9` (muted gray), selected `#6B8B7E` (dark sage)
- Per-bar layout: day label → bar → calorie value → ±% deviation → lock icon
- Tap bar → `onSelectDay(index)`, tap lock → `onToggleLock(index)`
- Today indicator (dot or underline)

**Create:** `src/components/budget/DayEditor.tsx`

- Selected day name + date header
- Calorie input: ±50 stepper buttons + direct number input (no slider)
- Warning area: renders `getDayWarning()` result in amber text

**Create:** `src/components/budget/MacroBreakdownAccordion.tsx`

- Expandable (collapsed by default)
- Shows P / C / F in grams with calorie contribution
- Protein row annotates floor: `"150g (min: 120g)"`
- Use existing expandable/accordion pattern if one exists

**Create:** `src/components/budget/WeeklyTotalHeader.tsx`

- "Weekly Total: 14,000 cal" — prominent, immutable during editing

---

## Step 15 — Create Weekly Budget screen

**Create:** `src/app/weekly-budget.tsx`

Premium guard:
```typescript
const isPremium = useSubscriptionStore((s) => s.isPremium);
useEffect(() => {
  if (!isPremium) router.replace('/paywall?context=calorie_budget');
}, [isPremium]);
```

Structure:
```
<SafeAreaView>
  <Header title="Weekly Calorie Budget" leftAction="back" />
  <ScrollView>
    <WeeklyTotalHeader total={weeklyTotal} />
    <BudgetBarChart ... />
    <DayEditor ... />
    <MacroBreakdownAccordion ... />
    <StartDayPicker ... />
    <ActionRow>
      <Button "Reset to Equal" variant="outline" />
      <Button "Save Budget" variant="primary" />
    </ActionRow>
    {isFirstUse && <InfoCard text="Weekly averages matter more than
      daily perfection. This planner helps you be flexible —
      not restrictive." />}
  </ScrollView>
</SafeAreaView>
```

**Goal change detection on open:** If `base × 7 ≠ stored weeklyTotal`, prompt: "Your calorie goal has changed. Update your weekly budget?" Yes → reset to equal. No → keep current.

**Pattern switching into redistribution:** If another pattern is active, show: "Switch to Weekly Budget? This will replace your current [pattern name] setup." On confirm: set `patternType='redistribution'`, clear `markedDays`/`dayTargets`, initialize fresh.

---

## Step 16 — Register route

**Edit:** `src/app/_layout.tsx`

Add `/weekly-budget` route registration matching the same modal/stack pattern as `macro-cycling-setup.tsx`.

---

## Step 17 — Add Weekly Budget entry point in settings

**Edit:** `src/app/settings.tsx` (the settings hub with navigation rows — NOT `goals.tsx` which is a form)

Add navigation row where other premium feature links are:
```typescript
<SettingsRow
  title="Weekly Calorie Budget"
  subtitle="Distribute calories across your week"
  onPress={() => router.push('/weekly-budget')}
  premium
/>
```

Match premium badge/row styling used by existing premium settings rows.

---

## Step 18 — Update macro-cycling setup for redistribution

**Edit:** `src/app/macro-cycling-setup.tsx`

- Add pattern option: `{ label: 'Weekly Budget', value: 'redistribution' }`
- Update ALL switch/if-else branches on pattern type to include `'redistribution'`
- When switching from another pattern to redistribution: show replacement confirmation
- When showing pattern preview/labels: map `'redistribution'` → `"Weekly Budget"`

---

## Step 19 — Register weekly budget widget

**Edit:** `src/types/dashboard.ts` (or wherever WidgetType union lives)
Add `'weekly_budget'` to widget type union.

**Edit:** `src/components/dashboard/widgets/widgetDefinitions.ts`
Add definition with `isPremium: true`.

**Edit:** `src/components/dashboard/widgets/index.ts`
Export/register `WeeklyBudgetWidget`.

**Create:** `src/components/dashboard/widgets/WeeklyBudgetWidget.tsx`

- Compact 7-bar miniature (no labels, just bars + today highlight)
- Subtitle: "Remaining: X,XXX cal"
- Tap → `router.push('/weekly-budget')`
- Wrap with premium lock (`LockedContentArea` or equivalent) for free users

---

## Step 20 — Final verification sweep

Run:
```bash
grep -rn "useDailyNutrition" src/ --include="*.ts" --include="*.tsx"
# ↑ Confirm no consumer reads totals.calories through raw hook

grep -rn "training_rest\|high_low_carb\|even_distribution" src/ --include="*.ts" --include="*.tsx"
# ↑ Confirm every pattern switch includes 'redistribution'

grep -rn "CURRENT_SCHEMA_VERSION" src/ --include="*.ts"
# ↑ Confirm = 22
```

---

## Nourished Calm Messaging Reference

Use only these framings. **Never use:** "debt", "banking", "owe", "make up for", "calorie deficit rollover".

| Context | Message |
|---------|---------|
| First-use tooltip | "Weekly averages matter more than daily perfection. This planner helps you be flexible — not restrictive." |
| Low-calorie warning | "Very low-calorie days can leave you feeling drained." |
| Floor hit | "This is at the minimum (800 cal). Your health comes first." |
| High day note | "Your [Day] budget is higher, so the other days are a bit lighter." |
| Cannot redistribute | "Unlock at least one other day to adjust your budget." |
| Impossible adjustment | "Can't redistribute this much. Try unlocking more days or making a smaller adjustment." |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| All other days locked | `redistributeCalories` → `null` → UI rejects with message, reverts |
| Multiple days hit 800 floor | Iterative clamping (up to 5 passes); if still unbalanced → `null` |
| UNIQUE constraint on overrides | Transactional delete+insert in `saveRedistributionOverrides` |
| Week rollover (new week) | Copy prior-week day-of-week pattern; if none, generate fresh |
| Fiber absent on entry types | `calculateMacroCalories` defaults to fiber=0 (basic 4-4-9) |
| Quick-add entries + macro method | Always use stored calories (user-provided, not recalculated) |
| C2 toggle instant/retroactive | Display-time only, no data migration |
| Goal change mid-week | Detect on screen open, prompt to update or keep |
| Pattern switch into redistribution | Confirm, then replace config |

---

## Files Summary

### New Files (10)

| # | Path |
|---|------|
| 1 | `src/db/migrations/022_redistribution.ts` |
| 2 | `src/utils/calculateMacroCalories.ts` |
| 3 | `src/utils/redistribution.ts` |
| 4 | `src/hooks/useAdjustedDailyNutrition.ts` |
| 5 | `src/app/weekly-budget.tsx` |
| 6 | `src/components/budget/BudgetBarChart.tsx` |
| 7 | `src/components/budget/DayEditor.tsx` |
| 8 | `src/components/budget/MacroBreakdownAccordion.tsx` |
| 9 | `src/components/budget/WeeklyTotalHeader.tsx` |
| 10 | `src/components/dashboard/widgets/WeeklyBudgetWidget.tsx` |

### Modified Files (16+)

| # | Path | Changes |
|---|------|---------|
| 1 | `src/db/migrations/index.ts` | Register 022, `CURRENT_SCHEMA_VERSION = 22` |
| 2 | `src/types/planning.ts` | `'redistribution'` + interfaces + config fields + row type |
| 3 | `src/repositories/settingsRepository.ts` | Calorie method key + hydration + update |
| 4 | `src/stores/settingsStore.ts` | `calorieCalculationMethod` in UserSettings + action |
| 5 | `src/repositories/macroCycleRepository.ts` | Mapper, `getDayType`, new CRUD methods |
| 6 | `src/stores/macroCycleStore.ts` | Redistribution state + actions |
| 7 | `src/app/log-entry/[id].tsx` | Label vs. macro comparison |
| 8 | `src/app/settings/nutrition.tsx` | Calorie method selector |
| 9 | `src/app/settings.tsx` | Weekly Budget navigation row |
| 10 | `src/app/macro-cycling-setup.tsx` | Handle `'redistribution'` |
| 11 | `src/app/_layout.tsx` | Register `/weekly-budget` route |
| 12 | `src/types/dashboard.ts` | `'weekly_budget'` in WidgetType |
| 13 | `src/components/dashboard/widgets/widgetDefinitions.ts` | Widget def, `isPremium: true` |
| 14 | `src/components/dashboard/widgets/index.ts` | Export WeeklyBudgetWidget |
| 15 | `src/components/dashboard/widgets/CalorieRingWidget.tsx` | Swap to adjusted hook |
| 16 | `src/components/dashboard/widgets/MacroBarsWidget.tsx` | Swap to adjusted hook |
| 17 | `src/components/dashboard/widgets/NutritionOverviewWidget.tsx` | Swap to adjusted hook |
| 18 | `src/components/dashboard/widgets/ProteinFocusWidget.tsx` | Swap to adjusted hook |
| 19 | `src/components/dashboard/widgets/TodaysMealsWidget.tsx` | Swap or document exemption |
| 20+ | Any other `useDailyNutrition` consumers | Swap or document exemption |

---

## Acceptance Criteria

### C2: Label vs. Macro Calories
- [ ] `calculateMacroCalories()` + `getCalorieDelta()` utilities exist and work
- [ ] `calorieCalculationMethod` in `UserSettings`, persisted via `settingsRepository`
- [ ] Default `'label'`, hydrated in initialization
- [ ] `useAdjustedDailyNutrition` works with `entriesByMeal` shape correctly
- [ ] Quick-add calories preserved (inferred via delta math, not recalculated)
- [ ] ALL `useDailyNutrition` consumers audited (grep verified) and swapped/exempted
- [ ] `log-entry/[id].tsx` shows label vs. macro comparison with delta
- [ ] Settings → Nutrition has calorie method selector
- [ ] Toggle is instant and retroactive (display-time only)
- [ ] Not premium-gated

### C1: Weekly Calorie Redistribution
- [ ] Migration 022 runs cleanly, `CURRENT_SCHEMA_VERSION = 22`
- [ ] `'redistribution'` in `MacroCyclePatternType`, ALL switches updated (grep verified)
- [ ] Repository mapper handles `lockedDays` / `redistributionStartDay`
- [ ] `saveRedistributionOverrides` uses transactional delete+insert
- [ ] Iterative redistribution with 800-cal floor clamping
- [ ] Returns `null` on impossible adjustments → UI rejects with message
- [ ] Macro cascade: protein floor → fat % → carbs absorb
- [ ] Store: initialize, load (with rollover), adjust, lock, reset, startDay, save
- [ ] Bar chart: animated, tap-select, lock-toggle, ±% deviation
- [ ] Day editor: ±50 stepper, direct input, warnings
- [ ] Save writes config + 7 overrides in transaction
- [ ] `useResolvedTargets` picks up overrides (verified, no changes needed)
- [ ] Premium-gated with paywall redirect
- [ ] Widget registered in all 3 files (`dashboard.ts`, `widgetDefinitions.ts`, `index.ts`)
- [ ] Widget renders, premium-locked for free users
- [ ] Nourished Calm language throughout (no debt/banking)
- [ ] Pattern switching confirmation
- [ ] Goal change detection on screen open
- [ ] Route registered in `_layout.tsx`
- [ ] Settings hub has Weekly Budget row
