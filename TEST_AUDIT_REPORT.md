# NutritionRx Test Suite Audit Report

## 0. Audit Corrections

> This section was added by a manual audit against the live codebase (2026-02-15).
> All source file paths, test paths, and gap claims were verified.

### Corrections Applied (5 entries fixed)
| # | Location | Issue | Resolution |
|---|----------|-------|------------|
| C1 | Summary line 4 | Counts inaccurate: stores 29→27, hooks 20→19, services 63→~45, "15 hooks"→16 hooks | Summary text updated |
| C2 | §3.2 CrashFallbackScreen | Path `src/components/crash/CrashFallbackScreen.tsx` does not exist | Corrected to `src/components/CrashFallbackScreen.tsx` |
| C3 | §3.2 VoiceToast | Listed as `MISSING` but test exists at `src/components/voice/__tests__/VoiceToast.test.tsx` | Entry updated to reflect existing test |
| C4 | §3.2 ErrorBoundary (duplicate) | Listed twice (original + duplicate at end of §3.2) | Duplicate entry removed |
| C5 | §2.6 Progress photo pipeline | "Current test: MISSING" but `src/__tests__/stores/progressPhotoStore.test.ts` exists | Entry updated; gap narrowed to integration-level only |

### Entries Removed (1)
- §3.2 ErrorBoundary duplicate at end of section (redundant with earlier entry)

### Entries Added [ADDED BY AUDIT] (16 new gaps discovered)
| # | Section | File / Area | Priority |
|---|---------|-------------|----------|
| A1 | §1.4 | `src/utils/generateId.ts` — only utility WITH a test; omitted from inventory | (info only) |
| A2 | §3.2 | `src/components/premium/PremiumBadge.tsx` — NO TEST | Medium |
| A3 | §3.2 | `src/components/premium/PremiumSettingsRow.tsx` — NO TEST | Medium |
| A4 | §3.2 | `src/components/reflection/ReflectionBanner.tsx` — NO TEST | Medium |
| A5–A13 | §1 (new §1.5) | 9 repositories without unit tests: `fastingRepository`, `favoriteRepository`, `healthSyncRepository`, `macroCycleRepository`, `mealPlanRepository`, `micronutrientRepository`, `quickAddRepository`, `recipeRepository`, `reflectionRepository` | High |
| A14 | §5 | `src/features/` directory (111 files) entirely omitted from audit — contains untested stores, hooks, services, and components across insights/, weekly-insights/, legal/, micronutrients/ | High |
| A15 | §3.2 | `src/components/healthkit/HealthKitPermissionScreen.tsx` — partial coverage via `HealthKitComponents.test.ts` but no direct render test | Medium |
| A16 | §1.3 | Type-only files (1.3.19, 1.3.23, 1.3.30) and barrel exports (1.4.19) flagged as low-value test targets | (info only) |

### Net Delta
- **Corrected:** 5 entries
- **Removed:** 1 duplicate
- **Added:** 16 new gaps / observations

---

## Summary
- Total source files discovered in audited layers: `src/stores` 27 (excl. index), `src/hooks` 19, `src/services` ~45, `src/utils` 33, `src/components` 108, `src/app` screens 75, `src/repositories` 18 (excl. index), `src/features` 111.
- Total Jest test files discovered: 110.
- Total Maestro flows discovered: 41 (`maestro/flows/**` + utilities).
- Estimated critical gaps: no unit tests for 4 stores, 16 hooks, 31 services, 31 utilities, 9 repositories; zero component-level unit coverage for all `src/app/**` screens due Jest config exclusion; 99+ component files under `src/components` have no render test coverage; `src/features/` directory not audited.
- Estimated highest priority areas: health sync/food-import/premium-gating cross-layer coverage, migration safety, error/retry behavior, and offline accessibility.

## 1. Unit Test Gaps

### 1.1 Stores
- **1.1.1**
  - **File:** `src/stores/recipeStore.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit coverage for recipe CRUD, favorites, plan associations, or serialization boundaries.
  - **Suggested fix:** Add `src/stores/__tests__/recipeStore.test.ts` with add/update/delete flows, hydration/default reset, empty-state initialization, duplicate suppression, and error recovery on failed mutations.
  - **Priority:** High

- **1.1.2**
  - **File:** `src/stores/reflectionStore.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing coverage for reflection capture lifecycle, weekly aggregation, and stale-entry pruning.
  - **Suggested fix:** Add unit tests for init defaults, submit/update/delete reflection actions, date filtering boundaries, and null/undefined payload handling.
  - **Priority:** High

- **1.1.3**
  - **File:** `src/stores/routeStore.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for route history state transitions, reset behavior, or invalid route guards.
  - **Suggested fix:** Add test suite for stack mutations, guarded updates, back-navigation fallback, and unknown-route input handling.
  - **Priority:** Medium

- **1.1.4**
  - **File:** `src/stores/useReferralStore.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for referral code lifecycle, opt-in toggles, or idempotent application.
  - **Suggested fix:** Add tests for setting/clearing referral state, duplicate submission protection, server-receipt parsing edge cases, and reset on sign-out.
  - **Priority:** Medium

### 1.2 Hooks
- **1.2.1**
  - **File:** `src/hooks/useAdjustedDailyNutrition.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing calculation and boundary logic for macro rounding, missing-nutrient defaults, and zero-macro days.
  - **Suggested fix:** Add `src/hooks/__tests__/useAdjustedDailyNutrition.test.ts` validating computed outputs and fallback paths for null totals.
  - **Priority:** High

- **1.2.2**
  - **File:** `src/hooks/useDailyNutrition.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for memoization boundaries and stale data recomputation.
  - **Suggested fix:** Add tests for subscription updates, missing logs, and date-window transitions.
  - **Priority:** High

- **1.2.3**
  - **File:** `src/hooks/useDatabase.ts`
  - **Current test:** `MISSING`
  - **Gap:** No health checks for open/close lifecycle, migration failures, or undefined DB handle paths.
  - **Suggested fix:** Unit-test database hook initialization, dependency cleanup, and graceful error states for unavailable DB.
  - **Priority:** High

- **1.2.4**
  - **File:** `src/hooks/useHealthSync.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing orchestration assertions for state transitions, manual retry triggers, and permission-denied handling.
  - **Suggested fix:** Add tests around start/stop states, sync interval setup, and guard clauses when permissions/services unavailable.
  - **Priority:** High

- **1.2.5**
  - **File:** `src/hooks/useLLMStatus.ts`
  - **Current test:** `MISSING`
  - **Gap:** No status derivation tests for unavailable model/provider, in-progress/incomplete states, and error transitions.
  - **Suggested fix:** Add tests for status map, fallback states, and transient error recovery.
  - **Priority:** Medium

- **1.2.6**
  - **File:** `src/hooks/useMealTypes.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing validation for unknown/duplicated meal keys and sorting/ordering expectations.
  - **Suggested fix:** Add tests for default meal ordering, custom list merge, and deterministic returns with missing config.
  - **Priority:** Medium

- **1.2.7**
  - **File:** `src/hooks/useNetworkGuard.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for offline gating and user-facing fallback path timing.
  - **Suggested fix:** Add tests for guarded action wrapper with offline, reconnect, and throttled retry behavior.
  - **Priority:** High

- **1.2.8**
  - **File:** `src/hooks/useNetworkStatus.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing coverage for status transitions, unstable connectivity flaps, and listener teardown.
  - **Suggested fix:** Add tests for initial state defaults, `online`/`offline` transitions, and cleanup behavior.
  - **Priority:** High

- **1.2.9**
  - **File:** `src/hooks/useOnboardingStep.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing progression constraints, branch skipping, and corrupted step state recovery.
  - **Suggested fix:** Add tests for step index bounds, reset behavior, and out-of-range persisted state.
  - **Priority:** High

- **1.2.10**
  - **File:** `src/hooks/useResolvedTargets.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for resolved-target derivation with partial profile data and null macros.
  - **Suggested fix:** Add tests for all fallback branches, division-by-zero prevention, and stale user preference precedence.
  - **Priority:** High

