# NutritionRx Weekly Reflection — Implementation Specification

## Feature: Weekly Reflection (Check-In System)

**Version:** 1.0
**Date:** February 10, 2026
**Status:** Ready for Implementation
**Depends On:** Goal Screen Enhancement Spec (current weight field, timeline mode)

---

## 1. Overview

The Weekly Reflection is NutritionRx's system for keeping calorie and macro targets in sync with the user's actual weight over time. Every ~7 days, the app prompts the user to log their current weight and optionally share how they're feeling. The app then recalculates their nutrition plan based on the updated data.

This is a **single-screen, scrollable experience** designed to take under 30 seconds. It is NOT a multi-step wizard, NOT a coaching questionnaire, and NOT an accountability mechanism. It is a brief, warm moment where the user and the app sync up together.

### Why This Matters

Without periodic weight updates, calorie targets go stale. As a user loses weight, their BMR drops — meaning the deficit that worked at 190 lbs may be maintenance-level at 175 lbs. The Weekly Reflection closes this feedback loop with minimal friction.

Research supports this approach:
- Self-weighing at least weekly is associated with greater weight loss and less weight regain (PMC systematic review, 2012)
- Consistency of self-weighing matters more than raw frequency (PMC, 2020)
- Self-monitoring adherence typically declines by week 3–5 — the experience must be frictionless to sustain engagement (PMC, 2019)
- A 10,000-person smart scale cohort study found that breaks in weighing of 30+ days correlated with weight gain, especially in overweight and obese individuals (JMIR, 2021)

### Design Philosophy: Nourished Calm

The Weekly Reflection is the single most psychologically sensitive recurring interaction in the app. The user is being asked to confront a number that may or may not match their hopes. Every word, every color, every animation must reinforce that this is a safe, supportive space.

**This is a "Reflection," not a:**
- "Check-in" (implies accountability to someone else)
- "Weigh-in" (reduces the experience to a number on a scale)
- "Progress report" (implies pass/fail judgment)
- "Assessment" (clinical, cold)

**Core emotional design goals:**
- The user should feel **curious** about their data, not anxious
- The user should feel **supported** by the app, not judged
- The user should feel **in control** of their plan, not dictated to
- The user should feel **encouraged** regardless of what the scale says

---

## 2. User Flow

### 2.1 Trigger: The Gentle Prompt

After 7 days since the user's last reflection (or since onboarding if they've never done one), the app surfaces an in-app prompt. This is NOT a push notification (excluded from v1). It appears as a banner on the Today/Dashboard screen.

**Banner States:**

| Days Since Last Reflection | Banner Message | Style |
|---|---|---|
| 7 days | "It's been a week — ready for a quick reflection?" | Sage green background, soft |
| 8–13 days | "Your plan works best with regular updates. Quick reflection?" | Same style, slightly more prominent |
| 14+ days | "Welcome back! Let's get your plan updated with where you are now." | Warm terracotta accent |
| Never done one | "Set up your weekly reflection to keep your plan on track" | Onboarding-style, educational |

**Banner Behavior:**
- Appears at the top of the Today screen, below the header but above the calorie ring
- Has a clear "Let's go" / "Reflect now" CTA button and a subtle "✕" dismiss button
- If dismissed, reappears the next day (does NOT disappear permanently)
- If dismissed 3 times in a row, reduces to a smaller, less prominent indicator (a small dot or badge on a navigation element) — never fully hidden
- Tapping the CTA opens the Reflection screen as a full-screen modal (not a new route/page — this keeps it feeling lightweight)
- The banner does NOT appear if the user has already completed a reflection in the last 6 days (allow early check-in up to 1 day early, matching the 6-day minimum)
- **The banner does NOT appear if the user has no active goal** (goalStore.goalType is null/undefined or no goal row exists). Without a goal, there are no calorie/macro targets to recalculate, so a reflection has no functional purpose. If the user has logged weight data but never set up a goal, the banner is suppressed entirely.
- **The banner does NOT appear if the user has no current weight** (currentWeightKg is null and no weight log entries exist). The reflection depends on having a previous weight to compare against. For truly first-time users, the onboarding flow or goal screen should capture initial weight before reflections begin.

**Implementation:**

```typescript
// In the Today screen or a shared layout component
const goalStore = useGoalStore();
const hasActiveGoal = goalStore.goalType != null;
const hasAnyWeight = goalStore.currentWeightKg != null;

const daysSinceLastReflection = useMemo(() => {
  if (!lastReflectionDate) return Infinity;
  const now = new Date();
  const last = new Date(lastReflectionDate);
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}, [lastReflectionDate]);

const shouldShowBanner = hasActiveGoal && hasAnyWeight && daysSinceLastReflection >= 6;
```

### 2.2 The Reflection Screen

