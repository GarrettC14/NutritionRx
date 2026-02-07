# NutritionRx E2E Test Suite — Cleanup & Assertion Tightening

## Context

A Codex audit of the NutritionRx test suite identified systemic false-positive risk: core flows pass even when behavior is broken due to `optional: true` on critical assertions, smoke tests that verify navigation but not business outcomes, brittle Health Connect tests using coordinate taps and text selectors, and a non-executed E2E spec file. This spec addresses all findings in priority order.

**This is a Claude Code implementation prompt.** Execute phases sequentially. Run tests after each phase before proceeding.

---

## Audit Metrics (Starting State)

- Maestro inventory: 42 YAML files (31 feature flows, 9 utils, 1 smoke, 1 config)
- Assertion profile: 176 `tapOn`, 148 `assertVisible`, **0 `assertNotVisible`**, 25 `optional: true`
- TestID utilization: ~209 / 404 IDs referenced (~51.7%)
- Jest suites: 107 files; 2 test-like files not executed

---

## Phase 1: Eliminate False-Positive Risk on Core Flows

**Goal:** No critical user journey should pass when the underlying behavior is broken. Convert `optional` assertions/actions to hard assertions for destructive, premium, and paywall paths.

### Step 1: Audit All `optional: true` Usage

```bash
# List every optional step with surrounding context
grep -B3 -A3 "optional: true" .maestro/**/*.yaml .maestro/*.yaml 2>/dev/null

# Count total
grep -rc "optional: true" .maestro/ --include="*.yaml" 2>/dev/null
```

**Rules for `optional: true` (same as GymRx):**

- ✅ ALLOWED on: OS permission dialogs, system alerts, keyboard dismiss, animation timing waits, onboarding screens that only show on first launch
- ❌ NOT ALLOWED on: Delete confirmations, premium feature interactions, paywall controls, data entry steps, any assertion that validates business behavior

### Step 2: Fix Specific Flows

#### 1A: `delete-entry.yaml` (P0)

**Current problem:** Delete confirmation dialog tap is optional — the entire destructive action may never execute, and the flow still passes.

```bash
# View the current flow around line 91
sed -n '85,100p' .maestro/flows/delete-entry.yaml 2>/dev/null || find .maestro -name "delete-entry.yaml" -exec sed -n '85,100p' {} \;
```

**Required changes:**

1. Remove `optional: true` from the delete confirmation tap
2. Add `assertVisible` on the confirmation dialog BEFORE tapping confirm (strict)
3. Add `assertNotVisible` on the deleted entry AFTER confirmation (this is the critical behavioral assertion — note the audit found **0** `assertNotVisible` across the entire suite)
4. Verify the daily total/calorie count changed after deletion

```yaml
# Example pattern for delete assertion
- assertVisible:
    text: "Delete" # or whatever the confirmation button text is
- tapOn:
    text: "Delete"
# After delete — verify the entry is gone
- assertNotVisible:
    id: "the-deleted-entry-testid" # find the actual testID
# Verify totals updated
- assertVisible:
    id: "daily-calorie-total" # verify number changed
```

#### 1B: `macro-cycling.yaml` (P0)

**Current problem:** Entire premium interactions are optional — macro cycling feature can be completely broken and the flow passes.

```bash
sed -n '55,70p' .maestro/flows/macro-cycling.yaml 2>/dev/null || find .maestro -name "macro-cycling.yaml" -exec sed -n '55,70p' {} \;
```

**Required changes:**

1. Remove `optional: true` from all premium feature interaction steps
2. Split into two flows or two clear sections:
   - **Free user path:** Verify premium gate is shown (strict `assertVisible` on paywall/lock indicator)
   - **Premium user path:** Verify macro cycling UI loads with actual content (cycle configuration, day assignments, macro targets)
3. Each path must have at least one strict behavioral assertion (not just "screen loaded")

#### 1C: `meal-planning.yaml` (P0)

**Current problem:** Premium interactions at lines 75 and 91 are optional.

```bash
sed -n '70,95p' .maestro/flows/meal-planning.yaml 2>/dev/null || find .maestro -name "meal-planning.yaml" -exec sed -n '70,95p' {} \;
```