- **1.2.11**
  - **File:** `src/hooks/useRouter.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing behavior for query param sanitization, route memoization, and unsupported route errors.
  - **Suggested fix:** Add tests for canonical route output, safe decoding of params, and fallback route behavior.
  - **Priority:** Medium

- **1.2.12**
  - **File:** `src/hooks/useShortcuts.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for deep-link/shortcut parsing and disabled-shortcut branches.
  - **Suggested fix:** Add tests for valid/invalid shortcut payloads and graceful handling of absent navigator references.
  - **Priority:** Medium

- **1.2.13**
  - **File:** `src/hooks/useStatusColor.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for boundary color mapping and unknown status defaults.
  - **Suggested fix:** Add deterministic tests over all status enum branches and invalid/null fallback paths.
  - **Priority:** Low

- **1.2.14**
  - **File:** `src/hooks/useTheme.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing runtime theme resolution branch tests when theme store unavailable.
  - **Suggested fix:** Add tests for light/dark/system mode resolution and fallback to defaults.
  - **Priority:** Medium

- **1.2.15**
  - **File:** `src/hooks/useTooltip.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for tooltip cooldown logic and dismissed flags persistence.
  - **Suggested fix:** Add tests for show/hide transitions, repeated mounts, and dismissed state restoration.
  - **Priority:** Medium

- **1.2.16**
  - **File:** `src/hooks/useVoiceDeepLinks.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for URL decode, malformed intent handling, and action routing.
  - **Suggested fix:** Add parsing tests for known intents, malformed links, and null-safe no-op behavior.
  - **Priority:** Medium

### 1.3 Services
- **1.3.1**
  - **File:** `src/services/aiPhoto/openAIVisionService.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for request formatting, image preprocessing paths, and timeout/failure handling.
  - **Suggested fix:** Add tests with mocked provider responses for success, partial failure, empty response, and rate-limited error paths.
  - **Priority:** High

- **1.3.2**
  - **File:** `src/services/context/dataAvailability.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing assertions for each availability heuristic and empty-context fallback.
  - **Suggested fix:** Add direct tests covering complete/partial/missing context states.
  - **Priority:** Medium

- **1.3.3**
  - **File:** `src/services/context/derivedNutritionInsights.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for derivation formulas and boundary nutrition ranges.
  - **Suggested fix:** Add tests for low/high calorie days, null macro values, and stable deterministic outputs.
  - **Priority:** Medium

- **1.3.4**
  - **File:** `src/services/context/nutritionContextBuilder.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing payload shape validation and profile override precedence.
  - **Suggested fix:** Test canonical context assembly from complete, partial, and invalid profile inputs.
  - **Priority:** Medium

- **1.3.5**
  - **File:** `src/services/context/nutritionContextFormatter.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for tokenized formatting and locale/unit-sensitive output.
  - **Suggested fix:** Add test matrix for formatting variants, long strings, and null inputs.
  - **Priority:** Medium

- **1.3.6**
  - **File:** `src/services/context/nutritionContextQueries.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing query-template guard tests and malformed prompt data handling.
  - **Suggested fix:** Add tests for query composition, escaping, and missing data handling.
  - **Priority:** Medium

- **1.3.7**
  - **File:** `src/services/context/nutritionSystemPrompt.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit coverage for prompt assembly and conditional policy injection.
  - **Suggested fix:** Add snapshot + branch tests for every option toggle and unsupported profile combinations.
  - **Priority:** Medium

- **1.3.8**
  - **File:** `src/services/healthSyncOrchestrator.ts`
  - **Current test:** `MISSING`
  - **Gap:** No orchestration tests for adapter selection, failure cascades, and abort/retry behavior.
  - **Suggested fix:** Add unit tests around successful orchestration, partial failures, and cancellation cleanup.
  - **Priority:** High

- **1.3.9**
  - **File:** `src/services/healthSyncService.ts`
  - **Current test:** `MISSING`
  - **Gap:** No direct tests for sync start/stop guards, permission branching, and persisted cursor progression.
  - **Suggested fix:** Test command-level sync logic with mocked adapters, no-permission paths, and corrupted cursor handling.
  - **Priority:** High

- **1.3.10**
  - **File:** `src/services/healthSyncWriteCoordinator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing batching and conflict-resolution tests.
  - **Suggested fix:** Add tests for write queueing, deduplication, and rollback after write failure.
  - **Priority:** High

- **1.3.11**
  - **File:** `src/services/healthconnect/healthSyncAdapter.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing adapter contract tests for unsupported payloads and field mapping.
  - **Suggested fix:** Add adapter-level tests with canonical and malformed Health Connect payload samples.
  - **Priority:** High

- **1.3.12**
  - **File:** `src/services/healthkit/healthSyncAdapter.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing mapping tests for HealthKit units, timezones, and duplicate events.
  - **Suggested fix:** Add fixture-based tests covering unit conversion and deduplication logic.
  - **Priority:** High

- **1.3.13**
  - **File:** `src/services/llm/deviceClassifier.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for unknown device classes and versioned heuristics.
  - **Suggested fix:** Add tests for every classifier branch and fallback classification behavior.
  - **Priority:** Medium

- **1.3.14**
  - **File:** `src/services/llm/modelCatalog.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing validation for supported model metadata and filtered results.
  - **Suggested fix:** Add tests for catalog lookup, unknown model fallback, and capability flags.
  - **Priority:** Medium

- **1.3.15**
  - **File:** `src/services/llm/providerManager.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing fallback provider selection and failover ordering tests.
  - **Suggested fix:** Add tests for provider switch logic, provider errors, and health-check gating.
  - **Priority:** Medium

- **1.3.16**
  - **File:** `src/services/llm/providers/appleFoundationProvider.ts`
  - **Current test:** `MISSING`
  - **Gap:** No API contract tests for auth headers, request shape, and model unavailable errors.
  - **Suggested fix:** Add mocked HTTP response tests for success and each provider error class.
  - **Priority:** Medium

- **1.3.17**
  - **File:** `src/services/llm/providers/llamaProvider.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing model loading, unload/reload, and provider-specific response parsing.
  - **Suggested fix:** Add provider-level tests for init config, streaming/non-streaming responses, and parser exceptions.
  - **Priority:** Medium

- **1.3.18**
  - **File:** `src/services/llm/providers/unsupportedProvider.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing explicit unsupported-provider error behavior checks.
  - **Suggested fix:** Assert thrown error messages and caller-safe fallback behavior.
  - **Priority:** Low

- **1.3.19**
  - **File:** `src/services/llm/types.ts`
  - **Current test:** `MISSING`
  - **Gap:** No compile-time guard tests for strict typing paths and narrowing helpers.
  - **Suggested fix:** Add runtime validation tests for schema parse helpers if present; otherwise document as type-only and flag for snapshoting only.
  - **Priority:** Low

- **1.3.20**
  - **File:** `src/services/nutritionImport/nutritionImportService.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing end-to-end import pipeline tests before data persistence.
  - **Suggested fix:** Add tests validating source parser selection, conflict resolution, rollback on parser errors, and no-ops on empty imports.
  - **Priority:** High

- **1.3.21**
  - **File:** `src/services/nutritionImport/parsers/macrofactor.ts`
  - **Current test:** `MISSING`
  - **Gap:** Uncovered parser edge cases (bad CSV/JSON, missing nutrients, locale delimiters).
  - **Suggested fix:** Add parser fixture tests for malformed exports and optional field coercion.
  - **Priority:** Medium

- **1.3.22**
  - **File:** `src/services/nutritionImport/parsers/nutritionrx.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing schema compatibility tests for custom NutritionRx exports and backward compatibility.
  - **Suggested fix:** Add tests for valid/legacy payloads, missing required keys, and duplicate food entries.
  - **Priority:** Medium

- **1.3.23**
  - **File:** `src/services/nutritionImport/parsers/types.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit-level guards for parser union narrowing and invalid type discrimination.
  - **Suggested fix:** Add exhaustive switch/guard tests across parser type variants and unknown type rejection.
  - **Priority:** Low

- **1.3.24**
  - **File:** `src/services/referralService.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing backend contract tests for referral code validation and server errors.
  - **Suggested fix:** Mock network responses for valid/invalid/expired referral codes and idempotent submission.
  - **Priority:** Medium

- **1.3.25**
  - **File:** `src/services/restaurants/restaurantData.ts`\n  - **Current test:** `MISSING`
  - **Gap:** No tests for normalization and dedupe logic for restaurant payloads.
  - **Suggested fix:** Add unit tests for parse, merge, and stale cache handling.
  - **Priority:** Medium

- **1.3.26**
  - **File:** `src/services/restaurants/restaurantDataService.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing retry/backoff and offline fallback coverage for restaurant fetches.
  - **Suggested fix:** Add tests for network timeout, caching, and fallback responses.
  - **Priority:** Medium

