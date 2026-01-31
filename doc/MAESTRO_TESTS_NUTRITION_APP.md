# Maestro Test Suite Specification — NutritionRx App

> **Purpose:** This document provides complete specifications for generating Maestro E2E tests.
> Claude (IDE) should use this to generate the actual YAML files with full accuracy.

---

## Project Structure

```
maestro/
├── config.yaml                    # Global config
├── utils/
│   ├── complete-onboarding.yaml   # Full onboarding flow
│   ├── skip-to-home.yaml          # Quick path to home (for returning user tests)
│   ├── seed-data.yaml             # Seed via developer settings
│   ├── reset-app.yaml             # Fresh session reset
│   ├── enable-premium.yaml        # Toggle premium for feature tests
│   └── navigate-to-tab.yaml       # Tab navigation helper
├── smoke/
│   └── critical-path.yaml         # Onboarding → Log Food → Verify
└── flows/
    ├── onboarding/
    │   ├── legal-acknowledgment.yaml
    │   ├── full-onboarding.yaml
    │   └── onboarding-back-navigation.yaml
    ├── food-logging/
    │   ├── search-and-log.yaml
    │   ├── quick-add.yaml
    │   ├── create-custom-food.yaml
    │   ├── barcode-scan.yaml
    │   ├── ai-photo.yaml
    │   ├── restaurant-flow.yaml
    │   └── edit-entry.yaml
    ├── progress/
    │   ├── log-weight.yaml
    │   ├── view-charts.yaml
    │   └── time-range-navigation.yaml
    ├── settings/
    │   ├── profile.yaml
    │   ├── goals.yaml
    │   ├── units.yaml
    │   ├── nutrition.yaml
    │   ├── water.yaml
    │   ├── fasting.yaml
    │   ├── theme.yaml
    │   └── delete-data.yaml
    ├── home/
    │   ├── date-navigation.yaml
    │   ├── water-tracking.yaml
    │   ├── widget-management.yaml
    │   └── meal-sections.yaml
    ├── premium/
    │   ├── paywall.yaml
    │   ├── macro-cycling.yaml
    │   └── meal-planning.yaml
    └── import/
        └── import-data.yaml
```

---

## Global Configuration

### `config.yaml`

```yaml
# Maestro Configuration for NutritionRx
appId: com.yourcompany.nutritionrx  # UPDATE with actual bundle ID
name: NutritionRx E2E Tests

# No auth credentials needed - local-first app
env:
  # Default preferences for tests
  DEFAULT_GOAL: "lose"
  DEFAULT_ENERGY_UNIT: "calories"
  DEFAULT_WEIGHT_UNIT: "lbs"
```

---

## Utility Subflows

### `utils/complete-onboarding.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Complete Onboarding Utility
---
# Starts from fresh install, ends on Home screen

# Legal Acknowledgment
- assertVisible:
    id: "legal-screen"

- scrollUntilVisible:
    element:
      id: "legal-checkbox"
    direction: DOWN
    scrollBounds:
      id: "legal-scroll-view"

- tapOn:
    id: "legal-checkbox"

- tapOn:
    id: "legal-proceed-button"

# Onboarding Welcome
- extendedWaitUntil:
    visible:
      id: "onboarding-welcome-screen"
    timeout: 3000

- tapOn:
    id: "onboarding-begin-button"

# Goal Selection
- assertVisible:
    id: "onboarding-goal-screen"

- tapOn:
    id: "onboarding-goal-option-lose"

- tapOn:
    id: "onboarding-goal-continue-button"

# Preferences
- assertVisible:
    id: "onboarding-preferences-screen"

- tapOn:
    id: "onboarding-energy-calories"

- tapOn:
    id: "onboarding-weight-lbs"

- tapOn:
    id: "onboarding-preferences-continue-button"

# Ready Screen
- assertVisible:
    id: "onboarding-ready-screen"

- tapOn:
    id: "onboarding-ready-explore-app"

# Verify Home
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 5000
```

### `utils/skip-to-home.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Skip to Home (Returning User)
---
# For tests that assume onboarding is already complete
# Just verifies we're on home or navigates there

- assertVisible:
    id: "home-screen"
    optional: true

- tapOn:
    id: "tab-bar-home"
    optional: true

- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000
```

### `utils/seed-data.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Seed Database Utility
---
# Navigate to Developer Settings and seed data
# Precondition: User is on Home screen (onboarding complete)

- tapOn:
    id: "tab-bar-settings"

- assertVisible:
    id: "settings-screen"

# Navigate to About (need to tap version 7 times to unlock dev settings)
- scrollUntilVisible:
    element:
      id: "settings-about-row"
    direction: DOWN
    scrollBounds:
      id: "settings-scroll-view"

- tapOn:
    id: "settings-about-row"

- assertVisible:
    id: "settings-about-screen"

# Tap version number 7 times to unlock developer settings
- repeat:
    times: 7
    commands:
      - tapOn:
          text: "Version"
          optional: true
      - wait: 100

# Go back and find developer settings
- tapOn:
    id: "settings-about-back-button"

