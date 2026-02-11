# NutritionRx — Onboarding Flow Redesign (FINAL — Implementation Ready)

> **FINAL changes from v3.2:** 5 nits total (3 + 2 blockers).
>
> 1. (P1) completeOnboarding() moved to END of completion handler — only called after all DB writes succeed
> 2. (P2) Pass `undefined` (not `null`) for optional targetWeightKg on maintain/track. Validate non-null required inputs before goalStore.createGoal().
> 3. (P3) Removed stale selectedRate references. Gain-rate options capped at ≤ 0.5% to match goals.tsx.
> 4. (P1) completeOnboarding() is non-throwing — catches errors internally, sets store.error. Handler now checks store error state and throws to trigger catch block.
> 5. (P1) hasCompletedOnboarding moved to VERY LAST write — prevents index.tsx legacy migration from seeing "completed" profile with missing goal/weight data on partial failure.
>
> **v3.2 changes from v3.1:** Final 4 patches. This version is implementation-ready.
>
> 1. (P1) Track path overwrite fix: pass raw 'track' to completeOnboarding() — never map before that call
> 2. (P1) goalStore.createGoal() uses profile-level params (sex, heightCm, age, activityLevel, currentWeightKg) — it calculates TDEE/macros internally. Pseudo-code rewritten to match.
> 3. (P1) Persist middleware now uses explicit partialize — excludes runtime flags (isLoaded) and Date fields (completedAt, firstFoodLoggedAt) to prevent hydration bugs
> 4. (P2) Onboarding rates use canonical percent values from goals.tsx, not arbitrary lb→% conversions. Display is converted to lb/kg for user readability.
>
> **v3.1 changes from v3:** Fixed 7 findings from final code audit.
>
> 1. (P1) Store has NO persist middleware — instructions now say ADD it, not "check partialize"
> 2. (P1) Completion handler rewritten with correct API signatures: completeOnboarding(args), profileRepository.update(camelCase), goalRepository CreateGoalInput(camelCase, requires targetRatePercent/eatingStyle/proteinPriority), goalStore.createGoal() for in-memory sync
> 3. (P1) Raw 'track' stored in onboarding_goal_path BEFORE mapping to 'maintain' for goal type
> 4. (P1) Goal creation now goes through goalStore (not just repository) to prevent stale in-memory targets on first dashboard render
> 5. (P2) targetRatePercent is REQUIRED (not nullable) — use 0 for maintain/track
> 6. (P2) Weight seeding uses correct API: weightRepository.create({ date, weightKg }) — camelCase
> 7. (P2) energyUnit kept in store/repo contract as 'calories' default — no UI but passes through

## Context

NutritionRx is a React Native nutrition tracking app built with Expo, TypeScript, Zustand, and SQLite. Design philosophy is **"Nourished Calm"** — warm, supportive, non-judgmental language around food.

**Current onboarding** is minimal: goal → preferences → ready. It collects only `goalPath` and unit preferences (`energyUnit`, `weightUnit`). Sex, DOB, height, weight, and activity level live in Settings → Profile. Target weight/rate/goal planning live in Settings → Goals. None of this is collected during onboarding, so the app can't show personalized targets on first launch.

**This redesign** replaces the 3-screen onboarding with an 8-screen flow that collects the user's full profile, calculates TDEE + macros, and shows a personalized plan before reaching the dashboard.

---

## ⚠️ CRITICAL: Read These Constraints Before Writing Any Code

Each constraint maps to a verified codebase fact. Violating any of these will cause bugs or regressions.

---

### Constraint 1: Exact file paths

The onboarding route files live at:

```
/Users/garrettcoughlin/Desktop/NutritionRx/src/app/onboarding/
```

NOT `app/(onboarding)/`. Do NOT restructure or rename this directory. Add new screen files here alongside the existing ones, then delete old ones at the end.

Verify the exact `_layout.tsx` Stack screen configuration and `index.tsx` redirect before modifying them.

---

### Constraint 2: Goals schema — use actual field names

The `goals` table (`002_goals.ts` starting line 35, `goalRepository.ts` line 124) uses these field names:

