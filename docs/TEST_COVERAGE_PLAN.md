# NutritionRx Test Coverage Plan

## Summary Statistics

| Metric | Count |
|--------|-------|
| Existing test files | 68 |
| Existing test lines | ~16,149 |
| Estimated test cases | ~3,100 |
| Source files (stores) | 21 |
| Source files (repos) | 14 |
| Source files (services) | 20+ |
| Source files (screens) | 30+ |
| Source files (components) | 50+ |

### Current Coverage by Layer

| Layer | Tested | Untested | Coverage |
|-------|--------|----------|----------|
| Stores | 8 / 21 | 13 | ~38% |
| Repositories | 6 / 14 | 8 | ~43% |
| Services | 14+ | ~6 | ~70% |
| Hooks | 3 | ~10 | ~23% |
| Components/Screens | 5 | ~80 | ~6% |
| Integration | 7 | ~10 | ~41% |

---

## 1. Unit Tests (utils, hooks, stores, validation)

### 1.1 Already Tested

**Stores (8 files):**
- `stores/foodLogStore.test.ts` (512 lines)
- `stores/waterStore.test.ts` (271 lines)
- `stores/onboardingStore.test.ts` (290 lines)
- `stores/dashboardStore.test.ts` (351 lines)
- `stores/restaurantStore.test.ts` (458 lines)
- `stores/nutritionImportStore.test.ts` (306 lines)
- `stores/__tests__/healthKitStore.test.ts`
- `stores/__tests__/healthConnectStore.test.ts`

**Services (14+ files):**
- `services/tdeeCalculator.test.ts` (412 lines)
- `services/macroCalculator.test.ts` (461 lines)
- `services/openFoodFactsApi.test.ts` (595 lines)
- `services/nutritionImport/parsers/cronometer.test.ts`
- `services/nutritionImport/parsers/loseit.test.ts`
- `services/nutritionImport/parsers/myfitnesspal.test.ts`
- `services/nutritionImport/parsers/parserUtils.test.ts`
- `services/nutritionImport/parsers/index.test.ts`
- `services/watchConnectivity/watchConnectivityService.test.ts`
- `services/wearOS/wearSyncService.test.ts`
- `services/voiceAssistant/__tests__/voiceAssistantService.test.ts`
- `services/voiceAssistant/__tests__/voiceCommandHandler.test.ts`
- `services/healthconnect/__tests__/healthConnectService.test.ts`
- `services/healthconnect/__tests__/healthConnectNutritionSync.test.ts`
- `services/healthkit/__tests__/healthKitService.test.ts`
- `services/healthkit/__tests__/healthKitNutritionSync.test.ts`

**Hooks (3 files):**
- `hooks/useProgressiveTooltips.test.ts` (380 lines)
- `hooks/useWatchConnectivity.test.ts` (363 lines)
- `hooks/useWearOS.test.ts` (135 lines)

**Other:**
- `__tests__/tdeeCalculator.test.ts` (370 lines)
- `__tests__/constants.test.ts` (171 lines)
- `__tests__/stores.test.ts` (386 lines)
- `__tests__/mappers.test.ts` (310 lines)
- `constants/servingUnits.test.ts` (322 lines)
- `types/watch.test.ts` (364 lines)

### 1.2 Missing — P0 (Critical)

#### `settingsStore`
**File:** `src/stores/settingsStore.ts`
**Priority:** P0 — Drives the entire app (daily goals, theme, units)

| Test Case | Description |
|-----------|-------------|
| Load settings from DB | Verify all default settings loaded correctly |
| Update daily calorie goal | Setting updates and persists |
| Update daily protein/carbs/fat goals | Each macro goal persists independently |
| Toggle theme (dark/light) | Theme switches and persists |
| Toggle weight unit (lbs/kg) | Unit switches and triggers conversions |
| Set has_seen_onboarding | Onboarding flag persists |
| Handle corrupted settings | Graceful fallback to defaults |
| Concurrent updates | Multiple rapid updates don't conflict |

#### `goalStore`
**File:** `src/stores/goalStore.ts`
**Priority:** P0 — TDEE calculation, macro adjustments, weekly reflections