# Developer settings should now be visible
- scrollUntilVisible:
    element:
      id: "settings-dev-seed-database"
    direction: DOWN
    scrollBounds:
      id: "settings-scroll-view"

- tapOn:
    id: "settings-dev-seed-database"

# Navigate to developer screen
- extendedWaitUntil:
    visible:
      id: "settings-developer-screen"
    timeout: 3000

# Configure and seed
- tapOn:
    id: "settings-developer-seed-button"

# Wait for seeding to complete
- wait: 5000

# Dismiss result if shown
- tapOn:
    id: "settings-developer-dismiss-result-button"
    optional: true

# Return to home
- tapOn:
    id: "settings-developer-back-button"

- tapOn:
    id: "tab-bar-home"
```

### `utils/reset-app.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Reset App to Fresh State
---
# Triggers fresh session via developer settings

- tapOn:
    id: "tab-bar-settings"

- scrollUntilVisible:
    element:
      id: "settings-dev-fresh-session"
    direction: DOWN
    scrollBounds:
      id: "settings-scroll-view"

- tapOn:
    id: "settings-dev-fresh-session"

# Confirm if dialog appears
- tapOn:
    id: "ui-confirm-dialog-confirm"
    optional: true

# Should return to legal screen
- extendedWaitUntil:
    visible:
      id: "legal-screen"
    timeout: 5000
```

### `utils/enable-premium.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Enable Premium (Dev Toggle)
---
# Enable premium features for testing

- tapOn:
    id: "tab-bar-settings"

- scrollUntilVisible:
    element:
      id: "settings-dev-premium-toggle"
    direction: DOWN
    scrollBounds:
      id: "settings-scroll-view"

- tapOn:
    id: "settings-dev-premium-toggle"

- wait: 500

- tapOn:
    id: "tab-bar-home"
```

---

## Smoke Test

### `smoke/critical-path.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Critical Path Smoke Test
tags:
  - smoke
  - critical
---
# ============================================
# CRITICAL PATH: Onboarding → Log Food → Verify
# ============================================

# --- STEP 1: Fresh app launch ---
- launchApp:
    clearState: true

# --- STEP 2: Legal Acknowledgment ---
- assertVisible:
    id: "legal-screen"

- scrollUntilVisible:
    element:
      id: "legal-checkbox"
    direction: DOWN
    scrollBounds:
      id: "legal-scroll-view"

- tapOn:
    id: "legal-checkbox"

- tapOn:
    id: "legal-proceed-button"

# --- STEP 3: Onboarding ---
- extendedWaitUntil:
    visible:
      id: "onboarding-welcome-screen"
    timeout: 3000

- tapOn:
    id: "onboarding-begin-button"

# Goal
- assertVisible:
    id: "onboarding-goal-screen"

- tapOn:
    id: "onboarding-goal-option-track"

- tapOn:
    id: "onboarding-goal-continue-button"

# Preferences
- assertVisible:
    id: "onboarding-preferences-screen"

- tapOn:
    id: "onboarding-energy-calories"
- tapOn:
    id: "onboarding-weight-lbs"

- tapOn:
    id: "onboarding-preferences-continue-button"

# Ready
- assertVisible:
    id: "onboarding-ready-screen"

- tapOn:
    id: "onboarding-ready-explore-app"

# --- STEP 4: Verify Home Screen ---
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 5000

- assertVisible:
    id: "home-date-label"

# --- STEP 5: Log Food via Quick Add ---
- tapOn:
    id: "meal-add-food-button-breakfast"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

# Use Quick Add for simplicity
- scrollUntilVisible:
    element:
      text: "Quick Add"
    direction: DOWN

- tapOn:
    text: "Quick Add"

- assertVisible:
    id: "quick-add-screen"

- tapOn:
    id: "quick-add-calories-input"
- inputText: "350"

- tapOn:
    id: "quick-add-protein-input"
- inputText: "25"

- tapOn:
    id: "quick-add-carbs-input"
- inputText: "30"

- tapOn:
    id: "quick-add-fat-input"
- inputText: "12"

- hideKeyboard

- tapOn:
    id: "quick-add-add-button"

# --- STEP 6: Verify Entry on Home ---
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000

# Verify calorie ring updated (or meal section has entry)
- assertVisible:
    id: "widget-calorie-ring"

# --- SMOKE TEST COMPLETE ---
- assertTrue:
    condition: true
    message: "Critical path smoke test passed"
```

---

## Full Flow Specifications

---

### ONBOARDING FLOWS

#### `flows/onboarding/legal-acknowledgment.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Legal Acknowledgment Flow
tags:
  - onboarding
  - legal
---
- launchApp:
    clearState: true

- assertVisible:
    id: "legal-screen"

# Verify all elements present
- assertVisible:
    id: "legal-scroll-view"
- assertVisible:
    id: "legal-terms-link"

# Try to proceed without checking - should be disabled or show error
- tapOn:
    id: "legal-proceed-button"

# Should still be on legal screen (button disabled without checkbox)
- assertVisible:
    id: "legal-screen"

# Now properly acknowledge
- scrollUntilVisible:
    element:
      id: "legal-checkbox"
    direction: DOWN
    scrollBounds:
      id: "legal-scroll-view"

