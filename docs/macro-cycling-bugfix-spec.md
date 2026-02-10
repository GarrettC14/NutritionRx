# Macro Cycling — Audit Bugfix Specification

## Context

Macro cycling allows users to define different macro targets for different days (e.g., high carb on training days, low carb on rest days). The feature has a 3-step wizard, a repository layer, and a Zustand store — but the targets it produces are never consumed by any downstream system. This is the top priority fix.

**Do not refactor the wizard, store, or repo architecture.** The setup flow works. The problem is entirely on the consumption side.

---

## CRITICAL: Cycling Targets Are Never Applied

**Problem:** `CalorieRingWidget`, `MacroBarsWidget`, and all progress/tracking UI pull targets exclusively from `useGoalStore` (base targets). Macro cycling targets are computed and stored but never read by anything that affects the user's experience. Users complete the wizard, see confirmation, and then... nothing changes.

**This is the core fix. Everything else in this spec is secondary.**

### Step 1: Create a unified target resolution hook

Create a new hook that becomes the single source of truth for "what are today's targets?" It should check for cycling first, fall back to base goals.

```typescript
// Suggested: hooks/useResolvedTargets.ts (or similar, match existing conventions)

/**
 * Returns the effective macro targets for a given date.
 * Resolution order:
 *   1. User override for this specific date (if override management exists)
 *   2. Macro cycling target for this day-of-week (if cycling is active)
 *   3. Base targets from useGoalStore (default)
 *
 * All downstream UI should use this hook instead of reading
 * useGoalStore directly for target values.
 */
```

The hook should:
- Pull base targets (`calorieGoal`, `proteinGoal`, `carbsGoal`, `fatGoal`) from `useGoalStore`
- Call `macroCycleRepository.getTargetsForDate(date, baseTargets)` — the repo already implements the override → cycling → base resolution hierarchy and accepts a `baseTargets` parameter, so the hook is largely a reactive wrapper around this method
- Return the resolved targets for calories, protein, carbs, and fat
- If cycling is not active, the repo will return base targets unchanged — no special handling needed in the hook
- Accept an optional `date` parameter (defaults to today) so it works for historical views too
- Handle the timezone issue (see Fix 4 below) when determining day-of-week
- Return a `source` field indicating where targets came from: `'cycling'` | `'override'` | `'base'`
- Re-resolve reactively when the goal store or cycling config changes

### Step 2: Wire up all consumers

Find every component that reads macro/calorie targets from `useGoalStore` and replace with the new hook. At minimum, these are likely affected:

- **CalorieRingWidget** — the main calorie progress ring on the dashboard
- **MacroBarsWidget** — protein/carbs/fat progress bars
- **Meal logging screens** — any "% of daily target" displays
- **Weekly Insights / analytics** — target comparison calculations
- **Chat advisor** — if it references daily targets for recommendations
- **Any "remaining" calculations** (e.g., "You have 450 calories remaining")

For each consumer:
1. Replace `useGoalStore` target reads with `useResolvedTargets()`
2. Verify the component re-renders correctly when targets change
3. If the component displays the target value itself (not just progress), it should show the cycling-adjusted value

**Search strategy to find all consumers:**
```bash
# The goal store exposes these specific property names — search for all of them
grep -rn "calorieGoal\|proteinGoal\|carbsGoal\|fatGoal" src/ --include="*.ts" --include="*.tsx"
```

