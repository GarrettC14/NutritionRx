# Cluster E: Micronutrient Tiering — Implementation Package

**Version:** 4.0 — Final Implementation (Triple-Audited, Code-Complete)
**Schema:** CURRENT_SCHEMA_VERSION = 21 — NO migration required
**Status:** All code patches validated against live codebase. Hand directly to Claude Code.

---

## Change Summary

Restructure the micronutrient free/premium split from 23-free/2-premium to 10-free/15-premium. Display-layer and store changes only. No database migration. No calculation logic changes.

**Files to modify:** 4
**Files to create:** 1
**Tests to update:** 1

---

## Acceptance Criteria

- [ ] 13 nutrients flipped to `isPremium: true` in `nutrients.ts`
- [ ] `getVisibleNutrients` overwritten with tracked-scoped version; all call sites updated
- [ ] 3 new store functions added: `getTrackedNutrientsByCategory`, `getPremiumTrackedNutrients`, `getFreeTrackedNutrients`
- [ ] `PremiumMicronutrientPreview.tsx` created with blur, 4 preview rows, CTA to paywall
- [ ] `micronutrients.tsx` fully refactored: free = "Daily Essentials" + preview; premium = Vitamins/Minerals/Other
- [ ] `useFilteredNutrients` removed from `micronutrients.tsx`
- [ ] `MicronutrientSnapshotWidget` scoped to visible tier
- [ ] StatusOverviewCard counts scoped to visible nutrients (not all 25 for free users)
- [ ] All 25 nutrients still calculate in store for all users (display-only gate)
- [ ] Colors use `premiumGold` / `premiumGoldMuted` — no "sage green" for premium elements
- [ ] Paywall navigates with `context=micronutrients` → `ADVANCED_NUTRITION`
- [ ] Tests updated and passing
- [ ] No schema migration (CURRENT_SCHEMA_VERSION remains 21)