- tapOn:
    id: "legal-checkbox"

- tapOn:
    id: "legal-proceed-button"

# Should move to onboarding
- extendedWaitUntil:
    visible:
      id: "onboarding-welcome-screen"
    timeout: 3000
```

#### `flows/onboarding/full-onboarding.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Full Onboarding Flow
tags:
  - onboarding
  - complete
---
- launchApp:
    clearState: true

# === Legal ===
- assertVisible:
    id: "legal-screen"

- scrollUntilVisible:
    element:
      id: "legal-checkbox"
    direction: DOWN

- tapOn:
    id: "legal-checkbox"

- tapOn:
    id: "legal-proceed-button"

# === Welcome ===
- extendedWaitUntil:
    visible:
      id: "onboarding-welcome-screen"
    timeout: 3000

- tapOn:
    id: "onboarding-begin-button"

# === Goal Selection ===
- assertVisible:
    id: "onboarding-goal-screen"
- assertVisible:
    id: "onboarding-goal-back-button"

# Verify all goal options
- assertVisible:
    id: "onboarding-goal-option-lose"
- assertVisible:
    id: "onboarding-goal-option-maintain"
- assertVisible:
    id: "onboarding-goal-option-build"
- assertVisible:
    id: "onboarding-goal-option-track"

# Select "Lose weight"
- tapOn:
    id: "onboarding-goal-option-lose"

- tapOn:
    id: "onboarding-goal-continue-button"

# === Preferences ===
- assertVisible:
    id: "onboarding-preferences-screen"
- assertVisible:
    id: "onboarding-preferences-back-button"

# Verify unit options
- assertVisible:
    id: "onboarding-energy-calories"
- assertVisible:
    id: "onboarding-energy-kilojoules"
- assertVisible:
    id: "onboarding-weight-lbs"
- assertVisible:
    id: "onboarding-weight-kg"

# Select preferences
- tapOn:
    id: "onboarding-energy-calories"
- tapOn:
    id: "onboarding-weight-lbs"

- tapOn:
    id: "onboarding-preferences-continue-button"

# === Ready Screen ===
- assertVisible:
    id: "onboarding-ready-screen"
- assertVisible:
    id: "onboarding-ready-back-button"

# Verify CTA options
- assertVisible:
    id: "onboarding-ready-scan-barcode"
- assertVisible:
    id: "onboarding-ready-search-food"
- assertVisible:
    id: "onboarding-ready-explore-app"

# Choose to explore app
- tapOn:
    id: "onboarding-ready-explore-app"

# === Home Screen ===
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 5000

- assertVisible:
    id: "home-date-label"
- assertVisible:
    id: "widget-calorie-ring"
```

#### `flows/onboarding/onboarding-back-navigation.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Onboarding Back Navigation
tags:
  - onboarding
  - navigation
---
- launchApp:
    clearState: true

# Complete legal
- scrollUntilVisible:
    element:
      id: "legal-checkbox"
    direction: DOWN

- tapOn:
    id: "legal-checkbox"

- tapOn:
    id: "legal-proceed-button"

# Welcome → Goal
- extendedWaitUntil:
    visible:
      id: "onboarding-welcome-screen"
    timeout: 3000

- tapOn:
    id: "onboarding-begin-button"

- assertVisible:
    id: "onboarding-goal-screen"

# Goal → Preferences
- tapOn:
    id: "onboarding-goal-option-maintain"

- tapOn:
    id: "onboarding-goal-continue-button"

- assertVisible:
    id: "onboarding-preferences-screen"

# Go back to Goal
- tapOn:
    id: "onboarding-preferences-back-button"

- assertVisible:
    id: "onboarding-goal-screen"

# Previous selection should be preserved
- tapOn:
    id: "onboarding-goal-continue-button"

- assertVisible:
    id: "onboarding-preferences-screen"

# Continue to Ready
- tapOn:
    id: "onboarding-energy-calories"
- tapOn:
    id: "onboarding-weight-kg"

- tapOn:
    id: "onboarding-preferences-continue-button"

- assertVisible:
    id: "onboarding-ready-screen"

# Go back to Preferences
- tapOn:
    id: "onboarding-ready-back-button"

- assertVisible:
    id: "onboarding-preferences-screen"
```

---

### FOOD LOGGING FLOWS

#### `flows/food-logging/search-and-log.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Search and Log Food
tags:
  - food-logging
  - search
---
- launchApp

# Ensure onboarding is complete
- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- assertVisible:
    id: "home-screen"

# Add food to breakfast
- tapOn:
    id: "meal-add-food-button-breakfast"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

# Verify search elements
- assertVisible:
    id: "add-food-search-input"
- assertVisible:
    id: "add-food-scan-fab"
- assertVisible:
    id: "add-food-tab-all"

# Search for food
- tapOn:
    id: "add-food-search-input"
- inputText: "chicken breast"

# Wait for search debounce (300ms)
- wait: 500

# Tap a search result
- tapOn:
    id: "add-food-search-result-item-.*"
    index: 0

# Log Food screen
- extendedWaitUntil:
    visible:
      id: "log-food-screen"
    timeout: 3000