- **1.3.27**
  - **File:** `src/services/seedDataService.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing seed import contract and duplicate record prevention tests.
  - **Suggested fix:** Add tests for seed path selection, no-op when already seeded, and schema mismatch handling.
  - **Priority:** Medium

- **1.3.28**
  - **File:** `src/services/usda/USDAFoodService.ts`
  - **Current test:** `MISSING`
  - **Gap:** No API/JSON normalization tests, cache invalidation, and rate-limit behavior.
  - **Suggested fix:** Add HTTP mock tests for missing USDA fields and endpoint failures.
  - **Priority:** High

- **1.3.29**
  - **File:** `src/services/usda/nutrientMap.ts`
  - **Current test:** `MISSING`
  - **Gap:** No map normalization tests for unknown nutrients and id collisions.
  - **Suggested fix:** Add unit tests for forward/backward mapping and unknown code handling.
  - **Priority:** Medium

- **1.3.30**
  - **File:** `src/services/usda/types.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing schema and discriminator validation for USDA payloads.
  - **Suggested fix:** Add validation tests for all USDA variants and malformed payloads.
  - **Priority:** Low

- **1.3.31**
  - **File:** `src/services/voiceAssistant/__fixtures__/voiceAssistantE2ESpecs.ts`
  - **Current test:** `MISSING`
  - **Gap:** Fixture set is untested, so E2E command coverage and command phrase drift risk is undetected.
  - **Suggested fix:** Add a contract test to load every fixture and ensure parser compatibility; include boundary phrases and broken intents.
  - **Priority:** Medium

### 1.4 Utilities
- **1.4.1**
  - **File:** `src/utils/alcoholCalculations.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing edge logic for low-dose/invalid-proof values and unit conversion boundaries.
  - **Suggested fix:** Add unit tests for zero/negative/NaN inputs and unit mixups.
  - **Priority:** Medium

- **1.4.2**
  - **File:** `src/utils/analytics.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing wrapper tests for event throttling and optional metadata sanitization.
  - **Suggested fix:** Add tests around optional payloads, deduplication, and opt-out flags.
  - **Priority:** Medium

- **1.4.3**
  - **File:** `src/utils/calculateMacroCalories.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for overflow, decimals, and negative macros.
  - **Suggested fix:** Add exhaustive unit tests for all valid/invalid macro triplets and output rounding.
  - **Priority:** Medium

- **1.4.4**
  - **File:** `src/utils/colorUtils.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing palette mapping and fallback colors for missing macro states.
  - **Suggested fix:** Add tests for invalid input colors and boundary percentage-to-color boundaries.
  - **Priority:** Low

- **1.4.5**
  - **File:** `src/utils/devTools/clearDatabase.ts`
  - **Current test:** `MISSING`
  - **Gap:** No guard testing for destructive clear-path flags and dry-run mode.
  - **Suggested fix:** Add test coverage that validates destructive confirmation and returns result metadata.
  - **Priority:** Medium

- **1.4.6**
  - **File:** `src/utils/devTools/generators/fastingGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for fasting range generation and invalid window input.
  - **Suggested fix:** Add deterministic fixture-based tests with boundary windows and impossible ranges.
  - **Priority:** Low

- **1.4.7**
  - **File:** `src/utils/devTools/generators/favoriteGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing duplicate and random-seed behavior checks.
  - **Suggested fix:** Add seed-based tests for stable output and dedupe constraints.
  - **Priority:** Low

- **1.4.8**
  - **File:** `src/utils/devTools/generators/foodLogGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** No date-edge coverage for midnight/noon transitions and meal slot validation.
  - **Suggested fix:** Add property-based tests for date and meal assignment bounds.
  - **Priority:** Medium

- **1.4.9**
  - **File:** `src/utils/devTools/generators/helpers.ts`
  - **Current test:** `MISSING`
  - **Gap:** Shared generation helpers untested, so downstream generators can silently fail together.
  - **Suggested fix:** Add helper-level tests for all utility routines and invalid RNG seeds.
  - **Priority:** Medium

- **1.4.10**
  - **File:** `src/utils/devTools/generators/macroCycleGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing sequence boundary checks and unsupported day patterns.
  - **Suggested fix:** Add tests for 7-day cycle variants and invalid pattern inputs.
  - **Priority:** Low

- **1.4.11**
  - **File:** `src/utils/devTools/generators/mealPlanGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing collision/overlap constraints and empty macro profiles.
  - **Suggested fix:** Add unit tests for overlapping entries and strict macro sum checks.
  - **Priority:** Medium

- **1.4.12**
  - **File:** `src/utils/devTools/generators/micronutrientGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for missing nutrient references and out-of-range values.
  - **Suggested fix:** Add tests covering empty configs and clamp logic.
  - **Priority:** Low

- **1.4.13**
  - **File:** `src/utils/devTools/generators/profileGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing age/height/weight edge cases and gender/goal compatibility.
  - **Suggested fix:** Add tests for boundary and impossible profile combinations.
  - **Priority:** Low

- **1.4.14**
  - **File:** `src/utils/devTools/generators/progressPhotoGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing metadata/date alignment and retention-window bounds.
  - **Suggested fix:** Add tests for invalid URIs, missing timestamps, and spacing limits.
  - **Priority:** Low

- **1.4.15**
  - **File:** `src/utils/devTools/generators/reflectionGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for sentiment distributions and null reflection text.
  - **Suggested fix:** Add tests for score boundaries and missing narrative payloads.
  - **Priority:** Low

- **1.4.16**
  - **File:** `src/utils/devTools/generators/restaurantLogGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for duplicated restaurant entries or missing cuisine data.
  - **Suggested fix:** Add deterministic tests for dedupe and required field fallbacks.
  - **Priority:** Low

- **1.4.17**
  - **File:** `src/utils/devTools/generators/waterGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing hydration unit boundaries and negative intake paths.
  - **Suggested fix:** Add tests for empty/negative/null inputs and day bucket resets.
  - **Priority:** Low

- **1.4.18**
  - **File:** `src/utils/devTools/generators/weightGenerator.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing trend direction and unrealistic jump edge cases.
  - **Suggested fix:** Add tests for min/max delta constraints and unit conversion integrity.
  - **Priority:** Medium

- **1.4.19**
  - **File:** `src/utils/devTools/index.ts`
  - **Current test:** `MISSING`
  - **Gap:** No aggregator export smoke checks and tree-shake regression tests.
  - **Suggested fix:** Add a simple import/export smoke test ensuring each dev tool generator is reachable.
  - **Priority:** Low

- **1.4.20**
  - **File:** `src/utils/devTools/mockData/edgeCases.ts`
  - **Current test:** `MISSING`
  - **Gap:** No contract tests for edge-case fixtures and stability of keys.
  - **Suggested fix:** Add tests verifying fixture schema and required fixture fields.
  - **Priority:** Low

- **1.4.21**
  - **File:** `src/utils/devTools/mockData/foodTemplates.ts`
  - **Current test:** `MISSING`
  - **Gap:** No coverage for template schema updates and required nutrition fields.
  - **Suggested fix:** Validate all templates against canonical schema and known required fields.
  - **Priority:** Low

- **1.4.22**
  - **File:** `src/utils/devTools/seedDatabase.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing seed orchestration contract and environment guard checks.
  - **Suggested fix:** Add tests for dry-run mode, destructive mode and seeded vs unseeded behavior.
  - **Priority:** Medium

- **1.4.23**
  - **File:** `src/utils/devTools/types.ts`
  - **Current test:** `MISSING`
  - **Gap:** Untested type helper functions may allow runtime mismatches if misused.
  - **Suggested fix:** Add narrow tests or TypeScript compile-time fixture assertions for each generator type.
  - **Priority:** Low

- **1.4.24**
  - **File:** `src/utils/haptics.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing calls to haptic mock in preference paths and null-device fallback.
  - **Suggested fix:** Add tests ensuring haptics are skipped gracefully when disabled/unavailable.
  - **Priority:** Low