```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,               -- 'lose' | 'maintain' | 'gain' (NOT 'goal_type')
  target_weight_kg REAL,
  target_rate_percent REAL,         -- % of bodyweight/week (e.g. 0.5 = 0.5%/week) (NOT 'weekly_rate_kg')
  start_date TEXT NOT NULL,
  start_weight_kg REAL NOT NULL,    -- (NOT 'current_weight_kg')
  initial_tdee_estimate REAL NOT NULL,
  initial_target_calories REAL NOT NULL,  -- (NOT 'daily_calorie_target')
  initial_protein_g REAL NOT NULL,
  initial_carbs_g REAL NOT NULL,
  initial_fat_g REAL NOT NULL,
  current_tdee_estimate REAL NOT NULL,
  current_target_calories REAL NOT NULL,
  current_protein_g REAL NOT NULL,
  current_carbs_g REAL NOT NULL,
  current_fat_g REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Key mappings from onboarding UI → goals DB:**
| Onboarding concept | DB field |
|---|---|
| Goal type (lose/maintain/gain) | `type` |
| User's current weight | `start_weight_kg` |
| Target weight | `target_weight_kg` |
| Rate (converted from lbs/week to % bodyweight) | `target_rate_percent` |
| Calculated TDEE | `initial_tdee_estimate` AND `current_tdee_estimate` (same value at creation) |
| Calculated daily calories | `initial_target_calories` AND `current_target_calories` |
| Calculated protein | `initial_protein_g` AND `current_protein_g` |
| Calculated carbs | `initial_carbs_g` AND `current_carbs_g` |
| Calculated fat | `initial_fat_g` AND `current_fat_g` |

**Use `goalRepository.ts` methods to create the goal.** Read the repo to find the correct function signature — do NOT write raw SQL. The repo uses a `CreateGoalInput` interface with **camelCase** field names (e.g. `startWeightKg`, `targetRatePercent`, `initialTargetCalories`) that map to the snake_case SQL columns. Always use the repository's TypeScript interface, not the SQL column names directly.

---

### Constraint 3: user_settings is a key-value store

`user_settings` (`001_initial.ts` line 144) is a key-value table:

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

`settingsRepository.ts` (line 23) reads/writes individual keys. There are NO typed columns — everything is a string key with a string value.

**To store new keys** (e.g. `height_unit`, `onboarding_goal_path`), use the existing `settingsRepository` get/set methods. Verify the exact method signatures by reading `settingsRepository.ts`.

**Already-existing setting keys** (verify these exist): `weight_unit`, `theme`, `daily_calorie_goal`, `daily_protein_goal`, `daily_carbs_goal`, `daily_fat_goal`, `has_seen_onboarding`.

**New keys to add via settingsRepository (not migration):**

- `height_unit` → `'ft_in'` or `'cm'`
- `onboarding_goal_path` → `'lose'` | `'maintain'` | `'gain'` | `'track'` (raw UI selection)

Since it's key-value, no migration is needed — just write the key. But add corresponding reader functions/constants if the codebase has a pattern for that.

---

### Constraint 4: "track" is not a valid GoalType — pass raw 'track' through ALL store/repo calls

`goalRepository.ts` (line 11) defines: `type GoalType = 'lose' | 'maintain' | 'gain'`

Additionally, `onboardingStore.ts` (line 96) calls `onboardingRepository.completeOnboarding(goalPath, ...)`, and `onboardingRepository.ts` (line 137) writes `onboarding_goal_path`. This is the **authoritative write** for the UX flag.

**The critical ordering rule:** You MUST pass the raw `'track'` value to `onboardingStore.completeOnboarding()` so it flows through to the repository. If you map `'track'` → `'maintain'` before that call, the repository will write `'maintain'` as `onboarding_goal_path` and the UX differentiation is permanently lost.

**Implementation:**

1. Call `onboardingStore.completeOnboarding(draft.goalPath, ...)` with raw `'track'` — this writes `onboarding_goal_path: 'track'` via the repository
2. Do NOT call `settingsRepository.set('onboarding_goal_path', ...)` separately — the repository already handles this. A separate write would either be redundant or create a race condition.
3. Map `'track'` → `'maintain'` ONLY for the `goalStore.createGoal()` call (the DB goal type)
4. The UI reads `onboarding_goal_path` from the repository/settings to differentiate language: "Suggested Intake" vs "Daily Target"

---

### Constraint 5: Seed weight_entries on completion

Current weight's source of truth for many flows is the `weight_entries` table (`profile.tsx` lines 37, 69). Simply writing `start_weight_kg` to the goals table is NOT sufficient — the profile and weight trend features read from `weight_entries`.

**On onboarding completion, also insert a weight entry:**

```typescript
// Use the correct method and camelCase field names
await weightRepository.create({
  date: today, // ISO date string, today's date
  weightKg: currentWeightKg, // from onboarding draft — camelCase, NOT weight_kg
});
```

**⚠️ Read `weightRepository.ts`** (lines 8, 144) to confirm the method name is `create` and the field names are `date`, `weightKg`, `notes?`. The table may also have optional fields like `notes` or `source`.

---

### Constraint 6: Profile onboarding completion flag

The app has TWO completion checks that must both be set:

1. `onboardingStore.ts` (line 96) — the Zustand store's `isComplete` flag (set by `completeOnboarding(...)`)
2. `profileRepository.ts` (line 136) — the profile's `hasCompletedOnboarding` field (set via `profileRepository.update()`)

**On onboarding completion, set BOTH — but `hasCompletedOnboarding` must be the VERY LAST write.**

If `hasCompletedOnboarding` is set before other writes complete and a later write fails, `index.tsx` (line 45) may see a "completed" profile with missing goal/weight data, triggering incorrect routing or legacy migration behavior on next launch.

```typescript
// WRONG — sets completion flag too early:
await profileRepository.update({ ...allFields, hasCompletedOnboarding: true });
await goalStore.createGoal(...);  // if this fails, profile says "complete" but no goal exists

// RIGHT — completion flag is the final gate:
await profileRepository.update({ ...profileFields });  // no hasCompletedOnboarding yet
await goalStore.createGoal(...);
await weightRepository.create(...);
await onboardingStore.completeOnboarding(...);          // store flag
await profileRepository.update({ hasCompletedOnboarding: true }); // DB flag — LAST
```

If only one is set, the app may route incorrectly on next launch (e.g. showing onboarding again, or showing the dashboard without profile data).

**Also verify:** Does the app check `onboarding_skipped` anywhere? If so, make sure onboarding completion does NOT set that flag (it should remain 0/false since the user completed the full flow).

---

### Constraint 7: Onboarding layout has `gestureEnabled: false`

`_layout.tsx` (line 13) disables swipe-back gestures in the onboarding stack. This means:

- Users CANNOT swipe back between screens
- Back navigation must be handled via an explicit back button/arrow in the header or screen body
- The Continue button is the ONLY way forward
- This is intentional (prevents accidental swipe-backs during a sequential flow)

**Implementation:**

- Keep `gestureEnabled: false` on the stack navigator
- Add a visible back arrow/button on screens 2-8 that calls `router.back()`
- Screen 1 (Goal) has no back button (it's the entry point)
- The back button should be in the screen body or a custom header, NOT relying on the native gesture

---

### Constraint 8: onboardingStore has NO persist middleware — add it with explicit partialize

`onboardingStore.ts` (line 1) is a **plain Zustand store** — it does NOT use `persist` middleware, `partialize`, or AsyncStorage. State is lost on every app restart.

**This means crash-recovery for the new draft state requires you to ADD persist middleware to the store.**

**⚠️ You MUST use `partialize` to whitelist specific fields.** The store has runtime flags and Date-typed fields that will cause hydration bugs if persisted naively:

- `isLoaded` (runtime flag, `onboardingStore.ts` line 7) — if persisted as `true`, the `loadOnboarding()` function will short-circuit on relaunch (`onboardingStore.ts` line 77) and skip loading fresh data from the DB
- `completedAt` (`onboardingStore.ts` line 7) — Date object that will be stringified by JSON serialization and rehydrate as a string, not a Date
- `firstFoodLoggedAt` (`onboardingStore.ts` line 12) — same Date serialization issue

**Implementation — add persist with partialize:**

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // ALL existing fields and actions — unchanged
      // ...

      // NEW draft fields and actions
      draft: INITIAL_DRAFT,
      updateDraft: (partial) =>
        set((state) => ({
          draft: { ...state.draft, ...partial },
        })),
      clearDraft: () => set({ draft: INITIAL_DRAFT }),
    }),
    {
      name: "nutritionrx-onboarding-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // ONLY persist the draft (for crash recovery mid-onboarding)
        draft: state.draft,
        // ONLY persist stable, serialization-safe existing fields:
        isComplete: state.isComplete,
        goalPath: state.goalPath,
        energyUnit: state.energyUnit,
        weightUnit: state.weightUnit,
        seenTooltips: state.seenTooltips,
        // DO NOT persist:
        // - isLoaded (runtime flag — must start false, loadOnboarding() sets it)
        // - completedAt (Date object — serialization mismatch)
        // - firstFoodLoggedAt (Date object — serialization mismatch)
        // - Any other computed/transient/Date fields
      }),
    },
  ),
);
```

**⚠️ Read the FULL store interface** to decide which fields to include in partialize. The list above is based on audit findings but may be incomplete. The rule is:

- Include: primitive types (string, number, boolean), plain objects, arrays of primitives
- Exclude: Date objects, runtime flags that control loading, function references, anything set by `loadOnboarding()`