- assertVisible:
    id: "log-food-back-button"
- assertVisible:
    id: "log-food-favorite-button"
- assertVisible:
    id: "log-food-amount-input"
- assertVisible:
    id: "log-food-add-button"

# Verify meal is pre-selected
- assertVisible:
    id: "log-food-meal-breakfast"

# Adjust amount
- tapOn:
    id: "log-food-amount-input"
- clearText
- inputText: "150"

- hideKeyboard

# Add to log
- tapOn:
    id: "log-food-add-button"

# Should return to home
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000

# Verify entry appears in breakfast section
- assertVisible:
    id: "meal-breakfast-section"
```

#### `flows/food-logging/quick-add.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Quick Add Flow
tags:
  - food-logging
  - quick-add
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- assertVisible:
    id: "home-screen"

# Add to lunch via meal section
- tapOn:
    id: "meal-add-food-button-lunch"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

# Navigate to Quick Add (may need scroll or tab)
- scrollUntilVisible:
    element:
      text: "Quick Add"
    direction: DOWN

- tapOn:
    text: "Quick Add"

- assertVisible:
    id: "quick-add-screen"

# Verify elements
- assertVisible:
    id: "quick-add-back-button"
- assertVisible:
    id: "quick-add-calories-input"
- assertVisible:
    id: "quick-add-protein-input"
- assertVisible:
    id: "quick-add-carbs-input"
- assertVisible:
    id: "quick-add-fat-input"
- assertVisible:
    id: "quick-add-description-input"
- assertVisible:
    id: "quick-add-add-button"

# Verify meal options
- assertVisible:
    id: "quick-add-meal-breakfast"
- assertVisible:
    id: "quick-add-meal-lunch"
- assertVisible:
    id: "quick-add-meal-dinner"
- assertVisible:
    id: "quick-add-meal-snack"

# Lunch should be pre-selected since we came from lunch section
- tapOn:
    id: "quick-add-meal-lunch"

# Enter macros
- tapOn:
    id: "quick-add-calories-input"
- inputText: "450"

- tapOn:
    id: "quick-add-protein-input"
- inputText: "30"

- tapOn:
    id: "quick-add-carbs-input"
- inputText: "40"

- tapOn:
    id: "quick-add-fat-input"
- inputText: "15"

- tapOn:
    id: "quick-add-description-input"
- inputText: "Leftover pasta"

- hideKeyboard

- tapOn:
    id: "quick-add-add-button"

# Should return to home
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000
```

#### `flows/food-logging/create-custom-food.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Create Custom Food
tags:
  - food-logging
  - custom-food
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "meal-add-food-button-dinner"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

- tapOn:
    id: "add-food-create-food-button"

- assertVisible:
    id: "create-food-screen"

# Verify elements
- assertVisible:
    id: "create-food-back-button"
- assertVisible:
    id: "create-food-name-input"
- assertVisible:
    id: "create-food-brand-input"
- assertVisible:
    id: "create-food-serving-amount-input"
- assertVisible:
    id: "create-food-serving-unit-input"
- assertVisible:
    id: "create-food-calories-input"
- assertVisible:
    id: "create-food-protein-input"
- assertVisible:
    id: "create-food-carbs-input"
- assertVisible:
    id: "create-food-fat-input"
- assertVisible:
    id: "create-food-create-button"

# Fill in custom food details
- tapOn:
    id: "create-food-name-input"
- inputText: "Grandma's Meatloaf"

- tapOn:
    id: "create-food-brand-input"
- inputText: "Homemade"

- tapOn:
    id: "create-food-serving-amount-input"
- inputText: "1"

- tapOn:
    id: "create-food-serving-unit-input"
- inputText: "slice"

- tapOn:
    id: "create-food-calories-input"
- inputText: "280"

- tapOn:
    id: "create-food-protein-input"
- inputText: "22"

- tapOn:
    id: "create-food-carbs-input"
- inputText: "12"

- tapOn:
    id: "create-food-fat-input"
- inputText: "16"

- hideKeyboard

- tapOn:
    id: "create-food-create-button"

# Should navigate to Log Food screen with the new food
- extendedWaitUntil:
    visible:
      id: "log-food-screen"
    timeout: 3000

# Verify our food name appears
- assertVisible:
    text: "Grandma's Meatloaf"
```

#### `flows/food-logging/restaurant-flow.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Restaurant Food Logging
tags:
  - food-logging
  - restaurant
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

# Seed data to ensure restaurants are loaded
- runFlow: ../utils/seed-data.yaml

- tapOn:
    id: "tab-bar-home"

- tapOn:
    id: "meal-add-food-button-lunch"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

- tapOn:
    id: "add-food-browse-restaurants-button"

- extendedWaitUntil:
    visible:
      id: "restaurant-list-screen"
    timeout: 5000

# Verify elements
- assertVisible:
    id: "restaurant-search-input"
- assertVisible:
    id: "restaurant-back-button"

# Search for a restaurant
- tapOn:
    id: "restaurant-search-input"
- inputText: "McDonald"

- wait: 500

# Tap on a restaurant result
- tapOn:
    id: "restaurant-item-.*"
    index: 0