- **1.4.25**
  - **File:** `src/utils/onboarding.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing onboarding state transition tests and legacy step compatibility.
  - **Suggested fix:** Add tests for feature flags and step-order guard logic.
  - **Priority:** Medium

- **1.4.26**
  - **File:** `src/utils/paywallAnalytics.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing test for free/premium analytics event gating and PII-safe payload shape.
  - **Suggested fix:** Add tests for each paywall action and event payload filtering.
  - **Priority:** High

- **1.4.27**
  - **File:** `src/utils/progressZones.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing zone boundary tests and threshold crossover behavior.
  - **Suggested fix:** Add tests with boundary inputs and expected zone output transitions.
  - **Priority:** Medium

- **1.4.28**
  - **File:** `src/utils/redistribution.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing normalization and clamp checks for percentage reallocation.
  - **Suggested fix:** Add tests for sum-not-equal-100 cases and negative remainder handling.
  - **Priority:** Medium

- **1.4.29**
  - **File:** `src/utils/reflectionMessages.ts`
  - **Current test:** `MISSING`
  - **Gap:** No tests for tone/category mapping when message templates are missing.
  - **Suggested fix:** Add tests for each message key, fallback text, and localization placeholder replacement.
  - **Priority:** Low

- **1.4.30**
  - **File:** `src/utils/sentryHelpers.ts`
  - **Current test:** `MISSING`
  - **Gap:** Error wrapping contract and stack enrichment paths untested.
  - **Suggested fix:** Add tests for safe handling of non-Error inputs and metadata merging.
  - **Priority:** High

- **1.4.31**
  - **File:** `src/utils/trendWeight.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing rolling-window and smoothing edge conditions.
  - **Suggested fix:** Add deterministic tests for empty arrays, one-point windows, and flat/negative trends.
  - **Priority:** Medium

- **1.4.32**
  - **File:** `src/utils/weightTrendAdapters.ts`
  - **Current test:** `MISSING`
  - **Gap:** Missing conversion and null-date handling across adapters.
  - **Suggested fix:** Add tests for malformed records and date parsing edge cases.
  - **Priority:** Medium

### 1.5 Repositories [ADDED BY AUDIT]

> The original audit omitted `src/repositories/` entirely. 9 of 18 repositories have tests; the following 9 do not.

- **1.5.1** [ADDED BY AUDIT]
  - **File:** `src/repositories/fastingRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for fasting session CRUD, protocol config persistence, or date-range queries.
  - **Suggested fix:** Add `src/__tests__/repositories/fastingRepository.test.ts` covering session create/complete/cancel, config upsert, and boundary date filtering.
  - **Priority:** High

- **1.5.2** [ADDED BY AUDIT]
  - **File:** `src/repositories/favoriteRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for favorite add/remove, duplicate prevention, or list retrieval ordering.
  - **Suggested fix:** Add tests for toggle behavior, idempotent adds, and sort-order stability.
  - **Priority:** Medium

- **1.5.3** [ADDED BY AUDIT]
  - **File:** `src/repositories/healthSyncRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for sync cursor persistence, last-sync timestamps, or platform-specific record mapping.
  - **Suggested fix:** Add tests for cursor read/write, stale cursor recovery, and cross-platform record handling.
  - **Priority:** High

- **1.5.4** [ADDED BY AUDIT]
  - **File:** `src/repositories/macroCycleRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for config CRUD, redistribution override persistence, day-type derivation, or locked-day handling.
  - **Suggested fix:** Add tests covering all pattern types, override save/load, and redistribution config round-trip.
  - **Priority:** High

- **1.5.5** [ADDED BY AUDIT]
  - **File:** `src/repositories/mealPlanRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for planned meal CRUD, meal slot assignment, or date-range queries.
  - **Suggested fix:** Add tests for create/update/delete planned meals, slot validation, and weekly summary queries.
  - **Priority:** Medium

- **1.5.6** [ADDED BY AUDIT]
  - **File:** `src/repositories/micronutrientRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for micronutrient log queries, target persistence, or aggregation logic.
  - **Suggested fix:** Add tests for daily/weekly nutrient queries, target CRUD, and missing-data fallback.
  - **Priority:** Medium

- **1.5.7** [ADDED BY AUDIT]
  - **File:** `src/repositories/quickAddRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for quick-add item persistence, pinned food retrieval, or recent-item ordering.
  - **Suggested fix:** Add tests for add/remove quick items, pin/unpin behavior, and recency sorting.
  - **Priority:** Medium