| Test Case | Description |
|-----------|-------------|
| Create new goal (lose/gain/maintain) | Each type sets correct initial targets |
| TDEE calculation with different activity levels | Verify Mifflin-St Jeor formula |
| Macro target calculation with eating styles | All 4 styles produce correct splits |
| Protein priority levels | All 4 levels produce correct g/lb targets |
| Weekly reflection flow | Accepting/rejecting recommendations |
| Complete active goal | Status transition, completed_at set |
| Multiple goals (one active) | Only one goal active at a time |
| Edge: very low/very high starting weight | Reasonable targets at extremes |

#### `profileStore`
**File:** `src/stores/profileStore.ts`
**Priority:** P0 — Onboarding state, profile management

| Test Case | Description |
|-----------|-------------|
| Load profile singleton | Returns singleton profile |
| Update demographics (sex, DOB, height) | Each field persists |
| Complete onboarding | Flag set, profile populated |
| Skip onboarding | Skip flag set, minimal data |
| Update activity level | Persists, affects TDEE recalculation |
| Update eating style/protein priority | Persists, affects macro targets |

#### `weightStore`
**File:** `src/stores/weightStore.ts`
**Priority:** P0 — Weight trend calculation, HealthKit sync

| Test Case | Description |
|-----------|-------------|
| Add weight entry | Creates entry, recalculates trend |
| Update existing entry | Updates and recalculates |
| Delete weight entry | Removes and recalculates |
| Weight trend calculation (EMA) | Verify smoothing algorithm |
| Unit conversion (kg ↔ lbs) | Correct conversions, rounding |
| Date uniqueness constraint | One entry per date |
| HealthKit sync integration | Import/export weight data |
| Edge: very low/high weight values | 45-200 kg range |

#### Validation Functions
**Priority:** P0 — Macro calculator edge cases, date validation

| Test Case | Description |
|-----------|-------------|
| Macro calculator with 0 calories | No division by zero |
| Macro calculator with extreme inputs | Very high/low TDEE values |
| Date validation (YYYY-MM-DD format) | Valid/invalid date strings |
| Date range validation | Start before end |
| Leap year date handling | Feb 29 edge cases |
| Negative serving sizes | Rejected or clamped |
| Zero-calorie food items | Allowed for water/coffee |

### 1.3 Missing — P1 (High)

#### `fastingStore`
**File:** `src/stores/fastingStore.ts`

| Test Case | Description |
|-----------|-------------|
| Start fasting session | Creates active session |
| End fasting session | Calculates actual_hours, sets completed |
| Cancel fasting session | Status → cancelled |
| Active session detection | Only one active at a time |
| Protocol configuration (16:8, 18:6, etc.) | Correct eating windows |
| Custom protocol hours | Custom fast duration |
| Notification flag management | Toggle notification settings |
| Session history by date range | Correct filtering |

#### `macroCycleStore`
**File:** `src/stores/macroCycleStore.ts`

| Test Case | Description |
|-----------|-------------|
| Enable/disable macro cycling | Toggle affects daily targets |
| Training/rest day pattern | Correct days marked |
| Day-specific targets | Different macros per day type |
| Manual override for specific date | Override takes precedence |
| Remove override | Falls back to pattern |
| Get targets for today | Considers day-of-week + overrides |

#### `mealPlanStore`
**File:** `src/stores/mealPlanStore.ts`

| Test Case | Description |
|-----------|-------------|
| Create planned meal | Correct data persisted |
| Update planned meal status (planned → logged) | Status transition |
| Skip planned meal | Status → skipped |
| Get plans for date | Correct filtering by date |
| Delete planned meal | Removed from DB |
| Enable/disable meal planning | Feature toggle |

#### `micronutrientStore`
**File:** `src/stores/micronutrientStore.ts`

| Test Case | Description |
|-----------|-------------|
| Load nutrient settings | Default demographic values |
| Update demographic settings | Recalculates RDA targets |
| Daily intake aggregation | Correct totals from log entries |
| Nutrient status calculation | deficient/adequate/excess |
| Custom nutrient targets | Override RDA values |
| Data completeness flag | Tracks missing nutrient data |

#### `foodSearchStore`
**File:** `src/stores/foodSearchStore.ts`

| Test Case | Description |
|-----------|-------------|
| Search by name | Matching results returned |
| Search by barcode | Exact barcode match |
| Filter by source | Only matching source type |
| Recent foods | Ordered by last_used_at |
| Frequent foods | Ordered by usage_count |
| Empty search results | Graceful empty state |
| API search (OpenFoodFacts) | External search integration |