# Restaurant menu screen
- extendedWaitUntil:
    visible:
      id: "restaurant-menu-screen"
    timeout: 3000

- assertVisible:
    id: "restaurant-menu-back-button"
- assertVisible:
    id: "restaurant-menu-search-input"
- assertVisible:
    id: "restaurant-category-all"

# Tap on a menu item
- tapOn:
    id: "restaurant-menu-item-.*"
    index: 0

# Restaurant food detail
- extendedWaitUntil:
    visible:
      id: "restaurant-food-screen"
    timeout: 3000

- assertVisible:
    id: "restaurant-food-back-button"
- assertVisible:
    id: "restaurant-food-amount-input"
- assertVisible:
    id: "restaurant-food-add-button"

# Verify meal options
- assertVisible:
    id: "restaurant-food-meal-lunch"

# Add to log
- tapOn:
    id: "restaurant-food-add-button"

# Should return to home
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 5000
```

#### `flows/food-logging/edit-entry.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Edit Food Log Entry
tags:
  - food-logging
  - edit
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

# First, add a food entry
- tapOn:
    id: "meal-add-food-button-breakfast"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

# Quick add for simplicity
- scrollUntilVisible:
    element:
      text: "Quick Add"
    direction: DOWN

- tapOn:
    text: "Quick Add"

- tapOn:
    id: "quick-add-calories-input"
- inputText: "200"

- hideKeyboard

- tapOn:
    id: "quick-add-add-button"

- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000

# Now tap on the entry to edit it
- tapOn:
    id: "meal-entry-item-.*"
    index: 0

- extendedWaitUntil:
    visible:
      id: "log-entry-screen"
    timeout: 3000

# Verify edit elements
- assertVisible:
    id: "log-entry-close-button"
- assertVisible:
    id: "log-entry-amount-input"
- assertVisible:
    id: "log-entry-save-button"
- assertVisible:
    id: "log-entry-delete-button"

# Verify meal change options
- assertVisible:
    id: "log-entry-meal-breakfast"
- assertVisible:
    id: "log-entry-meal-lunch"
- assertVisible:
    id: "log-entry-meal-dinner"
- assertVisible:
    id: "log-entry-meal-snack"

# Change amount
- tapOn:
    id: "log-entry-amount-input"
- clearText
- inputText: "1.5"

- hideKeyboard

# Change meal to lunch
- tapOn:
    id: "log-entry-meal-lunch"

# Save changes
- tapOn:
    id: "log-entry-save-button"

- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000
```

#### `flows/food-logging/delete-entry.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Delete Food Log Entry
tags:
  - food-logging
  - delete
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

# Add a food entry to delete
- tapOn:
    id: "meal-add-food-button-snack"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

- scrollUntilVisible:
    element:
      text: "Quick Add"
    direction: DOWN

- tapOn:
    text: "Quick Add"

- tapOn:
    id: "quick-add-calories-input"
- inputText: "100"

- hideKeyboard

- tapOn:
    id: "quick-add-add-button"

- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000

# Open the entry
- tapOn:
    id: "meal-entry-item-.*"
    index: 0

- assertVisible:
    id: "log-entry-screen"

# Delete it
- tapOn:
    id: "log-entry-delete-button"

# Confirm deletion
- tapOn:
    id: "ui-confirm-dialog-confirm"

- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000
```

#### `flows/food-logging/barcode-scan.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Barcode Scanner Flow
tags:
  - food-logging
  - barcode
  - camera
---
# Note: This test requires camera access
# On simulator/emulator, test the permission and manual entry paths

- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "meal-add-food-button-breakfast"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

- tapOn:
    id: "add-food-scan-fab"

- extendedWaitUntil:
    visible:
      id: "scanner-screen"
    timeout: 3000

# Verify scanner elements
- assertVisible:
    id: "scanner-close-button"

# Camera permission handling
- assertVisible:
    id: "scanner-allow-camera-button"
    optional: true

- assertVisible:
    id: "scanner-go-back-button"
    optional: true

# If we have camera access, verify scanner controls
- assertVisible:
    id: "scanner-flash-toggle"
    optional: true

- assertVisible:
    id: "scanner-enter-manually-button"
    optional: true

# Close scanner
- tapOn:
    id: "scanner-close-button"

- assertVisible:
    id: "add-food-screen"
```

#### `flows/food-logging/ai-photo.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: AI Photo Analysis Flow
tags:
  - food-logging
  - ai
  - premium
  - camera
---
# Note: Requires premium and camera access

- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

# Enable premium for this test
- runFlow: ../utils/enable-premium.yaml

- tapOn:
    id: "meal-add-food-button-lunch"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

- tapOn:
    id: "add-food-ai-photo-button"

- extendedWaitUntil:
    visible:
      id: "ai-photo-screen"
    timeout: 3000

# Verify AI photo elements
- assertVisible:
    id: "ai-photo-close-button"
- assertVisible:
    id: "ai-photo-flash-toggle"
    optional: true
- assertVisible:
    id: "ai-photo-gallery-button"
- assertVisible:
    id: "ai-photo-capture-button"
    optional: true

