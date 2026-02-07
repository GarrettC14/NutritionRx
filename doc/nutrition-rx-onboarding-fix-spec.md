# NutritionRx — Onboarding Flow Hardening & First-Time UX Fixes

## Context

An audit of the first-time user flow revealed critical routing issues, orphaned components, and UX gaps. This spec addresses all findings in priority order. The app uses Expo Router, Zustand, SQLite, and TypeScript.

**Current flow:** App Launch → `_layout.tsx` → `index.tsx` (AppInitializer) → `/legal-acknowledgment` → `/onboarding` (Welcome → Goal → Preferences → Ready) → Dashboard

**Design philosophy:** "Nourished Calm" — warm, supportive, non-judgmental. Sage green and soft cream palette. No words like "failed" or "cheated."

---

## Task 1: Harden the Legal Gate (CRITICAL)

The legal acknowledgment MUST be the absolute first thing any new user sees. It must be an independent, hard gate that cannot be bypassed by any combination of onboarding state flags.

### Requirements

1. **Single source of truth for legal acknowledgment.** In the root `_layout.tsx` (or the AppInitializer in `index.tsx` — whichever handles top-level routing), check for legal acknowledgment BEFORE any onboarding logic runs. The check should be:
   - `hasAcknowledgedLegal === true` AND `acknowledgedLegalVersion === CURRENT_LEGAL_VERSION`
   - If either condition fails → route to `/legal-acknowledgment`, full stop. No other routing logic should execute.

2. **Legal state must be independent of onboarding state.** The legal check should NOT be entangled with `isComplete`, `hasCompletedOnboarding`, or `onboardingSkipped`. It's a separate concern.

3. **Consolidate the three conflicting onboarding flags** (`onboardingStore.isComplete`, `profile.hasCompletedOnboarding`, `profile.onboardingSkipped`) into a single canonical flag. Recommend keeping `onboardingStore.isComplete` as the single source of truth and removing/deprecating the other two. If `profile.hasCompletedOnboarding` or `profile.onboardingSkipped` exist in the DB schema already, migrate them: on app launch, if either legacy flag is `true`, set `onboardingStore.isComplete = true` and clear the legacy flags.

4. **Routing priority order in AppInitializer** should be exactly:
   ```
   1. Legal not acknowledged? → /legal-acknowledgment
   2. Onboarding not complete? → /onboarding
   3. Otherwise → Dashboard (tabs)
   ```

### Implementation Notes

- Search the codebase for all references to `hasCompletedOnboarding`, `onboardingSkipped`, and `isComplete` to find every place these flags are read or written.
- Ensure the legal version constant is defined in one place (e.g., `src/constants/legal.ts`) and referenced everywhere.
- The legal screen already exists and works well — don't change its UI, just ensure the routing gate is airtight.

---

## Task 2: Fix Legal Screen Checkbox Race Condition (CRITICAL)

### Current Bug

If a user taps the checkbox before scrolling to the bottom, the screen auto-scrolls via `scrollToEnd()` but `hasScrolledToBottom` isn't set yet because the `onScroll` event fires asynchronously. The checkbox doesn't toggle, requiring a second tap.

### Fix

In the `scrollToEnd()` callback (or immediately after calling it), explicitly set `hasScrolledToBottom = true` rather than relying solely on the `onScroll`/`onMomentumScrollEnd` event to detect that the user reached the bottom. This way, when the programmatic scroll completes, the state is already set and the checkbox tap works on the first try.

```typescript
// Pseudocode for the fix:
const handleCheckboxPress = () => {
  if (!hasScrolledToBottom) {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setHasScrolledToBottom(true); // Set immediately, don't wait for onScroll
    return; // Don't toggle yet — let the scroll finish, user taps again OR...
  }
  // ...alternatively, set it AND toggle in one action so single tap works:
  setAcknowledged(!acknowledged);
};
```

Choose whichever approach feels more natural — the key requirement is that a single tap after the auto-scroll should work without needing a second tap.

---

## Task 3: Add Error Handling to Onboarding Completion (CRITICAL)

### Current Bug

`onboarding/ready.tsx` calls `completeOnboarding()` then immediately `router.replace()` with no try/catch. A DB write failure leaves the user in a broken state.

### Fix