#### `favoritesStore`
**File:** `src/stores/favoritesStore.ts`

| Test Case | Description |
|-----------|-------------|
| Add favorite food | Creates with sort_order |
| Remove favorite food | Deleted from DB |
| Reorder favorites | sort_order updates |
| Load favorites list | Ordered by sort_order |
| Duplicate prevention | food_id unique constraint |

#### `progressPhotoStore`
**File:** `src/stores/progressPhotoStore.ts`

| Test Case | Description |
|-----------|-------------|
| Create photo metadata | Correct fields persisted |
| Delete photo | Removed from DB |
| Create comparison | Links two photos |
| Delete comparison | Removed from DB |
| Filter by category | front/side/back filtering |
| Filter by date range | Correct date filtering |

#### `aiPhotoStore`
**File:** `src/stores/aiPhotoStore.ts`

| Test Case | Description |
|-----------|-------------|
| Upload photo | State management during upload |
| Analysis complete | Results stored |
| Error handling | Upload/analysis failures |
| Clear results | State reset |

---

## 2. Integration Tests (DB ops, store+DB, API)

### 2.1 Already Tested (7 files)

- `features/water/waterTracking.integration.test.ts` (294 lines)
- `features/onboarding/onboardingFlow.integration.test.ts` (260 lines)
- `features/restaurant/restaurantFlow.integration.test.ts` (448 lines)
- `features/legal/legalFlow.integration.test.ts` (363 lines)
- `features/watch/watchConnectivity.integration.test.ts` (521 lines)
- `features/tooltip/tooltipSystem.integration.test.ts` (437 lines)
- `features/dashboard/dashboardComponents.test.ts` (406 lines)

### 2.2 Missing — P0 (Critical)

| Test Suite | Description |
|------------|-------------|
| **Onboarding → Goal Creation → First Log** | Full onboarding creates profile, goal, settings |
| **Weekly Reflection Cycle** | 7 days of data → reflection → target adjustment |
| **Food Log → Daily Totals** | Adding/editing/deleting entries recalculates totals |
| **Weight Entry → Trend Calculation** | Weight updates propagate to trend/metabolism |

### 2.3 Missing — P1 (High)

| Test Suite | Description |
|------------|-------------|
| **Fasting Timer Lifecycle** | Config → start → end/cancel → history |
| **Meal Plan → Food Log** | Plan meal → mark as logged → appears in log |
| **Macro Cycling → Daily Targets** | Cycle config → correct daily target resolution |
| **Micronutrient Aggregation** | Log entries → nutrient intake calculation |
| **Progress Photo Comparisons** | Create photos → comparison pairs |
| **Restaurant → Log Entry** | Search restaurant → log food → appears in daily |
| **Import Data Flow** | Parse CSV → import → log entries created |
| **HealthKit Bidirectional Sync** | Export weight → import nutrition |

---

## 3. UI/Component Tests (screens, components, forms)

### 3.1 Already Tested (5 files)

- `__tests__/components.test.ts` (872 lines) — Various component tests
- `features/legal/DisclaimerCard.test.ts` (176 lines)
- `features/legal/content.test.ts` (229 lines)
- `components/voice/__tests__/VoiceToast.test.tsx`
- `components/healthkit/__tests__/HealthKitComponents.test.ts`

### 3.2 Missing — P2 (Medium)

#### Screen Render Tests

Each screen should be tested in 3 states: empty, loaded, error.

| Screen | Empty State | Loaded State | Error State |
|--------|-------------|--------------|-------------|
| Today Tab (Dashboard) | No logs message | Full daily view | DB error |
| Food Log Screen | "No entries" | Meals listed | Load failure |
| Add Food Screen | Search empty | Results shown | API error |
| Weight Screen | No entries | Chart + list | Load failure |
| Progress Tab | No photos | Photo grid | Load failure |
| Water Tracking | Zero glasses | Glasses shown | Load failure |
| Settings Screen | Default values | Custom values | — |
| Onboarding Flow | Step 1 | Mid-flow | — |
| Developer Tools | Zero counts | With data | — |
| Fasting Timer | Not configured | Active session | — |
| Meal Planning | No plans | Plans listed | — |
| Macro Cycling | Not enabled | Day targets | — |
| Restaurant Browser | No restaurants | Restaurant list | — |
| Micronutrients | No data | Daily summary | — |