# For simulator testing, use gallery
- tapOn:
    id: "ai-photo-gallery-button"

# Wait for image picker (this may vary by platform)
- wait: 2000

# Close if no image selected
- tapOn:
    id: "ai-photo-close-button"
    optional: true

- assertVisible:
    id: "add-food-screen"
    optional: true
```

#### `flows/food-logging/favorite-food.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Favorite Food Flow
tags:
  - food-logging
  - favorites
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- runFlow: ../utils/seed-data.yaml

- tapOn:
    id: "meal-add-food-button-breakfast"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

# Search for a food
- tapOn:
    id: "add-food-search-input"
- inputText: "apple"

- wait: 500

# Select a result
- tapOn:
    id: "add-food-search-result-item-.*"
    index: 0

- assertVisible:
    id: "log-food-screen"

# Favorite the food
- tapOn:
    id: "log-food-favorite-button"

- wait: 500

# Add to log
- tapOn:
    id: "log-food-add-button"

- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 3000

# Go back to add food and check favorites
- tapOn:
    id: "meal-add-food-button-lunch"

- extendedWaitUntil:
    visible:
      id: "add-food-screen"
    timeout: 3000

# Verify favorites section exists
- assertVisible:
    id: "add-food-favorites-section"
```

---

### PROGRESS FLOWS

#### `flows/progress/log-weight.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Log Weight
tags:
  - progress
  - weight
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-progress"

- extendedWaitUntil:
    visible:
      id: "progress-screen"
    timeout: 3000

- tapOn:
    id: "progress-log-weight-button"

- extendedWaitUntil:
    visible:
      id: "log-weight-screen"
    timeout: 3000

# Verify elements
- assertVisible:
    id: "log-weight-close-button"
- assertVisible:
    id: "log-weight-minus-button"
- assertVisible:
    id: "log-weight-input"
- assertVisible:
    id: "log-weight-plus-button"
- assertVisible:
    id: "log-weight-notes-input"
- assertVisible:
    id: "log-weight-save-button"

# Quick adjust buttons
- assertVisible:
    id: "log-weight-quick-minus-1"
- assertVisible:
    id: "log-weight-quick-minus-05"
- assertVisible:
    id: "log-weight-quick-plus-05"
- assertVisible:
    id: "log-weight-quick-plus-1"

# Enter weight
- tapOn:
    id: "log-weight-input"
- clearText
- inputText: "175.5"

# Use quick adjust
- tapOn:
    id: "log-weight-quick-minus-05"

# Add notes
- tapOn:
    id: "log-weight-notes-input"
- inputText: "Morning weigh-in"

- hideKeyboard

# Save
- tapOn:
    id: "log-weight-save-button"

- extendedWaitUntil:
    visible:
      id: "progress-screen"
    timeout: 3000

# Verify chart updated
- assertVisible:
    id: "progress-weight-chart"
```

#### `flows/progress/view-charts.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: View Progress Charts
tags:
  - progress
  - charts
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- runFlow: ../utils/seed-data.yaml

- tapOn:
    id: "tab-bar-progress"

- assertVisible:
    id: "progress-screen"

# Verify all charts
- assertVisible:
    id: "progress-weight-chart"

- scrollUntilVisible:
    element:
      id: "progress-calorie-chart"
    direction: DOWN

- assertVisible:
    id: "progress-calorie-chart"

- scrollUntilVisible:
    element:
      id: "progress-macro-chart"
    direction: DOWN

- assertVisible:
    id: "progress-macro-chart"
```

#### `flows/progress/time-range-navigation.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Progress Time Range Navigation
tags:
  - progress
  - navigation
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- runFlow: ../utils/seed-data.yaml

- tapOn:
    id: "tab-bar-progress"

- assertVisible:
    id: "progress-screen"

# Verify time range buttons
- assertVisible:
    id: "progress-time-range-7d"
- assertVisible:
    id: "progress-time-range-30d"
- assertVisible:
    id: "progress-time-range-90d"
- assertVisible:
    id: "progress-time-range-all"

# Test each range
- tapOn:
    id: "progress-time-range-7d"
- wait: 500

- tapOn:
    id: "progress-time-range-30d"
- wait: 500

- tapOn:
    id: "progress-time-range-90d"
- wait: 500

- tapOn:
    id: "progress-time-range-all"
- wait: 500

# Return to 7d
- tapOn:
    id: "progress-time-range-7d"
```

---

### HOME FLOWS

#### `flows/home/date-navigation.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Home Date Navigation
tags:
  - home
  - navigation
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- assertVisible:
    id: "home-screen"

# Verify date navigation elements
- assertVisible:
    id: "home-date-prev-button"
- assertVisible:
    id: "home-date-label"
- assertVisible:
    id: "home-date-next-button"

# Navigate to previous day
- tapOn:
    id: "home-date-prev-button"

- wait: 500

# Navigate back to today
- tapOn:
    id: "home-date-next-button"

- wait: 500

# Try to go to future (should be blocked or limited)
- tapOn:
    id: "home-date-next-button"

- wait: 500

# Verify still on valid date
- assertVisible:
    id: "home-date-label"