1. Wrap `completeOnboarding()` in try/catch.
2. On failure, show a toast or inline error message (use the app's existing toast/notification pattern if one exists, otherwise a simple inline message): "Something went wrong saving your preferences. Please try again."
3. Do NOT navigate on failure — keep the user on the Ready screen so they can retry.
4. Add a loading state (see Task 5) so the button is disabled during the async operation.

```typescript
const handleComplete = async (destination: string) => {
  setIsLoading(true);
  try {
    await completeOnboarding();
    router.replace(destination);
  } catch (error) {
    // Show error to user — do NOT navigate
    setError("Something went wrong saving your preferences. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

---

## Task 4: Wire Up FirstFoodCelebration (HIGH IMPACT)

### Current State

`src/components/onboarding/FirstFoodCelebration.tsx` exists with confetti animation and a celebration modal. The onboarding store has `markFirstFoodLogged()` logic. But nothing wires them together.

### Requirements

1. **Find where food logging completes** — the success callback/handler after a food item is saved to the DB (could be in a food log store, a save handler in a food detail screen, etc.).

2. **After the first successful food log**, call `markFirstFoodLogged()` from the onboarding store.

3. **Render `<FirstFoodCelebration />` in the dashboard layout** (or wherever makes sense — it should overlay the current screen). It should check the onboarding store's state to know when to show itself. If the component already has this logic built in, just import and render it. If not, add:

   ```typescript
   // In dashboard or main layout:
   {onboardingStore.shouldShowFirstFoodCelebration && (
     <FirstFoodCelebration onDismiss={() => onboardingStore.dismissFirstFoodCelebration()} />
   )}
   ```

4. **Verify the component renders correctly** — check that it uses the app's color palette (sage green, soft cream) and that the celebration copy is warm and encouraging per "Nourished Calm" guidelines. No words like "Great job!" that feel patronizing — prefer something like "Your first meal — you're on your way 🌱" (the component may already have appropriate copy).

### Implementation Notes

- Read the existing `FirstFoodCelebration.tsx` and onboarding store code first to understand what's already built before adding anything.
- The celebration should only fire once, ever. Make sure the flag persists across app restarts (should be in SQLite, not just Zustand memory).

---

## Task 5: Add Loading State to Ready Screen Buttons (MEDIUM)

### Current Bug

No spinner or disabled state on the Ready screen's three exit buttons (Scan barcode, Search food, Explore app). Users could double-tap during the DB write.

### Fix

1. Add a `isLoading` boolean state.
2. When any button is pressed, set `isLoading = true` and disable all three buttons.
3. Show a subtle loading indicator (could be the button text changing to "Setting up..." with reduced opacity, or a small spinner — keep it lightweight).
4. Buttons re-enable on error (see Task 3).

---

## Task 6: Enable Progressive Tooltips (MEDIUM)

### Current State

`useProgressiveTooltips` has 6 tooltips ready (water tracking, meal collapse, quick add, weekly summary, barcode scanner, serving size) but the dashboard calls it with `autoCheck: false`.

### Fix

1. Change to `autoCheck: true` in the dashboard's call to `useProgressiveTooltips`.
2. Verify the tooltips show in a sensible order for a new user. The ideal sequence for first session would be:
   - Quick add (most important first action)
   - Barcode scanner
   - Water tracking
   - The rest can follow in subsequent sessions
3. Make sure tooltips don't fire during onboarding or on the legal screen — only after the user has reached the dashboard.
4. Test that dismissing a tooltip persists (doesn't re-show on next app launch).

---

## Task 7: Remove Welcome Screen from Onboarding (LOW — OPTIONAL)

The user just came through the legal acknowledgment screen. A separate "Welcome" screen that just says "Let's Begin" adds a tap with no value.

### If implementing:

1. Remove the Welcome step from the onboarding flow.
2. Make the legal acknowledgment screen warmer — after the legal text and checkbox, add a brief welcome message below the "I Agree" button area: something like "Welcome to NutritionRx — let's set up your preferences" so the user feels welcomed before they proceed.
3. After legal acknowledgment, route directly to the Goal selection screen.
4. Update any step indicators/progress bars in the onboarding flow to reflect one fewer step.

### If skipping: That's fine — it's a nice-to-have, not critical.

---

## Testing Requirements

After implementing all changes, verify:

1. **Fresh install flow:** Legal → Onboarding (Goal → Preferences → Ready) → Dashboard. No crashes, no double-prompts.
2. **Kill app mid-onboarding:** Relaunch should return to legal if not acknowledged, or onboarding if legal is done but onboarding isn't.
3. **Legal version bump:** Change the version constant. Existing users should be re-prompted for legal on next launch, but should NOT have to redo onboarding.
4. **First food celebration:** Log a food item for the first time → celebration fires. Log a second item → no celebration. Kill and relaunch → still no celebration.
5. **Ready screen error:** Temporarily break the DB write in `completeOnboarding()` → verify error message shows and user stays on Ready screen.
6. **Legal checkbox:** Open legal screen → tap checkbox before scrolling → verify it works in a single interaction (scroll + toggle, or scroll then immediate re-tap works).
7. **Progressive tooltips:** Fresh user reaches dashboard → tooltips begin showing without manual trigger.
8. **Double-tap prevention:** Rapidly tap a Ready screen button → only one navigation occurs.

---

## Files Likely Involved

Search the codebase to confirm exact paths, but expect to touch:

- `src/app/_layout.tsx` — root routing logic
- `src/app/index.tsx` — AppInitializer
- `src/app/legal-acknowledgment.tsx` — checkbox fix
- `src/app/onboarding/ready.tsx` — error handling + loading state
- `src/app/onboarding/welcome.tsx` — removal (optional)
- `src/stores/onboarding-store.ts` — flag consolidation
- `src/components/onboarding/FirstFoodCelebration.tsx` — wiring
- `src/hooks/useProgressiveTooltips.ts` — autoCheck flag
- Dashboard screen(s) — FirstFoodCelebration render + tooltip hookup
- Food logging handler(s) — markFirstFoodLogged() call

## Priority Order

Do these in order — each subsequent task assumes the previous ones are done:

1. Task 1 (legal gate hardening + flag consolidation)
2. Task 2 (checkbox race condition)
3. Task 3 (error handling on completion)
4. Task 5 (loading state — pairs with Task 3)
5. Task 4 (FirstFoodCelebration wiring)
6. Task 6 (progressive tooltips)
7. Task 7 (welcome screen removal — optional)