#### Component Prop Variation Tests

| Component | Variations |
|-----------|------------|
| MacroRing / ProgressRing | 0%, 50%, 100%, >100% |
| MealCard | Empty, 1 entry, many entries |
| WeightChart | No data, few points, many points |
| FoodSearchResult | With/without brand, barcode |
| SettingsItem | Toggle, navigation, value display |
| ConfirmDialog | Default, destructive, info-only |
| CalendarStrip | Current day, past dates |
| NutrientBar | Deficient, adequate, excess |

#### Form Validation UI Tests

| Form | Validations |
|------|-------------|
| Quick Add | Calories required, optional macros |
| Custom Food | Name required, serving required |
| Weight Entry | Positive number, date selection |
| Goal Creation | Weight targets, rate selection |
| Profile Edit | Height, DOB format |

#### Accessibility Tests

| Test | Description |
|------|-------------|
| VoiceOver labels | All interactive elements have labels |
| Tap target sizes | Min 44x44 points |
| Color contrast | Text readable in both themes |
| Screen reader navigation | Logical tab order |

---

## 4. E2E Tests (user journeys, error recovery)

### 4.1 Missing — P3 (Low)

#### User Journeys

| Journey | Steps |
|---------|-------|
| **New User Onboarding** | Launch → Set goals → First food log → See dashboard |
| **Daily Logging Flow** | Open app → Add breakfast → Add lunch → Check totals |
| **Weekly Check-in** | Complete week → See reflection → Accept/adjust targets |
| **Restaurant Ordering** | Browse restaurants → Find food → Log meal |
| **Progress Tracking** | Log weight → Take photo → View trend |
| **Data Import** | Select file → Parse → Review → Import |

#### Error Recovery

| Scenario | Expected Behavior |
|----------|-------------------|
| Network failure during API search | Show error, offer retry |
| Database corruption | Reset option available |
| Interrupted seeding | Clean state, can retry |
| HealthKit permission denied | Graceful degradation |

#### Performance Tests

| Test | Threshold |
|------|-----------|
| Dashboard load with 6 months data | < 500ms |
| Food search (local) response | < 100ms |
| Scrolling food log (200+ entries) | 60fps |
| Weight chart render (180 points) | < 200ms |
| Seed database (6 months) | < 30s |

---

## 5. Test File Mapping (proposed `__tests__/` structure)