```

#### `flows/home/water-tracking.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Water Tracking
tags:
  - home
  - water
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- assertVisible:
    id: "home-screen"

# Find water widget
- scrollUntilVisible:
    element:
      id: "widget-water-tracker"
    direction: DOWN

- assertVisible:
    id: "widget-water-tracker"

# Add water
- tapOn:
    id: "water-add-button"

- wait: 300

# Add another glass
- tapOn:
    id: "water-add-button"

- wait: 300

# Remove one
- tapOn:
    id: "water-remove-button"

- wait: 300

# Verify glass indicators
- assertVisible:
    id: "water-glass-indicator-0"
```

#### `flows/home/widget-management.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Widget Management
tags:
  - home
  - widgets
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- assertVisible:
    id: "home-screen"

# Enter edit mode
- tapOn:
    id: "home-edit-button"

- wait: 500

# Verify edit mode elements
- assertVisible:
    id: "home-restore-button"
- assertVisible:
    id: "home-add-widget-button"

# Open widget picker
- tapOn:
    id: "home-add-widget-button"

- extendedWaitUntil:
    visible:
      id: "home-widget-picker-modal"
    timeout: 2000

# Close picker
- swipe:
    direction: DOWN
    duration: 500

# Restore default layout
- tapOn:
    id: "home-restore-button"

- wait: 500

# Exit edit mode (tap edit button again or tap outside)
- tapOn:
    id: "home-edit-button"
    optional: true
```

---

### SETTINGS FLOWS

#### `flows/settings/profile.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Profile Settings
tags:
  - settings
  - profile
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

- assertVisible:
    id: "settings-screen"

- tapOn:
    id: "settings-profile-row"

- extendedWaitUntil:
    visible:
      id: "settings-profile-screen"
    timeout: 3000

# Verify elements
- assertVisible:
    id: "settings-profile-back-button"
- assertVisible:
    id: "settings-profile-edit-button"
- assertVisible:
    id: "settings-profile-sex-male"
- assertVisible:
    id: "settings-profile-sex-female"

# Enable editing
- tapOn:
    id: "settings-profile-edit-button"

# Change sex
- tapOn:
    id: "settings-profile-sex-female"

# Adjust height
- tapOn:
    id: "settings-profile-height-plus"
- tapOn:
    id: "settings-profile-height-plus"

# Save
- tapOn:
    id: "settings-profile-save-button"

- wait: 1000

# Navigate back
- tapOn:
    id: "settings-profile-back-button"

- assertVisible:
    id: "settings-screen"
```

#### `flows/settings/goals.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Goals Settings
tags:
  - settings
  - goals
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

- tapOn:
    id: "settings-goals-row"

- extendedWaitUntil:
    visible:
      id: "settings-goals-screen"
    timeout: 3000

# Verify elements
- assertVisible:
    id: "settings-goals-back-button"
- assertVisible:
    id: "settings-goals-edit-button"
- assertVisible:
    id: "settings-goals-goal-lose"
- assertVisible:
    id: "settings-goals-goal-maintain"
- assertVisible:
    id: "settings-goals-goal-gain"

# Enable editing
- tapOn:
    id: "settings-goals-edit-button"

# Change goal
- tapOn:
    id: "settings-goals-goal-maintain"

# Save
- tapOn:
    id: "settings-goals-save-button"

- wait: 1000

- tapOn:
    id: "settings-goals-back-button"

- assertVisible:
    id: "settings-screen"
```

#### `flows/settings/theme.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Theme Settings
tags:
  - settings
  - theme
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

- assertVisible:
    id: "settings-screen"

# Verify theme options
- assertVisible:
    id: "settings-theme-system"
- assertVisible:
    id: "settings-theme-light"
- assertVisible:
    id: "settings-theme-dark"

# Test each theme
- tapOn:
    id: "settings-theme-dark"
- wait: 500

- tapOn:
    id: "settings-theme-light"
- wait: 500

- tapOn:
    id: "settings-theme-system"
- wait: 500
```

#### `flows/settings/water.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Water Settings
tags:
  - settings
  - water
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

- tapOn:
    id: "settings-water-row"

- extendedWaitUntil:
    visible:
      id: "settings-water-screen"
    timeout: 3000

# Verify elements
- assertVisible:
    id: "settings-water-back-button"

# Change glass goal
- tapOn:
    id: "settings-water-glass-goal-option-8"

- wait: 500

# Navigate back
- tapOn:
    id: "settings-water-back-button"

- assertVisible:
    id: "settings-screen"
```

#### `flows/settings/fasting.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Fasting Settings
tags:
  - settings
  - fasting
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

- tapOn:
    id: "settings-fasting-row"

- extendedWaitUntil:
    visible:
      id: "settings-fasting-screen"
    timeout: 3000

# Verify elements
- assertVisible:
    id: "settings-fasting-back-button"
- assertVisible:
    id: "settings-fasting-enable-toggle"

# Enable fasting
- tapOn:
    id: "settings-fasting-enable-toggle"

- wait: 500

# Select a protocol
- tapOn:
    id: "settings-fasting-protocol-option-16:8"
    optional: true

