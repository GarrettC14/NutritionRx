# NutritionRx — Micronutrient Screen Redesign Specification

## Document Purpose

This specification defines every change required to transform the Micronutrient Details Screen from its current clinical, traffic-light color system to a design that embodies NutritionRx's "Nourished Calm" philosophy. It covers color system overhaul, language/copy changes, interaction fixes, accessibility compliance, performance improvements, and code cleanup. This document is the reference for the implementation prompt.

---

## 1. Design Philosophy Alignment

### The Problem

The current screen uses red (#F85149) for "deficient" and "excessive" states, yellow (#D29922) for "low" and "high," and green (#3FB950) for "optimal." This is a classic traffic-light model that communicates judgment: red = failure, green = success. It directly contradicts NutritionRx's core principle of non-judgmental language around food choices.

### Competitive Intelligence

**Noom's Lesson:** Noom originally used red/yellow/green food categories. They deliberately replaced red with orange after feedback that red made users "feel like they're doing something wrong when they enjoy a spoonful of nut butter." The color shift was driven by their psychology team. NutritionRx should go further — our philosophy is explicitly calmer than Noom's.

**Cronometer's Approach:** Uses grey (not yet at target), green (met target), red (exceeded max). Simple but still judgmental with red. Users on their forums have complained about the red bar for nutrients like cholesterol where "exceeding" is relative. Cronometer recently refreshed their nutrient target UI but kept the same color model.

**Wellness App Color Psychology:** Research from UXmatters (2024) confirms: blue calms people, green represents health/balance, and red energizes/alarms. Calm, Headspace, and other wellness-adjacent apps use soft gradients, pastels, and nature-inspired palettes. Our redesign draws from this established pattern.

### The Solution: "Gentle Guidance" Color Model

Replace the traffic-light model with a **warmth gradient** using NutritionRx's existing brand palette (sage green, soft cream, terracotta). The emotional mapping shifts from "good/bad" to "keep nourishing/well nourished." The warmest color (terracotta) means "this needs attention" — attention, not alarm. The coolest color (sage green) means "you're well nourished here."

---

## 2. Color System — Complete Token Replacement

### 2.1 New Status Color Tokens

These replace the existing `error`, `warning`, `success`, and `accent` usage in status contexts only. The base theme tokens themselves remain unchanged for non-status UI (buttons, links, destructive actions).

#### Dark Mode Status Colors

| Status                          | Old Token | Old Hex | New Token Name   | New Hex | Contrast vs bgPrimary (#0D1117) | Contrast vs bgSecondary (#161B22) | WCAG AA Normal |
| ------------------------------- | --------- | ------- | ---------------- | ------- | ------------------------------- | --------------------------------- | -------------- |
| deficient → "Needs nourishing"  | error     | #F85149 | statusTerracotta | #E07A5F | 6.42:1                          | 5.86:1                            | ✅ Pass        |
| low → "Getting started"         | warning   | #D29922 | statusWarmTan    | #D4A574 | 8.50:1                          | 7.77:1                            | ✅ Pass        |
| adequate → "Getting there"      | accent    | #64B5F6 | statusSoftSage   | #87CEAB | 10.32:1                         | 9.43:1                            | ✅ Pass        |
| optimal → "Well nourished"      | success   | #3FB950 | statusSageGreen  | #7DB87E | 8.14:1                          | 7.44:1                            | ✅ Pass        |
| high → "Above target"           | warning   | #D29922 | statusWarmTan    | #D4A574 | 8.50:1                          | 7.77:1                            | ✅ Pass        |
| excessive → "Well above target" | error     | #F85149 | statusDustyRose  | #C97B6B | 5.88:1                          | 5.38:1                            | ✅ Pass        |

#### Light Mode Status Colors

| Status            | New Token Name   | New Hex | Contrast vs bgPrimary (#FFFFFF) | Contrast vs bgSecondary (#F6F8FA) | WCAG AA Normal |
| ----------------- | ---------------- | ------- | ------------------------------- | --------------------------------- | -------------- |
| Needs nourishing  | statusTerracotta | #A14D38 | 5.78:1                          | 5.43:1                            | ✅ Pass        |
| Getting started   | statusWarmTan    | #7D6540 | 5.52:1                          | 5.18:1                            | ✅ Pass        |
| Getting there     | statusSoftSage   | #3D7A5C | 5.08:1                          | 4.77:1                            | ✅ Pass        |
| Well nourished    | statusSageGreen  | #357A48 | 5.21:1                          | 4.90:1                            | ✅ Pass        |
| Above target      | statusWarmTan    | #7D6540 | 5.52:1                          | 5.18:1                            | ✅ Pass        |
| Well above target | statusDustyRose  | #9B5548 | 5.55:1                          | 5.21:1                            | ✅ Pass        |

**Note:** The existing light mode had WCAG failures: warning (#CA8A04) at 2.94:1 and success (#16A34A) at 3.30:1. Both fail AA. The new palette fixes this.

### 2.2 How Status Colors Are Applied

Add a new mapping in the theme system:

```typescript
// theme/statusColors.ts
export const statusColors = {
  dark: {
    needsNourishing: "#E07A5F", // terracotta
    gettingStarted: "#D4A574", // warm tan
    gettingThere: "#87CEAB", // soft sage
    wellNourished: "#7DB87E", // sage green
    aboveTarget: "#D4A574", // warm tan (same as gettingStarted)
    wellAboveTarget: "#C97B6B", // dusty rose
  },
  light: {
    needsNourishing: "#A14D38",
    gettingStarted: "#7D6540",
    gettingThere: "#3D7A5C",
    wellNourished: "#357A48",
    aboveTarget: "#7D6540",
    wellAboveTarget: "#9B5548",
  },
};
```

The existing `NutrientStatus` enum maps to these new colors:

```typescript
export const statusColorMap: Record<
  NutrientStatus,
  keyof typeof statusColors.dark
> = {
  deficient: "needsNourishing",
  low: "gettingStarted",
  adequate: "gettingThere",
  optimal: "wellNourished",
  high: "aboveTarget",
  excessive: "wellAboveTarget",
};
```

### 2.3 Widget Color Unification

The `MicronutrientSnapshotWidget` currently uses hardcoded non-token colors (#E07A5F, #D4A574, #4CAF50). After the redesign, these happen to closely align with the new status tokens. Replace them:

| Widget Condition | Current Hardcoded     | Replace With                 |
| ---------------- | --------------------- | ---------------------------- |
| Progress < 50%   | #E07A5F (terracotta)  | statusColors.needsNourishing |
| Progress < 80%   | #D4A574 (warning tan) | statusColors.gettingStarted  |
| Progress >= 80%  | #4CAF50 (sage green)  | statusColors.wellNourished   |

This ensures the dashboard widget and the detail screen speak the same visual language.

### 2.4 Hex+Alpha Utility Replacement

The current code constructs transparent status colors via string concatenation: `${color}15` and `${color}20`. This produces 8-digit hex values that are fragile.

Replace ALL instances with a utility function:

```typescript
// utils/colorUtils.ts
export const withAlpha = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};
```

Usage: `withAlpha(statusColor, 0.08)` instead of `${statusColor}15`.

Affected locations:

- StatusOverviewCard line ~69: badge backgrounds
- StatusFilterChips line ~62: selected chip backgrounds
- Any other location using the `${color}XX` pattern

---

## 3. Copy & Language Changes

### 3.1 Status Labels

| Internal Status Enum Value | Current Display Label        | New Display Label   | Rationale                               |
| -------------------------- | ---------------------------- | ------------------- | --------------------------------------- |
| deficient                  | "Deficient"                  | "Needs nourishing"  | Action-oriented, not clinical diagnosis |
| low                        | "Low"                        | "Getting started"   | Encouraging momentum                    |
| adequate                   | "Adequate" / "Getting there" | "Getting there"     | Already good, keep it                   |
| optimal                    | "Optimal"                    | "Well nourished"    | Positive, body-focused, calm            |
| high                       | "High"                       | "Above target"      | Neutral, factual, no alarm              |
| excessive                  | "Excessive"                  | "Well above target" | Neutral, no moral weight                |

Create a `STATUS_DISPLAY_LABELS` map:

```typescript
export const STATUS_DISPLAY_LABELS: Record<NutrientStatus, string> = {
  deficient: "Needs nourishing",
  low: "Getting started",
  adequate: "Getting there",
  optimal: "Well nourished",
  high: "Above target",
  excessive: "Well above target",
};
```

### 3.2 Status Icons

Replace warning/alert iconography with nature/growth metaphors.

| Status    | Current Icon (Ionicons)  | New Icon (Ionicons) | Rationale                 |
| --------- | ------------------------ | ------------------- | ------------------------- |
| deficient | alert-circle-outline     | leaf-outline        | Growth needed, not danger |
| low       | arrow-down-outline       | water-outline       | Filling up metaphor       |
| adequate  | trending-up-outline      | sunny-outline       | Warming up, progressing   |
| optimal   | checkmark-circle-outline | flower-outline      | Blooming, nourished       |
| high      | arrow-up-outline         | cloud-outline       | Gentle overflow cue       |
| excessive | alert-circle-outline     | rainy-outline       | Too much water metaphor   |

Create a `STATUS_ICONS` map:

```typescript
export const STATUS_ICONS: Record<NutrientStatus, string> = {
  deficient: "leaf-outline",
  low: "water-outline",
  adequate: "sunny-outline",
  optimal: "flower-outline",
  high: "cloud-outline",
  excessive: "rainy-outline",
};
```

**Fallback option:** If the nature metaphor feels too whimsical after visual testing, a simpler alternative uses filled vs outlined circles with varying sizes. The implementation should make swapping easy via the centralized map.

### 3.3 Empty State Copy

Current: "Log some food to see your micronutrients"

New: "Start tracking what nourishes you"

Add a CTA button below:

- Label: "Log Food"
- Action: Navigate to food logging screen (use expo-router `router.push`)
- Style: Primary button using accent color

### 3.4 Filter Chip Labels

Update chip labels to match new status display names:

| Current Chip Label | New Chip Label                 | Matches          |
| ------------------ | ------------------------------ | ---------------- |
| "All"              | "All" (unchanged)              | All nutrients    |
| "Deficient"        | "Below target"                 | deficient + low  |
| "Low"              | _(merged into "Below target")_ |                  |
| _(missing)_        | "Getting there" ← **ADD**      | adequate         |
| "Optimal"          | "Well nourished"               | optimal          |
| "High"             | "Above target"                 | high + excessive |

This reduces from 4 chips to 5 total (including "All") while adding the missing "adequate" coverage. Deficient + low are grouped because the user question is the same ("what am I not getting enough of?"), and high + excessive are grouped for the same reason ("what am I getting too much of?"). Individual status labels on each NutrientBar row still distinguish severity within the filtered view.

---

## 4. Interaction & UX Fixes

### 4.1 Bottom Sheet — Persistent Mount Pattern

**Problem:** The `NutrientDetailSheet` is conditionally rendered (`sheetVisible && selectedNutrient && <NutrientDetailSheet />`). This causes mount/unmount on every open/close, producing janky animations and breaking @gorhom/bottom-sheet's internal layout calculations. Known issue documented in gorhom/react-native-bottom-sheet#838 and #1063.

**Fix:** Keep the sheet always mounted. Control visibility via `index` prop.

```tsx
// Before:
{sheetVisible && selectedNutrient && (
  <NutrientDetailSheet ... />
)}

// After:
<NutrientDetailSheet
  ref={sheetRef}
  nutrient={selectedNutrient}
  index={sheetVisible && selectedNutrient ? 0 : -1}
  snapPoints={snapPoints}
  enablePanDownToClose
  onClose={() => setSheetVisible(false)}
/>
```

Key changes:

- Remove the conditional wrapper entirely
- Use `index={-1}` for closed state
- Add `enablePanDownToClose` prop
- Use `useRef` for the sheet reference
- The sheet's content can conditionally render based on `selectedNutrient` being non-null

### 4.2 Date Navigation Shortcuts

**Problem:** Users must open the calendar picker even for yesterday's data. No quick navigation.

**Fix:** Add left/right chevron buttons flanking the date label.

```
[◁]  [📅 Feb 11, 2026]  [▷]
```

- Left chevron: Go to previous day
- Right chevron: Go to next day (disabled if current date is today)
- Calendar button remains for jumping to specific dates
- Chevrons have 44×44pt minimum tap target (accessibility)
- Add haptic feedback on tap (Expo Haptics)

### 4.3 Target Editor Keyboard Handling

**Problem:** TextInput fields in NutrientTargetEditor have no `returnKeyType` or `onSubmitEditing`. Pressing Return does nothing.

**Fix:**

- First field ("Daily Target"): `returnKeyType="next"`, `onSubmitEditing` focuses second field
- Second field ("Max Threshold"): `returnKeyType="done"`, `onSubmitEditing` dismisses keyboard
- Both fields: `keyboardType="decimal-pad"`
- Add `blurOnSubmit={false}` to first field so keyboard stays up during field transition
- Wrap modal content in `KeyboardAvoidingView` if not already done

### 4.4 Stale Data on Date Change

**Problem:** When switching dates, `isLoading && !dailyIntake` means subsequent loads show stale data from the previous date until new data arrives. No visual feedback.

**Fix:** Add a thin inline loading indicator at the top of the ScrollView when date changes trigger a reload.

```tsx
// Track loading after first load separately
const [isRefreshing, setIsRefreshing] = useState(false);

// On date change:
setIsRefreshing(true);
await loadDailyIntake(newDate);
setIsRefreshing(false);
```

Visual treatment: A 2px-height animated bar at the top of the ScrollView using the accent color, similar to web page loading indicators. Uses `react-native-reanimated` for smooth animation. Alternatively, reduce opacity of stale content to 0.5 during load.

### 4.5 StatusOverviewCard — Add Missing Statuses

**Problem:** The `STATUS_CONFIG` in StatusOverviewCard only includes deficient, low, optimal, and high. It excludes "adequate" and "excessive." Users see "adequate" labels on NutrientBars but can't find them in the overview.

**Fix:** Add all 6 statuses to `STATUS_CONFIG`:

```typescript
const STATUS_CONFIG = [
  {
    status: "deficient",
    label: "Needs nourishing",
    color: statusColors.needsNourishing,
  },
  {
    status: "low",
    label: "Getting started",
    color: statusColors.gettingStarted,
  },
  {
    status: "adequate",
    label: "Getting there",
    color: statusColors.gettingThere,
  },
  {
    status: "optimal",
    label: "Well nourished",
    color: statusColors.wellNourished,
  },
  { status: "high", label: "Above target", color: statusColors.aboveTarget },
  {
    status: "excessive",
    label: "Well above target",
    color: statusColors.wellAboveTarget,
  },
];
```

**Layout consideration:** 6 badges instead of 4. Use a 3×2 grid or horizontal scroll if they don't fit. Recommended: 3 columns × 2 rows with `flexWrap: 'wrap'`.

### 4.6 StatusFilterChips — Add Missing Filters

**Problem:** No filter chips for "adequate" or "excessive."

**Fix:** Add chips for all statuses. The chip array should match `STATUS_CONFIG`. The "Low" chip continues to also match "deficient" nutrients. The "Above target" chip continues to also match "excessive" nutrients. But now "Getting there" and "Well above target" are also available as distinct filters.

Updated `FILTER_CHIPS`:

```typescript
const FILTER_CHIPS = [
  { key: "all", label: "All", color: accent, matches: [] }, // empty = show all
  {
    key: "low",
    label: "Below target",
    color: statusColors.needsNourishing,
    matches: ["deficient", "low"],
  },
  {
    key: "adequate",
    label: "Getting there",
    color: statusColors.gettingThere,
    matches: ["adequate"],
  },
  {
    key: "optimal",
    label: "Well nourished",
    color: statusColors.wellNourished,
    matches: ["optimal"],
  },
  {
    key: "high",
    label: "Above target",
    color: statusColors.aboveTarget,
    matches: ["high", "excessive"],
  },
];
```

**Filter grouping rationale:** Deficient and low are both "below target" states that differ in severity — grouping them under one filter ("Below target") matches the user's mental model ("show me what I'm not getting enough of"). Similarly, high and excessive are both "above target" states. This reduces the chip count from 7 to 5, keeping the horizontal scroll usable on small screens. Individual status labels (e.g., "Needs nourishing" vs "Getting started") remain visible on each NutrientBar row, so users can still distinguish severity within a filtered view.

**Note:** The StatusOverviewCard still shows all 6 individual statuses with their distinct labels/counts — the grouping only applies to the filter chips, which are an action (filtering) rather than a display (status counts).

**Material Design 3 alignment:** MD3 filter chips show a checkmark icon when selected. Add a small checkmark (Ionicons `checkmark`) as a leading icon when `selected === true`. This improves the selected state indication beyond just background color change.

### 4.7 Dead Code Cleanup in StatusOverviewCard

**Problem:** Line 53-57 computes a `count` variable that aggregates related statuses, but line 58-62 computes `displayCount` independently with the same logic. The `count` variable is never used.

**Fix:** Remove the dead `count` computation. Keep only `displayCount`.

---

## 5. Progress Bar Consistency

### 5.1 The Mental Model Problem

Currently three different bar implementations show the same data at different scales:

| Component            | Track Height | Scale             | 100% Fills Bar?          |
| -------------------- | ------------ | ----------------- | ------------------------ |
| NutrientBar (list)   | 8px          | 0–100% of target  | Yes                      |
| Detail sheet bar     | 10px         | 0–200% of target  | No — 100% is at 50% mark |
| ContributorsList bar | 4px          | Relative to total | N/A (proportional)       |

When a user taps a NutrientBar showing a full bar (100%), the detail sheet shows the same data as a half-filled bar. This is confusing.

### 5.2 The Fix: Unified 0–100% Scale With Overflow Indicator

**All progress bars use 0–100% scale.** The bar fills completely at 100% of target.

For intake exceeding 100%, add an **overflow glow/badge** at the right edge of the bar:

```
[████████████████████▏→ 142%]
                     ^ subtle overflow indicator
```

Implementation:

- Bar fills to 100% max
- If percent > 100%, show a small pulsing badge at the right edge with the percentage
- Badge uses the appropriate status color (warm tan for "Above target," dusty rose for "Well above target")
- The detail sheet shows the same bar but with additional marker lines for target (100%) and upper limit

**Detail sheet bar changes:**

- Remove the 200% scale mapping
- Bar fills 0–100% of target (same as list)
- Add a vertical marker line at the 100% position labeled "Target"
- If upper limit exists, add a second marker line at the (upperLimit/target \* 100)% position labeled "Max"
- Overflow beyond 100% shown via the badge and a color shift in the final portion of the bar

**ContributorsList bar:** No changes needed — these are proportional (food X contributed Y% of the nutrient) and don't use the target scale.

---

## 6. Accessibility Fixes

### 6.1 CollapsibleSection Accessibility Role

**Problem:** No `accessibilityRole` or `accessibilityState` on the expand/collapse header.

**Fix:**

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityState={{ expanded: isExpanded }}
  accessibilityLabel={`${title}, ${isExpanded ? 'expanded' : 'collapsed'}, ${count} nutrients`}
  onPress={toggle}
>
```

### 6.2 Hardcoded White Text (#FFFFFF)

**Problem:** NutrientBar line ~240 uses `color: '#FFFFFF'` for the overflow text badge. Not theme-aware.

**Fix:** Since this text renders on a status-colored badge background, use a WCAG-safe contrast selection utility that computes actual contrast ratios against both candidate text colors and picks the winner:

```typescript
// In utils/colorUtils.ts:
const WHITE = "#FFFFFF";
const DARK = "#1F2328";

export const contrastTextColor = (bgHex: string): string => {
  const bgLum = relativeLuminance(bgHex);
  const whiteLum = relativeLuminance(WHITE); // ~1.0
  const darkLum = relativeLuminance(DARK); // ~0.024

  const whiteRatio =
    (Math.max(bgLum, whiteLum) + 0.05) / (Math.min(bgLum, whiteLum) + 0.05);
  const darkRatio =
    (Math.max(bgLum, darkLum) + 0.05) / (Math.min(bgLum, darkLum) + 0.05);

  return whiteRatio >= darkRatio ? WHITE : DARK;
};
```

This is WCAG-safe: it picks whichever text color produces the higher actual contrast ratio against the badge background, rather than relying on a luminance threshold that could fail at edge cases.

### 6.3 Filter Chip Accessibility Enhancement

**Current:** Chips have `accessibilityState.selected` — good.

**Add:** `accessibilityRole="button"` and `accessibilityHint` describing what the filter does. Example: `accessibilityHint="Filters to show only nutrients that need nourishing"`.

### 6.4 Date Navigation Accessibility

The new chevron buttons need:

- `accessibilityRole="button"`
- `accessibilityLabel="Previous day"` / `"Next day"`
- Right chevron: `accessibilityState={{ disabled: isToday }}`

### 6.5 Empty State CTA Accessibility

The new "Log Food" button needs:

- `accessibilityRole="button"`
- `accessibilityLabel="Log food to start tracking micronutrients"`

---

## 7. Premium Gating Fix

### 7.1 Choose a Consistent Product Behavior

**Problem:** Line ~100: `isPremium ? ALL_NUTRIENTS : ALL_NUTRIENTS` — both branches return the same thing. This is dead code. But the _intended_ behavior is ambiguous: should free users see premium nutrients with a blur overlay (current visual approach via LockedContentArea), or should they be hidden entirely?

**Decision: Show all, lock premium.** This aligns with NutritionRx's established "visible menu item with lock" design principle — premium features should be discoverable to create desire without being pushy. Free users see the full nutrient list, but premium nutrient rows show the LockedContentArea blur overlay and tapping them shows the paywall instead of the detail sheet.

**Fix:** Remove the dead branching code entirely. ALL_NUTRIENTS should always be displayed for all users. The differentiation happens at the interaction layer, not the data layer:

```typescript
// REMOVE this dead code:
// const displayedNutrients = isPremium ? ALL_NUTRIENTS : ALL_NUTRIENTS;

// KEEP: All nutrients are always rendered
const displayedNutrients = ALL_NUTRIENTS;

// Premium gating happens in the tap handler:
const handleNutrientPress = (nutrient: NutrientData) => {
  if (nutrient.isPremium && !isPremium) {
    showPaywall(); // or navigation to upgrade screen
    return;
  }
  setSelectedNutrient(nutrient);
  setSheetOpen(true);
};
```

**What stays:** LockedContentArea blur overlay on premium nutrient rows for free users (visual lock indicator).
**What's added:** Tap handler guards against opening the detail sheet for locked nutrients.
**What's removed:** The dead `isPremium ? ALL_NUTRIENTS : ALL_NUTRIENTS` branching.

### 7.2 Blur Leak Verification

**Problem (from audit):** expo-blur intensity of 100 at 0.03 content opacity might leak readable text on high-density screens.

**Action:** During QA, test the blur overlay on high-PPI devices (iPhone 15 Pro Max, recent iPads). If text is readable through the blur, increase blur intensity or decrease content opacity further. No code change needed now — this is a QA checklist item.

---

## 8. Layout & Visual Hierarchy Improvements

### 8.1 Section Spacing

**Problem:** Uniform `gap: spacing[3]` (12px) between all elements creates a flat visual hierarchy.

**Fix:** Introduce a spacing break between the "summary zone" (overview card + filter chips) and the "detail zone" (collapsible nutrient sections):

```
StatusOverviewCard
  ↕ spacing[3] (12px)
StatusFilterChips
  ↕ spacing[5] (20px)  ← increased gap here
CollapsibleSection[]
  ↕ spacing[3] (12px)  ← between sections stays 12px
```

### 8.2 Section Visual Separator

Add a subtle 1px border or use `bgInteractive` (#30363D dark / #F3F4F6 light) as a thin separator line between the filter zone and the nutrient sections. This creates a clear "dashboard summary above / detailed list below" structure.

### 8.3 Target Editor Modal — Tablet Scaling

**Problem:** `maxWidth: 360px` makes the modal tiny on tablets/iPads.

**Fix:** Use responsive max-width:

```typescript
const modalMaxWidth = Math.min(Dimensions.get("window").width * 0.85, 480);
```

This uses 85% of screen width up to 480px, working well on both phones and tablets.

---

## 9. Animation & Polish

### 9.1 Bottom Sheet Animation Config

The detail sheet and modal currently use platform default animations. Add a custom spring config for consistency with the app's calm feel:

```typescript
const CALM_SPRING_CONFIG = {
  damping: 20,
  stiffness: 150,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};
```

Apply to the bottom sheet via `animationConfigs` prop.

### 9.2 Date Transition

When the date changes, the nutrient data should cross-fade rather than pop in:

- Fade out current data (opacity 1→0.5) over 150ms
- Load new data
- Fade in (opacity 0.5→1) over 200ms

Use `react-native-reanimated` `withTiming` for this.

---

## 10. Technical Cleanup

### 10.1 Summary of All Code Changes by File

| File                                             | Changes                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/app/micronutrients.tsx`                     | Bottom sheet persistent mount, date nav chevrons, stale data indicator, empty state CTA, spacing adjustments |
| `src/components/NutrientBar.tsx`                 | New status colors, overflow badge theme-aware text, updated bar scale                                        |
| `src/components/NutrientDetailSheet.tsx`         | Bar scale change (0-100%), marker system update, new labels/icons                                            |
| `src/components/StatusOverviewCard.tsx`          | Add adequate + excessive, remove dead code, new colors/labels                                                |
| `src/components/StatusFilterChips.tsx`           | Add adequate + excessive chips, MD3 checkmark, new colors/labels                                             |
| `src/components/CollapsibleSection.tsx`          | Accessibility role + state                                                                                   |
| `src/components/NutrientTargetEditor.tsx`        | Keyboard handling, tablet scaling                                                                            |
| `src/components/ContributorsList.tsx`            | No changes needed (proportional bars)                                                                        |
| `src/components/MicronutrientSnapshotWidget.tsx` | Replace hardcoded colors with status tokens                                                                  |
| `src/theme/statusColors.ts`                      | **NEW FILE** — status color tokens and maps                                                                  |
| `src/utils/colorUtils.ts`                        | **NEW or UPDATE** — `withAlpha()` and `contrastTextColor()` utilities                                        |
| `src/constants/micronutrients.ts`                | New `STATUS_DISPLAY_LABELS`, `STATUS_ICONS`                                                                  |
| `src/stores/micronutrientStore.ts`               | No changes expected                                                                                          |

### 10.2 Files Requiring Search-and-Replace

The following string patterns need global replacement:

- `'Deficient'` → `STATUS_DISPLAY_LABELS.deficient`
- `'Low'` → `STATUS_DISPLAY_LABELS.low`
- `'Adequate'` → `STATUS_DISPLAY_LABELS.adequate`
- `'Optimal'` → `STATUS_DISPLAY_LABELS.optimal`
- `'High'` → `STATUS_DISPLAY_LABELS.high`
- `'Excessive'` → `STATUS_DISPLAY_LABELS.excessive`
- `'alert-circle-outline'` (in status context) → `STATUS_ICONS[status]`
- `color: '#FFFFFF'` (in NutrientBar) → `color: contrastTextColor(statusColor)`
- All `${color}15`, `${color}20` patterns → `withAlpha(color, 0.08)`, `withAlpha(color, 0.12)`

---

## 11. QA Checklist

### Visual Verification

- [ ] All 6 status colors render correctly in dark mode
- [ ] All 6 status colors render correctly in light mode
- [ ] Widget colors match detail screen colors
- [ ] No hardcoded color values remain in status contexts
- [ ] Filter chips show all 6 statuses + "All"
- [ ] StatusOverviewCard shows all 6 status badges
- [ ] Nature icons render correctly for all statuses
- [ ] Progress bars use consistent 0–100% scale
- [ ] Overflow badge appears for nutrients >100%
- [ ] Bottom sheet animates smoothly on open/close
- [ ] Date chevrons navigate correctly; right chevron disabled on today
- [ ] Target editor keyboard advances between fields
- [ ] Empty state shows CTA button that navigates to food logging
- [ ] Modal scales appropriately on iPad

### Accessibility Verification

- [ ] All status text passes WCAG AA contrast (4.5:1) on both themes
- [ ] CollapsibleSection announces expanded/collapsed state
- [ ] Filter chips announce selected state
- [ ] Date navigation buttons have proper labels
- [ ] VoiceOver/TalkBack correctly reads NutrientBar status labels
- [ ] Reduce motion preference disables CollapsibleSection animations

### Functional Verification

- [ ] Premium gating correctly filters nutrients for free users
- [ ] Status counts in overview match actual nutrient statuses
- [ ] Filter chips correctly filter nutrients (including adequate and excessive)
- [ ] Date changes show loading indicator and fresh data
- [ ] Custom target editor saves/resets correctly
- [ ] Contributors load on sheet open
- [ ] Blur overlay doesn't leak readable text on high-PPI devices

---

## 12. Research Confidence Table

Every key design decision should trace to evidence. Confidence levels: **High** = primary source verified; **Medium** = credible secondary source; **Low** = general industry consensus without a specific study.

| Claim                                                        | Primary Source                                                                   | Date               | Confidence | Notes                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------ | ---------- | ------------------------------------------------------------------------------------ |
| Noom replaced red with orange to reduce user guilt           | Women's Health Mag quoting Noom's Martin + Good Housekeeping review              | Jul 2023, Nov 2022 | **High**   | Multiple independent reports confirm the color change and stated rationale           |
| Cronometer uses grey/green/red bar system                    | Cronometer Support: "Nutrient Targets Summary" (support.cronometer.com)          | Current (live doc) | **High**   | Primary source — their own support documentation                                     |
| Cronometer users complained about red for cholesterol bars   | Cronometer Community Forum: "Targets and colors" thread                          | Sep 2018           | **Medium** | Forum posts are authentic user voices but small sample                               |
| @gorhom/bottom-sheet conditional render causes mount bugs    | GitHub Issue #838 (animateOnMount=false keeps sheet hidden)                      | Feb 2022           | **High**   | Primary source — library's own issue tracker with repro video                        |
| @gorhom/bottom-sheet lacks unmount animation support         | GitHub Issue #1063 (feature request for animateOnExiting)                        | Aug 2022           | **High**   | Primary source — 12+ thumbs up, confirmed unresolved                                 |
| Persistent mount with index={-1} is the recommended pattern  | gorhom.dev official props documentation                                          | Current            | **High**   | Primary source — the enableDynamicSizing and index props doc                         |
| MD3 filter chips show checkmark on selection                 | material.io/components/chips/guidelines + Android Developers Compose docs        | Current            | **High**   | Primary source — Google's own design system documentation                            |
| WCAG AA requires 4.5:1 contrast for normal text              | W3C Understanding SC 1.4.3 (w3.org/WAI/WCAG21)                                   | Current            | **High**   | Authoritative standard                                                               |
| Current light mode warning (#CA8A04) fails WCAG AA at 2.94:1 | Calculated using WCAG relative luminance formula                                 | This document      | **High**   | Math — independently verifiable                                                      |
| Current light mode success (#16A34A) fails WCAG AA at 3.30:1 | Calculated using WCAG relative luminance formula                                 | This document      | **High**   | Math — independently verifiable                                                      |
| All proposed palette colors pass WCAG AA                     | Calculated using WCAG relative luminance formula                                 | This document      | **High**   | Math — independently verifiable. Run through WebAIM Contrast Checker to double-check |
| Red increases heart rate / blue calms                        | Goldstein 1942, Elliot 2015 review in Advances in Experimental Social Psychology | 1942, 2015         | **Medium** | Cited via UXmatters 2024 secondary summary. Foundational but cited secondhand        |
| Wellness apps use soft gradients and pastels for calm UX     | General industry observation (Calm, Headspace, Vessel)                           | N/A                | **Low**    | Pattern recognition across apps, not a formal study                                  |

---

## 13. Phased Execution Plan

This redesign touches 12+ files. Shipping it as one atomic change creates high regression risk. Split into three phases with clear boundaries and independent shippability.

### Phase 1: Foundation (Non-Visual, Zero Regression Risk)

**Goal:** Create the new color/label/icon infrastructure without changing any existing rendering.

- Create `src/theme/statusColors.ts` (new file)
- Create `src/utils/colorUtils.ts` — `withAlpha()` and `contrastTextColor()` (new file or additions)
- Create `src/constants/statusDisplay.ts` — `STATUS_DISPLAY_LABELS`, `STATUS_ICONS`, `STATUS_TO_COLOR_KEY` (new file)
- Create `src/hooks/useStatusColor.ts` (new file)
- Replace all `${color}XX` hex-alpha concatenations with `withAlpha()` calls (invisible change — same visual output)
- Remove dead `count` variable in StatusOverviewCard (invisible change)
- Fix target editor keyboard handling (isolated improvement)
- Fix target editor responsive modal width (isolated improvement)
- Add CollapsibleSection accessibility attributes (invisible to sighted users)

**Verification:** App compiles, all existing tests pass, no visual changes whatsoever. The new files exist but nothing imports them into rendering yet.

**Ship gate:** Can be merged to main immediately.

### Phase 2: Visual Redesign (Color + Copy + Layout)

**Goal:** Swap in the new visual system. This is the visible change.

- Wire StatusOverviewCard to new status colors, labels, icons. Add adequate + excessive badges.
- Wire StatusFilterChips to new colors, labels, grouped matches. Add checkmark indicator.
- Wire NutrientBar to new status colors, icons, labels. Fix hardcoded white text.
- Wire NutrientDetailSheet to new colors/labels.
- Wire MicronutrientSnapshotWidget to shared status color tokens.
- Update empty state copy and add CTA button.
- Add spacing/separator between summary and detail zones.

**Verification:** Full visual QA on both dark and light mode. Every status renders with new palette. Widget matches detail screen. All filter chips work.

**Ship gate:** Requires visual QA sign-off on both themes, both platforms.

### Phase 3: Interaction & Architecture Fixes

**Goal:** Fix structural UX issues that change behavior, not just appearance.

- Bottom sheet: persistent mount pattern (changes animation behavior)
- Date navigation: add chevrons + stale data indicator (new interaction)
- Progress bar: unify to 0–100% scale with overflow badge (changes data display logic)
- Premium gating: fix dead code, add tap handler guard (changes access control behavior)
- Bottom sheet calm spring animation config
- Date transition cross-fade

**Verification:** Full interaction testing on real devices. Bottom sheet open/close smooth. Date nav works. Progress bars consistent. Premium lock works.

**Ship gate:** Requires real-device testing on iOS + Android. TestFlight build recommended before merge.

### Why This Order

Phase 1 is pure infrastructure — it can't break anything and establishes the foundation. Phase 2 is the most impactful user-facing change but is also the most reviewable (visual diff). Phase 3 changes behavior and has the highest regression risk, so it comes last when everything else is stable.

Each phase should be a separate git branch and PR. If Phase 3 reveals issues, Phases 1+2 are already safely merged and the app looks correct even without the interaction fixes.

---

## 14. Pre-Implementation Discovery Checklist

Before starting Phase 1, the implementer must resolve these unknowns by examining the actual codebase. Document the answers in a comment at the top of the first PR.

| Unknown                      | What to Find                                                                                                                                                                     | How to Find It                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Theme hook name              | What is the hook for accessing theme colors? (`useThemeColors`? `useTheme`? Context-based?)                                                                                      | `grep -r "useTheme\|ThemeContext\|useColors" src/`                               |
| Color scheme detection       | Does the app use `useColorScheme()` or a custom theme store for dark/light?                                                                                                      | Check the theme hook implementation                                              |
| NutrientStatus enum location | Where is the `NutrientStatus` type defined?                                                                                                                                      | `grep -rn "NutrientStatus" src/`                                                 |
| ALL_NUTRIENTS location       | Where is the full nutrient list defined? Does it have an `isPremium` field?                                                                                                      | `grep -rn "ALL_NUTRIENTS\|allNutrients" src/`                                    |
| Component file paths         | Exact paths for StatusOverviewCard, StatusFilterChips, NutrientBar, NutrientDetailSheet, NutrientTargetEditor, CollapsibleSection, ContributorsList, MicronutrientSnapshotWidget | `find src -name "*.tsx" \| xargs grep -l "StatusOverviewCard\|NutrientBar"` etc. |
| Food logging route           | What is the Expo Router path for the food logging screen?                                                                                                                        | `ls src/app/` and check for diary/food/log routes                                |
| Paywall/upgrade function     | How does the app currently show the paywall? Function name? Navigation path?                                                                                                     | `grep -rn "paywall\|showPaywall\|upgrade\|premium" src/`                         |
| Bottom sheet version         | What version of @gorhom/bottom-sheet is installed? (v4 vs v5 have different APIs)                                                                                                | `cat package.json \| grep "bottom-sheet"`                                        |
| Subscription store hook      | How is `isPremium` accessed? Store name? Hook?                                                                                                                                   | `grep -rn "isPremium\|useSubscription" src/`                                     |
| Existing colorUtils          | Does a color utility file already exist?                                                                                                                                         | `find src -name "*color*" -o -name "*Color*"`                                    |

---

## 15. Migration Notes

### Backward Compatibility

The `NutrientStatus` enum values (`deficient`, `low`, `adequate`, `optimal`, `high`, `excessive`) remain unchanged. Only the display mapping changes. This means:

- Database stored values are unaffected
- Store logic is unaffected
- Only display/presentation layer changes

### Rollback Plan

If any issues arise, the centralized maps (`STATUS_DISPLAY_LABELS`, `STATUS_ICONS`, `statusColors`) can be reverted to the old values in a single commit without touching component logic.