```
src/__tests__/
├── stores/
│   ├── settingsStore.test.ts          # P0 - NEW
│   ├── goalStore.test.ts              # P0 - NEW
│   ├── profileStore.test.ts           # P0 - NEW
│   ├── weightStore.test.ts            # P0 - NEW
│   ├── fastingStore.test.ts           # P1 - NEW
│   ├── macroCycleStore.test.ts        # P1 - NEW
│   ├── mealPlanStore.test.ts          # P1 - NEW
│   ├── micronutrientStore.test.ts     # P1 - NEW
│   ├── foodSearchStore.test.ts        # P1 - NEW
│   ├── favoritesStore.test.ts         # P1 - NEW
│   ├── progressPhotoStore.test.ts     # P1 - NEW
│   ├── aiPhotoStore.test.ts           # P1 - NEW
│   ├── subscriptionStore.test.ts      # P1 - NEW
│   ├── foodLogStore.test.ts           # EXISTS
│   ├── waterStore.test.ts             # EXISTS
│   ├── onboardingStore.test.ts        # EXISTS
│   ├── dashboardStore.test.ts         # EXISTS
│   ├── restaurantStore.test.ts        # EXISTS
│   ├── nutritionImportStore.test.ts   # EXISTS
│   ├── healthKitStore.test.ts         # EXISTS
│   └── healthConnectStore.test.ts     # EXISTS
├── repositories/
│   ├── settingsRepository.test.ts     # P0 - NEW
│   ├── logEntryRepository.test.ts     # P0 - NEW
│   ├── quickAddRepository.test.ts     # P0 - NEW
│   ├── favoriteRepository.test.ts     # P1 - NEW
│   ├── fastingRepository.test.ts      # P1 - NEW
│   ├── macroCycleRepository.test.ts   # P1 - NEW
│   ├── mealPlanRepository.test.ts     # P1 - NEW
│   ├── foodRepository.test.ts         # P1 - NEW
│   ├── profileRepository.test.ts      # EXISTS
│   ├── waterRepository.test.ts        # EXISTS
│   ├── weightRepository.test.ts       # EXISTS
│   ├── goalRepository.test.ts         # EXISTS
│   ├── restaurantRepository.test.ts   # EXISTS
│   └── onboardingRepository.test.ts   # EXISTS
├── services/
│   ├── validation.test.ts             # P0 - NEW
│   ├── seedDataService.test.ts        # P1 - NEW
│   ├── aiPhoto/                       # P1 - NEW
│   ├── restaurants/                   # P1 - NEW
│   ├── tdeeCalculator.test.ts         # EXISTS
│   ├── macroCalculator.test.ts        # EXISTS
│   ├── openFoodFactsApi.test.ts       # EXISTS
│   └── ...                            # EXISTS
├── features/
│   ├── onboarding-to-goal.integration.test.ts   # P0 - NEW
│   ├── weekly-reflection.integration.test.ts    # P0 - NEW
│   ├── food-log-totals.integration.test.ts      # P0 - NEW
│   ├── weight-trend.integration.test.ts         # P0 - NEW
│   ├── fasting/                                 # P1 - NEW
│   ├── mealPlan/                                # P1 - NEW
│   ├── macroCycle/                              # P1 - NEW
│   ├── micronutrients/                          # P1 - NEW
│   └── ...                                      # EXISTS
├── screens/                                     # P2 - ALL NEW
│   ├── TodayScreen.test.tsx
│   ├── FoodLogScreen.test.tsx
│   ├── AddFoodScreen.test.tsx
│   ├── WeightScreen.test.tsx
│   ├── ProgressScreen.test.tsx
│   ├── SettingsScreen.test.tsx
│   ├── OnboardingScreen.test.tsx
│   ├── DeveloperScreen.test.tsx
│   ├── FastingScreen.test.tsx
│   ├── MealPlanScreen.test.tsx
│   └── RestaurantScreen.test.tsx
├── components/                                  # P2 - ALL NEW
│   ├── MacroRing.test.tsx
│   ├── MealCard.test.tsx
│   ├── WeightChart.test.tsx
│   ├── FoodSearchResult.test.tsx
│   ├── SettingsItem.test.tsx
│   ├── NutrientBar.test.tsx
│   └── CalendarStrip.test.tsx
└── e2e/                                         # P3 - ALL NEW
    ├── newUserOnboarding.e2e.ts
    ├── dailyLogging.e2e.ts
    ├── weeklyCheckin.e2e.ts
    └── restaurantOrdering.e2e.ts
```

---

## 6. Priority Matrix

### P0 — Critical (implement first)

| # | Test Suite | Type | Est. Cases | Justification |
|---|-----------|------|------------|---------------|
| 1 | settingsStore | Unit | 15 | Drives all daily targets and app config |
| 2 | goalStore | Unit | 20 | TDEE/macro calculations core to app |
| 3 | profileStore | Unit | 12 | Onboarding gate, profile data |
| 4 | weightStore | Unit | 15 | Trend calc, HealthKit integration |
| 5 | settingsRepository | Unit | 10 | Settings CRUD correctness |
| 6 | logEntryRepository | Unit | 15 | Food logging CRUD paths |
| 7 | quickAddRepository | Unit | 10 | Quick add CRUD paths |
| 8 | Validation functions | Unit | 20 | Edge cases in all calculators |
| 9 | Onboarding → Goal integration | Integration | 8 | End-to-end onboarding |
| 10 | Weekly reflection cycle | Integration | 10 | Target adjustment accuracy |
| 11 | Food log → daily totals | Integration | 8 | Calorie counting accuracy |
| 12 | Weight → trend calculation | Integration | 8 | Weight trend accuracy |

**P0 Total: ~151 new test cases**

### P1 — High (implement second)

| # | Test Suite | Type | Est. Cases |
|---|-----------|------|------------|
| 1 | fastingStore | Unit | 15 |
| 2 | macroCycleStore | Unit | 12 |
| 3 | mealPlanStore | Unit | 10 |
| 4 | micronutrientStore | Unit | 12 |
| 5 | foodSearchStore | Unit | 10 |
| 6 | favoritesStore | Unit | 8 |
| 7 | progressPhotoStore | Unit | 10 |
| 8 | aiPhotoStore | Unit | 8 |
| 9 | subscriptionStore | Unit | 8 |
| 10 | Remaining repositories (8) | Unit | 60 |
| 11 | Feature integration tests (8) | Integration | 40 |