**Required changes:**

1. Remove `optional: true` from premium meal planning interactions
2. Add strict assertions:
   - Meal plan creation: verify plan appears after creation
   - Meal plan content: verify meals/foods are listed within the plan
   - If gated: verify paywall shows (strict)

#### 1D: `paywall.yaml` (P0)

**Current problem:** Critical paywall controls (subscription options, pricing, restore button) are optional.

```bash
sed -n '20,35p' .maestro/flows/paywall.yaml 2>/dev/null || find .maestro -name "paywall.yaml" -exec sed -n '20,35p' {} \;
```

**Required changes:**

1. Remove `optional: true` from ALL paywall content assertions
2. Add strict assertions for:
   - `assertVisible` on subscription tier options (monthly/annual pricing)
   - `assertVisible` on restore purchases button
   - `assertVisible` on terms/privacy links
3. The paywall flow is a trust-critical screen — every element must be strictly verified

**Verification:** After fixing all four flows, temporarily break each one's UI (comment out a component in source) and confirm the Maestro flow FAILS. Then restore the component.

---

## Phase 2: Upgrade Smoke & High-Value Flows to Assert Business Outcomes

**Goal:** Flows should verify that data was actually persisted and totals updated — not just that screens opened.

### 2A: `critical-path.yaml` (P1)

**Current problem:** Logs food but never verifies the entry appears or that calorie/macro totals changed.

```bash
cat .maestro/smoke/critical-path.yaml 2>/dev/null || find .maestro -name "critical-path.yaml" -exec cat {} \;
```

**Required assertions to add:**

After food logging (around line 54):