**Side effect of adding persist:** Fields like `seenTooltips` will now survive app restarts (they previously didn't). Verify that `FirstFoodCelebration.tsx` and tooltip display logic still behave correctly — e.g. if `seenTooltips` was previously re-initialized on every launch, persisting it changes behavior.

**The `name` key must be unique** — check that no other store uses the same AsyncStorage key.

**Test crash recovery:** Fill out screens 1-4, force-quit, relaunch. Draft data for screens 1-4 should be intact and the app should resume at screen 5. Also verify `loadOnboarding()` still runs on fresh launch (isLoaded not persisted → starts false → loadOnboarding proceeds normally).

---

### Constraint 9: energyUnit removal must preserve existing contracts

The UI removes the energy unit toggle (kJ not supported app-wide), but `energyUnit` is still part of the onboarding store interface (`onboardingStore.ts` line 9) and `onboardingRepository` signatures (`onboardingRepository.ts` line 11).

**Implementation:**

- Do NOT remove `energyUnit` from the store or repository interfaces — that would break the existing contract
- Default it to `'calories'` in the draft's `INITIAL_DRAFT` and never expose UI for it
- When `completeOnboarding()` is called, pass `'calories'` for the energyUnit argument
- When kJ support is added app-wide later, re-add the UI toggle on the body-stats screen

---

**Legal → Onboarding (7-8 screens) → Dashboard**

Legal gate is unchanged. New onboarding replaces all existing onboarding screens.

---

### Screen 1: Goal

**File:** `src/app/onboarding/goal.tsx` (replace existing content)

```
┌─────────────────────────────────────────────┐
│                                    Step 1/8  │
│  ━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                              │
│  What brings you to                          │
│  NutritionRx?                                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  ○  Lose weight                        │  │
│  │     Track calories to reach your goal  │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Maintain weight                    │  │
│  │     Keep your nutrition balanced       │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Build muscle                       │  │
│  │     Optimize protein and calories      │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Just track what I eat              │  │
│  │     No specific goal in mind           │  │
│  └────────────────────────────────────────┘  │
│                                              │
│           [ Continue ]                       │
│  No back button on this screen               │
└──────────────────────────────────────────────┘
```

**Draft field:** `goalPath: 'lose' | 'maintain' | 'gain' | 'track'`

**DB mapping on completion:**

- `lose` → goal with `type: 'lose'`
- `maintain` → goal with `type: 'maintain'`
- `gain` → goal with `type: 'gain'`
- `track` → goal with `type: 'maintain'` + `onboarding_goal_path: 'track'` in user_settings (see Constraint 4)

**No default** — user must select one.
**No back button** — this is the entry point.
**Navigation:** Always → Screen 2. Also updates `draft.lastCompletedScreen = 'goal'`.

---

### Screen 2: About You

**File:** `src/app/onboarding/about-you.tsx` (new file)

```
┌─────────────────────────────────────────────┐
│  [← Back]                           Step 2/8 │
│  ━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                              │
│  A little about you                          │
│                                              │
│  This helps us estimate your daily           │
│  calorie needs more accurately.              │
│                                              │
│  Sex                                         │
│  ┌──────────────┐ ┌──────────────┐           │
│  │    Male      │ │   Female     │           │
│  └──────────────┘ └──────────────┘           │
│                                              │
│  Date of birth                               │
│  ┌────────────────────────────────────────┐  │
│  │  March 15, 1990                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ℹ️ Used only for metabolism estimates.      │
│     You can change this anytime in Settings. │
│                                              │
│           [ Continue ]                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Draft fields:**

- `sex: 'male' | 'female'`
- `dateOfBirth: string` (YYYY-MM-DD)

**Back button:** Visible, calls `router.back()` (gesture disabled per Constraint 7).
**Input:** Sex = segmented toggle. DOB = platform date picker.
**Validation:** Both required. Age ≥ 13 (gentle message: "NutritionRx is designed for ages 13 and up").
**Navigation:** → Screen 3. Updates `draft.lastCompletedScreen = 'about-you'`.

---

### Screen 3: Body Stats

**File:** `src/app/onboarding/body-stats.tsx` (new file)

```
┌─────────────────────────────────────────────┐
│  [← Back]                           Step 3/8 │
│  ━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                              │
│  Your current stats                          │
│                                              │
│  Height                                      │
│  ┌─────────────────────────┐                 │
│  │  5' 10"                  │  [ft/in ↔ cm]  │
│  └─────────────────────────┘                 │
│                                              │
│  Current weight                              │
│  ┌─────────────────────────┐                 │
│  │  185 lbs                 │  [lbs ↔ kg]    │
│  └─────────────────────────┘                 │
│                                              │
│  ℹ️ Smart defaults based on your locale.     │
│     Change anytime in Settings.              │
│                                              │
│           [ Continue ]                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Draft fields:**

- `heightCm: number` (stored internally in cm always)
- `currentWeightKg: number` (stored internally in kg always)
- `weightUnit: 'lbs' | 'kg'`
- `heightUnit: 'ft_in' | 'cm'`

**No energy unit toggle** — the app is kcal-only per `units.tsx` line 98. Remove to avoid setting false expectations.

**Smart defaults:** Use `expo-localization`. US → ft/in + lbs. Metric locales → cm + kg.
**Unit toggles:** Inline, converting the displayed value instantly without losing the stored metric value.
**Validation:** Height 61–244 cm (2'0"–8'0"). Weight 23–318 kg (50–700 lbs). All required.
**Navigation:** → Screen 4. Updates `draft.lastCompletedScreen = 'body-stats'`.

---

### Screen 4: Activity Level

**File:** `src/app/onboarding/activity.tsx` (new file)

```
┌─────────────────────────────────────────────┐
│  [← Back]                           Step 4/8 │
│  ━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                              │
│  How active are you?                         │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  ○  Not very active                    │  │
│  │     Desk job, not much movement        │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  A little active                    │  │
│  │     Some walking, light exercise       │  │
│  │     1-2x/week                          │  │
│  ├────────────────────────────────────────┤  │
│  │  ●  Fairly active              default │  │
│  │     Regular exercise 3-4x/week         │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Very active                        │  │
│  │     Hard workouts 5-6x/week            │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Extremely active                   │  │
│  │     Intense daily training or          │  │
│  │     physical job                       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ℹ️ Not sure? Start lower — we'll help      │
│     you adjust based on your results.        │
│                                              │
│           [ Continue ]                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Draft field:** `activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'`

| Label            | DB Value          | Multiplier |
| ---------------- | ----------------- | ---------- |
| Not very active  | sedentary         | 1.2        |
| A little active  | lightly_active    | 1.375      |
| Fairly active    | moderately_active | 1.55       |
| Very active      | very_active       | 1.725      |
| Extremely active | extremely_active  | 1.9        |

**Default:** `moderately_active` pre-selected.
**Navigation:** → Screen 5. Updates `draft.lastCompletedScreen = 'activity'`.

---

### Screen 5: Eating Style

**File:** `src/app/onboarding/eating-style.tsx` (new file)

```
┌─────────────────────────────────────────────┐
│  [← Back]                           Step 5/8 │
│  ━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░  │
│                                              │
│  How do you like to eat?                     │
│                                              │
│  This helps us balance your carbs and fats.  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  ⚖️  Flexible                     ✓   │  │
│  │  A balanced mix of carbs and fats      │  │
│  ├────────────────────────────────────────┤  │
│  │  🍞  Carb-Focused                      │  │
│  │  More carbs for energy & performance   │  │
│  ├────────────────────────────────────────┤  │
│  │  🥑  Fat-Focused                       │  │
│  │  More fats, moderate carbs             │  │
│  ├────────────────────────────────────────┤  │
│  │  🥓  Very Low Carb                     │  │
│  │  Under 50g carbs (keto-friendly)       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│           [ Continue ]                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Draft field:** `eatingStyle: 'flexible' | 'carb_focused' | 'fat_focused' | 'very_low_carb'`

| Style         | Carb % | Fat % | Carb Cap |
| ------------- | ------ | ----- | -------- |
| Flexible      | 50%    | 50%   | None     |
| Carb-Focused  | 65%    | 35%   | None     |
| Fat-Focused   | 35%    | 65%   | 150g     |
| Very Low Carb | 10%    | 90%   | 50g      |

**DB location:** Written to `user_profile` table (NOT user_settings). Reference: `profileRepository.ts` line 107, `nutrition.tsx` line 132. Also copied to goals on goal creation per `goalRepository.ts` line 148.
**Default:** `flexible` pre-selected.
**Navigation:** → Screen 6. Updates `draft.lastCompletedScreen = 'eating-style'`.

---

### Screen 6: Protein Priority

**File:** `src/app/onboarding/protein.tsx` (new file)

```
┌─────────────────────────────────────────────┐
│  [← Back]                           Step 6/8 │
│  ━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░  │
│                                              │
│  How much protein do you want?               │
│                                              │
│  Higher protein helps preserve muscle,       │
│  especially when losing weight.              │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  ○  Standard                           │  │
│  │     ~{calculated}g/day · General health │  │
│  ├────────────────────────────────────────┤  │
│  │  ●  Active                     default │  │
│  │     ~{calculated}g/day · Regular       │  │
│  │     exercise                           │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Athletic                           │  │
│  │     ~{calculated}g/day · Intense       │  │
│  │     training                           │  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Maximum                            │  │
│  │     ~{calculated}g/day · Bodybuilding  │  │
│  │     or cutting                         │  │
│  └────────────────────────────────────────┘  │
│                                              │
│           [ Continue ]                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Draft field:** `proteinPriority: 'standard' | 'active' | 'athletic' | 'maximum'`

| Priority | g/lb | Example (185 lbs) |
| -------- | ---- | ----------------- |
| Standard | 0.6  | ~111g/day         |
| Active   | 0.75 | ~139g/day         |
| Athletic | 0.9  | ~167g/day         |
| Maximum  | 1.0  | ~185g/day         |

**Dynamic gram values:** Read `currentWeightKg` from draft, convert to lbs, multiply. Update in real-time.
**DB location:** Written to `user_profile` (same as eating_style — NOT user_settings).
**Default:** `active` pre-selected.
**Navigation:**

- If `goalPath` is `'lose'` or `'gain'` → Screen 7 (Target)
- If `goalPath` is `'maintain'` or `'track'` → Screen 8 (Your Plan)
- Updates `draft.lastCompletedScreen = 'protein'`.

---

### Screen 7: Target (CONDITIONAL — lose/gain only)

**File:** `src/app/onboarding/target.tsx` (new file)

```
┌─────────────────────────────────────────────┐
│  [← Back]                           Step 7/8 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░  │
│                                              │
│  Set your target                             │
│                                              │
│  Target weight                               │
│  ┌─────────────────────────┐                 │
│  │  165 lbs                 │                │
│  └─────────────────────────┘                 │
│                                              │
│  Weekly rate                                 │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  ○  Slow · ~{computed} lb/week        │  │
│  │     Easiest to maintain                │  │
│  ├────────────────────────────────────────┤  │
│  │  ●  Moderate · ~{computed} lb/week     │  │
│  │     Recommended for most people default│  │
│  ├────────────────────────────────────────┤  │
│  │  ○  Aggressive · ~{computed} lb/week  │  │
│  │     Faster, but harder to sustain      │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  📅 At this rate, you'll reach your goal    │
│     in about ~20 weeks (May 2026)            │
│                                              │
│  Rate display values are computed from       │
│  canonical percent × current weight.         │
│                                              │
│           [ Continue ]                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Draft fields:**

- `targetWeightKg: number`
- `targetRatePercent: number` (canonical percent value — stored directly, no conversion needed)

**⚠️ CRITICAL: Use the SAME canonical `targetRatePercent` values that `goals.tsx` uses** (`goals.tsx` lines 79, 204, 679). The Settings screen uses strict equality checks against these values to show which option is selected. If onboarding stores a different percent (e.g. from an arbitrary lb/week → % conversion), the Settings rate picker will show no selection.

**Read `goals.tsx` to find the exact percent values used.** They are likely something like `0.25`, `0.5`, `0.75`, `1.0` (as percent of bodyweight per week). Use those exact values as the canonical options.

**Rate options — LOSE goals:**
| Rate | targetRatePercent (stored) | Display (computed from user's weight) |
|------|---------------------------|---------------------------------------|
| Slow | _(read from goals.tsx — likely 0.25)_ | ~{weightKg × percent / 100} kg/week or converted to lbs |
| Moderate | _(read from goals.tsx — likely 0.5)_ | ~{computed} |
| Aggressive | _(read from goals.tsx — likely 0.75)_ | ~{computed} |

**Rate options — GAIN goals (more conservative — max ≤ 0.5% per goals.tsx line 204):**
| Rate | targetRatePercent (stored) | Display |
|------|---------------------------|---------|
| Slow | _(from goals.tsx — must be ≤ 0.5)_ | ~{computed} |
| Moderate | _(from goals.tsx — must be ≤ 0.5)_ | ~{computed} |

**Note:** Gain goals may only have 2 rate options (not 3) if goals.tsx caps at 0.5%. Match the exact options available in Settings to avoid orphaned selections. Read `goals.tsx` line 204 to confirm.

**How to compute display text from percent:**

```typescript
// Convert canonical percent to user-friendly display
const weeklyChangeKg = (currentWeightKg * targetRatePercent) / 100;
const weeklyChangeLbs = weeklyChangeKg * 2.20462;
// Display: "~0.9 lb/week" or "~0.4 kg/week" based on user's weightUnit
```

**The stored value is always the canonical percent** — never a converted lb or kg value. This guarantees Settings rate picker compatibility.

For maintain/track goals (which skip this screen), use `targetRatePercent = 0`.

**ETA calculation:**

```typescript
const weeklyChangeKg = (currentWeightKg * targetRatePercent) / 100;
const weeksToGoal = Math.abs(currentWeightKg - targetWeightKg) / weeklyChangeKg;
```

Display as "~X weeks (Month Year)".

**Validation:**

- Lose: target < current weight
- Gain: target > current weight
- Minimum target: 36 kg / 80 lbs
- Gentle validation messages, not error styling

**Default rate:** `moderate` (middle percent option) pre-selected. Target weight field empty (required).
**Navigation:** → Screen 8. Updates `draft.lastCompletedScreen = 'target'`.

---

### Screen 8: Your Plan (Summary)

**File:** `src/app/onboarding/your-plan.tsx` (new file)

```
┌─────────────────────────────────────────────┐
│  [← Back]                           Step 8/8 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                              │
│  Your plan is ready ✨                       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │  Daily Calorie Target                  │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │         1,950 cal                │  │  │
│  │  └──────────────────────────────────┘  │  │
│  │                                        │  │
│  │  Macro Breakdown                       │  │
│  │  ┌──────────┬──────────┬───────────┐  │  │
│  │  │ Protein  │  Carbs   │   Fat     │  │  │
│  │  │  139g    │  195g    │   65g     │  │  │
│  │  │  29%     │  40%     │   30%     │  │  │
│  │  └──────────┴──────────┴───────────┘  │  │
│  │                                        │  │
│  │  Based on:                             │  │
│  │  • TDEE: 2,450 cal/day                │  │
│  │  • 500 cal/day deficit                │  │
│  │  • Goal: Lose 20 lbs in ~20 weeks     │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ℹ️ These are starting estimates.            │
│     We'll help you adjust as you go.         │
│                                              │
│           [ Start Tracking ]                 │
│                                              │
└──────────────────────────────────────────────┘
```

**Calculations — USE EXISTING CODE (do not duplicate):**

BMR/TDEE logic exists in `goalStore.ts` (lines 433, 442). Macro logic exists in `macroCalculator.ts` (line 63).

**Step 1: Read both files.** Understand their function signatures and what parameters they expect.

**Step 2:** If those functions pull data from store state internally (tightly coupled), refactor them into pure functions that accept parameters. Move the pure functions to a shared location (e.g. extend `macroCalculator.ts`). Update `goalStore.ts` to import from the shared location. Run existing tests.

**Step 3:** Import and call those shared functions from the summary screen with data from the onboarding draft.

**Calorie floor:** 1,500 (male) / 1,200 (female). If hit, show note: "We've set a minimum safe target. Consider a slower rate for sustainable results."

**Display by goal path:**
| goalPath | Header | Detail lines |
|----------|--------|-------------|
| lose | "Your plan is ready ✨" | TDEE, deficit, ETA |
| gain | "Your plan is ready ✨" | TDEE, surplus, ETA |
| maintain | "Your plan is ready ✨" | TDEE only |
| track | "Here's a starting point ✨" | Estimated TDEE, softer language ("suggested intake"), "Adjust anytime in Settings — there's no wrong answer." |

---

## Completion Handler ("Start Tracking" button)

This is the most critical function. It runs when the user taps "Start Tracking" on the summary screen. It must write to multiple places AND keep in-memory stores in sync.

### ⚠️ API Constraints (verified against codebase)

1. **`goalStore.createGoal()` takes PROFILE-LEVEL parameters and calculates internally** (`goalStore.ts` line 114, called at line 266). It expects inputs like `currentWeightKg`, `sex`, `heightCm`, `age`, `activityLevel`, `eatingStyle`, `proteinPriority`, `targetRatePercent`, `type`, etc. It does NOT accept pre-calculated TDEE, calories, or macro values — **it computes those itself** using the same BMR/TDEE/macro functions. This means:
   - The summary screen calculates values **for display only** (showing the user their plan)
   - The completion handler passes **raw profile data** to goalStore, which re-derives the same numbers
   - This guarantees consistency between onboarding and future goal recalculations

2. **`completeOnboarding()` requires arguments** (`onboardingStore.ts` line 21). Read the method signature — it likely expects goalPath (raw), energyUnit, weightUnit. **Pass raw `'track'` here, not mapped `'maintain'`** — the repository call inside (`onboardingRepository.ts` line 137) writes `onboarding_goal_path` from this value.

3. **`profileRepository.update()`** uses **camelCase** field names (`profileRepository.ts` line 81). E.g. `dateOfBirth`, `heightCm`, `activityLevel`, `eatingStyle`, `proteinPriority`, `hasCompletedOnboarding`.

4. **`weightRepository.create()`** (`weightRepository.ts` lines 8, 144) takes **camelCase**: `{ date, weightKg, notes? }`.

5. **Ordering matters for 'track' path:** `onboardingStore.completeOnboarding(draft.goalPath, ...)` must be called with raw `'track'`. The onboarding repo writes `onboarding_goal_path: 'track'`. If you map to 'maintain' and pass that to completeOnboarding, the UX flag is permanently lost. Call it **after all data writes** but **before** `hasCompletedOnboarding` (which is the very last write).

6. **`completeOnboarding()` is non-throwing** (`onboardingStore.ts` line 96). It catches errors internally and sets `store.error` instead of throwing. A try/catch around the call will NOT catch failures. You must check `onboardingStore.getState().error` after the call and throw manually if it's set.

7. **`hasCompletedOnboarding` must be the VERY LAST write.** If set earlier and a subsequent write fails, `index.tsx` (line 45) legacy migration sees a "completed" profile with missing goal/weight data. Write it only after every other step has succeeded.

### Step-by-step:

```typescript
async function handleStartTracking(draft: OnboardingDraft) {
  const goalType = draft.goalPath === "track" ? "maintain" : draft.goalPath;
  const age = calculateAge(draft.dateOfBirth);

  // 0. Validate required non-null inputs before any writes
  if (
    !draft.sex ||
    !draft.dateOfBirth ||
    !draft.heightCm ||
    !draft.currentWeightKg ||
    !draft.activityLevel ||
    !draft.eatingStyle ||
    !draft.proteinPriority
  ) {
    // Show error — should not happen if screen validation is correct
    return;
  }

  try {
    // 1. Write profile — WITHOUT hasCompletedOnboarding (set later at final step)
    //    If this is set now and a later write fails, index.tsx (line 45) legacy
    //    migration can see completed profile + missing goal = broken state
    await profileRepository.update({
      sex: draft.sex,
      dateOfBirth: draft.dateOfBirth,
      heightCm: draft.heightCm,
      activityLevel: draft.activityLevel,
      eatingStyle: draft.eatingStyle,
      proteinPriority: draft.proteinPriority,
      // hasCompletedOnboarding intentionally OMITTED — set in step 6
    });

    // 2. Create goal via goalStore.createGoal() — PROFILE-LEVEL params
    //    goalStore calculates TDEE/calories/macros internally
    //    ⚠️ Read goalStore.ts line 114 for the exact parameter interface
    await goalStore.getState().createGoal({
      type: goalType, // 'lose' | 'maintain' | 'gain' (mapped)
      currentWeightKg: draft.currentWeightKg,
      targetWeightKg:
        draft.goalPath === "lose" || draft.goalPath === "gain"
          ? draft.targetWeightKg
          : undefined, // undefined, NOT null — optional field
      targetRatePercent: draft.targetRatePercent, // canonical % from goals.tsx, 0 for maintain/track
      sex: draft.sex,
      heightCm: draft.heightCm,
      age: age,
      activityLevel: draft.activityLevel,
      eatingStyle: draft.eatingStyle,
      proteinPriority: draft.proteinPriority,
      // DO NOT pass: tdee, calories, protein, carbs, fat — goalStore computes these
    });

    // 3. Seed weight entry — CAMELCASE
    await weightRepository.create({
      date: new Date().toISOString().split("T")[0],
      weightKg: draft.currentWeightKg,
    });

    // 4. Write unit settings
    await settingsRepository.set("weight_unit", draft.weightUnit);
    await settingsRepository.set("height_unit", draft.heightUnit);
    // DO NOT separately write onboarding_goal_path — step 5 handles it

    // 5. Mark onboarding complete in store/repo
    //    ⚠️ completeOnboarding() does NOT throw on failure (onboardingStore.ts line 96)
    //    It catches errors internally and sets store.error instead.
    //    You MUST check the store error state after calling it.
    await onboardingStore.getState().completeOnboarding(
      draft.goalPath, // RAW value — 'track' preserved here
      draft.energyUnit, // 'calories' (hardcoded, no UI)
      draft.weightUnit, // from draft
      // ... any other required args — READ THE SIGNATURE
    );

    // Check if completeOnboarding silently failed
    const storeError = onboardingStore.getState().error;
    if (storeError) {
      throw new Error(`Onboarding store completion failed: ${storeError}`);
    }

    // 6. FINAL STEP: Set hasCompletedOnboarding on profile — only after everything succeeded
    //    This is the flag that index.tsx (line 45) checks for routing.
    //    Setting it earlier risks partial-completion state on failure.
    await profileRepository.update({
      hasCompletedOnboarding: true,
    });

    // 7. Clear draft
    onboardingStore.getState().clearDraft();

    // 8. Navigate to dashboard
    router.replace("/");
  } catch (error) {
    // If ANY write fails (including non-throwing completeOnboarding),
    // hasCompletedOnboarding is NOT set, draft is intact, user can retry
    console.error("Onboarding completion failed:", error);
    showRetryError();
  }
}
```

**⚠️ This pseudo-code is a GUIDE — you MUST read every method signature before calling it.** Specifically:

- Read `goalStore.createGoal()` at line 114 for the exact input interface — the params above are based on audit findings but field names may differ slightly
- Read `onboardingStore.completeOnboarding()` at line 96 — confirm it catches errors and sets `store.error` (does NOT throw). Check the exact error field name.
- Read `profileRepository.update()` at line 81 for exact field names
- Read `weightRepository.create()` at lines 8/144 for required fields
- Handle errors — if any write fails, show a retry option, don't navigate away
- **Idempotency:** If the user retries after a partial failure (e.g. profile written but goal failed), the retry will re-write profile data (harmless) and attempt goal creation again. Verify that `goalStore.createGoal()` doesn't fail if profile data already exists.

### Summary screen calculations (for DISPLAY only)

The summary screen needs to calculate TDEE, daily calories, and macros to show the user their plan. These same calculations will be re-derived by `goalStore.createGoal()` when the user taps "Start Tracking".

**Use the SAME pure functions that goalStore uses internally** (from `goalStore.ts` or `macroCalculator.ts`). This guarantees the displayed numbers match what gets stored. If goalStore's calculation functions are tightly coupled to store state, extract them into shared pure utilities first.

---

## Onboarding Store Changes

### Extend, do NOT replace. ADD persist middleware (Constraint 8).

The store currently has NO persist middleware. You must wrap it with `persist` from `zustand/middleware`.

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// In onboardingStore.ts — ADD these fields alongside ALL existing ones

interface OnboardingDraft {
  // Screen 1
  goalPath: "lose" | "maintain" | "gain" | "track" | null;
  // Screen 2
  sex: "male" | "female" | null;
  dateOfBirth: string | null;
  // Screen 3
  heightCm: number | null;
  currentWeightKg: number | null;
  weightUnit: "lbs" | "kg";
  heightUnit: "ft_in" | "cm";
  // NOT exposed in UI, but required by existing store/repo contract (Constraint 9)
  energyUnit: "calories" | "kilojoules";
  // Screen 4
  activityLevel: ActivityLevel | null;
  // Screen 5
  eatingStyle: EatingStyle | null;
  // Screen 6
  proteinPriority: ProteinPriority | null;
  // Screen 7 (conditional)
  targetWeightKg: number | null;
  targetRatePercent: number; // canonical percent from goals.tsx options, 0 for maintain/track
  // Resume tracking
  lastCompletedScreen: string | null;
}

const INITIAL_DRAFT: OnboardingDraft = {
  goalPath: null,
  sex: null,
  dateOfBirth: null,
  heightCm: null,
  currentWeightKg: null,
  weightUnit: detectLocaleWeightUnit(), // from expo-localization
  heightUnit: detectLocaleHeightUnit(),
  energyUnit: "calories", // hardcoded — kJ not supported app-wide
  activityLevel: null,
  eatingStyle: null,
  proteinPriority: null,
  targetWeightKg: null,
  targetRatePercent: 0, // 0 = no rate (maintain/track default)
  lastCompletedScreen: null,
};
```

**Actions to add:**

- `updateDraft(partial: Partial<OnboardingDraft>)` — merges partial into draft, persists automatically via middleware
- `clearDraft()` — resets draft to `INITIAL_DRAFT`

**Actions to KEEP untouched:**

- `completeOnboarding(...)` — **requires arguments** (`onboardingStore.ts` line 21). Read the signature. It likely expects goalPath, energyUnit, weightUnit, or similar. Pass the correct values from the draft.
- All tooltip actions (`markTooltipSeen`, `hasSeenTooltip`, etc.)
- `markFirstFoodLogged()` and related celebration state
- Any other existing actions

**Adding persist middleware:**
Wrap the entire store creator with `persist(...)`. See Constraint 8 for the full pattern. This is a NEW addition — the store currently has no persistence. Test that existing behavior (tooltips, celebrations) still works after adding persist, since those fields will now survive app restarts when they previously didn't.

---

## Draft State Lifecycle

| Event                                  | Action                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Onboarding starts (first time)         | Initialize draft with `INITIAL_DRAFT` (locale defaults for units, energyUnit='calories')      |
| User taps Continue on any screen       | Update `draft.lastCompletedScreen`, auto-persisted by Zustand persist middleware              |
| User taps Back                         | Navigate back, draft data preserved (no changes needed)                                       |
| User changes goalPath from lose→track  | Clear `targetWeightKg` and reset `targetRatePercent` to 0 in draft                            |
| App force-quit mid-flow                | Draft persisted in AsyncStorage via persist middleware (NEW — previously lost)                |
| App relaunches, `isComplete === false` | Zustand hydrates from AsyncStorage. Read `draft.lastCompletedScreen`, navigate to next screen |
| User taps "Start Tracking"             | Run completion handler, then `clearDraft()`                                                   |
| `resetOnboarding()` called (debug)     | `clearDraft()` + reset `isComplete`                                                           |

**Draft NEVER reads from DB on resume.** It's the sole source of truth during onboarding. DB is only written on completion.

---

## Navigation & Progress Bar

### \_layout.tsx updates

Keep `gestureEnabled: false`. Add all new screens to the Stack:

```typescript
// Add these screen entries to the existing Stack navigator
// Verify screen name conventions match the existing pattern in _layout.tsx
<Stack.Screen name="goal" />
<Stack.Screen name="about-you" />
<Stack.Screen name="body-stats" />
<Stack.Screen name="activity" />
<Stack.Screen name="eating-style" />
<Stack.Screen name="protein" />
<Stack.Screen name="target" />
<Stack.Screen name="your-plan" />
```

### Progress bar logic

```typescript
function getScreenOrder(
  goalPath: "lose" | "maintain" | "gain" | "track" | null,
): string[] {
  const base = [
    "goal",
    "about-you",
    "body-stats",
    "activity",
    "eating-style",
    "protein",
  ];
  if (goalPath === "lose" || goalPath === "gain") {
    return [...base, "target", "your-plan"];
  }
  return [...base, "your-plan"];
}

// Step counter: "Step {currentIndex + 1} / {screenOrder.length}"
// Progress bar width: (currentIndex + 1) / screenOrder.length * 100%
```

Animate progress bar width with `react-native-reanimated` (300ms).

### Resume navigation

In `index.tsx` (the onboarding entry point):

```typescript
const { isComplete, draft } = useOnboardingStore();

if (isComplete) {
  router.replace("/"); // go to dashboard
  return;
}

if (draft.lastCompletedScreen) {
  const order = getScreenOrder(draft.goalPath);
  const lastIndex = order.indexOf(draft.lastCompletedScreen);
  const nextScreen = order[lastIndex + 1];
  if (nextScreen) {
    router.replace(`/onboarding/${nextScreen}`);
    return;
  }
}

// Default: start at goal screen
router.replace("/onboarding/goal");
```

---

## Shared UI Components

Before creating any, search the codebase for existing equivalents. Reuse what exists.

- **`OnboardingRadioCard`** — Single-select card (emoji optional, title, subtitle). Used on 5 screens.
- **`OnboardingSegmentedToggle`** — Two-option pill (sex, units).
- **`OnboardingContinueButton`** — Fixed bottom, disabled until valid.
- **`OnboardingBackButton`** — Visible back arrow (since gestures disabled).
- **`OnboardingInfoText`** — Small gray "Change anytime in Settings" text.
- **`OnboardingProgressBar`** — Thin animated bar. Reanimated.

### Test IDs

Add to `testIDs.ts`, matching its existing naming convention:

```typescript
export const ONBOARDING = {
  GOAL_LOSE: "onboarding-goal-lose",
  GOAL_MAINTAIN: "onboarding-goal-maintain",
  GOAL_GAIN: "onboarding-goal-gain",
  GOAL_TRACK: "onboarding-goal-track",
  CONTINUE_BUTTON: "onboarding-continue",
  BACK_BUTTON: "onboarding-back",
  SEX_MALE: "onboarding-sex-male",
  SEX_FEMALE: "onboarding-sex-female",
  DOB_INPUT: "onboarding-dob",
  HEIGHT_INPUT: "onboarding-height",
  HEIGHT_UNIT_TOGGLE: "onboarding-height-unit",
  WEIGHT_INPUT: "onboarding-weight",
  WEIGHT_UNIT_TOGGLE: "onboarding-weight-unit",
  ACTIVITY_SEDENTARY: "onboarding-activity-sedentary",
  ACTIVITY_LIGHTLY: "onboarding-activity-lightly",
  ACTIVITY_MODERATELY: "onboarding-activity-moderately",
  ACTIVITY_VERY: "onboarding-activity-very",
  ACTIVITY_EXTREMELY: "onboarding-activity-extremely",
  EATING_FLEXIBLE: "onboarding-eating-flexible",
  EATING_CARB: "onboarding-eating-carb",
  EATING_FAT: "onboarding-eating-fat",
  EATING_LOWCARB: "onboarding-eating-lowcarb",
  PROTEIN_STANDARD: "onboarding-protein-standard",
  PROTEIN_ACTIVE: "onboarding-protein-active",
  PROTEIN_ATHLETIC: "onboarding-protein-athletic",
  PROTEIN_MAXIMUM: "onboarding-protein-maximum",
  TARGET_WEIGHT_INPUT: "onboarding-target-weight",
  RATE_SLOW: "onboarding-rate-slow",
  RATE_MODERATE: "onboarding-rate-moderate",
  RATE_AGGRESSIVE: "onboarding-rate-aggressive",
  START_TRACKING: "onboarding-start-tracking",
};
```

---

## Files to Delete After Implementation

- `src/app/onboarding/preferences.tsx` — replaced by body-stats, activity, eating-style, protein screens
- `src/app/onboarding/ready.tsx` — replaced by your-plan screen
- Any `WelcomeScreen` or welcome-related files if they exist in the onboarding directory

---

## Implementation Order

### Phase 0: Read and understand (no code changes)

1. Read `goalStore.ts` — find BMR/TDEE functions, understand their signatures
2. Read `macroCalculator.ts` — find macro functions, understand their signatures
3. Read `goalRepository.ts` — find `createGoal` method, understand exact field names and types, understand how `target_rate_percent` is used
4. Read `profileRepository.ts` — find `update()` method, confirm camelCase fields: `eatingStyle`, `proteinPriority`, `hasCompletedOnboarding`, `dateOfBirth`, `heightCm`, `activityLevel`
5. Read the weight entries repository — find the add entry method and required fields
6. Read `settingsRepository.ts` — find get/set methods, confirm key-value pattern
7. Read `onboardingStore.ts` — map ALL existing fields, actions, and persist config
8. Read `_layout.tsx` and `index.tsx` in the onboarding directory — understand current routing
9. Read `foodLogStore.ts` (line 431) — understand how daily targets are resolved
10. Read `testIDs.ts` — understand naming conventions
11. Read `complete-onboarding.yaml` — understand what Maestro tests reference

### Phase 1: Shared infrastructure

1. Refactor calculation functions into shared pure utilities if needed (goalStore + macroCalculator)
2. Run existing tests to confirm refactor didn't break anything
3. **Add persist middleware to `onboardingStore.ts`** (Constraint 8 — it currently has NONE). Verify tooltip/celebration behavior still works after this change.
4. Extend `onboardingStore.ts` with draft state, updateDraft, clearDraft
5. Create shared onboarding UI components (or identify existing ones)

### Phase 2: Build screens

5. Build screens 1-7 (goal → about-you → body-stats → activity → eating-style → protein → target)
6. Build screen 8 (your-plan with completion handler)

### Phase 3: Navigation

7. Update `_layout.tsx` — add new screens, progress bar
8. Update `index.tsx` — resume logic

### Phase 4: Cleanup

9. Delete old screens (`preferences.tsx`, `ready.tsx`)
10. Update `testIDs.ts`
11. Rewrite `complete-onboarding.yaml` Maestro helper

### Phase 5: Verification

12. Verify Settings screens (profile.tsx, goals.tsx, nutrition.tsx) read the data onboarding wrote
13. Verify `foodLogStore` daily targets work for all 4 goal paths — specifically that `goalStore` has the active goal in memory after onboarding completes (not just in DB)
14. Verify `FirstFoodCelebration` and tooltip system still work (these now persist across restarts due to new persist middleware — confirm this doesn't cause duplicate celebrations)
15. Verify `hasCompletedOnboarding` flag prevents re-onboarding on relaunch (both Zustand store AND profile table)
16. Test draft persistence: fill screens 1-4, force-quit, relaunch, confirm resume works
17. Verify "track" users: check that `onboarding_goal_path` in user_settings is `'track'` (not `'maintain'`), even though the goal type in the DB is `'maintain'`
18. Verify `energyUnit` is passed as `'calories'` to `completeOnboarding()` even though no UI toggle exists

---

## Testing Checklist

### Unit Tests

- [ ] BMR for male and female (if refactored — existing tests may already cover)
- [ ] TDEE for all 5 activity levels
- [ ] Macro calculation: all 4 eating styles × 4 protein priorities (16 combos)
- [ ] Carb cap enforcement (fat-focused 150g, very low carb 50g)
- [ ] Calorie floor enforcement (1,500 male, 1,200 female)
- [ ] Onboarding rate options match exact canonical percent values from goals.tsx (strict equality)
- [ ] `targetRatePercent = 0` for maintain and track goals
- [ ] ETA calculation (weeks to goal)
- [ ] Unit conversions (lbs↔kg, ft/in↔cm)
- [ ] Age calculation from DOB
- [ ] Completion handler: profileRepository.update() called with camelCase fields
- [ ] Completion handler: goalStore.createGoal() (or repository + reload) called with camelCase CreateGoalInput including required eatingStyle, proteinPriority, targetRatePercent
- [ ] Completion handler: weightRepository.create() called with { date, weightKg }
- [ ] Completion handler: completeOnboarding() called with correct required arguments
- [ ] Completion handler: completeOnboarding() non-throwing error detected via store.error check
- [ ] Completion handler: hasCompletedOnboarding is written LAST — after all other writes succeed
- [ ] Completion handler: partial failure (e.g. goal write fails) does NOT set hasCompletedOnboarding
- [ ] Completion handler: retry after partial failure is idempotent (re-writing profile data is harmless)
- [ ] Completion handler: "track" stores raw 'track' in onboarding_goal_path BEFORE mapping to 'maintain' for goal type
- [ ] Completion handler: goalStore has active goal in memory after completion (not stale)
- [ ] energyUnit defaults to 'calories' and is passed through to store/repo without UI
- [ ] Draft persistence: serialize/deserialize round-trip via NEW persist middleware
- [ ] Draft clearing on completion
- [ ] Goal path change (lose→track) clears target fields
- [ ] Adding persist middleware doesn't cause tooltip/celebration regressions

### E2E Tests (Maestro)

- [ ] Full flow: lose (8 screens, all fields)
- [ ] Full flow: gain (8 screens, gain-specific rates)
- [ ] Full flow: maintain (7 screens, target skipped)
- [ ] Full flow: track (7 screens, target skipped, softer summary language)
- [ ] Back navigation preserves data (check values persist when going back and forward)
- [ ] Unit toggles convert values correctly
- [ ] Summary screen shows calculated values
- [ ] After completion: dashboard shows personalized daily targets
- [ ] After completion: Settings → Profile shows onboarded data
- [ ] After completion: Settings → Goals shows created goal
- [ ] FirstFoodCelebration still triggers after first food log
- [ ] App force-quit at screen 4, relaunch → resumes at screen 5

---

## Reminders

- **Non-judgmental language.** No "diet", "restrict", "cheat". Use "nutrition", "adjust", "flexible".
- **Use repository/store methods for ALL DB writes.** Never raw SQL. Use camelCase field names matching the actual TypeScript interfaces.
- **completeOnboarding() does NOT throw.** Check store.error after calling it — throw manually if set.
- **hasCompletedOnboarding is the VERY LAST write.** Never set it before all other writes succeed.
- **Use goalStore.createGoal() (not just goalRepository)** to keep in-memory state in sync for dashboard render.
- **Use EXISTING calculation functions.** Refactor if needed, never duplicate.
- **EXTEND the onboarding store AND add persist middleware.** Keep tooltip/celebration behavior working. Test persist side effects.
- **completeOnboarding() requires arguments.** Read the signature.
- **targetRatePercent is required, not nullable.** Use 0 for maintain/track.
- **Store raw 'track' before mapping to 'maintain'.** The UX flag must survive the goal type conversion.
- **energyUnit stays in the contract** as `'calories'` — no UI, but pass it through.
- **weightRepository.create({ date, weightKg })** — camelCase, not snake_case.
- **Match existing route paths.** Files go in `src/app/onboarding/`.
- **Seed weight_entries.** Profile and trends depend on this table.
- **Set BOTH completion flags.** Zustand store AND profile table.
- **Back buttons in screen body.** Gesture disabled by design.
- **All data changeable.** Note "Change anytime in Settings" on each screen.
- **Dark mode.** All screens must respect current theme.