**Known consumers to check (from audit):**
- **CalorieRingWidget** — main calorie progress ring on the dashboard
- **MacroBarsWidget** — protein/carbs/fat progress bars
- **Today screen `(tabs)/index.tsx`** — already loads macro cycle config on mount and shows a day-type badge, but never feeds cycling targets into the actual widget values. The plumbing is partially there — connect it.
- **Meal logging screens** — any "% of daily target" displays
- **Meal plan feature** — if meal plan generation uses goal targets to build plans, it must also go through `useResolvedTargets`. If this integration is complex, note it as a follow-up but do not skip it silently.
- **Weekly Insights / analytics** — target comparison calculations (each day should compare against that day's resolved target, not a flat weekly value)
- **Chat advisor** — if it references daily targets for recommendations
- **Any "remaining" calculations** (e.g., "You have 450 calories remaining")

### Step 3: Verify and enhance the visual indicator

The Today screen `(tabs)/index.tsx` already renders a day-type badge when cycling is enabled — so this is partially done. Review what's there and ensure:

- The badge is positioned near the CalorieRingWidget or MacroBarsWidget (not off in a corner where users won't associate it with their targets)
- The badge text clearly communicates the day type (e.g., "High Carb Day", "Rest Day", or whatever the user named their pattern)
- Styling is muted/secondary so it's informative but not distracting
- If the badge is already well-positioned and clear, no changes needed — just confirm it works correctly now that the actual target values will change alongside it

### Step 4: Verify end-to-end

After wiring everything up, verify this scenario works:
1. User sets base targets: 2000 cal, 150g protein, 250g carbs, 70g fat
2. User enables macro cycling with high-carb days (Mon/Wed/Fri) and low-carb days (Tue/Thu/Sat/Sun)
3. On a Monday, CalorieRingWidget and MacroBarsWidget show the HIGH carb targets
4. On a Tuesday, they show the LOW carb targets
5. Logging a meal on Monday calculates "remaining" against the high-carb targets
6. Weekly Insights compares each day against that day's appropriate target (not a flat weekly average)

**Acceptance Criteria:**
- [ ] New `useResolvedTargets` hook (or equivalent) exists and resolves cycling → base fallback
- [ ] CalorieRingWidget uses resolved targets
- [ ] MacroBarsWidget uses resolved targets
- [ ] All "remaining" calculations use resolved targets
- [ ] Visual indicator shows which cycling day type is active
- [ ] Base-only users (no cycling) see zero behavior change
- [ ] Hook accepts optional date parameter for historical views
- [ ] Returns `source` field for UI to know if cycling is active

---

## OTHER FIXES

Complete these after the critical fix above is verified working.

### Fix 2: Weekly Average Calculation — Divide by Actual Days

**Problem:** Weekly average divides by 7 even when not all 7 days have cycling targets configured. If a user only sets targets for 5 days, the average is artificially diluted.

**Implementation:**

- Find the weekly average calculation (likely in the cycling store or a stats utility)
- Count only days that have explicit cycling targets configured
- Divide the sum by that count, not by 7
- If all 7 days have targets, behavior is unchanged
- Add a guard: if count is 0, return base targets (avoid division by zero)

**Acceptance Criteria:**
- [ ] Weekly average only counts days with configured cycling targets
- [ ] 7-day configurations produce identical results to before
- [ ] No division by zero possible

---

### Fix 3: Document or Fix Asymmetric High/Low Scaling

**Problem:** High carb days scale at 100% while low carb days use a 67% inverse. This asymmetry is unexplained and may confuse users or produce unintended nutritional outcomes.

**Implementation:**

Investigate the scaling logic and determine intent:
- If the asymmetry is intentional (e.g., based on sports nutrition research), add a code comment explaining the rationale and consider adding a brief user-facing explanation in the wizard (e.g., "Low carb days reduce carbs by ~33% to support recovery while maintaining energy balance")
- If the asymmetry is a bug, fix it so high and low days scale symmetrically around the base (e.g., high = base × 1.3, low = base × 0.7)
- Either way, the scaling factors should be named constants, not magic numbers:
  ```typescript
  const HIGH_CARB_SCALE = 1.0;   // or whatever the actual value is
  const LOW_CARB_SCALE = 0.67;
  ```

**Acceptance Criteria:**
- [ ] Scaling factors are named constants with comments explaining the rationale
- [ ] If asymmetry is intentional: code comment + optional user-facing explanation
- [ ] If asymmetry is a bug: symmetric scaling implemented
- [ ] No magic numbers in scaling logic

---

### Fix 4: Timezone-Aware Day-of-Week Calculation

**Problem:** The day-of-week determination for cycling patterns is timezone-fragile. The current code uses `new Date(date + 'T12:00:00').getDay()` — the noon trick is an attempt at timezone safety, but the string is parsed as local time without an explicit offset. This works in most cases but is brittle and non-obvious.

**Implementation:**

- For "today" resolution (no date parameter): use `new Date().getDay()` — this is always local timezone and is the simplest correct approach
- For date-string resolution (historical views): the `T12:00:00` noon trick is acceptable but add a comment explaining WHY it exists:
  ```typescript
  // Parse at noon local time to avoid date-shifting from UTC offset.
  // e.g., '2026-02-10' parsed as UTC in some engines would roll back
  // to Feb 9 in UTC-8. Noon gives a 12-hour buffer in either direction.
  const dayOfWeek = new Date(dateString + 'T12:00:00').getDay();
  ```
- Ensure consistency: if other parts of the app use a date library (dayjs, date-fns), prefer that over raw `Date` parsing
- Verify the new `useResolvedTargets` hook passes dates consistently to the repo

**Acceptance Criteria:**
- [ ] Day-of-week uses local timezone, not UTC
- [ ] Consistent with how dates are handled elsewhere in the app
- [ ] A user at 11:30 PM local time sees today's targets, not tomorrow's

---

### Fix 5: Custom Pattern Validation

**Problem:** The custom pattern step in the wizard allows users to enter macro values with no validation. Users could enter negative numbers, impossibly high values, or leave fields empty.

**Implementation:**

- Add validation to the custom pattern input fields in the wizard:
  - **Calories:** Must be a positive number. Hard minimum 500, maximum 10000. Values 500-800 show a warning but are allowed (covers IF rest days, smaller individuals).
  - **Protein (g):** Must be a positive number, minimum 0, maximum 500
  - **Carbs (g):** Must be a positive number, minimum 0, maximum 1000
  - **Fat (g):** Must be a positive number, minimum 0, maximum 400
  - All fields required (no empty values)
- Show inline validation messages below each field using Nourished Calm tone:
  - Hard block (below minimum / above maximum): "The supported range is [min]–[max]"
  - Soft warning (calories 500-800): "This is quite low — make sure it aligns with your plan" (non-blocking, user can proceed)
  - Empty: "Please enter a value for [nutrient]"
- Disable the "Next" / "Save" button until all fields pass validation
- Consider adding a warning (not a block) if macros don't roughly add up to the calorie target: "Heads up — these macros add up to ~[X] calories, which differs from your [Y] calorie target"

**Acceptance Criteria:**
- [ ] All custom pattern fields validate on input
- [ ] Invalid values show inline error messages
- [ ] Wizard cannot be completed with invalid macro values
- [ ] Macro-calorie mismatch warning displays (non-blocking)
- [ ] Validation messages use supportive, non-judgmental language

---

### Fix 6: Override Management UI

**Problem:** Day-specific overrides exist in the database (allowing a user to override cycling targets for a specific date) but there's no UI to view or clear them. Stale overrides silently affect targets with no way for the user to know or fix it.

**Implementation:**

This can be minimal for now — doesn't need a full management screen:

**Existing infrastructure:** The repo already has `getOverrideByDate()`, `setOverride()`, `clearOverride()`, and `clearAllOverrides()`. The store exposes `todayOverride` but does NOT expose list-all or clear-all — those store methods need to be added.

**Repo change needed:**
- The repo has `getOverrideByDate()`, `setOverride()`, `clearOverride()`, and `clearAllOverrides()` — but NO list-all query. Add a new repo method:
  ```typescript
  // macroCycleRepository
  async getAllOverrides(): Promise<MacroCycleOverride[]> {
    // SELECT * FROM macro_cycle_overrides ORDER BY date ASC
  }
  ```

**Store changes needed (wrapping repo methods):**
- Add `getAllOverrides()` — calls the new repo method above
- Add `clearOverride(date)` — wraps repo's `clearOverride`
- Add `clearAllOverrides()` — wraps repo's `clearAllOverrides`

**UI implementation:**

- In the macro cycling settings screen (wherever the user views/edits their cycling configuration), add a section at the bottom: "Date Overrides"
- If overrides exist, show them as a simple list:
  ```
  Date Overrides
  ─────────────────
  Feb 3 — High Carb (manual override)    [✕]
  Feb 7 — Rest Day (manual override)     [✕]
  ```
- Each override has a dismiss/delete button (✕) that removes it from the database
- If no overrides exist, either hide the section entirely or show "No date overrides"
- Tapping delete should show a brief confirmation: "Remove override for Feb 3?" with Cancel / Remove options
- After deletion, targets for that date revert to the cycling pattern

**Acceptance Criteria:**
- [ ] Overrides are visible in the cycling settings screen
- [ ] Each override can be deleted with confirmation
- [ ] Deleting an override reverts that date to the cycling pattern
- [ ] Section is hidden or minimal when no overrides exist
- [ ] Dates are formatted in a user-friendly way (not ISO strings)

---

## Post-Fix Checklist

1. **TypeScript:** `npx tsc --noEmit` — zero new errors
2. **Consumer migration audit:** Re-run `grep -rn "calorieGoal\|proteinGoal\|carbsGoal\|fatGoal" src/` — every hit should either use `useResolvedTargets` or have an explicit comment explaining why it reads base goals directly. Expect ~5-10 legitimate false positives (e.g., the goal settings screen where users SET base goals, the cycling wizard itself, store definitions) — those are correct as-is and don't need migration.
3. **Meal plan check:** If meal plan generation reads targets, confirm it goes through `useResolvedTargets`. If the integration is complex, document it as a tracked follow-up — do not leave it as a silent gap.
4. **Critical path test:** Enable cycling → check dashboard on different day types → targets change appropriately
5. **Fallback test:** Disable cycling → all targets revert to base `useGoalStore` values
6. **Historical test:** View a past day's log → targets shown match what cycling dictated for that date
7. **Timezone test:** Manually set device to UTC+12 and UTC-12 → day-of-week is correct in both
8. **Custom pattern test:** Try submitting invalid values in wizard → hard blocks prevent submission, soft warnings allow proceed
9. **Override test:** Create an override → verify it takes priority → delete it via new UI → verify cycling resumes
10. **No regression:** Users who never enabled macro cycling should see absolutely zero behavior change anywhere