- **1.5.8** [ADDED BY AUDIT]
  - **File:** `src/repositories/recipeRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for recipe CRUD, ingredient list persistence, or nutrition calculation from ingredients.
  - **Suggested fix:** Add tests covering create/update/delete recipes, ingredient serialization, and computed macro totals.
  - **Priority:** High

- **1.5.9** [ADDED BY AUDIT]
  - **File:** `src/repositories/reflectionRepository.ts`
  - **Current test:** `MISSING`
  - **Gap:** No unit tests for reflection entry CRUD, sentiment persistence, or date-range queries.
  - **Suggested fix:** Add tests for submit/update/delete reflections, sentiment score validation, and weekly aggregation queries.
  - **Priority:** Medium

## 2. Integration Test Gaps

- **2.1 Health sync cross-layer integration**
  - **File:** `src/services/healthconnect`, `src/services/healthkit`, `src/services/healthSyncService.ts`, `src/stores/healthConnectStore.ts`, `src/stores/healthKitStore.ts`
  - **Current test:** `src/services/healthconnect/__tests__/...` and `src/services/healthkit/__tests__/...` mostly unit-level; store-layer wiring is not asserted end-to-end.
  - **Gap:** No integration test verifies permission acquisition → platform sync → service orchestration → store mutation → persisted DB with retry and error boundaries.
  - **Suggested fix:** Add an integration spec that stubs platform permissions and DB, then asserts full sync lifecycle across stores and error recovery when a provider returns partial/invalid payloads.
  - **Priority:** High

- **2.2 Nutrition import orchestration**
  - **File:** `src/services/nutritionImport/nutritionImportService.ts`, `src/services/nutritionImport/parsers`, `src/features/nutrition`
  - **Current test:** parser-level tests only for individual parser modules.
  - **Gap:** No test validates parser selection + conflict resolution + hydration into stores + dedupe/idempotency.
  - **Suggested fix:** Add integration tests with multiple parser fixtures (including malformed exports) and assert final persisted records, duplicate collapse, and user-facing error states.
  - **Priority:** High

- **2.3 Referral flow integration**
  - **File:** `src/services/referralService.ts`, `src/stores/useReferralStore.ts`, paywall/screen layer
  - **Current test:** `MISSING`
  - **Gap:** Referral submission and gating state are not integration-tested from action → API → store + UI gate changes.
  - **Suggested fix:** Add integration test that submits valid/expired referral code and asserts subscription gate unlock state and UI branch outcomes.
  - **Priority:** Medium

- **2.4 Recipe feature integration**
  - **File:** `src/stores/recipeStore.ts`, `src/app/recipes/**`, `src/components/weekly-budget` and related planning utilities
  - **Current test:** `MISSING`
  - **Gap:** No tests for create/edit/delete recipe persistence and recipe usage in meal planning.
  - **Suggested fix:** Add feature-level integration suite covering repository mock + store + plan mutation + UI rendering of recipe cards/lists.
  - **Priority:** High

- **2.5 Reflection + weekly insights pipeline**
  - **File:** `src/stores/reflectionStore.ts`, `src/services/context/*`, `src/features/weekly-insights`
  - **Current test:** `MISSING`
  - **Gap:** Reflection capture and insight generation are unconnected in tests.
  - **Suggested fix:** Add an integration test that submits reflection entries and verifies prompt context and widget/message output updates.
  - **Priority:** Medium

- **2.6 Progress photo pipeline**
  - **File:** `src/stores/progressPhotoStore.ts`, `src/app/progress-photos/**`, camera/file utilities
  - **Current test:** `src/__tests__/stores/progressPhotoStore.test.ts` *(corrected by audit — store-level unit test EXISTS)*
  - **Gap:** Store unit test exists, but no integration test for storage upload/comparison and UI timeline path exercised end-to-end.
  - **Suggested fix:** Add flow-style integration test with mocked file handles: capture/import photo → save entry → timeline render → compare states.
  - **Priority:** High

- **2.7 Premium gating at feature boundary**
  - **File:** `src/stores/subscriptionStore.ts`, `src/components/premium/*`, `src/features/premium`
  - **Current test:** `src/__tests__/features/premium/subscriptionGatingIntegration.test.ts` + `components/PremiumGate.test.tsx`, but several screens and paywall entry points are untested.
  - **Gap:** Missing free-vs-premium branching for food import, meal planning, macro-cycling settings, chat, and restaurant flows in one consolidated integration harness.
  - **Suggested fix:** Add integration tests that mount representative premium-gated screens and assert behavior for both states, including restore/cancel/retry transitions.
  - **Priority:** High

- **2.8 Offline + reconnect behavior**
  - **File:** `src/services` networked modules, `src/hooks/useNetworkStatus.ts`, `src/components/ui/OfflineFeatureGate.tsx`
  - **Current test:** service-level and component-level tests are sparse/isolated.
  - **Gap:** No reliable integration test for offline mode: request blocked → banner shown → retry queue → successful replay.
  - **Suggested fix:** Add integration tests for network loss simulation with deterministic reconnect and mutation replay expectations.
  - **Priority:** High

- **2.9 DB migration + repository contract integration**
  - **File:** `src/db/migrations/*`, `src/repositories/*`, stores
  - **Current test:** repositories tested, but no migration-to-repository integration checks.
  - **Gap:** Schema evolution may break reads silently until runtime.
  - **Suggested fix:** Add startup/integration tests that apply migration chain, then exercise repository reads for critical tables.
  - **Priority:** High

## 3. UI Component Test Gaps

### 3.1 Screen-level components under `src/app` (`75` files)
- **File:** All files under `src/app/**/*.tsx`
- **Current test:** `MISSING` (Jest collectCoverage excludes `src/app/**/*`)
- **Gap:** No render/unit tests for route-level screens, including critical paths like `chat`, `micronutrients`, `progress-photos`, `recipes`, and `settings/*` nested routes.
- **Suggested fix:** Add focused Jest tests for screen-level rendering of each screen with route params, loading/empty/error states, and conditional premium-gated branches.
- **Priority:** Critical

### 3.2 Reusable/components without render tests in `src/components`
- **File:** `src/components/budget/BudgetBarChart.tsx`
- **Current test:** `MISSING`
- **Gap:** No rendering and interaction assertions.
- **Suggested fix:** Add tests covering loading, empty data, and max-value rendering.
- **Priority:** High

- **File:** `src/components/budget/DayEditor.tsx`
- **Current test:** `MISSING`
- **Gap:** No edit state and validation assertions.
- **Suggested fix:** Add tests for input validation, save/cancel actions, and boundary values.
- **Priority:** High

- **File:** `src/components/budget/MacroBreakdownAccordion.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing expand/collapse and macro-summary branch coverage.
- **Suggested fix:** Add user interaction tests for toggling states with incomplete macro sets.
- **Priority:** Medium

- **File:** `src/components/budget/WeeklyTotalHeader.tsx`
- **Current test:** `MISSING`
- **Gap:** No visual or value formatting assertions.
- **Suggested fix:** Add tests for totals with zero/negative/NaN data and label fallback.
- **Priority:** Medium

- **File:** `src/components/charts/CalorieChart.tsx`
- **Current test:** `MISSING`
- **Gap:** No chart-data branch and empty-series tests.
- **Suggested fix:** Add render tests for populated, sparse, and empty ranges with accessibility labels.
- **Priority:** Medium

- **File:** `src/components/charts/MacroChart.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing macro combination and tooltip interactions.
- **Suggested fix:** Add tests for stacked dataset rendering and missing-value suppression.
- **Priority:** Medium

- **File:** `src/components/charts/WeightChart.tsx`
- **Current test:** `MISSING`
- **Gap:** No trend/zoom rendering coverage.
- **Suggested fix:** Test single-point, two-point, and dense-series branches, and no-data fallback UI.
- **Priority:** Medium

- **File:** `src/components/charts/WeightTrendChartMinimal.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing compact rendering edge coverage.
- **Suggested fix:** Add tests for compact axis labels, null points, and minimal dataset states.
- **Priority:** Low

- **File:** `src/components/CrashFallbackScreen.tsx` *(path corrected by audit — no `crash/` subdirectory)*
- **Current test:** `MISSING`
- **Gap:** No crash fallback rendering and recovery callback assertions.
- **Suggested fix:** Add render test validating retry/restart actions and error message variants.
- **Priority:** Medium

- **File:** `src/components/ErrorBoundary.tsx`
- **Current test:** `MISSING`
- **Gap:** No test for boundary catching and fallback replacement.
- **Suggested fix:** Add unit test that intentionally throws from child and verifies fallback render path.
- **Priority:** Critical

- **File:** `src/components/dashboard/DashboardScreen.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing widget composition and empty-data states.
- **Suggested fix:** Add tests for widget loading, reorder interactions, and no-data cards.
- **Priority:** High

- **File:** `src/components/dashboard/WidgetPickerModal.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing selection toggle and confirm/cancel interactions.
- **Suggested fix:** Add interaction tests for adding/removing widgets and persistence callbacks.
- **Priority:** Medium

- **File:** `src/components/dashboard/WidgetRenderer.tsx`
- **Current test:** `MISSING`
- **Gap:** No fallback rendering for unsupported widget types.
- **Suggested fix:** Add render tests for all widget variants and unknown-type branch.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/AIDailyInsightWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** No tests for generated insight text, loading/error placeholders, and premium lock states.
- **Suggested fix:** Add tests for content + skeleton + locked states.
- **Priority:** High

- **File:** `src/components/dashboard/widgets/CalorieRingWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing rendering for over-target and under-target values.
- **Suggested fix:** Add tests for ring normalization and threshold-based color changes.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/FastingTimerWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** No running/paused/complete timer state tests.
- **Suggested fix:** Add state branch tests for countdown rendering and completion callbacks.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/GoalsSummaryWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing multiple-goal combinations and missing goals fallback.
- **Suggested fix:** Add tests with zero-goal, single-goal, and multiple-goal fixtures.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/MacroBarsWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** No value clamp tests and accessibility labels.
- **Suggested fix:** Add render tests for macro totals and empty macro logs.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/MicronutrientSnapshotWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing missing-data and saturation limit rendering.
- **Suggested fix:** Add tests for complete/incomplete nutrient payloads and warning state display.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/NutritionOverviewWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** No macro total and loading skeleton branch tests.
- **Suggested fix:** Add snapshot-like render tests with all branches and interaction refresh behavior.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/ProteinFocusWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing branch coverage for high/low protein states.
- **Suggested fix:** Add tests for protein target reached/not reached with call-to-action labels.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/QuickAddWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** No add-item action tests.
- **Suggested fix:** Add render + callback tests for add actions and disabled states.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/StreakBadgeWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing consecutive/zero streak state transitions.
- **Suggested fix:** Add rendering assertions for first-day, long-streak, and reset values.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/TodaysMealsWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** No empty section and meal-type branching tests.
- **Suggested fix:** Add tests for breakfast/lunch/dinner/snack grouping and no-meals placeholder.
- **Priority:** High

- **File:** `src/components/dashboard/widgets/WaterTrackerWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing goal/under-goal/incomplete-data branches.
- **Suggested fix:** Add tests for tracked-water updates and CTA visibility.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/WeeklyAverageWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** No chart-data and no-range states.
- **Suggested fix:** Add tests for valid range, short window, and no-data fallback.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/WeeklyBudgetWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing over-budget and budget-disabled rendering branches.
- **Suggested fix:** Add render tests with boundary spending and zero-budget cases.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/WeeklyRecapWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing recap copy changes based on trend thresholds.
- **Suggested fix:** Add tests for positive/negative/neutral weekly summaries.
- **Priority:** Medium

- **File:** `src/components/dashboard/widgets/WeightTrendWidget.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing upward/downward trend visual states.
- **Suggested fix:** Add rendering tests for trend arrows, no-weight data, and stale-data handling.
- **Priority:** Medium

- **File:** `src/components/food/FoodQuickRow.tsx`
- **Current test:** `MISSING`
- **Gap:** No interaction tests for quick-add/remove actions.
- **Suggested fix:** Add callback tests for press/selection and quantity edit.
- **Priority:** High

- **File:** `src/components/food/FoodSearchResult.tsx`
- **Current test:** `MISSING`
- **Gap:** No empty-result and high-latency loading test coverage.
- **Suggested fix:** Add tests for throttled search text changes and empty/no-match rendering.
- **Priority:** Medium

- **File:** `src/components/food/FoodSection.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing section-collapse and long list virtualization behavior.
- **Suggested fix:** Add tests for empty/expanded states and section ordering stability.
- **Priority:** Medium

- **File:** `src/components/food/MacroSummary.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing percent formatting and zero-macro rendering.
- **Suggested fix:** Add render tests with fractional and missing macro values.
- **Priority:** Medium

- **File:** `src/components/food/MealBlockBottomSheet.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing open/close and submit interactions.
- **Suggested fix:** Add interaction tests for selection, close gesture, and validation errors.
- **Priority:** High

- **File:** `src/components/food/QuickConfirmCard.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing confirm/cancel/long-press branches.
- **Suggested fix:** Add branch tests for confirmation callbacks and disabled buttons.
- **Priority:** Medium

- **File:** `src/components/food/RecentFoodsRow.tsx`
- **Current test:** `MISSING`
- **Gap:** No rendering for recents when empty or stale.
- **Suggested fix:** Add tests with no-recents state and row press callbacks.
- **Priority:** Medium

- **File:** `src/components/healthconnect/HealthConnectIntegrationScreen.tsx`
- **Current test:** `MISSING`
- **Gap:** No render and permission CTA behavior coverage.
- **Suggested fix:** Add tests for connected/disconnected/permission required states.
- **Priority:** High

- **File:** `src/components/healthkit/HealthIntegrationScreen.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing integration prompt and error action handling.
- **Suggested fix:** Add tests for unsupported devices and permission request flows.
- **Priority:** High

- **File:** `src/components/healthkit/HealthKitPermissionScreen.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing allow/deny callback and copy variants.
- **Suggested fix:** Add tests for permission acceptance, denial, and fallback messaging.
- **Priority:** High

- **File:** `src/components/llm/ModelDownloadSheet.tsx`
- **Current test:** `MISSING`
- **Gap:** No progress, failure, and retry interaction tests.
- **Suggested fix:** Add tests for download states and action buttons.
- **Priority:** High

- **File:** `src/components/micronutrients/MicronutrientSummary.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing low/high threshold badge branch coverage.
- **Suggested fix:** Add tests for missing nutrients, boundary values, and grouped rendering.
- **Priority:** Medium

- **File:** `src/components/micronutrients/NutrientBar.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing fill/overflow and accessibility assertions.
- **Suggested fix:** Add tests for complete/incomplete nutrient bars and overflow text.
- **Priority:** Medium

- **File:** `src/components/navigation/CustomTabBar.tsx`
- **Current test:** `MISSING`
- **Gap:** No focus/active state interactions.
- **Suggested fix:** Add tests for tab press handlers, selected route updates, and accessibility labels.
- **Priority:** High

- **File:** `src/components/nutritionImport/ImportPreviewCard.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing branch coverage for preview mismatch and cancel/confirm actions.
- **Suggested fix:** Add tests with valid/invalid preview datasets and action callbacks.
- **Priority:** Medium

- **File:** `src/components/nutritionImport/ImportProgressBar.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing progress, stalled, and error states.
- **Suggested fix:** Add rendering tests for progress updates and error messaging.
- **Priority:** Medium

- **File:** `src/components/nutritionImport/ImportSampleDay.tsx`
- **Current test:** `MISSING`
- **Gap:** No sample-day card rendering and edge value formatting tests.
- **Suggested fix:** Add tests for empty sample sets and malformed totals.
- **Priority:** Medium

- **File:** `src/components/nutritionImport/ImportSourceCard.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing source selection, disabled sources, and accessibility coverage.
- **Suggested fix:** Add tests for all selectable states and disabled reason rendering.
- **Priority:** Medium

- **File:** `src/components/nutritionImport/ImportTypeOption.tsx`
- **Current test:** `MISSING`
- **Gap:** No option selection and description truncation coverage.
- **Suggested fix:** Add tests for active/inactive and disabled selection behavior.
- **Priority:** Medium

- **File:** `src/components/onboarding/OnboardingProgressBar.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing progress clamp and skipped-step rendering.
- **Suggested fix:** Add tests for first/mid/last step indicators and total count mismatch.
- **Priority:** Medium

- **File:** `src/components/onboarding/OnboardingRadioCard.tsx`
- **Current test:** `MISSING`
- **Gap:** No selected-state and helper-text rendering assertions.
- **Suggested fix:** Add interaction tests for radio selection and repeated tap behavior.
- **Priority:** Medium

- **File:** `src/components/onboarding/OnboardingScreen.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing screen lifecycle and CTA state tests.
- **Suggested fix:** Add render tests across all onboarding step variants and invalid step fallback.
- **Priority:** High

- **File:** `src/components/onboarding/OnboardingSegmentedToggle.tsx`
- **Current test:** `MISSING`
- **Gap:** Missing toggle state changes and default index handling.
- **Suggested fix:** Add tests for left/middle/right selections and boundary index input.
- **Priority:** Medium

- **File:** `src/components/planning/FastingSection.tsx`
- **Current test:** `MISSING`
  - **Gap:** No timer/list state transitions and protocol selector assertions.
  - **Suggested fix:** Add tests for empty protocol, validation errors, and change callbacks.
  - **Priority:** Medium

- **File:** `src/components/planning/FastingTimer.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No start/pause/finish interaction tests.
  - **Suggested fix:** Add tests for timer control callbacks and edge durations.
  - **Priority:** High

- **File:** `src/components/planning/PlannedMealsSection.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No reorder/empty and meal-type filter tests.
  - **Suggested fix:** Add tests for list rendering with empty plans and drag interactions.
  - **Priority:** High

- **File:** `src/components/premium/LockedContentArea.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing locked/unlocked branch tests and CTA routing assertions.
  - **Suggested fix:** Add tests for both premium states and locked overlays.
  - **Priority:** High

- **File:** `src/components/premium/LockedOverlay.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No overlay/close/tap-through interaction coverage.
  - **Suggested fix:** Add render + interaction tests for lock state and access request.
  - **Priority:** High

- **File:** `src/components/premium/PaywallErrorBanner.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No error banner variants covered.
  - **Suggested fix:** Add tests for network, entitlement, and retry states.
  - **Priority:** Medium

- **File:** `src/components/premium/PaywallScreen.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No plan selection and close/cancel interaction branches.
  - **Suggested fix:** Add render tests for every plan card and action handler.
  - **Priority:** High

- **File:** `src/components/premium/PlanCard.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing selected/unselected and price formatting branches.
  - **Suggested fix:** Add interaction tests for selected state and disabled state.
  - **Priority:** Medium

- **File:** `src/components/premium/PremiumBanner.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing premium-state and CTA callback coverage.
  - **Suggested fix:** Add tests for gated banner and dismissal behavior.
  - **Priority:** Medium

- **File:** `src/components/premium/PremiumFeatureChips.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing feature chips rendering and disabled states.
  - **Suggested fix:** Add tests for all chip variants and long label overflow.
  - **Priority:** Medium

- **File:** `src/components/premium/PremiumMicronutrientPreview.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No preview gating/hidden-content branch tests.
  - **Suggested fix:** Add tests for gated/unlocked text and fallback behavior.
  - **Priority:** Medium

- **File:** `src/components/premium/PremiumUpgradeContent.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing entitlement-aware render assertions.
  - **Suggested fix:** Add tests for premium and free variants and upgrade CTA.
  - **Priority:** Medium

- **File:** `src/components/premium/PremiumUpgradeSheet.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No open/close transition and button callback tests.
  - **Suggested fix:** Add interaction tests for sheet actions and confirmation path.
  - **Priority:** High

- **File:** `src/components/progressPhotos/PhotoComparison.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing comparison slider/render state tests.
  - **Suggested fix:** Add tests for before/after rendering and missing image fallback.
  - **Priority:** High

- **File:** `src/components/progressPhotos/PhotoThumbnail.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No press and selection rendering tests.
  - **Suggested fix:** Add tests for selected states, missing image URI fallback, and accessibility labels.
  - **Priority:** Medium

- **File:** `src/components/progressPhotos/PhotoTimeline.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing empty timeline and chronological ordering assertions.
  - **Suggested fix:** Add tests for ordered data and click-through actions.
  - **Priority:** High

- **File:** `src/components/progressPhotos/ProgressPhotosSummary.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No aggregate summary and error state coverage.
  - **Suggested fix:** Add tests for zero/photos and stale summary states.
  - **Priority:** Medium

- **File:** `src/components/reflection/PlanUpdateSection.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No expand/collapse and action callbacks.
  - **Suggested fix:** Add tests for initial closed state and submit interactions.
  - **Priority:** Medium

- **File:** `src/components/reflection/ProgressMessage.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing sentiment/length variants and fallback copy.
  - **Suggested fix:** Add tests for short/long/empty messages and rendering fallback.
  - **Priority:** Medium

- **File:** `src/components/reflection/ReflectionModal.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing open/close and validation states.
  - **Suggested fix:** Add interaction tests for keyboard handling, submit, and cancel.
  - **Priority:** High

- **File:** `src/components/reflection/SentimentSection.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing score selection and disabled state tests.
  - **Suggested fix:** Add tests for each sentiment path and unselected edge.
  - **Priority:** Medium

- **File:** `src/components/reflection/WeightInputSection.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing input validation and unit edge cases.
  - **Suggested fix:** Add tests for unit conversion, decimals, and submit button enablement.
  - **Priority:** Medium

- **File:** `src/components/restaurant/CategoryChip.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing selection and rendering for empty category sets.
  - **Suggested fix:** Add tests for active/inactive, disabled, and dynamic category labels.
  - **Priority:** Medium

- **File:** `src/components/restaurant/RestaurantCard.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No image loading, favorite toggle, and row press tests.
  - **Suggested fix:** Add interaction tests for press, long name truncation, and stale image fallback.
  - **Priority:** High

- **File:** `src/components/restaurant/RestaurantFoodCard.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing add/quantity and unavailable nutrition path coverage.
  - **Suggested fix:** Add tests for all action states and missing calorie payloads.
  - **Priority:** High

- **File:** `src/components/ui/CalorieRing.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing ring percentage and max-boundary rendering.
  - **Suggested fix:** Add tests for boundary values and label visibility.
  - **Priority:** Low

- **File:** `src/components/ui/Card.tsx`
  - **Current test:** `MISSING`
  - **Gap:** No variant/spacing/accessibility branch coverage.
  - **Suggested fix:** Add tests for card variants and style prop passthrough.
  - **Priority:** Medium

- **File:** `src/components/ui/CollapsibleSection.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing expand/collapse interactions.
  - **Suggested fix:** Add tests for animation states and controlled/uncontrolled behavior.
  - **Priority:** Medium

- **File:** `src/components/ui/DateOfBirthPicker.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing valid/invalid date paths and timezone handling.
  - **Suggested fix:** Add callback tests for leap years and null values.
  - **Priority:** Medium

- **File:** `src/components/ui/DatePickerModal.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing open/close and confirm/cancel callbacks.
  - **Suggested fix:** Add tests for initial value, selection, and dismissal.
  - **Priority:** Medium

- **File:** `src/components/ui/FavoriteButton.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing toggle transitions and debounced press handling.
  - **Suggested fix:** Add tests for on/off states, optimistic updates, and disabled state.
  - **Priority:** Medium

- **File:** `src/components/ui/FloatingActionButton.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing visibility and press callback coverage.
  - **Suggested fix:** Add render tests for icon, disabled and press behavior.
  - **Priority:** Medium

- **File:** `src/components/ui/Input.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing validation and keyboard behavior tests.
  - **Suggested fix:** Add tests for controlled updates, error text, and secure entry.
  - **Priority:** Medium

- **File:** `src/components/ui/NetworkBanner.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing online/offline transition and action callback tests.
  - **Suggested fix:** Add tests for critical offline message and dismiss behavior.
  - **Priority:** High

- **File:** `src/components/ui/OfflineFeatureGate.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing offline fallback rendering and feature-blocking actions.
  - **Suggested fix:** Add tests for gated/offline and enabled states.
  - **Priority:** High

- **File:** `src/components/ui/PinToWidgetButton.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing long-press and unavailable device branch coverage.
  - **Suggested fix:** Add tests for all pinning capability branches.
  - **Priority:** Medium

- **File:** `src/components/ui/ProgressBar.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing percentage clamping and animation start states.
  - **Suggested fix:** Add tests for 0, 50, 100, and >100 values.
  - **Priority:** Medium

- **File:** `src/components/ui/SegmentedControl.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing selection and disabled option behavior.
  - **Suggested fix:** Add tests for segment switching and value callback correctness.
  - **Priority:** Medium

- **File:** `src/components/ui/Skeleton.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing variant/size branches and conditional rendering.
  - **Suggested fix:** Add tests for skeleton variants and animation toggles.
  - **Priority:** Low

- **File:** `src/components/ui/StreakBadge.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing zero-value and large streak rendering.
  - **Suggested fix:** Add tests for empty, first-time, and very long streaks.
  - **Priority:** Medium

- **File:** `src/components/ui/Text.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing variant typography and truncation coverage.
  - **Suggested fix:** Add tests for `numberOfLines`, color props, and semantic role.
  - **Priority:** Medium

- **File:** `src/components/ui/ThemedDatePicker.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing value conversion and disabled-state tests.
  - **Suggested fix:** Add tests for controlled updates and theme transitions.
  - **Priority:** Medium

- **File:** `src/components/ui/Toast.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing show/hide lifecycle and duplicate-toast behavior.
  - **Suggested fix:** Add tests for message duration, variant mapping, and dismissal.
  - **Priority:** Medium

- **File:** `src/components/ui/TooltipModal.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing anchor missing, open/close, and copy variants.
  - **Suggested fix:** Add tests for anchored rendering and close actions.
  - **Priority:** Medium

- **File:** `src/components/ui/UndoToast.tsx`
  - **Current test:** `MISSING`
  - **Gap:** Missing undo action timing and cancellation edges.
  - **Suggested fix:** Add tests for action callback and auto-dismiss interactions.
  - **Priority:** Medium

- **File:** `src/components/voice/VoiceToast.tsx`
  - **Current test:** `src/components/voice/__tests__/VoiceToast.test.tsx` *(corrected by audit — test EXISTS)*
  - **Gap:** ~~Existing tests in voice folder are not asserting full interaction contract in component tests.~~ Test exists with render + timer assertions. May still benefit from expanded interaction coverage.
  - **Suggested fix:** Review existing test for completeness; expand if recording-state and error-toast branches are not covered.
  - **Priority:** Low *(downgraded — test already exists)*

~~- **File:** `src/components/ErrorBoundary.tsx` — DUPLICATE REMOVED BY AUDIT (see earlier entry in §3.2)~~

### 3.3 Components Missing from Original Audit [ADDED BY AUDIT]

- **File:** `src/components/premium/PremiumBadge.tsx` [ADDED BY AUDIT]
  - **Current test:** `MISSING`
  - **Gap:** No rendering or state-variant assertions for premium badge display.
  - **Suggested fix:** Add tests for badge visibility based on subscription state and icon/label rendering.
  - **Priority:** Medium

- **File:** `src/components/premium/PremiumSettingsRow.tsx` [ADDED BY AUDIT]
  - **Current test:** `MISSING`
  - **Gap:** No rendering or interaction tests for premium-gated settings row with lock icon and navigation.
  - **Suggested fix:** Add tests for premium/free state rendering, press callback, and disabled state.
  - **Priority:** Medium

- **File:** `src/components/reflection/ReflectionBanner.tsx` [ADDED BY AUDIT]
  - **Current test:** `MISSING`
  - **Gap:** No rendering tests for reflection prompt banner visibility and dismiss behavior.
  - **Suggested fix:** Add tests for banner show/hide conditions and tap-through navigation.
  - **Priority:** Medium

- **File:** `src/components/healthkit/HealthKitPermissionScreen.tsx` [ADDED BY AUDIT]
  - **Current test:** Partial — `src/components/healthkit/__tests__/HealthKitComponents.test.ts` tests `HealthKitSettingRow` interface props but does NOT render `HealthKitPermissionScreen` directly.
  - **Gap:** No direct render test for the permission request screen, allow/deny callbacks, or fallback messaging.
  - **Suggested fix:** Add render tests for permission acceptance, denial, and unsupported device states.
  - **Priority:** High

## 4. Maestro E2E Gaps

### 4.1 Missing Journey Coverage (Flow: MISSING)
- **4.1.1**
  - **Current flow file:** `MISSING`
  - **Gap:** App has `src/app/chat/index.tsx` but no Maestro flow covers chat open, message send, and voice/assist fallback.
  - **Suggested fix:** Add `maestro/flows/chat/chat.tsx` style flow that covers first-run chat prompt, assistant response loading, and error-retry path.
  - **Priority:** High

- **4.1.2**
  - **Current flow file:** `MISSING`
  - **Gap:** No end-to-end flow for `src/app/micronutrients.tsx`.
  - **Suggested fix:** Add flow for open micronutrients screen, unit/zone states, stale-data empty handling, and deep-link in/out from settings.
  - **Priority:** Medium

- **4.1.3**
  - **Current flow file:** `MISSING`
  - **Gap:** Recipes feature (`src/app/recipes/index.tsx`, `recipes/create.tsx`, `recipes/[id].tsx`) has zero flow coverage.
  - **Suggested fix:** Add create/list/view/edit/delete recipe journey, including premium gating checks.
  - **Priority:** High

- **4.1.4**
  - **Current flow file:** `MISSING`
  - **Gap:** Progress photos journey (`src/app/progress-photos.tsx`, `progress-photos/capture.tsx`, `progress-photos/compare.tsx`) is untested.
  - **Suggested fix:** Add capture, compare, and delete/retake flow with permission/error branches.
  - **Priority:** High

- **4.1.5**
  - **Current flow file:** `MISSING`
  - **Gap:** No `weekly-insights` flow for `src/app/weekly-insights.tsx`.
  - **Suggested fix:** Add flow that validates insight refresh, week-range switches, and insight interaction card tap-through.
  - **Priority:** Medium

- **4.1.6**
  - **Current flow file:** `MISSING`
  - **Gap:** `src/app/weekly-reflection.tsx` has no dedicated flow.
  - **Suggested fix:** Add flow for create/edit/view reflection, including required error/empty states.
  - **Priority:** Medium

- **4.1.7**
  - **Current flow file:** `MISSING`
  - **Gap:** Settings nested routes `src/app/settings/apple-health.tsx`, `settings/health-connect.tsx`, `settings/health-notice.tsx`, `settings/terms-of-service.tsx`, `settings/privacy-policy.tsx`, `settings/developer.tsx` have no direct flow coverage.
  - **Suggested fix:** Add grouped compliance/settings navigation flow with return paths and toggle actions.
  - **Priority:** High

- **4.1.8**
  - **Current flow file:** `MISSING`
  - **Gap:** No E2E for `src/app/log-entry/[id].tsx` (entry editing detail) and `src/app/progress-photos/*` transitions.
  - **Suggested fix:** Add flow for detail open, edit fields, delete, and save success/fail branches.
  - **Priority:** Medium

### 4.2 Stale/Broken Flows
- **4.2.1**
  - **Current flow file:** `maestro/flows/premium/macro-cycling.yaml`
  - **Gap:** Uses literal `macro-cycling-pattern-option-high_low_carb`; pattern is generated via template in code/tests, so a selector rename would silently break this flow.
  - **Suggested fix:** Replace literal pattern assertions with helper-backed testID generation and assert helper output in one flow utility step.
  - **Priority:** Medium

- **4.2.2**
  - **Current flow file:** `maestro/flows/settings/fasting.yaml`
  - **Gap:** Uses dynamic protocol selector literals (e.g., `settings-fasting-protocol-option-16:8`) and meal-section selector templates without a shared helper contract.
  - **Suggested fix:** Codify helper-generated IDs in a dedicated flow constants module and import from test harness.
  - **Priority:** Medium

- **4.2.3**
  - **Current flow file:** Multiple flows with wildcard selectors
  - **Gap:** Wildcard selectors like `meal-entry-item-.*`, `restaurant-item-.*`, and `restaurant-menu-item-.*` are currently unbounded; selector changes in `TestIDs` can cause broad false positives.
  - **Suggested fix:** Introduce concrete, stable fixture IDs in affected flows and assert row counts before selection.
  - **Priority:** Medium

## 5. Cross-Cutting Gaps
- **Premium/free gating logic:** existing gating exists (`src/__tests__/features/premium/subscriptionGatingIntegration.test.ts`, `src/__tests__/features/restaurant/restaurantPremiumGating.test.ts`) but no coverage for newly added restaurant/progress photo/recipe/chat paths. Add end-to-end matrix tests that assert both states for each newly added premium surface.
- **Offline behavior:** no consolidated tests for offline command queueing/replay and UI behavior. `useNetworkStatus`, `useNetworkGuard`, `ui/OfflineFeatureGate`, and networked services need integration tests across reconnect.
- **Database migrations:** there are no tests exercising migration application sequences under `src/db/migrations/*`. This is a high-risk gap after schema changes and should include smoke + rollback behavior.
- **Analytics event firing:** utility `src/utils/paywallAnalytics.ts` and sentry utility usage are untested; add tests asserting exact event names, opt-out pathways, and PII filtering.
- **Error handling boundaries:** many modules have no tests around thrown exceptions and fallback rendering, especially in `src/services/healthSync*`, `src/services/voiceAssistant*`, and `src/services/seedDataService.ts`.
- **Accessibility:** no dedicated accessibility-focused assertions in component tests; add `accessibilityLabel`, role, and focus-order checks for primary components (buttons, tab bar, toasts, modals) and ensure Maestro has checks for labels where possible.
- **`src/features/` directory entirely omitted from audit** [ADDED BY AUDIT]: 111 source files across `insights/`, `weekly-insights/`, `legal/`, and `micronutrients/` feature modules. Contains stores (`alertDismissalStore`, `insightsStore`, `dailyInsightStore`), hooks (`useInsightsData`, `useInsightGeneration`, `useDeficiencyAlerts`, `useDailyInsightData`, `useWeeklyQuestions`, `useWeeklyData`, `useWeeklyInsightGeneration`, `useFilteredNutrients`), services (analyzers, prompt builders, generators), and ~15 components. Some have unit tests (`insights/__tests__/`, `weekly-insights/__tests__/`) but hooks and components are largely untested. A dedicated audit pass is recommended.
- **Repository layer gaps** [ADDED BY AUDIT]: 9 of 18 repositories under `src/repositories/` have no unit tests (see new §1.5). These sit between stores and SQLite and are critical for data integrity.

## 6. Priority Implementation Order
1. Add critical store/service unit tests for `recipeStore`, `reflectionStore`, `healthSyncService`, `healthSyncOrchestrator`, `nutritionImportService`, `aiPhoto/openAIVisionService`, and `USDAFoodService`.
1b. [ADDED BY AUDIT] Add repository unit tests for `fastingRepository`, `macroCycleRepository`, `healthSyncRepository`, `recipeRepository` (highest priority among the 9 untested repos).
2. Add missing hooks tests for premium/offline-critical logic: `useNetworkStatus`, `useNetworkGuard`, `useDatabase`, `useHealthSync`, `useOnboardingStep`.
3. Add integration suites for health sync, nutrition import, referrals, and progress photos.
4. Fill screen-level coverage for `src/app` navigation surfaces with highest-priority missing routes (`chat`, `recipes`, `progress-photos`, `weekly-insights`, and nested `settings/*` pages).
5. Add reusable component render+interaction tests for high-risk UI surfaces (dashboard widgets, premium components, and restaurant/food logging components).
6. Add migration integration smoke tests for `src/db/migrations/*` critical chain and run-time compatibility.
7. Add analytics and sentry utility tests to lock event contracts and error telemetry behavior.
8. Add accessibility assertions in existing/newest screen and component tests; then add one Maestro regression flow per critical screen branch.
9. [ADDED BY AUDIT] Audit `src/features/` directory — add targeted tests for untested hooks and components in insights/, weekly-insights/, and micronutrients/ modules.