**P1 Total: ~193 new test cases**

### P2 — Medium (implement third)

| # | Test Suite | Type | Est. Cases |
|---|-----------|------|------------|
| 1 | Screen render tests (14 screens) | UI | 42 |
| 2 | Component prop tests (8 components) | UI | 40 |
| 3 | Form validation UI tests (5 forms) | UI | 25 |
| 4 | Accessibility tests | UI | 20 |

**P2 Total: ~127 new test cases**

### P3 — Low (implement last)

| # | Test Suite | Type | Est. Cases |
|---|-----------|------|------------|
| 1 | E2E user journeys (6 flows) | E2E | 30 |
| 2 | Error recovery scenarios (4) | E2E | 12 |
| 3 | Performance benchmarks (5) | Perf | 5 |
| 4 | Visual regression | Visual | 20 |

**P3 Total: ~67 new test cases**

---

## 7. Implementation Checklist

### Phase 1: P0 Critical Tests

- [ ] `src/__tests__/stores/settingsStore.test.ts`
- [ ] `src/__tests__/stores/goalStore.test.ts`
- [ ] `src/__tests__/stores/profileStore.test.ts`
- [ ] `src/__tests__/stores/weightStore.test.ts`
- [ ] `src/__tests__/repositories/settingsRepository.test.ts`
- [ ] `src/__tests__/repositories/logEntryRepository.test.ts`
- [ ] `src/__tests__/repositories/quickAddRepository.test.ts`
- [ ] `src/__tests__/services/validation.test.ts`
- [ ] `src/__tests__/features/onboarding-to-goal.integration.test.ts`
- [ ] `src/__tests__/features/weekly-reflection.integration.test.ts`
- [ ] `src/__tests__/features/food-log-totals.integration.test.ts`
- [ ] `src/__tests__/features/weight-trend.integration.test.ts`

### Phase 2: P1 High-Priority Tests

- [ ] `src/__tests__/stores/fastingStore.test.ts`
- [ ] `src/__tests__/stores/macroCycleStore.test.ts`
- [ ] `src/__tests__/stores/mealPlanStore.test.ts`
- [ ] `src/__tests__/stores/micronutrientStore.test.ts`
- [ ] `src/__tests__/stores/foodSearchStore.test.ts`
- [ ] `src/__tests__/stores/favoritesStore.test.ts`
- [ ] `src/__tests__/stores/progressPhotoStore.test.ts`
- [ ] `src/__tests__/stores/aiPhotoStore.test.ts`
- [ ] `src/__tests__/stores/subscriptionStore.test.ts`
- [ ] `src/__tests__/repositories/favoriteRepository.test.ts`
- [ ] `src/__tests__/repositories/fastingRepository.test.ts`
- [ ] `src/__tests__/repositories/macroCycleRepository.test.ts`
- [ ] `src/__tests__/repositories/mealPlanRepository.test.ts`
- [ ] `src/__tests__/repositories/foodRepository.test.ts`
- [ ] Feature integration tests (fasting, meal plan, macro cycle, micronutrients, photo, restaurant, import, HealthKit)

### Phase 3: P2 UI Tests

- [ ] Screen render tests (14 screens × 3 states)
- [ ] Component prop variation tests (8 components)
- [ ] Form validation UI tests (5 forms)
- [ ] Accessibility audit tests

### Phase 4: P3 E2E & Performance

- [ ] E2E user journey tests (6 flows)
- [ ] Error recovery scenarios
- [ ] Performance benchmarks
- [ ] Visual regression baseline

---

## Estimated Impact

| Phase | New Tests | Running Total | Coverage Gain |
|-------|-----------|---------------|---------------|
| Current | ~3,100 | 3,100 | Baseline |
| P0 | +151 | 3,251 | +15% critical paths |
| P1 | +193 | 3,444 | +20% feature coverage |
| P2 | +127 | 3,571 | +10% UI coverage |
| P3 | +67 | 3,638 | +5% E2E coverage |
| **Total** | **+538** | **~3,638** | **+50% overall** |