A single, scrollable full-screen modal with three sections. The screen uses the standard NutritionRx modal pattern: soft cream (#FAF6F0) background, rounded top corners, drag-to-dismiss handle at top.

**Section 1: Weight Update (required)**
**Section 2: Sentiment Check (optional)**
**Section 3: Updated Plan (computed, read-only)**
**Action: Confirm Button**

The user scrolls through naturally. Sections 1 and 2 are interactive. Section 3 appears/updates in real-time as Section 1 is filled in.

### 2.3 Section 1: Weight Update

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Your weight this week                                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │          [ 184       ]  lbs                       │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Last reflection: 186 lbs (Feb 3)                       │
│  Your trend: ~185.2 lbs                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- The input field is auto-focused when the screen opens (keyboard appears immediately)
- The field shows the user's most recent weight log as a placeholder/pre-fill. If Apple Health / Health Connect is synced and has a weight reading from the last 48 hours, pre-fill with that value and show a subtle label: "From Apple Health"
- The field uses the same unit (lbs/kg) as the user's preference setting
- The field uses the same validation as the goal screen current weight field (min 66 lbs / 30 kg, max 660 lbs / 300 kg, single decimal point, no leading zeros, no multiple decimals)
- Below the input, show two contextual lines:
  - **Last reflection:** The weight they entered at their previous reflection, with the date
  - **Your trend:** The weighted average (see Section 5: Trend Weight)
- If this is their first ever reflection, show "This is your first reflection!" instead of the last reflection line, with no trend line
- The numeric keyboard should include a decimal point key

**Pre-fill Logic Priority:**
1. Apple Health / Health Connect weight from last 48 hours (if synced). **If multiple readings exist within the 48-hour window, use the most recent single reading** — do not average. Show the source timestamp: "From Apple Health · Today 7:32 AM". If the most recent reading is from a different day than today, show the date: "From Apple Health · Yesterday 8:15 AM"
2. Most recent weight log entry from NutritionRx (if exists)
3. Empty field with placeholder "Enter weight"

### 2.4 Section 2: Sentiment Check (Optional)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  How are you feeling about things?          (optional)  │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │             │ │             │ │             │       │
│  │     😊      │ │     😐      │ │     🫤      │       │
│  │   Feeling   │ │  Hanging    │ │   It's      │       │
│  │    good     │ │  in there   │ │   tough     │       │
│  │             │ │             │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Three tappable cards, horizontally arranged, equal width
- Cards use soft sage green (#7C9A82) border when unselected, filled sage green with white text when selected
- Only one can be selected at a time (radio behavior), but none is required
- The "(optional)" label is shown in muted text to the right of the section header
- Tapping a selected card deselects it (user can choose to not answer)
- No emoji if the platform doesn't support them well — use simple illustrated icons instead (a sun/smile, a neutral face, a cloud). Keep them warm and non-childish.

**Sentiment Values:**

| Display | Internal Value | Numeric |
|---|---|---|
| Feeling good | `positive` | 1 |
| Hanging in there | `neutral` | 0 |
| It's tough | `negative` | -1 |
| (Not selected) | `null` | null |

**Why sentiment matters:**
- The sentiment data is NOT used for calorie calculations. It's for two purposes:
  1. **User self-awareness:** Over time, they can see their own mood patterns alongside their weight trend (future analytics feature)
  2. **Contextual messaging:** If a user marks "It's tough" 2+ weeks in a row, the app can surface supportive content (see Section 8: Contextual Messaging)

### 2.5 Section 3: Your Updated Plan

This section computes and displays in real-time as soon as the user enters a weight in Section 1. It shows what changed and why, in plain language.

**If the plan changed:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Your updated plan                                      │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │  We've gently adjusted your targets based on      │  │
│  │  your progress:                                   │  │
│  │                                                   │  │
│  │  Daily calories    1,920  →  1,880                │  │
│  │  Protein           168g   →  166g                 │  │
│  │  Carbs             172g   →  166g                 │  │
│  │  Fat                64g   →   63g                 │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Progress note (contextual, see Section 7)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**If the plan didn't change (weight stayed similar):**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Your plan                                              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │  Your plan is right on track — no changes          │  │
│  │  this week.                                       │  │
│  │                                                   │  │
│  │  Daily calories    1,920                          │  │
│  │  Protein           168g                           │  │
│  │  Carbs             172g                           │  │
│  │  Fat                64g                           │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**The plan card:**
- Uses a slightly elevated card with subtle shadow on cream background
- Shows before → after with a right arrow (→) for changed values
- Changed values are highlighted with sage green text
- If calories went up (user lost weight faster than target, or gained weight on gain goal), show the increase with a brief explanation
- Always shows all four values: calories, protein, carbs, fat

**Macro cycling interaction:**
- If the user has macro cycling enabled, their daily targets vary by day type (e.g., training day vs. rest day). The plan card should display the **base daily average**, NOT individual day values.
- Show a subtitle below the macro values: "These are your daily averages — your cycling split is applied on top."
- The reflection recalculates the **base targets only**. The cycling percentage splits (e.g., +10% carbs on training days, -10% on rest days) are preserved unchanged and re-applied to the new base values.
- Do NOT show separate rows for each day type in the reflection — that would make the screen too complex. The user can view their full cycling breakdown on the goal settings screen.
- If cycling is enabled, the "Adjust my pace" link text changes to: "Adjust my pace or cycling"

```typescript
// When displaying targets with macro cycling
const displayCalories = macroCyclingEnabled
  ? goalStore.baseCalories       // Average across all day types
  : goalStore.dailyCalories;     // Same thing when cycling is off

// The recalculation updates baseCalories; cycling percentages are layered on after
```

### 2.6 Action: Confirm and Dismiss

Below the plan card, two actions:

```
┌───────────────────────────────────────────────────┐
│              [ Sounds Good ]                      │  ← Primary CTA, sage green filled
└───────────────────────────────────────────────────┘

[ Adjust my pace ]                                      ← Secondary, text link
```

**"Sounds Good" button:**
- Saves the reflection (weight log, sentiment, updated targets)
- Dismisses the modal with a subtle slide-down animation
- Shows a brief toast on the Today screen: "Plan updated ✓" (auto-dismisses after 2 seconds)

**"Adjust my pace" link:**
- Both buttons complete the reflection identically. "Adjust my pace" runs the same `submitReflection()` as "Sounds Good" — writing the weight log, recalculating targets, and saving the full reflection record with before/after snapshots.
- After the reflection is saved and the modal dismisses, it navigates to the goal settings screen (settings/goals.tsx).
- If the user changes their rate/timeline on the goal screen, those changes take effect going forward as a separate action. The reflection record keeps its original snapshot of what the auto-recalculation produced — this is correct because the snapshot represents what the app calculated from the weight update, before any manual goal adjustments.
- This avoids all timing issues: there's no "pending" state, no need to detect when the user returns, and no orphaned records if they navigate away.

```typescript
// "Adjust my pace" handler
const handleAdjustPace = async () => {
  await submitReflection();             // Same as "Sounds Good"
  router.push('/settings/goals');       // Then navigate
};
```

**Disabled state:**
- Both "Sounds Good" and "Adjust my pace" are disabled until the user enters a valid weight in Section 1
- Show buttons in a muted state with reduced opacity

---

## 3. Data Model

### 3.1 New Table: `reflections`

```sql
CREATE TABLE IF NOT EXISTS reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reflected_at TEXT NOT NULL,                    -- ISO 8601 timestamp
  weight_kg REAL NOT NULL CHECK(weight_kg >= 30 AND weight_kg <= 300),
  weight_trend_kg REAL,                         -- Calculated trend weight at time of reflection
  sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),  -- Nullable
  previous_calories INTEGER,                    -- Snapshot of targets BEFORE recalculation
  previous_protein_g REAL,
  previous_carbs_g REAL,
  previous_fat_g REAL,
  new_calories INTEGER,                         -- Snapshot of targets AFTER recalculation
  new_protein_g REAL,
  new_carbs_g REAL,
  new_fat_g REAL,
  weight_change_kg REAL,                        -- Delta from previous reflection weight
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_reflections_date ON reflections(reflected_at);
```

**Why snapshot the before/after targets?**
- So the reflection history screen (future feature) can show exactly what changed at each reflection
- Avoids needing to reconstruct calculations retroactively
- Enables analytics like "your calories have decreased by 200 over 8 weeks" without re-running old formulas

### 3.2 New Repository: `reflectionRepository.ts`

```typescript
// src/repositories/reflectionRepository.ts

export interface Reflection {
  id: number;
  reflectedAt: string;           // ISO 8601
  weightKg: number;
  weightTrendKg: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  previousCalories: number;
  previousProteinG: number;
  previousCarbsG: number;
  previousFatG: number;
  newCalories: number;
  newProteinG: number;
  newCarbsG: number;
  newFatG: number;
  weightChangeKg: number | null;  // null for first reflection
}

export interface ReflectionRepository {
  // Create a new reflection record
  create(reflection: Omit<Reflection, 'id'>): Promise<number>;

  // Get the most recent reflection
  getLatest(): Promise<Reflection | null>;

  // Get all reflections, newest first (for future history/analytics screen)
  getAll(limit?: number): Promise<Reflection[]>;

  // Get reflections within a date range
  getByDateRange(startDate: string, endDate: string): Promise<Reflection[]>;

  // Get the last N sentiment values (for contextual messaging)
  getRecentSentiments(count: number): Promise<Array<{ sentiment: string | null; reflectedAt: string }>>;

  // Count total reflections (for streak/consistency tracking)
  getCount(): Promise<number>;

  // Get the date of the last reflection (for banner trigger logic)
  getLastReflectionDate(): Promise<string | null>;
}
```

### 3.3 New Store: `reflectionStore.ts`

```typescript
// src/stores/reflectionStore.ts

import { create } from 'zustand';

interface ReflectionState {
  // Current state
  lastReflectionDate: string | null;
  daysSinceLastReflection: number | null;
  shouldShowBanner: boolean;
  bannerDismissCount: number;       // Reset when reflection is completed. Persisted to settings DB.

  // Reflection in progress (while modal is open)
  isReflecting: boolean;
  inputWeightKg: number | null;
  selectedSentiment: 'positive' | 'neutral' | 'negative' | null;
  previewCalories: number | null;   // Live preview of recalculated targets
  previewProteinG: number | null;
  previewCarbsG: number | null;
  previewFatG: number | null;
  hasChanges: boolean;              // Whether targets would change

  // Actions
  initialize: () => Promise<void>;            // Load last reflection date AND banner dismiss count from DB on app start
  dismissBanner: () => Promise<void>;         // Increment dismiss count AND persist to settings DB
  startReflection: () => void;                // Open modal, set isReflecting
  setInputWeight: (weightKg: number) => void; // Update preview calculations live
  setSentiment: (sentiment: 'positive' | 'neutral' | 'negative' | null) => void;
  submitReflection: () => Promise<void>;      // Save everything, update targets, close modal
  cancelReflection: () => void;               // Close modal without saving
}
```

**Persistence:** `bannerDismissCount` must survive app restarts. The `initialize()` action loads it from the settings DB, and `dismissBanner()` writes it back:

```typescript
// Inside initialize():
async initialize() {
  const lastDate = await reflectionRepository.getLastReflectionDate();
  const dismissCount = await settingsRepository.getNumber('reflection_banner_dismiss_count', 0);
  // ... compute daysSinceLastReflection and shouldShowBanner ...
  set({ lastReflectionDate: lastDate, bannerDismissCount: dismissCount, /* ... */ });
}

// Inside dismissBanner():
async dismissBanner() {
  const newCount = get().bannerDismissCount + 1;
  await settingsRepository.set('reflection_banner_dismiss_count', newCount);
  set({ bannerDismissCount: newCount });
}
```

### 3.4 Integration with Existing Stores

The reflection submission needs to coordinate with existing stores. **All database writes are wrapped in a single SQLite transaction** to prevent partial state: if any step fails, everything rolls back and the user can retry.

```typescript
// Inside submitReflection():
async submitReflection() {
  const { inputWeightKg, selectedSentiment } = get();
  if (!inputWeightKg) return;

  // 1. Get current targets (before recalculation) from goalStore
  const goalStore = useGoalStore.getState();
  const previousTargets = {
    calories: goalStore.dailyCalories,
    proteinG: goalStore.proteinG,
    carbsG: goalStore.carbsG,
    fatG: goalStore.fatG,
  };

  // 2. Calculate weight change from previous reflection BEFORE writing anything
  const lastReflection = await reflectionRepository.getLatest();
  const weightChangeKg = lastReflection
    ? inputWeightKg - lastReflection.weightKg
    : null;

  // 3. Run all writes inside a transaction
  await db.withTransactionAsync(async () => {
    // 3a. Log the weight entry (upsert — see Section 17, Edge Case #7)
    await weightRepository.upsertWeight(inputWeightKg, new Date().toISOString());

    // 3b. Calculate trend weight (read-only, safe inside transaction)
    const trendWeightKg = await calculateTrendWeight();

    // 3c. Update the goal store's current weight (triggers recalculation)
    //     This writes to the goals table, so it's inside the transaction
    await goalStore.updateCurrentWeight(inputWeightKg);

    // 3d. Get new targets (after recalculation)
    const newTargets = {
      calories: goalStore.dailyCalories,
      proteinG: goalStore.proteinG,
      carbsG: goalStore.carbsG,
      fatG: goalStore.fatG,
    };

    // 3e. Save the reflection record
    await reflectionRepository.create({
      reflectedAt: new Date().toISOString(),
      weightKg: inputWeightKg,
      weightTrendKg: trendWeightKg,
      sentiment: selectedSentiment,
      previousCalories: previousTargets.calories,
      previousProteinG: previousTargets.proteinG,
      previousCarbsG: previousTargets.carbsG,
      previousFatG: previousTargets.fatG,
      newCalories: newTargets.calories,
      newProteinG: newTargets.proteinG,
      newCarbsG: newTargets.carbsG,
      newFatG: newTargets.fatG,
      weightChangeKg,
    });

    // 3f. Persist banner dismiss count reset
    await settingsRepository.set('reflection_banner_dismiss_count', 0);
  });

  // 4. Update in-memory reflection state (only after transaction succeeds)
  set({
    lastReflectionDate: new Date().toISOString(),
    daysSinceLastReflection: 0,
    shouldShowBanner: false,
    bannerDismissCount: 0,
    isReflecting: false,
  });
}
```

**Error handling:** If the transaction fails, show a toast: "Something went wrong — please try again." The modal stays open with the user's input preserved so they can retry without re-entering data.

---

## 4. Recalculation Logic

### 4.1 What Recalculates on Reflection

When the user submits a reflection with a new weight, the following chain executes:

1. **BMR recalculates** using Mifflin-St Jeor with the new weight:
   - Male: `(10 × weightKg) + (6.25 × heightCm) - (5 × ageYears) + 5`
   - Female: `(10 × weightKg) + (6.25 × heightCm) - (5 × ageYears) - 161`

2. **TDEE recalculates** by applying the user's activity multiplier to the new BMR

3. **Daily calorie target recalculates** by subtracting (or adding for gain) the deficit/surplus implied by their goal rate:
   - Weekly rate in kg × 7700 kcal/kg ÷ 7 days = daily deficit/surplus
   - Target calories = TDEE - daily deficit (for loss) or + daily surplus (for gain)
   - Floor: 1500 cal (male) / 1200 cal (female)

4. **Macros recalculate:**
   - Protein: 1.8g × current weight in kg (using trend weight, not raw input)
   - Fat: 27.5% of total calories ÷ 9 cal/g
   - Carbs: remaining calories ÷ 4 cal/g

5. **If timeline mode is active:**
   - Recalculate remaining weight delta: `|trendWeightKg - targetWeightKg|`
   - Recalculate remaining weeks: `(targetDate - today) / msPerWeek`
   - Derive new implied weekly rate: `weightDelta / remainingWeeks`
   - If the new implied rate exceeds safety limits, note it (but don't block — the user may adjust their timeline on the goal screen)
   - Recalculate estimated completion date if in rate mode

### 4.2 Smoothing: When NOT to Change Targets

To avoid overreacting to a single data point, apply this smoothing rule:

**If the calorie change is ≤ 25 calories, do not update targets.**

Rationale: A 25-calorie difference is nutritionally meaningless and would create noise ("Your calories changed from 1,920 to 1,917"). Rounding to the nearest 5 or 10 also helps:

```typescript
const roundToNearest = (value: number, nearest: number): number => {
  return Math.round(value / nearest) * nearest;
};

// Round calories to nearest 10
const newCalories = roundToNearest(rawCalculatedCalories, 10);

// Round macros to nearest whole gram
const newProteinG = Math.round(rawProteinG);
const newCarbsG = Math.round(rawCarbsG);
const newFatG = Math.round(rawFatG);

// Only update if difference is meaningful
const calorieChange = Math.abs(newCalories - previousCalories);
const shouldUpdateTargets = calorieChange > 25;
```

If `shouldUpdateTargets` is false, the plan card shows "Your plan is right on track — no changes this week."

---

## 5. Trend Weight Calculation

### 5.1 Algorithm

Use an **exponential moving average (EMA)** of recent weight entries to smooth out daily fluctuations from water retention, food volume, etc.

```typescript
const calculateTrendWeight = async (): Promise<number | null> => {
  // Get last 14 days of weight entries
  const entries = await weightRepository.getEntriesForDateRange(
    subDays(new Date(), 14).toISOString(),
    new Date().toISOString()
  );

  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0].weightKg;

  // Sort oldest to newest
  entries.sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  // Time-weighted EMA: adjusts the smoothing factor based on the actual time gap
  // between entries, so that entries days apart don't get the same step-weight
  // as entries hours apart.
  //
  // Base smoothing: alpha = 0.2 per day. For a gap of N days, we compute:
  //   effective_alpha = 1 - (1 - base_alpha)^N
  //
  // This means:
  //   1-day gap  → alpha ≈ 0.20 (standard smoothing)
  //   2-day gap  → alpha ≈ 0.36 (more weight to new reading, since we "missed" a day)
  //   7-day gap  → alpha ≈ 0.79 (nearly resets to the new reading)
  //   14-day gap → alpha ≈ 0.96 (essentially starts fresh)
  //
  const BASE_ALPHA_PER_DAY = 0.2;
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  let ema = entries[0].weightKg;

  for (let i = 1; i < entries.length; i++) {
    const dayGap = (new Date(entries[i].loggedAt).getTime() - new Date(entries[i - 1].loggedAt).getTime()) / MS_PER_DAY;
    const effectiveAlpha = 1 - Math.pow(1 - BASE_ALPHA_PER_DAY, dayGap);
    ema = effectiveAlpha * entries[i].weightKg + (1 - effectiveAlpha) * ema;
  }

  return Math.round(ema * 10) / 10; // Round to 1 decimal
};
```

### 5.2 Display

On the reflection screen, show both values:
- "Today's weight: **184** lbs" (what they just entered)
- "Your trend: **~185.2** lbs" (the smoothed average)

Use the **trend weight** (not the raw input) for:
- Protein calculation (1.8g × trend weight in kg)
- BMR calculation
- Progress tracking (weekly weight change)
- Timeline estimated completion

Use the **raw weight** for:
- The weight log entry
- The "Last reflection" display at the next reflection

### 5.3 Educating the User

The first time a user sees the trend weight, show a one-time tooltip or expandable info line:

> "Your trend weight smooths out normal daily fluctuations to show where your weight is actually heading. It's a more reliable measure of progress than any single weigh-in."

This tooltip should be dismissable and not shown again after the first time (store a `hasSeenTrendWeightExplainer` boolean in settings).

---

## 6. UI Component: Reflection Banner

### 6.1 Component: `ReflectionBanner.tsx`

Location: `src/components/reflection/ReflectionBanner.tsx`

This component is rendered on the Today/Dashboard screen.

```typescript
// Props
interface ReflectionBannerProps {
  daysSinceLastReflection: number | null;
  hasCompletedFirstReflection: boolean;
  onStartReflection: () => void;
  onDismiss: () => void;
  dismissCount: number;
}
```

**Visual States:**

| State | Background | Icon | Message | CTA |
|---|---|---|---|---|
| Due (7 days) | Sage green (#7C9A82) at 10% opacity | Scale icon | "It's been a week — ready for a quick reflection?" | "Reflect now" |
| Overdue (8–13 days) | Sage green at 15% opacity | Scale icon | "Your plan works best with regular updates" | "Reflect now" |
| Very overdue (14+ days) | Terracotta (#C4785B) at 10% opacity | Wave/hello icon | "Welcome back! Let's get your plan in sync" | "Let's go" |
| First time | Sage green at 10% opacity | Sparkle icon | "Set up your weekly reflection to keep your plan on track" | "Get started" |
| Minimized (3+ dismissals) | None (just a subtle dot badge) | — | — | Tap to expand |

**Layout:**
- Full-width card with 16px horizontal margin
- 12px vertical padding
- Icon on the left (24x24), message text in the middle, CTA button on the right
- Small "✕" dismiss button at top-right corner
- Subtle entrance animation: slide down + fade in (200ms, ease-out)

### 6.2 Component: `ReflectionModal.tsx`

Location: `src/components/reflection/ReflectionModal.tsx`

This is the main reflection screen, presented as a full-screen modal.

**Structure:**

```
<Modal>
  <DragHandle />
  <ScrollView>
    <Header: "Weekly Reflection" />
    <WeightInputSection />
    <SentimentSection />
    <PlanUpdateSection />       ← Re-renders live as weight input changes
  </ScrollView>
  <FixedFooter>
    <ConfirmButton />           ← "Sounds Good" - disabled until weight is entered
    <AdjustPaceLink />          ← "Adjust my pace" - navigates to goal screen
  </FixedFooter>
</Modal>
```

**Key implementation notes:**
- The modal should use `react-native-modal` or Expo Router's modal presentation
- The footer with the confirm button should be fixed at the bottom (not scroll with content)
- The plan update section should re-render with a subtle fade transition when the weight input changes (debounce 300ms to avoid jitter while typing)
- If the user hasn't entered a weight yet, the plan section shows a muted placeholder: "Enter your weight above to see your updated plan"

---

## 7. Contextual Progress Messages

Below the plan card in Section 3, show a single contextual message based on the user's situation. Only show ONE message — pick the highest-priority match.

### 7.1 Message Priority and Copy

**Priority 1: First reflection ever**
> "Welcome to your first weekly reflection! Going forward, we'll check in like this each week to keep your plan tuned to you."

**Priority 2: Weight loss on a loss goal (positive progress)**
> "You've lost about [X] lbs this week. [If timeline active:] Aiming for [target] around [date]."

**Priority 3: Weight gain on a gain goal (positive progress)**
> "You've gained about [X] lbs this week — nice work. [If timeline active:] Aiming for [target] around [date]."

**Priority 4: Weight stable (within ±0.2 lbs / ±0.1 kg)**
> "Your weight held steady this week. Plateaus are a normal part of the process — your body may be adjusting."

**Priority 5: Weight went the wrong direction (gain on loss goal, or loss on gain goal)**
> "Your weight shifted a bit this week — that's completely normal and happens to everyone. Bodies fluctuate day to day. Your plan stays the course."

**Priority 6: Lost weight too fast (> 1% body weight in one week on a loss goal)**
> "You made a lot of progress this week! To keep things sustainable, we've nudged your calories up slightly."

**Priority 7: Gained weight too fast (> 0.5% body weight in one week on a gain goal)**
> "Your weight went up more than expected. We've adjusted your surplus down a bit to keep the gain lean."

**Priority 8: Very overdue reflection (14+ days since last)**
> "It's been a little while! A lot can happen in [X] weeks, so we've updated your plan to match where you are now."

### 7.2 Message Implementation

```typescript
const getProgressMessage = (
  isFirstReflection: boolean,
  weightChangeKg: number | null,
  goalType: 'lose' | 'gain' | 'maintain',
  currentWeightKg: number,
  daysSinceLastReflection: number,
  targetWeightKg: number | null,
  estimatedCompletionDate: string | null,
  unitPreference: 'kg' | 'lbs',               // ← User's display unit
): string => {
  // Helper: format weight change in user's preferred unit
  const formatWeightChange = (changeKg: number): string => {
    if (unitPreference === 'kg') {
      return `${Math.round(Math.abs(changeKg) * 10) / 10} kg`;
    }
    return `${Math.round(Math.abs(changeKg) * 2.20462 * 10) / 10} lbs`;
  };

  // Helper: format target weight in user's preferred unit
  const formatWeight = (kg: number): string => {
    if (unitPreference === 'kg') {
      return `${Math.round(kg * 10) / 10} kg`;
    }
    return `${Math.round(kg * 2.20462)} lbs`;
  };

  // Priority 1
  if (isFirstReflection) {
    return 'Welcome to your first weekly reflection! Going forward, we\'ll check in like this each week to keep your plan tuned to you.';
  }

  // Priority 8
  if (daysSinceLastReflection >= 14) {
    const weeks = Math.round(daysSinceLastReflection / 7);
    return `It's been a little while! A lot can happen in ${weeks} weeks, so we've updated your plan to match where you are now.`;
  }

  if (weightChangeKg === null || goalType === 'maintain') {
    return 'Your plan is looking good.';
  }

  const absChange = Math.abs(weightChangeKg);
  const percentChange = (absChange / currentWeightKg) * 100;

  // Priority 6: Lost too fast
  if (goalType === 'lose' && weightChangeKg < 0 && percentChange > 1.0) {
    return 'You made a lot of progress this week! To keep things sustainable, we\'ve nudged your calories up slightly.';
  }

  // Priority 7: Gained too fast
  if (goalType === 'gain' && weightChangeKg > 0 && percentChange > 0.5) {
    return 'Your weight went up more than expected. We\'ve adjusted your surplus down a bit to keep the gain lean.';
  }

  // Priority 2: Positive loss
  if (goalType === 'lose' && weightChangeKg < 0) {
    let msg = `You've lost about ${formatWeightChange(weightChangeKg)} this week.`;
    if (estimatedCompletionDate && targetWeightKg) {
      msg += ` Aiming for ${formatWeight(targetWeightKg)} around ${formatDate(estimatedCompletionDate)}.`;
    }
    return msg;
  }

  // Priority 3: Positive gain
  if (goalType === 'gain' && weightChangeKg > 0) {
    let msg = `You've gained about ${formatWeightChange(weightChangeKg)} this week — nice work.`;
    if (estimatedCompletionDate && targetWeightKg) {
      msg += ` Aiming for ${formatWeight(targetWeightKg)} around ${formatDate(estimatedCompletionDate)}.`;
    }
    return msg;
  }

  // Priority 4: Stable (within ±0.2 lbs / ~0.1 kg)
  if (absChange < 0.1) {
    return 'Your weight held steady this week. Plateaus are a normal part of the process — your body may be adjusting.';
  }

  // Priority 5: Wrong direction
  return 'Your weight shifted a bit this week — that\'s completely normal and happens to everyone. Bodies fluctuate day to day. Your plan stays the course.';
};
```

---

## 8. Contextual Messaging: Sentiment-Based Support

This is a lightweight system that uses accumulated sentiment data to surface supportive messages. NOT a coaching system — just warm, contextual encouragement.

### 8.1 Trigger Rules

Check sentiment history after each reflection submission:

```typescript
const checkSentimentPatterns = async (): Promise<string | null> => {
  const recentSentiments = await reflectionRepository.getRecentSentiments(3);

  // Need at least 3 reflections to detect patterns
  if (recentSentiments.length < 3) return null;

  const negativeCount = recentSentiments.filter(s => s.sentiment === 'negative').length;
  const positiveCount = recentSentiments.filter(s => s.sentiment === 'positive').length;

  // 3 negative in a row
  if (negativeCount === 3) {
    return 'tough_streak';
  }

  // 2 negative, then positive (recovery)
  if (recentSentiments[0].sentiment === 'positive' && negativeCount >= 2) {
    return 'recovery';
  }

  // 3 positive in a row
  if (positiveCount === 3) {
    return 'positive_streak';
  }

  return null;
};
```

### 8.2 Supportive Messages

These appear as a subtle card below the progress message, only when a pattern is detected.

| Pattern | Message |
|---|---|
| `tough_streak` | "It sounds like things have been hard lately. That's okay — every journey has rough patches. Would you like to adjust your pace to something that feels more manageable right now?" + [Adjust pace] button |
| `recovery` | "Glad things are feeling better this week! You showed up even when it was tough, and that matters." |
| `positive_streak` | "Three weeks of feeling good — you're building real momentum. Keep it up!" |

**Important:** The `tough_streak` message offers an actionable out — adjusting the pace. This is crucial for Nourished Calm: if someone is consistently struggling, the app should gently suggest that the plan may be too aggressive, not just offer empty encouragement. The button navigates to the goal settings screen.

---

## 9. Maintain Goal Handling

When the user's goal type is "Maintain weight," the reflection works slightly differently:

- **Weight input:** Same as loss/gain goals — the user still logs their weight
- **Sentiment:** Same
- **Plan update:** Instead of adjusting toward a deficit/surplus, the app recalculates maintenance calories based on the new weight
- **Progress message:** Show distance from maintenance target: "You're within 1 lb of your maintenance target" or "You're about 3 lbs above your maintenance target — we've added a small adjustment to bring you back gradually"
- **Dynamic maintenance:** If the user's weight drifts more than 2 lbs (0.9 kg) from their maintenance target, apply a gentle deficit or surplus of 0.15% body weight per week (similar to MacroFactor's approach) to nudge them back. This is NOT aggressive dieting — it's a subtle auto-correction.
- **Timeline section:** Hidden for maintain goals

---

## 10. Migration

### 10.1 New Migration File

Create `src/db/migrations/XXX_reflections.ts` (use the next available migration number):

```typescript
import { SQLiteDatabase } from 'expo-sqlite';

export const up = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reflected_at TEXT NOT NULL,
      weight_kg REAL NOT NULL CHECK(weight_kg >= 30 AND weight_kg <= 300),
      weight_trend_kg REAL,
      sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),
      previous_calories INTEGER,
      previous_protein_g REAL,
      previous_carbs_g REAL,
      previous_fat_g REAL,
      new_calories INTEGER,
      new_protein_g REAL,
      new_carbs_g REAL,
      new_fat_g REAL,
      weight_change_kg REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reflections_date ON reflections(reflected_at);
  `);
};

export const down = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
    DROP INDEX IF EXISTS idx_reflections_date;
    DROP TABLE IF EXISTS reflections;
  `);
};
```

### 10.2 Settings Addition

Add to the settings/preferences store (or existing settings table):

```typescript
// New settings keys
has_seen_trend_weight_explainer: boolean;  // Default: false
reflection_banner_dismiss_count: number;   // Default: 0 (resets on reflection completion)
```

---

## 11. Files to Create

| File | Purpose |
|---|---|
| `src/db/migrations/XXX_reflections.ts` | Database migration for reflections table |
| `src/repositories/reflectionRepository.ts` | Data access layer for reflections |
| `src/stores/reflectionStore.ts` | Zustand store for reflection state |
| `src/components/reflection/ReflectionBanner.tsx` | In-app prompt banner for Today screen |
| `src/components/reflection/ReflectionModal.tsx` | Full reflection screen (modal) |
| `src/components/reflection/WeightInputSection.tsx` | Weight input with validation and context |
| `src/components/reflection/SentimentSection.tsx` | Sentiment card selection |
| `src/components/reflection/PlanUpdateSection.tsx` | Recalculated plan display card |
| `src/components/reflection/ProgressMessage.tsx` | Contextual progress message |
| `src/utils/trendWeight.ts` | EMA trend weight calculation |
| `src/utils/reflectionMessages.ts` | All message generation logic |

## 12. Files to Modify

| File | Changes |
|---|---|
| `src/app/(tabs)/today.tsx` (or equivalent dashboard) | Add `ReflectionBanner` component |
| `src/stores/goalStore.ts` | Ensure `updateCurrentWeight` is callable from reflection flow |
| `src/repositories/weightRepository.ts` | Add `upsertWeight()` method (see Edge Case #7) |
| `src/db/migrations/index.ts` | Register the new migration |
| `src/app/_layout.tsx` or navigation config | Register the reflection modal route if using Expo Router modal |

---

## 13. Implementation Order

### Phase 1: Data Layer
1. Create the migration file and run it
2. Implement `reflectionRepository.ts` with all CRUD operations
3. Implement `reflectionStore.ts` with state management (including persisted `bannerDismissCount` — Edge Case #8)
4. Add `upsertWeight()` method to `weightRepository.ts` (Edge Case #7)
5. Implement `trendWeight.ts` utility with time-weighted EMA (Edge Case #5)
6. Implement `reflectionMessages.ts` utility with `unitPreference` parameter (Edge Case #6)
7. Add settings keys for `has_seen_trend_weight_explainer` and `reflection_banner_dismiss_count`
8. **Test:** Unit tests for time-weighted EMA — uniform daily entries, sparse entries (day 1 + day 14 only), single entry, empty entries, mixed gaps
9. **Test:** Unit tests for all message generation functions (every branch, both lbs and kg output)
10. **Test:** Unit tests for sentiment pattern detection
11. **Test:** Unit tests for `upsertWeight` — insert when no entry today, update when entry exists today
12. **Test:** Unit tests for `submitReflection` transaction — verify rollback on failure (mock a step 3e failure, assert weight log was NOT persisted)

### Phase 2: UI Components
1. Build `WeightInputSection` with validation, pre-fill logic (including Apple Health most-recent selection — Edge Case #9), and context display
2. Build `SentimentSection` with card selection and deselection
3. Build `PlanUpdateSection` with live preview (debounced), before/after display, contextual messages, macro cycling subtitle (Edge Case #4), and first-reflection "Your starting plan" variant (Edge Case #10)
4. Build `ProgressMessage` component
5. Build `ReflectionModal` assembling all sections with fixed footer — both buttons call `submitReflection()` (Edge Case #1)
6. Build `ReflectionBanner` with all visual states, dismiss logic with persistence, and no-active-goal guard (Edge Case #2)
7. **Test:** Component renders correctly in all states

### Phase 3: Integration
1. Wire `ReflectionBanner` into the Today screen with `hasActiveGoal` and `hasAnyWeight` guards
2. Wire `ReflectionModal` open/close from banner CTA
3. Wire `submitReflection` inside `db.withTransactionAsync()` (Edge Case #3)
4. Wire "Adjust my pace" to: submit reflection → navigate to goal screen
5. Wire Apple Health / Health Connect pre-fill (most recent reading from last 48h — Edge Case #9)
6. Add trend weight explainer tooltip (first-time only)
7. **Test:** E2E - Full reflection flow: banner appears → tap → enter weight → select sentiment → confirm → banner disappears → targets updated
8. **Test:** E2E - Reflection with no sentiment selected
9. **Test:** E2E - Dismiss banner 3 times → verify minimized state → quit and reopen app → verify still minimized (Edge Case #8)
10. **Test:** E2E - "Adjust my pace" → verify reflection saved before navigation → change goal rate → verify new rate takes effect going forward
11. **Test:** E2E - Plan unchanged scenario (small weight change, <25 cal difference)
12. **Test:** E2E - First reflection ever (welcome message, "Your starting plan" header, no trend line)
13. **Test:** E2E - Overdue reflection (14+ days, welcome back message)
14. **Test:** E2E - Maintain goal reflection flow
15. **Test:** E2E - No active goal → verify banner does not appear
16. **Test:** E2E - Log weight manually on Today screen → do reflection same day → verify only one weight entry for today (upsert)
17. **Test:** E2E - Macro cycling enabled → verify plan card shows "daily averages" subtitle
18. **Test:** E2E - Switch units between reflections → verify display converts correctly

---

## 14. What This Feature Does NOT Include (Explicitly Excluded)

- **Push notifications:** Excluded from v1 entirely. The banner is in-app only.
- **Expenditure algorithm:** NutritionRx does NOT reverse-engineer actual energy expenditure from intake vs. weight change (that's MacroFactor's core IP and a major technical undertaking). NutritionRx recalculates from updated weight using Mifflin-St Jeor. Simpler, transparent, and still effective.
- **Coaching modules:** No multi-step wizard, no conditional question flows, no "MF Coach" equivalent. One screen, three sections, under 30 seconds.
- **Reflection history screen:** The data model supports it, but the UI for viewing past reflections is a future feature. For now, the data accumulates for later.
- **Social/sharing features:** No "share your reflection" or community elements.
- **Weight graph on the reflection screen:** Keep it focused. The weight graph lives on the analytics/progress screen. The reflection screen is about updating, not analyzing.
- **Auto-adjusting rate when falling behind timeline:** MacroFactor explicitly doesn't do this (and explains why — it makes diets harder). NutritionRx follows the same philosophy. The weekly rate stays constant; the estimated completion date shifts instead.

---

## 15. Nourished Calm Copy Reference

All user-facing strings in one place for implementation consistency.

### Banner
- Due: "It's been a week — ready for a quick reflection?"
- Overdue: "Your plan works best with regular updates"
- Very overdue: "Welcome back! Let's get your plan in sync"
- First time: "Set up your weekly reflection to keep your plan on track"
- CTA variants: "Reflect now" / "Let's go" / "Get started"

### Modal Header
- "Weekly Reflection"

### Weight Section
- Label: "Your weight this week"
- Context line 1: "Last reflection: [weight] [unit] ([date])"
- Context line 2: "Your trend: ~[weight] [unit]"
- First time: "This is your first reflection!"
- Pre-filled from Health: "From Apple Health · [timestamp]" / "From Health Connect · [timestamp]"
- Placeholder: "Enter weight"

### Sentiment Section
- Label: "How are you feeling about things?"
- Sublabel: "(optional)"
- Option 1: "Feeling good" with sun/smile icon
- Option 2: "Hanging in there" with neutral icon
- Option 3: "It's tough" with cloud icon

### Plan Section
- Changed header: "Your updated plan"
- Changed intro: "We've gently adjusted your targets based on your progress:"
- No change header: "Your plan"
- No change intro: "Your plan is right on track — no changes this week."
- First reflection header: "Your starting plan"
- First reflection intro: "Based on your weight, here's your personalized plan:"
- Macro cycling subtitle: "These are your daily averages — your cycling split is applied on top."
- Labels: "Daily calories" / "Protein" / "Carbs" / "Fat"

### Confirm
- Primary button: "Sounds Good"
- Secondary link: "Adjust my pace"
- Toast after confirm: "Plan updated ✓"

### Trend Weight Explainer (first time only)
- "Your trend weight smooths out normal daily fluctuations to show where your weight is actually heading. It's a more reliable measure of progress than any single weigh-in."

### Sentiment Pattern Messages
- Tough streak: "It sounds like things have been hard lately. That's okay — every journey has rough patches. Would you like to adjust your pace to something that feels more manageable right now?"
- Recovery: "Glad things are feeling better this week! You showed up even when it was tough, and that matters."
- Positive streak: "Three weeks of feeling good — you're building real momentum!"

---

## 16. Accessibility

- Weight input: `accessibilityLabel="Enter your current weight in [lbs/kg]"`
- Sentiment cards: `accessibilityRole="radio"`, `accessibilityState={{ selected: true/false }}`, `accessibilityLabel="Feeling good / Hanging in there / It's tough"`
- Plan update card: `accessibilityRole="summary"`, entire card readable as one block
- Progress message: Announced via `AccessibilityInfo.announceForAccessibility()` when it appears
- Confirm button disabled state: `accessibilityState={{ disabled: true }}`, `accessibilityHint="Enter your weight first"`
- Banner dismiss: `accessibilityLabel="Dismiss reflection reminder"`, `accessibilityRole="button"`
- All touch targets minimum 44pt
- All text meets WCAG AA contrast (4.5:1 on cream background)

---

## 17. Edge Cases

### Edge Case #1: "Adjust My Pace" Data Consistency

**Resolved in Section 2.6.** Both "Sounds Good" and "Adjust my pace" execute the same `submitReflection()` — writing the weight log, recalculating targets, and saving the complete reflection record with before/after snapshots. "Adjust my pace" then navigates to the goal screen. Any goal changes the user makes there are a separate action that takes effect going forward; the reflection record retains its original auto-calculated snapshot. No pending state, no detection of "returned from goal screen," no orphaned records.

### Edge Case #2: No Active Goal

**Resolved in Section 2.1.** The banner requires `goalStore.goalType != null` to appear. If the user has no active goal, the banner never shows. If the user deactivates their goal mid-week, the banner disappears. If they re-create a goal, the 7-day timer starts from the new goal creation date (since there's no prior reflection with the new goal context).

### Edge Case #3: Transaction Safety

**Resolved in Section 3.4.** All writes in `submitReflection()` are wrapped in `db.withTransactionAsync()`. If any step fails, the entire transaction rolls back. The modal stays open with the user's input preserved for retry. A toast shows: "Something went wrong — please try again."

### Edge Case #4: Macro Cycling Interaction

**Resolved in Section 2.5.** The plan card displays base daily averages when cycling is active, with a subtitle explaining that cycling splits are applied on top. The reflection recalculates base targets only; cycling percentages are preserved and re-applied.

### Edge Case #5: Time-Weighted EMA

**Resolved in Section 5.1.** The EMA uses `effectiveAlpha = 1 - (1 - 0.2)^dayGap`, which correctly handles irregular intervals. A 1-day gap gives standard smoothing (α ≈ 0.20), while a 7-day gap nearly resets to the new reading (α ≈ 0.79).

### Edge Case #6: Unit Preference in Messages

**Resolved in Section 7.2.** `getProgressMessage()` accepts a `unitPreference` parameter and uses helper functions `formatWeightChange()` and `formatWeight()` to display values in the user's chosen unit. All weight displays throughout the reflection screen respect the user's unit preference.

### Edge Case #7: Duplicate Weight Entries on Same Day

If the user logs weight manually on the Today screen and then does a reflection on the same day, the reflection should **upsert** rather than create a duplicate entry.

**Implementation:** Add `upsertWeight()` to `weightRepository`:

```typescript
// src/repositories/weightRepository.ts