- `assertVisible` on the newly logged food entry (by name or testID)
- `assertVisible` on updated calorie total (verify it's non-zero or changed from baseline)
- If possible: capture the total before logging, log food, verify total increased

After second interaction (around line 77):

- Same pattern: verify the action produced a visible outcome, not just that the screen loaded

```yaml
# Pattern: Assert business outcome after food log
- tapOn:
    id: "log-food-button" # adjust to actual ID
# ... food selection/entry steps ...
- assertVisible:
    id: "food-entry-name" # the logged entry should appear
- assertVisible:
    id: "daily-calorie-total" # total should reflect the addition
```

### 2B: `quick-add.yaml` (P1)

**Current problem:** Quick-adds food but doesn't verify the entry persisted or totals changed.

```bash
sed -n '90,110p' .maestro/flows/quick-add.yaml 2>/dev/null || find .maestro -name "quick-add.yaml" -exec sed -n '90,110p' {} \;
```

**Required assertions:**

- After quick-add submission: `assertVisible` on the new entry in the food log
- Verify calorie/macro totals updated
- If quick-add has a "recent" or "frequent" section: verify the item appears there on subsequent use

### 2C: `favorite-food.yaml` (P1)

**Current problem:** Favorites a food but doesn't verify it persists in the favorites list.

```bash
sed -n '70,85p' .maestro/flows/favorite-food.yaml 2>/dev/null || find .maestro -name "favorite-food.yaml" -exec sed -n '70,85p' {} \;
```

**Required assertions:**

- After favoriting: navigate to favorites list and `assertVisible` on the favorited item
- After unfavoriting: `assertNotVisible` on the item in favorites list

### 2D: `widget-management.yaml` (P1)

**Current problem:** Manages widgets but doesn't verify changes stuck.

```bash
sed -n '70,85p' .maestro/flows/widget-management.yaml 2>/dev/null || find .maestro -name "widget-management.yaml" -exec sed -n '70,85p' {} \;
```

**Required assertions:**

- After adding/removing/reordering a widget: verify the dashboard reflects the change
- If widget has data: verify the widget shows correct data (not just that it rendered)

**Verification:** Run `critical-path.yaml` and each fixed flow individually — all must pass. Spot-check one by temporarily removing the food log insertion in source code and confirming the flow fails.

---

## Phase 3: Fix Health Connect E2E Flow

**Goal:** Make Health Connect testing reliable and maintainable.

### 3A: Audit Current State

```bash
cat .maestro/flows/health-connect-flow.yaml 2>/dev/null || find .maestro -name "health-connect-flow.yaml" -exec cat {} \;
wc -l .maestro/flows/health-connect-flow.yaml 2>/dev/null || find .maestro -name "health-connect-flow.yaml" -exec wc -l {} \;
```

**Current problems:**

- Heavy reliance on text-based selectors (brittle across copy changes, localization)
- Coordinate-based back tap at line ~310 (breaks on different screen sizes/densities)
- Single monolithic file with repeated `---` blocks (hard to run/retry granularly)

### 3B: Split Into Focused Flows

Break `health-connect-flow.yaml` into 3-4 focused files:

```
.maestro/health/
├── health-connect-permissions.yaml    # Permission request/grant flow
├── health-connect-sync-enable.yaml    # Toggle sync on, verify status
├── health-connect-data-display.yaml   # Verify synced data appears correctly
└── health-connect-sync-disable.yaml   # Toggle sync off, verify disconnected
```

### 3C: Replace Brittle Selectors

For every text-based selector in the health flows:

```bash
# Find all text-based selectors in health connect flow
grep -n "text:" .maestro/flows/health-connect-flow.yaml 2>/dev/null || find .maestro -name "health-connect-flow.yaml" -exec grep -n "text:" {} \;
```

1. Search the source code for corresponding components
2. Add `testID` props if they don't exist (follow existing naming convention)
3. Replace `text:` selectors with `id:` selectors in the YAML

```bash
# Find existing testID naming patterns
grep -rn "testID=" src/ app/ --include="*.tsx" | head -20
# Identify the pattern (e.g., "health-connect-toggle", "settings-sync-status")
```

### 3D: Remove Coordinate-Based Taps

```bash
# Find coordinate taps
grep -n "point\|tapOn.*x:\|tapOn.*y:" .maestro/flows/health-connect-flow.yaml 2>/dev/null
```

Replace every coordinate tap with:

- A `testID`-based tap, OR
- A `back` command (Maestro's built-in back navigation), OR
- A `pressKey: back` for Android

```yaml
# BAD: coordinate tap
- tapOn:
    point: "50,100"

# GOOD: semantic back
- back

# GOOD: testID-based
- tapOn:
    id: "header-back-button"
```

**Verification:** Run each new health flow individually on both an Android emulator and iOS simulator (if available). Verify they pass without flakiness across 3 consecutive runs.

---

## Phase 4: Fix Non-Executed Test Files

**Goal:** Every test file in the repo is either executed or explicitly removed.

### 4A: Voice Assistant E2E Spec

```bash
# Find the file
find . -name "voiceAssistant.e2e.spec.ts" -not -path "*/node_modules/*"
cat $(find . -name "voiceAssistant.e2e.spec.ts" -not -path "*/node_modules/*")

# Confirm Jest config only matches *.test.ts(x)
grep -A5 "testMatch\|testRegex\|testPathPattern" jest.config.js
```

**Current problem:** Jest config only runs `*.test.ts(x)` files. `voiceAssistant.e2e.spec.ts` is never executed.

**Action — choose one:**

- (a) **Rename** to `voiceAssistant.e2e.test.ts` so Jest picks it up, then fix any failing tests
- (b) **Convert** to a Maestro flow if it's testing UI interactions
- (c) **Move** to `docs/fixtures/` or `__fixtures__/` if it's intentionally a reference/fixture file
- (d) **Delete** if it's stale and the voice assistant feature has its own test coverage elsewhere

**Decision criteria:** Read the file contents. If it has real test logic that should run, rename it (option a). If it's placeholder/skeleton, delete it (option d).

### 4B: Check for Other Non-Executed Files

```bash
# Find all test-like files that DON'T match Jest's pattern
find . -name "*.spec.ts" -o -name "*.spec.tsx" -o -name "*.e2e.ts" -o -name "*.e2e.tsx" | grep -v node_modules | grep -v ".test."
```

Apply the same decision framework to any other non-executed files found.

**Verification:** `npx jest --listTests | wc -l` should account for all test files. No test-like files should exist outside Jest's match pattern unless explicitly documented.

---

## Phase 5: Add Package Scripts & CI Readiness

**Goal:** Standardized, repeatable test execution.

### 5A: Add Maestro Scripts to `package.json`

```json
{
  "scripts": {
    "test:maestro": "maestro test .maestro/",
    "test:maestro:smoke": "maestro test .maestro/smoke/",
    "test:maestro:flow": "maestro test",
    "test:maestro:premium": "maestro test .maestro/flows/macro-cycling.yaml .maestro/flows/meal-planning.yaml .maestro/flows/paywall.yaml"
  }
}
```

- `test:maestro:flow` takes a path argument: `npm run test:maestro:flow -- .maestro/flows/delete-entry.yaml`
- Adjust paths to match actual directory structure after reorganization

### 5B: Add `clearState` to All Flows

```bash
# Find flows missing clearState
for f in $(find .maestro -name "*.yaml" -not -path "*utils*" -not -path "*config*"); do
  if ! grep -q "clearState" "$f" 2>/dev/null; then
    echo "MISSING clearState: $f"
  fi
done
```

Every flow should start with:

```yaml
appId: com.cascadesoftwaresolutions.nutritionrx # verify against app.json
---
- clearState
- launchApp
```

**Exceptions:** Utility/helper flows called via `runFlow` and flows explicitly testing data persistence.

**Verification:** `npm run test:maestro:smoke` executes and returns clean exit code.

---

## Phase 6: Increase TestID Coverage

**Goal:** Close the gap from 51.7% testID utilization to >80%.

### 6A: Identify Untested Screens and Components

```bash
# All testIDs in the app
grep -rn "testID=" src/ app/ --include="*.tsx" --include="*.ts" | sed 's/.*testID=["'\'']\([^"'\'']*\)["'\''].*/\1/' | sort -u > /tmp/app-testids.txt

# All testIDs used in Maestro flows
grep -rn "id:" .maestro/ --include="*.yaml" | sed 's/.*id: *["'\'']\?\([^"'\'']*\)["'\'']\?.*/\1/' | sort -u > /tmp/maestro-testids.txt

# TestIDs that exist in app but are never tested
comm -23 /tmp/app-testids.txt /tmp/maestro-testids.txt > /tmp/untested-testids.txt
wc -l /tmp/untested-testids.txt
cat /tmp/untested-testids.txt
```

### 6B: Prioritize by Screen Importance

Group untested testIDs by screen/feature area. Prioritize adding assertions for:

1. **Food logging flow** — any untested IDs on the primary logging screens
2. **Dashboard/home** — daily totals, macro rings, progress indicators
3. **Settings** — preference toggles, data management
4. **Search/barcode** — food search results, barcode scan UI

For each high-priority untested ID, add it as an assertion in the most relevant existing Maestro flow rather than creating new flows.

### 6C: Add Missing testIDs to Source

```bash
# Find interactive elements WITHOUT testIDs
grep -rn "onPress\|onChangeText\|onSubmit" src/ app/ --include="*.tsx" | grep -v "testID" | head -30
```

For buttons, inputs, and key display elements that lack testIDs:

1. Add testIDs following the existing naming convention
2. Add corresponding assertions in relevant Maestro flows

**Verification:** Re-run the utilization check. Target: >80% of app testIDs referenced in at least one Maestro flow.

---

## Phase 7: Integration Test Accuracy (P2)

**Goal:** Clarify what "integration" tests actually test.

### 7A: Audit Mock Boundaries

```bash
# Find integration test files
find . -name "*integration*" -o -name "*Integration*" | grep -v node_modules

# Check mock usage in integration tests
grep -n "jest.mock\|jest.fn\|mockImplementation\|mockReturnValue" $(find . -name "*integration*" -o -name "*Integration*" | grep -v node_modules)
```

**Current problem:** Files like `foodLoggingIntegration.test.ts` mock the entire repository layer, making them orchestration/unit tests, not true integration tests.

**Action:** This is not a blocker — these tests are still valuable. But for clarity:

1. If time allows, rename files to reflect what they actually test (e.g., `foodLoggingOrchestration.test.ts`)
2. Add a comment at the top of each file: `// Tests service orchestration with mocked repositories. For full persistence integration, see Maestro flows.`
3. Do NOT delete or reduce these tests — they catch real bugs at the service layer

### 7B: Jest Coverage Exclusion

```bash
grep -A10 "coveragePathIgnorePatterns\|collectCoverageFrom" jest.config.js
```

**Current problem:** `src/app/` (route/screen files) is excluded from coverage, hiding gaps in routed UI behavior.

**Action:** This is a known tradeoff — screen files are hard to unit test meaningfully. Document the decision:

1. Add a comment in `jest.config.js` explaining why `src/app/` is excluded
2. Note that screen behavior coverage comes from Maestro E2E, not Jest unit tests

---

## Directory Reorganization

If the `.maestro/` directory isn't already organized by feature, restructure:

```
.maestro/
├── config.yaml                      # Global Maestro config
├── smoke/
│   └── critical-path.yaml           # Master smoke test
├── flows/
│   ├── food-logging/
│   │   ├── log-food.yaml
│   │   ├── quick-add.yaml
│   │   ├── favorite-food.yaml
│   │   └── delete-entry.yaml
│   ├── premium/
│   │   ├── paywall.yaml
│   │   ├── macro-cycling.yaml
│   │   └── meal-planning.yaml
│   ├── health/
│   │   ├── health-connect-permissions.yaml
│   │   ├── health-connect-sync-enable.yaml
│   │   ├── health-connect-data-display.yaml
│   │   └── health-connect-sync-disable.yaml
│   ├── dashboard/
│   │   └── widget-management.yaml
│   └── settings/
│       └── ...
├── utils/                           # Shared helper flows (runFlow targets)
│   └── ...
└── _TODO.md                         # Missing flows, known gaps
```

Update any `runFlow` cross-references after moving files.

---

## Execution Checklist

Run these phases in order. Do NOT skip ahead.

- [ ] **Phase 1:** Remove `optional: true` from critical flows (delete-entry, macro-cycling, meal-planning, paywall) and add strict behavioral assertions
- [ ] **Phase 1 verification:** Each fixed flow passes AND fails when UI is intentionally broken
- [ ] **Phase 2:** Add business outcome assertions to critical-path, quick-add, favorite-food, widget-management
- [ ] **Phase 2 verification:** Smoke test passes with new assertions
- [ ] **Phase 3:** Split health-connect-flow.yaml, replace text/coordinate selectors with testIDs
- [ ] **Phase 3 verification:** Health flows pass 3x consecutively without flakes
- [ ] **Phase 4:** Fix or remove voiceAssistant.e2e.spec.ts and any other non-executed test files
- [ ] **Phase 5:** Add package.json scripts, add clearState to all flows
- [ ] **Phase 6:** Close testID coverage gap toward >80%
- [ ] **Phase 7:** Document integration test mock boundaries and coverage exclusions
- [ ] **Final:** `npm run test:maestro` — full suite green

## Notes for Claude Code

- **This spec is strictly cleanup and tightening.** Do not create new feature flows beyond what's needed to replace the monolithic health-connect-flow.yaml.
- The `assertNotVisible` count across the entire suite is currently **zero**. This is a major gap. Every delete, remove, unfavorite, or disable action should have a corresponding `assertNotVisible` to verify the thing is actually gone.
- When adding testIDs to source code, follow the existing naming convention. Run `grep -rn "testID=" src/ app/ --include="*.tsx" | head -20` to identify the pattern before adding new ones.
- NutritionRx uses "Nourished Calm" design language — UI text may use warm/supportive phrasing. When writing assertions with `text:` selectors, match the exact copy from the source, not what you'd expect it to say.
- The app has a `__DEV__` premium bypass. Flows should test the actual free-user experience. If the bypass is active during testing, note it as a blocker.
- If a flow references UI that doesn't exist yet (feature not built), delete the flow and log it in `_TODO.md`.
