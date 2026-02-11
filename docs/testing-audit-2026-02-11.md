# NutritionRx Deep Test Audit (2026-02-11)

## Scope
Audit covered:
- Static checks: `npm run typecheck`, `npm run lint`
- Automated tests: `npm test -- --runInBand --watchman=false`
- Test inventory: unit, integration, UI, Maestro e2e flows
- Existing coverage artifacts under `coverage/`

## Current State Snapshot
- Unit/UI/integration test files: 101 non-integration + 6 integration in `src`
- Maestro flows: 35 + 1 smoke flow
- `e2e/` folder: empty (0 files)
- Jest run result: **23 failed suites, 84 passed**, **111 failed tests, 3004 passed**
- Lint result: **128 errors, 637 warnings**
- Typecheck result: large failure set (types/tests drift + app compile issues)
- Existing `coverage/lcov.info` (generated Jan 31) totals: **36.11% line**, **31.30% branch**

## Priority Findings (Bugs + Test Risks)

### P0 (release-blocking)
1. Environment global mismatch breaks multiple suites.
- `__DEV__` is used directly in `src/stores/subscriptionStore.ts:42`, `src/stores/subscriptionStore.ts:72`, `src/stores/subscriptionStore.ts:100`.
- In Jest/node environment this is undefined, causing `ReferenceError` and failing premium-related suites.

2. Watch sync service uses non-existent domain fields.
- `src/services/wearOS/wearSyncService.ts:227`, `src/services/wearOS/wearSyncService.ts:235`, `src/services/wearOS/wearSyncService.ts:239`, `src/services/wearOS/wearSyncService.ts:245`, `src/services/wearOS/wearSyncService.ts:367`, `src/services/wearOS/wearSyncService.ts:377` reference `LogEntry.foodId`, `LogEntry.name`, `LogEntry.servingSize`.
- Actual domain type uses `foodItemId`, `foodName`, `servings` (`src/types/domain.ts:55-70`).
- This is a real runtime defect risk for Wear sync features.

3. Date handling is timezone-unsafe across the app.
- 86 app-side occurrences of `toISOString().split('T')[0]` in production code.
- This can shift day boundaries in non-UTC timezones and explains date-sensitive failures (for example weekly Monday assumption in `src/stores/mealPlanStore.ts:54-60`, plus failing meal-plan date tests).

### P1 (high risk / stability)
4. Repository tests are stale relative to implementation.
- `settingsRepository` now uses batch `getAllAsync`, but tests still mock/expect per-key `getFirstAsync` behavior (`src/__tests__/repositories/settingsRepository.test.ts:192-360`).
- Causes false negatives and low trust in repository regression signals.

5. Weight repository tests do not mock new trend recomputation path.
- `weightRepository.create/update/delete*` now call `recomputeTrendWeights`, which depends on `getAllAsync` rows.
- Tests in `src/__tests__/repositories/weightRepository.test.ts` often omit `mockGetAllAsync`, causing `rows.map` on undefined (`src/repositories/weightRepository.ts:126`).

6. Jest cannot parse Expo vector icons in one suite.
- `src/components/voice/__tests__/VoiceToast.test.tsx` fails on ESM import from `@expo/vector-icons`.
- Current config does not include explicit mapping/mock for these icons.

7. Type model drift between domain and tests is widespread.
- Many tests still use old shapes or literals (e.g., meal type strings instead of enum values, missing newly required fields like `updatedAt`/`usdaNutrientCount`).
- Effect: noisy failures hide true regressions.

### P2 (quality gaps)
8. E2E strategy is almost entirely UI-presence assertions.
- Example: `maestro/smoke/critical-path.yaml` verifies screen visibility only; no persisted data assertions.
- `maestro/flows/food-logging/search-and-log.yaml` logs food but does not assert calorie total changed.

9. No Playwright/Detox-style app e2e under `e2e/`.
- All e2e is Maestro; that is fine if intentional, but currently there is no deeper programmatic end-to-end contract layer.

10. No enforced coverage thresholds in Jest config.
- `jest.config.js` has `collectCoverageFrom` but no `coverageThreshold`; coverage can silently regress.

## Draft Change Set (Ready for IDE Agent)

### Phase 1: Make CI/Local tests deterministic
1. Add Jest runtime globals and icon mocks.
- Update `jest.setup.js` to define `global.__DEV__ = false`.
- Add module mock for `@expo/vector-icons` (simple component shim).
- Optional: add `globals.d.ts` test typing for `__DEV__`.

2. Fix immediate runtime typing defects.
- Refactor `src/services/wearOS/wearSyncService.ts` to use `foodItemId`, `foodName`, `servings`.
- Add/adjust tests in `src/__tests__/services/wearOS/wearSyncService.test.ts` and watch integration tests.