async upsertWeight(weightKg: number, loggedAt: string): Promise<void> {
  const dateOnly = loggedAt.substring(0, 10); // Extract YYYY-MM-DD

  // Check if an entry exists for this date
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM weight_logs WHERE date(logged_at) = date(?)`,
    [dateOnly]
  );

  if (existing) {
    // Update existing entry for today
    await db.runAsync(
      `UPDATE weight_logs SET weight_kg = ?, logged_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [weightKg, loggedAt, existing.id]
    );
  } else {
    // Insert new entry
    await db.runAsync(
      `INSERT INTO weight_logs (weight_kg, logged_at, created_at) VALUES (?, ?, datetime('now'))`,
      [weightKg, loggedAt]
    );
  }
}
```

The `submitReflection()` transaction calls `upsertWeight()` instead of `logWeight()`. The trend weight calculation then sees at most one entry per day, which also improves EMA accuracy.

**Note:** The existing `logWeight()` method used elsewhere in the app (manual weight log on Today screen, goal screen) should remain unchanged — multiple entries per day from manual logging are fine for historical record. Only the reflection uses `upsertWeight()` because it represents a deliberate "this is my weight for this week" action that should override rather than append.

### Edge Case #8: Banner Dismiss Count Persistence

**Resolved in Section 3.3.** The `bannerDismissCount` is loaded from `settingsRepository` during `initialize()` and written back during `dismissBanner()`. Both are async operations. The `submitReflection()` transaction also resets the persisted count to 0.

### Edge Case #9: Apple Health Pre-fill with Multiple Readings

**Resolved in Section 2.3.** When multiple Apple Health / Health Connect readings exist within the 48-hour window, use the **most recent single reading** (not an average). Display the source and timestamp for transparency.

### Edge Case #10: First Reflection with No Prior Weight Data

If the user skipped weight entry during onboarding and has never logged weight anywhere in the app:

**Guard:** The banner does not appear until the user has both an active goal AND at least one weight log entry (see Section 2.1). This prevents the reflection from being the user's first-ever weight entry point, which could cause confusing target swings.

**If the guard is somehow bypassed** (e.g., the user had a weight entry that was later deleted):
- The weight input field shows the empty placeholder "Enter weight" with no pre-fill
- No trend weight is displayed (trend line hidden, not "~0 lbs")
- No "Last reflection" line is shown
- The progress message shows the first-reflection welcome text
- `goalStore.updateCurrentWeight()` computes new targets from scratch using the entered weight. If the goal store had been using a stale/default value, the target change could be large. This is **acceptable and correct** — the first real weight entry should establish accurate targets, even if the swing is big.
- To soften the UX, the plan section header says "Your starting plan" instead of "Your updated plan" for the first reflection, and the intro text says: "Based on your weight, here's your personalized plan:" instead of "We've gently adjusted your targets."

```typescript
// First reflection display variants
const planHeader = isFirstReflection ? 'Your starting plan' : 'Your updated plan';
const planIntro = isFirstReflection
  ? 'Based on your weight, here\'s your personalized plan:'
  : 'We\'ve gently adjusted your targets based on your progress:';
```

### Edge Case #11: User Changes Units Between Reflections

If the user switches from lbs to kg (or vice versa) between reflections:
- All internal storage remains in kg (no change)
- The "Last reflection" display converts the stored kg value to the user's **current** unit preference
- The weight input accepts and displays in the current unit preference
- The progress message uses the current unit preference (resolved in Edge Case #6)
- No special handling needed — this is purely a display conversion

### Edge Case #12: Very Large Weight Jump (>5 lbs in One Week)

If the entered weight differs from the previous reflection by more than ~2.3 kg (5 lbs) in a single week:
- Do NOT flag it as an error or show a warning. Large swings happen (water retention after travel, starting creatine, recovering from illness, etc.)
- The time-weighted EMA (Section 5.1) naturally dampens the impact on trend weight, which is what's used for calorie calculations
- The raw weight is still logged faithfully
- The progress message uses Priority 5 ("Your weight shifted a bit") or Priority 6/7 (too fast) as appropriate — these are all gentle, non-alarming messages
