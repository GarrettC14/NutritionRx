# Feature 1: Onboarding Progress Bar — Implementation Spec

## Git Workflow

**Branch:** `feature/onboarding-progress-bar`
**Merge Order:** 2nd (after Feature 5: Recent Foods)

## Files to Create
- `src/utils/onboarding.ts` — shared `getScreenOrder()`, `ALL_ONBOARDING_SCREENS`, types
- `src/hooks/useOnboardingStep.ts` — shared hook for route → step resolution
- `src/components/onboarding/OnboardingProgressBar.tsx` — layout-level progress bar

## Files to Modify
- `src/app/onboarding/_layout.tsx` — wrap Stack, add SafeAreaView (top), render progress bar
- `src/components/onboarding/OnboardingScreen.tsx` — remove old bar, remove step/totalSteps props, edges=['bottom'], consume useOnboardingStep()
- `src/app/onboarding/index.tsx` — import shared getScreenOrder
- `src/app/onboarding/goal.tsx` — import shared util, remove step/totalSteps props
- `src/app/onboarding/about-you.tsx` — same
- `src/app/onboarding/body-stats.tsx` — same
- `src/app/onboarding/activity.tsx` — same
- `src/app/onboarding/eating-style.tsx` — same
- `src/app/onboarding/protein.tsx` — same
- `src/app/onboarding/target.tsx` — same (also remove hardcoded totalSteps={8})
- `src/app/onboarding/your-plan.tsx` — same

## Key Implementation Notes

### P1: Single source of truth
- `useOnboardingStep()` is the ONLY place route-to-step resolution logic exists
- Both OnboardingProgressBar and OnboardingScreen consume this hook
- Zero tolerance for duplicated route parsing (useSegments/usePathname only in the hook)

### P1: Defensive unknown route handling
- When currentStep === 0, hide step text entirely (no "Step 0 of 0")
- OnboardingProgressBar returns null when currentScreen is unknown

### P2: Goal-screen 8-step fallback
- Default to 'lose' (8 steps) when draft.goalPath is null on goal.tsx
- Intentional UX: underpromise → overdeliver, ~0.6px difference imperceptible
- Must have inline comment explaining this

### P2: Track color
- Track: colors.bgSecondary (NOT ringTrack)
- Fill: colors.accent (NOT ringFill)

### P3: Clean unused imports
- After removing old bar from OnboardingScreen, check if useAnimatedStyle/withTiming/Animated still needed
- Run tsc --noEmit after all changes

### Design Tokens
- Bar height: 3px, border-radius: 1.5px
- Animation: withTiming 350ms, Easing.bezier(0.25, 0.1, 0.25, 1.0)
- Horizontal padding: componentSpacing.screenEdgePadding (16px)
- ReduceMotion.System for accessibility