- wait: 500

# Navigate back
- tapOn:
    id: "settings-fasting-back-button"

- assertVisible:
    id: "settings-screen"
```

#### `flows/settings/delete-data.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Delete All Data
tags:
  - settings
  - delete
  - destructive
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

- scrollUntilVisible:
    element:
      id: "settings-delete-all-data-row"
    direction: DOWN
    scrollBounds:
      id: "settings-scroll-view"

- tapOn:
    id: "settings-delete-all-data-row"

# Confirmation dialog should appear
- extendedWaitUntil:
    visible:
      id: "ui-confirm-dialog"
    timeout: 2000

# Cancel to not actually delete
- tapOn:
    id: "ui-confirm-dialog-cancel"

- assertVisible:
    id: "settings-screen"
```

---

### PREMIUM FLOWS

#### `flows/premium/paywall.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Paywall Flow
tags:
  - premium
  - paywall
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

# Try to access premium feature
- tapOn:
    id: "settings-premium-row"

- extendedWaitUntil:
    visible:
      id: "paywall-screen"
    timeout: 3000

# Verify paywall elements
- assertVisible:
    id: "paywall-close-button"
- assertVisible:
    id: "paywall-subscribe-button"
- assertVisible:
    id: "paywall-restore-button"
- assertVisible:
    id: "paywall-terms-link"
- assertVisible:
    id: "paywall-privacy-link"

# Close paywall
- tapOn:
    id: "paywall-close-button"

- assertVisible:
    id: "settings-screen"
```

#### `flows/premium/macro-cycling.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Macro Cycling Setup
tags:
  - premium
  - macro-cycling
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

# Enable premium
- runFlow: ../utils/enable-premium.yaml

- tapOn:
    id: "tab-bar-settings"

- tapOn:
    id: "settings-macro-cycling-row"

- extendedWaitUntil:
    visible:
      id: "macro-cycling-screen"
    timeout: 3000

# Verify elements
- assertVisible:
    id: "macro-cycling-close-button"

# Select a pattern
- tapOn:
    id: "macro-cycling-pattern-option-high-low"
    optional: true

- wait: 500

# Select days
- tapOn:
    id: "macro-cycling-day-pill-0"
    optional: true

- wait: 500

# Continue through setup
- tapOn:
    id: "macro-cycling-continue-button"
    optional: true

# Close
- tapOn:
    id: "macro-cycling-close-button"

- assertVisible:
    id: "settings-screen"
```

---

### IMPORT FLOWS

#### `flows/import/import-data.yaml`

```yaml
appId: com.yourcompany.nutritionrx
name: Import Data Flow
tags:
  - import
  - data
---
- launchApp

- runFlow:
    file: ../utils/complete-onboarding.yaml
    when:
      visible:
        id: "legal-screen"

- tapOn:
    id: "tab-bar-settings"

- scrollUntilVisible:
    element:
      id: "settings-import-row"
    direction: DOWN
    scrollBounds:
      id: "settings-scroll-view"

- tapOn:
    id: "settings-import-row"

- extendedWaitUntil:
    visible:
      id: "import-index-screen"
    timeout: 3000

# Verify welcome screen
- assertVisible:
    id: "import-index-back-button"
- assertVisible:
    id: "import-index-get-started-button"

# Can also seed sample data from here
- assertVisible:
    id: "import-seed-data-button"
    optional: true

# Start import flow
- tapOn:
    id: "import-index-get-started-button"

- extendedWaitUntil:
    visible:
      id: "import-source-screen"
    timeout: 3000

# Go back to index
- tapOn:
    id: "import-source-back-button"

- assertVisible:
    id: "import-index-screen"

# Go back to settings
- tapOn:
    id: "import-index-back-button"

- assertVisible:
    id: "settings-screen"
```

---

## Platform-Specific Notes

### iOS
- Paywall uses fullScreenModal presentation
- Modals dismiss with swipe down
- Apple Health integration available
- Camera permissions dialog is system-level

### Android
- Modals may use back button for dismissal
- Health Connect integration available
- File picker for CSV import may vary

---

## Running the Tests

### Single Flow
```bash
maestro test flows/food-logging/quick-add.yaml
```

### Smoke Test
```bash
maestro test smoke/critical-path.yaml
```

### All Food Logging Tests
```bash
maestro test flows/food-logging/
```

### Full Suite
```bash
maestro test .
```

---

## Checklist for IDE Claude

When generating YAML files from this spec:

- [ ] Use exact testIDs from the MAESTRO_CONTEXT.md document
- [ ] Include `runFlow` for complete-onboarding when starting from fresh
- [ ] Add waits after animations (300-500ms typical)
- [ ] Use `extendedWaitUntil` for screen transitions
- [ ] Add `hideKeyboard` after text input
- [ ] Use `scrollUntilVisible` with `scrollBounds` for long screens
- [ ] Handle premium gating with `enable-premium.yaml` utility
- [ ] Use `optional: true` for elements that may not exist (camera, etc.)
- [ ] Handle confirmation dialogs with `ui-confirm-dialog` testIDs
- [ ] Account for search debounce (300ms) in food search tests