3. Patch known compile blockers.
- `src/services/nutritionImport/nutritionImportService.ts:65`: replace `FileSystem.EncodingType.UTF8` with API-compatible option for current Expo FileSystem types.
- `src/services/healthkit/healthKitService.ts:62`: ensure package typings resolve (`@kingstinct/react-native-healthkit`) or add an ambient type declaration module.

### Phase 2: Fix test-suite drift (high value)
4. Rewrite repository tests to current DB contract.
- `src/__tests__/repositories/settingsRepository.test.ts`
  - Replace `getFirstAsync`-based expectations for `getAll/getDailyGoals` with `getAllAsync` row-map assertions.
  - Use explicit fixtures with keys/values.
- `src/__tests__/repositories/weightRepository.test.ts`
  - For create/update/delete flows, always mock `mockGetAllAsync.mockResolvedValue([...])` for trend recompute queries.

5. Introduce typed test builders to reduce model drift.
- Add builders in `src/test-utils/builders/` for `FoodItem`, `LogEntry`, `NutritionImportSession`, `USDASearchResult`.
- Replace hand-rolled object literals in failing tests.

6. Split typecheck scope in CI.
- Add scripts:
  - `typecheck:app` (exclude `src/__tests__`)
  - `typecheck:tests` (include tests)
- Gate CI on both once stabilized; during migration, make `typecheck:tests` non-blocking with TODO milestone.

### Phase 3: Date correctness hardening
7. Create a central local-date utility and migrate call sites.
- Add `src/utils/dateKey.ts` with:
  - `toLocalDateKey(date: Date): string` (local yyyy-mm-dd)
  - `todayLocalDateKey()`
  - `addDaysLocal(dateKey, days)`
- Replace `toISOString().split('T')[0]` usages incrementally (start with stores/repositories where logic is date-critical: `foodLogStore`, `mealPlanStore`, `waterStore`, `weightStore`, `goalStore`, `logEntryRepository`).
- Add unit tests for timezone boundary cases around local midnight.

### Phase 4: Improve e2e and coverage quality
8. Strengthen Maestro assertions from visibility to behavior.
- `maestro/flows/food-logging/search-and-log.yaml`:
  - After logging, assert meal section or calorie badge changed.
- `maestro/smoke/critical-path.yaml`:
  - Add one stateful assertion (e.g., onboarding persisted, home widgets loaded data not just shell).

9. Add two high-value regression e2e flows.
- `maestro/flows/regression/date-rollover.yaml` (verify same-day logging around local date transitions).
- `maestro/flows/regression/premium-gate.yaml` (locked feature + purchase bypass in mocked premium mode).

10. Enforce minimum coverage thresholds once tests are green.
- In `jest.config.js`, add conservative start point:
  - lines: 35, branches: 30, functions: 35, statements: 35.
- Raise thresholds as migration completes.

## Suggested Implementation Order for IDE Agent
1. Green the runtime env + parser config (`__DEV__`, vector icon mock, Watchman-safe scripts).
2. Fix real app defects (`wearSyncService` field mismatch, date utility migration seed).
3. Update stale repository and store tests with typed builders.
4. Add date-boundary tests and 2 new Maestro regression flows.
5. Add coverage thresholds and CI split scripts.

## Copy/Paste Task Prompts for IDE Agent

### Prompt A: Stabilize Jest Environment
"Update test infrastructure so Jest runs cleanly in Node: define `__DEV__` in Jest setup, add a mock for `@expo/vector-icons`, and ensure `npm test -- --runInBand --watchman=false` no longer fails on environment/bootstrap issues. Include updated tests where needed."

### Prompt B: Fix Wear Sync Contract Bug
"Refactor `src/services/wearOS/wearSyncService.ts` to align with `LogEntry` domain fields (`foodItemId`, `foodName`, `servings`). Update any dependent tests (`wearSyncService` and watch integration tests) and verify no TS errors remain for this module."

### Prompt C: Migrate Date Logic
"Create `src/utils/dateKey.ts` for local date-key generation and day arithmetic, then replace UTC-ISO date key generation in `foodLogStore`, `mealPlanStore`, `weightStore`, `waterStore`, and `logEntryRepository`. Add boundary tests for local midnight and timezone-sensitive week start calculations."

### Prompt D: Repair Repository Test Drift
"Rewrite settings and weight repository tests to match current repository implementation: use `getAllAsync` where applicable, mock trend recomputation queries in weight tests, and remove assumptions about per-setting `getFirstAsync` calls."

### Prompt E: Strengthen E2E Assertions
"Enhance Maestro smoke and food-logging flows to assert behavioral outcomes (data changed/persisted), not just screen visibility; add two regression flows for date rollover and premium gating."

## Residual Risks If Not Addressed
- Date drift bugs will continue to cause user-visible wrong-day logs and flaky tests.
- Watch sync may break silently for logged foods.
- High test noise will mask real regressions and slow delivery.
- Current e2e may pass while critical business logic is broken.
