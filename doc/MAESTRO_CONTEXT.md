# Maestro Test Context Document

Generated: 2026-01-31
App: NutritionRx (React Native / Expo Router)

---

## Quick Reference

### App Entry Points

- **Fresh install:** Legal Acknowledgment screen (`legal-screen`) → Onboarding Welcome → Onboarding Goal → Onboarding Preferences → Onboarding Ready → Main Tabs
- **Returning user:** Home/Dashboard tab (`home-screen`)
- **Deep link base:** Expo Router file-system routing under `src/app/`

### Test User Credentials

This app is **local-first** with no traditional authentication system. There are no login credentials.

- **Legal acknowledgment:** Stored locally, required once on first launch
- **Onboarding:** Stored locally via `useOnboardingStore`, completed once
- **Premium features:** Managed via RevenueCat subscription (use developer toggle for testing)

### Developer Testing Tools

Access Developer Settings by tapping the version number 7 times on the Settings → About screen.

- `settings-dev-premium-toggle` — Toggle premium status for testing
- `settings-dev-fresh-session` — Reset the app to first-launch state
- `settings-dev-seed-database` — Seed the database with sample data
- `settings-developer-clear-data-button` — Clear all app data
- `settings-developer-seed-button` — Seed test data with configurable options

---

## TestID Reference

### Naming Convention

- Format: `[feature]-[component]-[element]` (kebab-case)
- Dynamic IDs: `[feature]-[component]-[element]-{param}` via helper functions
- Constants file: `src/constants/testIDs.ts`

### Full TestID Inventory

#### Legal Acknowledgment

| TestID | Element | Purpose |
|--------|---------|---------|
| `legal-screen` | SafeAreaView | Screen container |
| `legal-scroll-view` | ScrollView | Scrollable content |
| `legal-checkbox` | Pressable | Acknowledge terms checkbox |
| `legal-proceed-button` | Button | Continue to onboarding |
| `legal-terms-link` | Link | Open terms of service |

#### Onboarding

| TestID | Element | Purpose |
|--------|---------|---------|
| `onboarding-welcome-screen` | SafeAreaView | Welcome screen container |
| `onboarding-begin-button` | Button | Start onboarding |
| `onboarding-goal-screen` | SafeAreaView | Goal selection screen |
| `onboarding-goal-back-button` | Pressable | Navigate back |
| `onboarding-goal-option-lose` | Pressable | Select "Lose weight" goal |
| `onboarding-goal-option-maintain` | Pressable | Select "Maintain weight" goal |
| `onboarding-goal-option-build` | Pressable | Select "Build muscle" goal |
| `onboarding-goal-option-track` | Pressable | Select "Just track" goal |
| `onboarding-goal-continue-button` | Button | Continue to preferences |
| `onboarding-preferences-screen` | SafeAreaView | Preferences screen |
| `onboarding-preferences-back-button` | Pressable | Navigate back |
| `onboarding-energy-calories` | Pressable | Select calories unit |
| `onboarding-energy-kilojoules` | Pressable | Select kilojoules unit |
| `onboarding-weight-lbs` | Pressable | Select pounds unit |
| `onboarding-weight-kg` | Pressable | Select kilograms unit |
| `onboarding-preferences-continue-button` | Button | Continue to ready screen |
| `onboarding-ready-screen` | SafeAreaView | Ready screen |
| `onboarding-ready-back-button` | Pressable | Navigate back |
| `onboarding-ready-scan-barcode` | Pressable | Go to barcode scanner |
| `onboarding-ready-search-food` | Pressable | Go to food search |
| `onboarding-ready-explore-app` | Pressable | Go to main app |

#### Tab Navigation

| TestID | Element | Purpose |
|--------|---------|---------|
| `tab-bar-container` | View | Tab bar root container |
| `tab-bar-home` | Pressable | Home/Today tab |
| `tab-bar-progress` | Pressable | Progress/Journey tab |
| `tab-bar-settings` | Pressable | Settings tab |

#### Home / Dashboard

| TestID | Element | Purpose |
|--------|---------|---------|
| `home-screen` | SafeAreaView | Home screen container |
| `home-date-prev-button` | Pressable | Navigate to previous day |
| `home-date-next-button` | Pressable | Navigate to next day |
| `home-date-label` | Text | Current date display |
| `home-day-menu-button` | Pressable | Open day context menu |
| `home-edit-button` | Pressable | Enter dashboard edit mode |
| `home-restore-button` | Pressable | Restore default layout |
| `home-add-widget-button` | Pressable | Open widget picker |
| `home-streak-badge` | View | Streak display badge |
| `home-day-type-badge` | View | Day type indicator |
| `home-widget-list` | FlatList | Widget list container |
| `home-widget-picker-modal` | Modal | Widget picker modal |
| `home-day-menu-modal` | Modal | Day context menu modal |

#### Dashboard Widgets

| TestID | Element | Purpose |
|--------|---------|---------|
| `widget-calorie-ring` | View | Calorie ring chart widget |
| `widget-macro-bars` | View | Macro progress bars widget |
| `widget-weekly-average` | View | Weekly average widget |
| `widget-protein-focus` | View | Protein focus widget |
| `widget-goals-summary` | View | Goals summary widget |
| `widget-todays-meals` | View | Today's meals widget |
| `widget-water-tracker` | View | Water tracking widget |
| `widget-streak-badge` | View | Streak badge widget |
| `widget-nutrition-overview` | View | Nutrition overview widget |
| `widget-quick-add` | View | Quick add widget |
| `widget-meal-ideas` | View | Meal ideas widget |
| `widget-fasting-timer` | View | Fasting timer widget |
| `widget-micronutrient-snapshot` | View | Micronutrient snapshot widget |
| `widget-ai-daily-insight` | View | AI daily insight widget |
| `widget-weekly-recap` | View | Weekly recap widget |
| `widget-weight-trend` | View | Weight trend widget |

#### Meal Sections (Home)

| TestID Pattern | Element | Purpose |
|----------------|---------|---------|
| `meal-breakfast-section` | View | Breakfast section |
| `meal-lunch-section` | View | Lunch section |
| `meal-dinner-section` | View | Dinner section |
| `meal-snack-section` | View | Snack section |
| `meal-add-food-button-{meal}` | Pressable | Add food to specific meal (dynamic) |
| `meal-copy-button-{meal}` | Pressable | Copy meal (dynamic) |
| `meal-entry-item-{id}` | Pressable | Individual food entry (dynamic) |
| `meal-delete-entry-button-{id}` | Pressable | Delete entry (dynamic) |

#### Progress / Journey

| TestID | Element | Purpose |
|--------|---------|---------|
| `progress-screen` | SafeAreaView | Progress screen container |
| `progress-log-weight-button` | Pressable | Open log weight modal |
| `progress-time-range-7d` | Pressable | Show 7-day range |
| `progress-time-range-30d` | Pressable | Show 30-day range |
| `progress-time-range-90d` | Pressable | Show 90-day range |
| `progress-time-range-all` | Pressable | Show all-time range |
| `progress-weight-chart` | View | Weight chart |
| `progress-calorie-chart` | View | Calorie chart |
| `progress-macro-chart` | View | Macro chart |

#### Add Food Flow

| TestID | Element | Purpose |
|--------|---------|---------|
| `add-food-screen` | SafeAreaView | Add food screen container |
| `add-food-search-input` | TextInput | Food search input |
| `add-food-clear-search-button` | Pressable | Clear search text |
| `add-food-scan-fab` | Pressable | Open barcode scanner FAB |
| `add-food-tab-all` | Pressable | All foods tab |
| `add-food-tab-restaurants` | Pressable | Restaurant foods tab |
| `add-food-tab-my-foods` | Pressable | My custom foods tab |
| `add-food-favorites-section` | View | Favorites section |
| `add-food-recent-section` | View | Recent foods section |
| `add-food-ai-photo-button` | Pressable | Open AI photo analysis |
| `add-food-create-food-button` | Pressable | Create custom food |
| `add-food-browse-restaurants-button` | Pressable | Browse restaurants |
| `add-food-search-result-item-{id}` | Pressable | Search result item (dynamic) |

#### Log Food Screen

| TestID | Element | Purpose |
|--------|---------|---------|
| `log-food-screen` | SafeAreaView | Log food screen container |
| `log-food-back-button` | Pressable | Navigate back |
| `log-food-favorite-button` | Pressable | Toggle favorite |
| `log-food-amount-input` | TextInput | Serving amount input |
| `log-food-unit-pill-{unit}` | Pressable | Select serving unit (dynamic) |
| `log-food-meal-breakfast` | Pressable | Select breakfast meal |
| `log-food-meal-lunch` | Pressable | Select lunch meal |
| `log-food-meal-dinner` | Pressable | Select dinner meal |
| `log-food-meal-snack` | Pressable | Select snack meal |
| `log-food-add-button` | Button | Add food to log |

#### Quick Add Screen

| TestID | Element | Purpose |
|--------|---------|---------|
| `quick-add-screen` | SafeAreaView | Quick add screen container |
| `quick-add-back-button` | Pressable | Navigate back |
| `quick-add-calories-input` | TextInput | Calories input |
| `quick-add-protein-input` | TextInput | Protein input |
| `quick-add-carbs-input` | TextInput | Carbs input |
| `quick-add-fat-input` | TextInput | Fat input |
| `quick-add-meal-breakfast` | Pressable | Select breakfast |
| `quick-add-meal-lunch` | Pressable | Select lunch |
| `quick-add-meal-dinner` | Pressable | Select dinner |
| `quick-add-meal-snack` | Pressable | Select snack |
| `quick-add-description-input` | TextInput | Description input |
| `quick-add-add-button` | Button | Submit quick add |

#### Create Food Screen

| TestID | Element | Purpose |
|--------|---------|---------|
| `create-food-screen` | SafeAreaView | Create food screen container |
| `create-food-back-button` | Pressable | Navigate back |
| `create-food-name-input` | TextInput | Food name input |
| `create-food-brand-input` | TextInput | Brand name input |
| `create-food-serving-amount-input` | TextInput | Serving amount |
| `create-food-serving-unit-input` | TextInput | Serving unit |
| `create-food-calories-input` | TextInput | Calories input |
| `create-food-protein-input` | TextInput | Protein input |
| `create-food-carbs-input` | TextInput | Carbs input |
| `create-food-fat-input` | TextInput | Fat input |
| `create-food-create-button` | Button | Create food |
| `create-food-cancel-button` | Pressable | Cancel creation |

#### Barcode Scanner

| TestID | Element | Purpose |
|--------|---------|---------|
| `scanner-screen` | SafeAreaView | Scanner screen container |
| `scanner-close-button` | Pressable | Close scanner |
| `scanner-flash-toggle` | Pressable | Toggle flashlight |
| `scanner-scan-again-button` | Pressable | Scan another barcode |
| `scanner-enter-manually-button` | Pressable | Enter barcode manually |
| `scanner-allow-camera-button` | Button | Allow camera permission |
| `scanner-go-back-button` | Button | Go back if no permission |

#### AI Photo Screen

| TestID | Element | Purpose |
|--------|---------|---------|
| `ai-photo-screen` | SafeAreaView | AI photo screen container |
| `ai-photo-close-button` | Pressable | Close screen |
| `ai-photo-flash-toggle` | Pressable | Toggle flash |
| `ai-photo-gallery-button` | Pressable | Pick from gallery |
| `ai-photo-capture-button` | Pressable | Take photo |
| `ai-photo-retake-button` | Pressable | Retake photo |
| `ai-photo-analyze-button` | Button | Analyze with AI |
| `ai-photo-food-checkbox-{index}` | Pressable | Toggle food item (dynamic) |
| `ai-photo-food-edit-button-{index}` | Pressable | Edit food item (dynamic) |
| `ai-photo-edit-modal` | Modal | Edit food modal |
| `ai-photo-edit-name-input` | TextInput | Edit food name |
| `ai-photo-edit-calories-input` | TextInput | Edit calories |
| `ai-photo-edit-protein-input` | TextInput | Edit protein |
| `ai-photo-edit-carbs-input` | TextInput | Edit carbs |
| `ai-photo-edit-fat-input` | TextInput | Edit fat |
| `ai-photo-edit-save-button` | Button | Save edits |
| `ai-photo-add-to-meal-button` | Button | Add analyzed food to meal |

#### Restaurant Flow

| TestID | Element | Purpose |
|--------|---------|---------|
| `restaurant-list-screen` | SafeAreaView | Restaurant list screen |
| `restaurant-search-input` | TextInput | Search restaurants |
| `restaurant-clear-search-button` | Pressable | Clear search |
| `restaurant-back-button` | Pressable | Navigate back |
| `restaurant-item-{id}` | Pressable | Restaurant card (dynamic) |
| `restaurant-recent-section` | View | Recently used section |
| `restaurant-menu-screen` | SafeAreaView | Restaurant menu screen |
| `restaurant-menu-back-button` | Pressable | Navigate back from menu |
| `restaurant-menu-search-input` | TextInput | Search menu items |
| `restaurant-category-all` | Pressable | Show all categories |
| `restaurant-category-chip-{id}` | Pressable | Category filter (dynamic) |
| `restaurant-menu-item-{id}` | Pressable | Menu item (dynamic) |
| `restaurant-food-screen` | SafeAreaView | Restaurant food detail |
| `restaurant-food-back-button` | Pressable | Navigate back |
| `restaurant-food-amount-input` | TextInput | Amount input |
| `restaurant-food-meal-breakfast` | Pressable | Select breakfast |
| `restaurant-food-meal-lunch` | Pressable | Select lunch |
| `restaurant-food-meal-dinner` | Pressable | Select dinner |
| `restaurant-food-meal-snack` | Pressable | Select snack |
| `restaurant-food-add-button` | Button | Add to log |

#### Log Weight

| TestID | Element | Purpose |
|--------|---------|---------|
| `log-weight-screen` | SafeAreaView | Log weight screen |
| `log-weight-close-button` | Pressable | Close modal |
| `log-weight-minus-button` | Pressable | Decrease weight |
| `log-weight-input` | TextInput | Weight value input |
| `log-weight-plus-button` | Pressable | Increase weight |
| `log-weight-quick-minus-1` | Pressable | Quick adjust -1 |
| `log-weight-quick-minus-05` | Pressable | Quick adjust -0.5 |
| `log-weight-quick-plus-05` | Pressable | Quick adjust +0.5 |
| `log-weight-quick-plus-1` | Pressable | Quick adjust +1 |
| `log-weight-notes-input` | TextInput | Notes input |
| `log-weight-save-button` | Button | Save weight entry |

#### Weekly Reflection

| TestID | Element | Purpose |
|--------|---------|---------|
| `reflection-screen` | SafeAreaView | Reflection screen |
| `reflection-close-button` | Pressable | Close modal |
| `reflection-notes-input` | TextInput | Reflection notes |
| `reflection-keep-targets-button` | Pressable | Keep current targets |
| `reflection-accept-new-button` | Pressable | Accept new targets |
| `reflection-done-button` | Button | Complete reflection |

#### Food Detail

| TestID | Element | Purpose |
|--------|---------|---------|
| `food-detail-screen` | SafeAreaView | Food detail screen |
| `food-detail-scroll-view` | ScrollView | Scrollable content |
| `food-detail-back-button` | Pressable | Navigate back |
| `food-detail-favorite-button` | Pressable | Toggle favorite |
| `food-detail-add-to-log-button` | Button | Add to food log |
| `food-detail-delete-button` | Button | Delete custom food |
| `food-detail-go-back-button` | Button | Go back after delete |

#### Log Entry Editor

| TestID | Element | Purpose |
|--------|---------|---------|
| `log-entry-screen` | SafeAreaView | Log entry screen |
| `log-entry-close-button` | Pressable | Close modal |
| `log-entry-amount-input` | TextInput | Amount input |
| `log-entry-meal-breakfast` | Pressable | Change to breakfast |
| `log-entry-meal-lunch` | Pressable | Change to lunch |
| `log-entry-meal-dinner` | Pressable | Change to dinner |
| `log-entry-meal-snack` | Pressable | Change to snack |
| `log-entry-save-button` | Button | Save changes |
| `log-entry-delete-button` | Button | Delete entry |

#### Paywall

| TestID | Element | Purpose |
|--------|---------|---------|
| `paywall-screen` | SafeAreaView | Paywall screen |
| `paywall-close-button` | Pressable | Close paywall |
| `paywall-subscribe-button` | Button | Subscribe |
| `paywall-restore-button` | Pressable | Restore purchases |
| `paywall-terms-link` | Pressable | Terms of service |
| `paywall-privacy-link` | Pressable | Privacy policy |

#### Settings

| TestID | Element | Purpose |
|--------|---------|---------|
| `settings-screen` | SafeAreaView | Settings screen |
| `settings-scroll-view` | ScrollView | Scrollable settings |
| `settings-premium-row` | Pressable | Premium upgrade row |
| `settings-goals-row` | Pressable | Goals settings |
| `settings-nutrition-row` | Pressable | Nutrition settings |
| `settings-meal-planning-row` | Pressable | Meal planning settings |
| `settings-macro-cycling-row` | Pressable | Macro cycling setup |
| `settings-water-row` | Pressable | Water settings |
| `settings-fasting-row` | Pressable | Fasting settings |
| `settings-profile-row` | Pressable | Profile settings |
| `settings-units-row` | Pressable | Units settings |
| `settings-theme-system` | Pressable | System theme |
| `settings-theme-light` | Pressable | Light theme |
| `settings-theme-dark` | Pressable | Dark theme |
| `settings-apple-health-row` | Pressable | Apple Health (iOS) |
| `settings-health-connect-row` | Pressable | Health Connect (Android) |
| `settings-widgets-row` | Pressable | Widget settings |
| `settings-restore-layout-row` | Pressable | Restore default layout |
| `settings-import-row` | Pressable | Import data |
| `settings-help-row` | Pressable | Help & support |
| `settings-health-notice-row` | Pressable | Health notice |
| `settings-about-row` | Pressable | About screen |
| `settings-terms-row` | Pressable | Terms of service |
| `settings-privacy-row` | Pressable | Privacy policy |
| `settings-delete-all-data-row` | Pressable | Delete all data |
| `settings-dev-premium-toggle` | Switch | Dev: toggle premium |
| `settings-dev-fresh-session` | Pressable | Dev: fresh session |
| `settings-dev-seed-database` | Pressable | Dev: seed database |

#### Settings Sub-screens

| TestID | Element | Purpose |
|--------|---------|---------|
| `settings-profile-screen` | SafeAreaView | Profile settings screen |
| `settings-profile-scroll-view` | ScrollView | Profile scroll content |
| `settings-profile-back-button` | Pressable | Navigate back |
| `settings-profile-edit-button` | Pressable | Enable editing |
| `settings-profile-sex-male` | Pressable | Select male |
| `settings-profile-sex-female` | Pressable | Select female |
| `settings-profile-birthday-button` | Pressable | Open date picker |
| `settings-profile-date-picker-done` | Button | Confirm date |
| `settings-profile-height-minus` | Pressable | Decrease height |
| `settings-profile-height-plus` | Pressable | Increase height |
| `settings-profile-height-unit-toggle` | Pressable | Toggle height unit |
| `settings-profile-activity-level-{level}` | Pressable | Activity level (dynamic) |
| `settings-profile-cancel-button` | Pressable | Cancel changes |
| `settings-profile-save-button` | Button | Save profile |
| `settings-goals-screen` | SafeAreaView | Goals settings screen |
| `settings-goals-scroll-view` | ScrollView | Goals scroll content |
| `settings-goals-back-button` | Pressable | Navigate back |
| `settings-goals-edit-button` | Pressable | Enable editing |
| `settings-goals-goal-lose` | Pressable | Select lose weight |
| `settings-goals-goal-maintain` | Pressable | Select maintain |
| `settings-goals-goal-gain` | Pressable | Select gain weight |
| `settings-goals-target-weight-input` | TextInput | Target weight |
| `settings-goals-rate-option-{rate}` | Pressable | Weight change rate (dynamic) |
| `settings-goals-cancel-button` | Pressable | Cancel changes |
| `settings-goals-save-button` | Button | Save goals |
| `settings-units-screen` | SafeAreaView | Units settings screen |
| `settings-units-scroll-view` | ScrollView | Units scroll content |
| `settings-units-back-button` | Pressable | Navigate back |
| `settings-units-weight-unit-option-{unit}` | Pressable | Weight unit option (dynamic) |
| `settings-water-screen` | SafeAreaView | Water settings screen |
| `settings-water-scroll-view` | ScrollView | Water scroll content |
| `settings-water-back-button` | Pressable | Navigate back |
| `settings-water-glass-goal-option-{count}` | Pressable | Glass goal (dynamic) |
| `settings-water-custom-goal-button` | Pressable | Set custom goal |
| `settings-water-custom-goal-input` | TextInput | Custom goal input |
| `settings-water-glass-size-option-{size}` | Pressable | Glass size (dynamic) |
| `settings-fasting-screen` | SafeAreaView | Fasting settings screen |
| `settings-fasting-scroll-view` | ScrollView | Fasting scroll content |
| `settings-fasting-back-button` | Pressable | Navigate back |
| `settings-fasting-enable-toggle` | Switch | Enable fasting |
| `settings-fasting-protocol-option-{protocol}` | Pressable | Fasting protocol (dynamic) |
| `settings-fasting-start-time-button` | Pressable | Set start time |
| `settings-fasting-end-time-button` | Pressable | Set end time |
| `settings-fasting-notify-window-opens` | Switch | Notify window opens |
| `settings-fasting-notify-window-closes` | Switch | Notify window closes |
| `settings-fasting-notify-fast-complete` | Switch | Notify fast complete |
| `settings-nutrition-screen` | SafeAreaView | Nutrition settings screen |
| `settings-nutrition-scroll-view` | ScrollView | Nutrition scroll content |
| `settings-nutrition-back-button` | Pressable | Navigate back |
| `settings-nutrition-edit-button` | Pressable | Enable editing |
| `settings-nutrition-eating-style-option-{style}` | Pressable | Eating style (dynamic) |
| `settings-nutrition-protein-priority-option-{priority}` | Pressable | Protein priority (dynamic) |
| `settings-nutrition-cancel-button` | Pressable | Cancel changes |
| `settings-nutrition-save-button` | Button | Save nutrition settings |
| `settings-meal-planning-screen` | SafeAreaView | Meal planning screen |
| `settings-meal-planning-scroll-view` | ScrollView | Meal planning scroll content |
| `settings-meal-planning-enable-toggle` | Switch | Enable meal planning |
| `settings-meal-planning-show-on-today-toggle` | Switch | Show on today screen |
| `settings-meal-planning-week-prev-button` | Pressable | Previous week |
| `settings-meal-planning-week-next-button` | Pressable | Next week |
| `settings-meal-planning-day-cell-{date}` | Pressable | Day cell (dynamic) |
| `settings-meal-planning-add-meal-button-{slot}` | Pressable | Add meal to slot (dynamic) |
| `settings-meal-planning-delete-meal-button-{id}` | Pressable | Delete planned meal (dynamic) |
| `settings-meal-planning-copy-day-button` | Pressable | Copy day's meals |
| `settings-meal-planning-clear-day-button` | Pressable | Clear day's meals |
| `settings-widgets-screen` | SafeAreaView | Widgets settings screen |
| `settings-widgets-scroll-view` | ScrollView | Widgets scroll content |
| `settings-widgets-back-button` | Pressable | Navigate back |
| `settings-widgets-clear-all-button` | Pressable | Clear all widgets |
| `settings-widgets-remove-pinned-item-{id}` | Pressable | Remove pinned widget (dynamic) |
| `settings-health-notice-screen` | SafeAreaView | Health notice screen |
| `settings-health-notice-scroll-view` | ScrollView | Health notice content |
| `settings-health-notice-back-button` | Pressable | Navigate back |
| `settings-privacy-policy-screen` | SafeAreaView | Privacy policy screen |
| `settings-privacy-policy-scroll-view` | ScrollView | Privacy policy content |
| `settings-privacy-policy-back-button` | Pressable | Navigate back |
| `settings-terms-of-service-screen` | SafeAreaView | Terms screen |
| `settings-terms-of-service-scroll-view` | ScrollView | Terms content |
| `settings-terms-of-service-back-button` | Pressable | Navigate back |
| `settings-about-screen` | SafeAreaView | About screen |
| `settings-about-back-button` | Pressable | Navigate back |
| `settings-health-connect-screen` | SafeAreaView | Health Connect screen |
| `settings-health-connect-back-button` | Pressable | Navigate back |
| `settings-apple-health-screen` | SafeAreaView | Apple Health screen |
| `settings-apple-health-back-button` | Pressable | Navigate back |
| `settings-developer-screen` | SafeAreaView | Developer settings screen |
| `settings-developer-scroll-view` | ScrollView | Developer content |
| `settings-developer-back-button` | Pressable | Navigate back |
| `settings-developer-clear-existing-toggle` | Switch | Clear existing before seed |
| `settings-developer-edge-cases-toggle` | Switch | Include edge cases |
| `settings-developer-months-minus` | Pressable | Decrease months |
| `settings-developer-months-plus` | Pressable | Increase months |
| `settings-developer-verbose-toggle` | Switch | Verbose logging |
| `settings-developer-seed-button` | Button | Seed database |
| `settings-developer-clear-data-button` | Button | Clear all data |
| `settings-developer-reset-button` | Button | Reset app |
| `settings-developer-refresh-button` | Button | Refresh stores |
| `settings-developer-dismiss-result-button` | Pressable | Dismiss result |

#### Macro Cycling Setup

| TestID | Element | Purpose |
|--------|---------|---------|
| `macro-cycling-screen` | SafeAreaView | Macro cycling screen |
| `macro-cycling-scroll-view` | ScrollView | Scroll content |
| `macro-cycling-close-button` | Pressable | Close screen |
| `macro-cycling-pattern-option-{pattern}` | Pressable | Pattern option (dynamic) |
| `macro-cycling-day-pill-{day}` | Pressable | Day selector (dynamic) |
| `macro-cycling-disable-button` | Button | Disable cycling |
| `macro-cycling-back-step-button` | Button | Previous step |
| `macro-cycling-continue-button` | Button | Next step |
| `macro-cycling-enable-button` | Button | Enable cycling |

#### Add Planned Meal

| TestID | Element | Purpose |
|--------|---------|---------|
| `add-planned-meal-screen` | SafeAreaView | Add planned meal screen |
| `add-planned-meal-search-input` | TextInput | Search foods |
| `add-planned-meal-clear-search-button` | Pressable | Clear search |
| `add-planned-meal-clear-selection-button` | Pressable | Clear selection |
| `add-planned-meal-servings-minus-button` | Pressable | Decrease servings |
| `add-planned-meal-servings-input` | TextInput | Servings input |
| `add-planned-meal-servings-plus-button` | Pressable | Increase servings |
| `add-planned-meal-add-button` | Button | Add planned meal |
| `add-planned-meal-sections-scroll-view` | ScrollView | Results scroll view |

#### Import Data Flow

| TestID | Element | Purpose |
|--------|---------|---------|
| `import-index-screen` | SafeAreaView | Import welcome screen |
| `import-index-scroll-view` | ScrollView | Welcome scroll content |
| `import-index-back-button` | Pressable | Close/back |
| `import-index-get-started-button` | Button | Start import flow |
| `import-seed-data-button` | Button | Seed sample data |
| `import-clear-seed-data-button` | Button | Clear seeded data |
| `import-type-screen` | SafeAreaView | Select type screen |
| `import-type-scroll-view` | ScrollView | Type scroll content |
| `import-type-back-button` | Pressable | Navigate back |
| `import-type-continue-button` | Button | Continue to source |
| `import-source-screen` | SafeAreaView | Select source screen |
| `import-source-scroll-view` | ScrollView | Source scroll content |
| `import-source-back-button` | Pressable | Navigate back |
| `import-source-continue-button` | Button | Continue to preview |
| `import-source-csv-button` | Pressable | Select CSV file |
| `import-clear-error-button` | Pressable | Clear error message |
| `import-preview-screen` | SafeAreaView | Preview screen |
| `import-preview-scroll-view` | ScrollView | Preview scroll content |
| `import-preview-back-button` | Pressable | Navigate back |
| `import-preview-import-button` | Button | Start import |
| `import-progress-screen` | SafeAreaView | Progress screen |
| `import-success-screen` | SafeAreaView | Success screen |
| `import-success-done-button` | Button | Finish import |

#### Chat / Nutrition Assistant

| TestID | Element | Purpose |
|--------|---------|---------|
| `chat-screen` | SafeAreaView | Chat screen |
| `chat-clear-button` | Pressable | Clear chat |
| `chat-message-input` | TextInput | Message input |
| `chat-send-button` | Pressable | Send message |
| `chat-upgrade-button` | Pressable | Upgrade to premium |

#### Shared UI Components

| TestID | Element | Purpose |
|--------|---------|---------|
| `ui-confirm-dialog` | Modal | Confirmation dialog |
| `ui-confirm-dialog-confirm` | Pressable | Confirm action |
| `ui-confirm-dialog-cancel` | Pressable | Cancel action |
| `ui-tooltip-modal` | Modal | Tooltip modal |
| `ui-tooltip-dismiss` | Pressable | Dismiss tooltip |
| `ui-fab` | Pressable | Floating action button |
| `ui-toast` | View | Toast notification |

#### Water Tracking

| TestID | Element | Purpose |
|--------|---------|---------|
| `water-add-button` | Pressable | Add water glass |
| `water-remove-button` | Pressable | Remove water glass |
| `water-glass-indicator-{index}` | View | Glass indicator (dynamic) |

### Dynamic TestID Helpers

Located in `src/constants/testIDs.ts`:

| Helper Function | Pattern | Example |
|----------------|---------|---------|
| `mealAddFoodButton(meal)` | `meal-add-food-button-{meal}` | `meal-add-food-button-breakfast` |
| `mealEntryItem(id)` | `meal-entry-item-{id}` | `meal-entry-item-abc123` |
| `mealDeleteEntry(id)` | `meal-delete-entry-button-{id}` | `meal-delete-entry-button-abc123` |
| `mealCopyButton(meal)` | `meal-copy-button-{meal}` | `meal-copy-button-lunch` |
| `foodSearchResult(id)` | `add-food-search-result-item-{id}` | `add-food-search-result-item-xyz` |
| `logFoodUnitPill(unit)` | `log-food-unit-pill-{unit}` | `log-food-unit-pill-grams` |
| `aiPhotoFoodCheckbox(index)` | `ai-photo-food-checkbox-{index}` | `ai-photo-food-checkbox-0` |
| `aiPhotoFoodEditButton(index)` | `ai-photo-food-edit-button-{index}` | `ai-photo-food-edit-button-0` |
| `restaurantItem(id)` | `restaurant-item-{id}` | `restaurant-item-mcdonalds` |
| `restaurantCategoryChip(id)` | `restaurant-category-chip-{id}` | `restaurant-category-chip-burgers` |
| `restaurantMenuItem(id)` | `restaurant-menu-item-{id}` | `restaurant-menu-item-big-mac` |
| `settingsActivityLevel(level)` | `settings-profile-activity-level-{level}` | `settings-profile-activity-level-moderate` |
| `settingsRateOption(rate)` | `settings-goals-rate-option-{rate}` | `settings-goals-rate-option-0.5` |
| `waterGlassIndicator(index)` | `water-glass-indicator-{index}` | `water-glass-indicator-3` |
| `homeWidgetItem(type)` | `home-widget-list-{type}` | `home-widget-list-calorie-ring` |
| `settingsWeightUnitOption(unit)` | `settings-units-weight-unit-option-{unit}` | `settings-units-weight-unit-option-lbs` |
| `settingsWaterGlassGoalOption(count)` | `settings-water-glass-goal-option-{count}` | `settings-water-glass-goal-option-8` |
| `settingsWaterGlassSizeOption(size)` | `settings-water-glass-size-option-{size}` | `settings-water-glass-size-option-250` |
| `settingsFastingProtocolOption(protocol)` | `settings-fasting-protocol-option-{protocol}` | `settings-fasting-protocol-option-16:8` |
| `settingsWidgetsRemovePinnedItem(id)` | `settings-widgets-remove-pinned-item-{id}` | `settings-widgets-remove-pinned-item-calorie-ring` |
| `settingsMealPlanningDayCell(date)` | `settings-meal-planning-day-cell-{date}` | `settings-meal-planning-day-cell-2026-01-31` |
| `settingsMealPlanningAddMealButton(slot)` | `settings-meal-planning-add-meal-button-{slot}` | `settings-meal-planning-add-meal-button-breakfast` |
| `settingsMealPlanningDeleteMealButton(id)` | `settings-meal-planning-delete-meal-button-{id}` | `settings-meal-planning-delete-meal-button-abc` |
| `settingsNutritionEatingStyleOption(style)` | `settings-nutrition-eating-style-option-{style}` | `settings-nutrition-eating-style-option-balanced` |
| `settingsNutritionProteinPriorityOption(priority)` | `settings-nutrition-protein-priority-option-{priority}` | `settings-nutrition-protein-priority-option-high` |
| `macroCyclingPatternOption(pattern)` | `macro-cycling-pattern-option-{pattern}` | `macro-cycling-pattern-option-high-low` |
| `macroCyclingDayPill(day)` | `macro-cycling-day-pill-{day}` | `macro-cycling-day-pill-0` |

---

## Navigation Structure

### Navigator Hierarchy

```
Root Stack Navigator (src/app/_layout.tsx)
├── App Initializer (index.tsx)
│   ├── → /legal-acknowledgment (if first launch)
│   ├── → /onboarding (if not completed)
│   └── → /(tabs) (returning user)
│
├── Legal Acknowledgment (legal-acknowledgment.tsx) [fullScreenModal]
│   └── → / (redirects to onboarding or main)
│
├── Onboarding Stack [fullScreenModal, no gesture dismiss]
│   ├── Welcome (onboarding/index.tsx) → /onboarding/goal
│   ├── Goal (onboarding/goal.tsx) → /onboarding/preferences
│   ├── Preferences (onboarding/preferences.tsx) → /onboarding/ready
│   └── Ready (onboarding/ready.tsx) → /(tabs), /add-food, or /add-food/scan
│
├── Main Tabs ((tabs)/_layout.tsx) [CustomTabBar]
│   ├── Home/Today ((tabs)/index.tsx)
│   ├── Progress ((tabs)/progress.tsx)
│   └── Settings ((tabs)/settings.tsx)
│
├── Add Food Stack (add-food/_layout.tsx) [animation: none]
│   ├── Search (add-food/index.tsx)
│   ├── Log (add-food/log.tsx)
│   ├── Quick Add (add-food/quick.tsx)
│   ├── Create Food (add-food/create.tsx)
│   ├── Scan (add-food/scan.tsx)
│   └── AI Photo (add-food/ai-photo.tsx)
│
├── Restaurant Stack (restaurant/_layout.tsx) [animation: none]
│   ├── List (restaurant/index.tsx)
│   ├── Menu (restaurant/[restaurantId].tsx)
│   └── Food Detail (restaurant/food/[foodId].tsx)
│
├── Settings Stack (settings/_layout.tsx)
│   ├── Goals, Profile, Units, Nutrition, Water, Fasting
│   ├── Meal Planning, Widgets, About
│   ├── Health Notice, Privacy Policy, Terms of Service
│   ├── Apple Health (iOS), Health Connect (Android)
│   └── Developer (hidden, 7-tap to access)
│
├── Import Data Stack (import-data/_layout.tsx)
│   ├── Welcome → Source → Type → Preview → Progress → Success
│
├── Standalone Screens
│   ├── Food Detail (food/[id].tsx)
│   ├── Add Planned Meal (add-planned-meal.tsx)
│   └── Macro Cycling Setup (macro-cycling-setup.tsx)
│
├── Modal Screens [presentation: modal, slide_from_bottom]
│   ├── Log Weight (log-weight.tsx)
│   ├── Weekly Reflection (weekly-reflection.tsx)
│   └── Log Entry Editor (log-entry/[id].tsx)
│
├── Paywall (paywall.tsx) [fullScreenModal, no gesture dismiss]
│
└── Not Found (+not-found.tsx)
```

### Complete Screen Inventory

| Screen Name | Route Path | Navigator | Accessible From | Auth Required |
|---|---|---|---|---|
| App Initializer | `/` | Root Stack | App launch | No |
| Legal Acknowledgment | `/legal-acknowledgment` | Root (fullScreenModal) | First launch | No |
| Onboarding Welcome | `/onboarding` | Onboarding Stack | After legal | No |
| Onboarding Goal | `/onboarding/goal` | Onboarding Stack | Welcome | No |
| Onboarding Preferences | `/onboarding/preferences` | Onboarding Stack | Goal | No |
| Onboarding Ready | `/onboarding/ready` | Onboarding Stack | Preferences | No |
| Home/Today | `/(tabs)` | Tabs | Main app entry | No |
| Progress | `/(tabs)/progress` | Tabs | Tab bar | No |
| Settings | `/(tabs)/settings` | Tabs | Tab bar | No |
| Add Food Search | `/add-food` | Add Food Stack | Home, tab bar | No |
| Log Food | `/add-food/log` | Add Food Stack | Food search/select | No |
| Quick Add | `/add-food/quick` | Add Food Stack | Add food screen | No |
| Create Food | `/add-food/create` | Add Food Stack | Add food screen | No |
| Barcode Scanner | `/add-food/scan` | Add Food Stack | Add food, onboarding | No |
| AI Photo | `/add-food/ai-photo` | Add Food Stack | Add food screen | No |
| Restaurant List | `/restaurant` | Restaurant Stack | Add food screen | No |
| Restaurant Menu | `/restaurant/[restaurantId]` | Restaurant Stack | Restaurant list | No |
| Restaurant Food | `/restaurant/food/[foodId]` | Restaurant Stack | Restaurant menu | No |
| Food Detail | `/food/[id]` | Root Stack | Various | No |
| Log Entry Editor | `/log-entry/[id]` | Root (modal) | Home meal entries | No |
| Log Weight | `/log-weight` | Root (modal) | Progress screen | No |
| Weekly Reflection | `/weekly-reflection` | Root (modal) | Home screen | No |
| Paywall | `/paywall` | Root (fullScreenModal) | Settings, premium triggers | No |
| Settings: Goals | `/settings/goals` | Settings Stack | Settings screen | No |
| Settings: Profile | `/settings/profile` | Settings Stack | Settings screen | No |
| Settings: Units | `/settings/units` | Settings Stack | Settings screen | No |
| Settings: Nutrition | `/settings/nutrition` | Settings Stack | Settings screen | No |
| Settings: Water | `/settings/water` | Settings Stack | Settings screen | No |
| Settings: Fasting | `/settings/fasting` | Settings Stack | Settings screen | No |
| Settings: Meal Planning | `/settings/meal-planning` | Settings Stack | Settings screen | No |
| Settings: Widgets | `/settings/widgets` | Settings Stack | Settings screen | No |
| Settings: About | `/settings/about` | Settings Stack | Settings screen | No |
| Settings: Health Notice | `/settings/health-notice` | Settings Stack | Settings screen | No |
| Settings: Privacy Policy | `/settings/privacy-policy` | Settings Stack | Settings screen | No |
| Settings: Terms | `/settings/terms-of-service` | Settings Stack | Settings screen | No |
| Settings: Apple Health | `/settings/apple-health` | Settings Stack | Settings (iOS) | No |
| Settings: Health Connect | `/settings/health-connect` | Settings Stack | Settings (Android) | No |
| Settings: Developer | `/settings/developer` | Settings Stack | 7-tap version | No |
| Macro Cycling Setup | `/macro-cycling-setup` | Root Stack | Settings | Premium |
| Import Welcome | `/import-data` | Import Stack | Settings | No |
| Import Source | `/import-data/source` | Import Stack | Import welcome | No |
| Import Type | `/import-data/type` | Import Stack | Import source | No |
| Import Preview | `/import-data/preview` | Import Stack | Import type | No |
| Import Progress | `/import-data/progress` | Import Stack | Import preview | No |
| Import Success | `/import-data/success` | Import Stack | Import progress | No |
| Add Planned Meal | `/add-planned-meal` | Root Stack | Meal planning | Premium |

---

## Critical User Flows

### Flow 1: First Launch — Legal & Onboarding

**Priority:** Critical
**Description:** Complete first-time user setup from legal acknowledgment through onboarding to the main app.
**Preconditions:** Fresh install, no local data stored.

**Steps:**

1. App launches → Legal Acknowledgment screen appears → testID: `legal-screen`
2. Scroll to bottom of legal content → testID: `legal-scroll-view`
3. Tap acknowledgment checkbox → Checkbox becomes checked → testID: `legal-checkbox`
4. Tap "Proceed" button → Navigates to Onboarding Welcome → testID: `legal-proceed-button`
5. See welcome screen → testID: `onboarding-welcome-screen`
6. Tap "Begin" → Navigates to Goal selection → testID: `onboarding-begin-button`
7. See goal screen → testID: `onboarding-goal-screen`
8. Tap a goal option (e.g., "Lose weight") → Option is selected → testID: `onboarding-goal-option-lose`
9. Tap "Continue" → Navigates to Preferences → testID: `onboarding-goal-continue-button`
10. See preferences screen → testID: `onboarding-preferences-screen`
11. Select energy unit (e.g., calories) → testID: `onboarding-energy-calories`
12. Select weight unit (e.g., lbs) → testID: `onboarding-weight-lbs`
13. Tap "Continue" → Navigates to Ready screen → testID: `onboarding-preferences-continue-button`
14. See ready screen → testID: `onboarding-ready-screen`
15. Tap "Explore the app first" → Navigates to Home tab → testID: `onboarding-ready-explore-app`
16. Verify Home screen appears → testID: `home-screen`

**Success Criteria:** Home screen is displayed with default widgets and empty meal sections.
**Potential Failure Points:**
- Checkbox not registering tap (small hit area)
- Legal scroll not detecting scroll-to-bottom
- Onboarding state not persisting correctly
- Router.replace not working from onboarding to tabs

---

### Flow 2: Log Food via Search

**Priority:** Critical
**Description:** Search for a food item and log it to a meal from the home screen.
**Preconditions:** User has completed onboarding, on Home screen.

**Steps:**

1. From Home screen, tap "Add Food" on a meal section → testID: `meal-add-food-button-breakfast` (or other meal)
2. Add Food screen appears → testID: `add-food-screen`
3. Tap search input → testID: `add-food-search-input`
4. Type a food name (e.g., "chicken breast") → Search results appear
5. Tap a search result → Navigates to Log Food screen → testID: `add-food-search-result-item-{id}`
6. Log Food screen appears → testID: `log-food-screen`
7. Adjust amount if needed → testID: `log-food-amount-input`
8. Verify correct meal is selected (e.g., breakfast) → testID: `log-food-meal-breakfast`
9. Tap "Add" button → Food is logged, navigates back → testID: `log-food-add-button`
10. Verify Home screen shows the new entry in the meal section → testID: `meal-entry-item-{id}`

**Success Criteria:** Food entry appears in the correct meal section on the Home screen with correct nutrition data.
**Potential Failure Points:**
- Search debounce delay (300ms default) — wait for results
- Empty search results if database not initialized
- Meal type parameter not passing correctly through navigation
- Amount input keyboard overlapping UI

---

### Flow 3: Log Food from Restaurant

**Priority:** Critical
**Description:** Browse restaurant menu and log a food item.
**Preconditions:** User on Home screen, restaurants loaded in database.

**Steps:**

1. Tap "Add Food" on a meal section → testID: `meal-add-food-button-lunch`
2. Add Food screen appears → testID: `add-food-screen`
3. Tap "Browse Restaurants" → testID: `add-food-browse-restaurants-button`
4. Restaurant List screen appears → testID: `restaurant-list-screen`
5. Tap a restaurant from the list → testID: `restaurant-item-{id}`
6. Restaurant Menu screen appears → testID: `restaurant-menu-screen`
7. (Optional) Tap a category filter → testID: `restaurant-category-chip-{id}`
8. Tap a menu item → testID: `restaurant-menu-item-{id}`
9. Restaurant Food Detail screen appears → testID: `restaurant-food-screen`
10. Verify meal selection → testID: `restaurant-food-meal-lunch`
11. Adjust amount if needed → testID: `restaurant-food-amount-input`
12. Tap "Add" → Food logged, navigates back → testID: `restaurant-food-add-button`
13. Navigate back to Home and verify entry appears → testID: `home-screen`

**Success Criteria:** Restaurant food item appears in the correct meal section with accurate nutrition data.
**Potential Failure Points:**
- Restaurant data not loading (async initialization)
- Category chip filtering not working
- Menu search returning no results
- Navigation back to home not clearing stack properly

---

### Flow 4: Quick Add

**Priority:** High
**Description:** Quickly log macros without searching for a specific food.
**Preconditions:** User on Home screen.

**Steps:**

1. Tap "Add Food" on a meal section → testID: `meal-add-food-button-snack`
2. Add Food screen appears → testID: `add-food-screen`
3. Tap "Quick Add" from the empty state or FAB menu → Navigates to Quick Add
4. Quick Add screen appears → testID: `quick-add-screen`
5. Enter calories → testID: `quick-add-calories-input`
6. Enter protein → testID: `quick-add-protein-input`
7. Enter carbs → testID: `quick-add-carbs-input`
8. Enter fat → testID: `quick-add-fat-input`
9. (Optional) Enter description → testID: `quick-add-description-input`
10. Verify meal selection → testID: `quick-add-meal-snack`
11. Tap "Add" → Entry logged → testID: `quick-add-add-button`
12. Verify entry appears on Home screen

**Success Criteria:** Quick add entry appears in the meal section with the exact macro values entered.
**Potential Failure Points:**
- Numeric input validation (non-numeric characters)
- Meal type not pre-selected from navigation params
- Zero values not being accepted

---

### Flow 5: Create Custom Food

**Priority:** High
**Description:** Create a new custom food and add it to the food database.
**Preconditions:** User on Add Food screen.

**Steps:**

1. From Add Food screen, tap "Create Food" → testID: `add-food-create-food-button`
2. Create Food screen appears → testID: `create-food-screen`
3. Enter food name → testID: `create-food-name-input`
4. (Optional) Enter brand → testID: `create-food-brand-input`
5. Enter serving amount → testID: `create-food-serving-amount-input`
6. Enter serving unit → testID: `create-food-serving-unit-input`
7. Enter calories → testID: `create-food-calories-input`
8. Enter protein → testID: `create-food-protein-input`
9. Enter carbs → testID: `create-food-carbs-input`
10. Enter fat → testID: `create-food-fat-input`
11. Tap "Create" → Food saved, navigates back → testID: `create-food-create-button`
12. Search for the created food name → Should appear in results

**Success Criteria:** Custom food is created and searchable in the food database.
**Potential Failure Points:**
- Required field validation (name, calories at minimum)
- Duplicate food name handling
- Numeric inputs not accepting decimal values

---

### Flow 6: Barcode Scan

**Priority:** High
**Description:** Scan a food barcode to find and log a food item.
**Preconditions:** Camera permissions granted, user on Add Food screen.

**Steps:**

1. From Add Food screen, tap scan FAB → testID: `add-food-scan-fab`
2. Scanner screen appears → testID: `scanner-screen`
3. (If permissions needed) Tap "Allow Camera" → testID: `scanner-allow-camera-button`
4. Camera viewfinder active, scan a barcode → Food found
5. Automatically navigates to Log Food screen → testID: `log-food-screen`
6. Review food details, adjust amount → testID: `log-food-amount-input`
7. Select meal → testID: `log-food-meal-breakfast`
8. Tap "Add" → testID: `log-food-add-button`

**Success Criteria:** Scanned food is identified and logged correctly.
**Potential Failure Points:**
- Camera permissions denied → Should show permission request or go-back option
- Barcode not found in database → Should show "not found" state with manual entry option
- Flash toggle on devices without flash → testID: `scanner-flash-toggle`
- Scanner needing to scan again → testID: `scanner-scan-again-button`

**Note:** Barcode scanning requires a physical device with camera. Maestro tests for this flow will need either a mock barcode image or should test the permission/manual-entry paths.

---

### Flow 7: AI Photo Food Analysis

**Priority:** High
**Description:** Take a photo of food and use AI to analyze its nutritional content.
**Preconditions:** Camera permissions granted, premium subscription active.

**Steps:**

1. From Add Food screen, tap "AI Photo" → testID: `add-food-ai-photo-button`
2. AI Photo screen appears → testID: `ai-photo-screen`
3. Take a photo → testID: `ai-photo-capture-button`
4. (Optional) Retake → testID: `ai-photo-retake-button`
5. Tap "Analyze" → AI processes the photo → testID: `ai-photo-analyze-button`
6. Review identified foods → Toggle checkboxes → testID: `ai-photo-food-checkbox-{index}`
7. (Optional) Edit a food item → testID: `ai-photo-food-edit-button-{index}`
8. (Optional) In edit modal, modify values → testIDs: `ai-photo-edit-name-input`, `ai-photo-edit-calories-input`, etc.
9. (Optional) Save edits → testID: `ai-photo-edit-save-button`
10. Tap "Add to Meal" → Foods logged → testID: `ai-photo-add-to-meal-button`

**Success Criteria:** AI-identified foods are added to the meal log with correct nutrition data.
**Potential Failure Points:**
- Camera not available (simulator) — need to test gallery path: `ai-photo-gallery-button`
- AI analysis failure/timeout
- No foods identified in photo
- Edit modal keyboard overlapping inputs
- Premium gate — non-premium users should be redirected to paywall

---

### Flow 8: Log Weight

**Priority:** High
**Description:** Record a weight measurement from the Progress screen.
**Preconditions:** User on Progress tab.

**Steps:**

1. Navigate to Progress tab → testID: `tab-bar-progress`
2. Progress screen appears → testID: `progress-screen`
3. Tap "Log Weight" → testID: `progress-log-weight-button`
4. Log Weight modal slides up → testID: `log-weight-screen`
5. Enter weight value → testID: `log-weight-input`
6. (Optional) Use quick adjust buttons → testID: `log-weight-quick-plus-05` or similar
7. (Optional) Use +/- buttons → testIDs: `log-weight-plus-button`, `log-weight-minus-button`
8. (Optional) Add notes → testID: `log-weight-notes-input`
9. Tap "Save" → Weight recorded, modal closes → testID: `log-weight-save-button`
10. Verify weight chart updates on Progress screen → testID: `progress-weight-chart`

**Success Criteria:** Weight entry is saved and visible on the Progress screen weight chart.
**Potential Failure Points:**
- Modal slide animation timing
- Weight input accepting invalid values
- Quick adjust buttons not updating the input field
- Date-based duplicate handling (overwrite vs. multiple entries)

---

### Flow 9: Edit Logged Entry

**Priority:** High
**Description:** Edit an existing food log entry from the Home screen.
**Preconditions:** At least one food entry logged for today.

**Steps:**

1. From Home screen, tap a meal entry item → testID: `meal-entry-item-{id}`
2. Log Entry editor modal slides up → testID: `log-entry-screen`
3. Modify the amount → testID: `log-entry-amount-input`
4. (Optional) Change meal type → testID: `log-entry-meal-lunch` (or other)
5. Tap "Save" → Entry updated → testID: `log-entry-save-button`
6. Verify updated values on Home screen

**Alternative: Delete entry**

5b. Tap "Delete" → Confirmation dialog appears → testID: `log-entry-delete-button`
6b. Confirm deletion → testID: `ui-confirm-dialog-confirm`
7b. Entry removed from Home screen

**Success Criteria:** Entry is updated/deleted and Home screen reflects the changes.
**Potential Failure Points:**
- Modal animation timing
- Amount input not updating nutrition preview
- Delete confirmation dialog not appearing
- Optimistic updates not syncing with store

---

### Flow 10: Modify Settings — Goals

**Priority:** Medium
**Description:** Change weight loss/gain goals in Settings.
**Preconditions:** User on Settings tab.

**Steps:**

1. Navigate to Settings tab → testID: `tab-bar-settings`
2. Settings screen appears → testID: `settings-screen`
3. Tap "Goals" row → testID: `settings-goals-row`
4. Goals screen appears → testID: `settings-goals-screen`
5. Tap "Edit" to enable editing → testID: `settings-goals-edit-button`
6. Select a goal (e.g., "Maintain") → testID: `settings-goals-goal-maintain`
7. (If applicable) Enter target weight → testID: `settings-goals-target-weight-input`
8. (If applicable) Select rate → testID: `settings-goals-rate-option-{rate}`
9. Tap "Save" → Goals updated → testID: `settings-goals-save-button`
10. Verify back on Settings screen

**Success Criteria:** Goals are updated and reflected in dashboard nutrition targets.
**Potential Failure Points:**
- Edit mode toggling correctly
- Cancel discarding unsaved changes → testID: `settings-goals-cancel-button`
- Rate options not visible for "Maintain" goal
- Nutrition recalculation after goal change

---

### Flow 11: Modify Settings — Profile

**Priority:** Medium
**Description:** Update user profile information.
**Preconditions:** User on Settings screen.

**Steps:**

1. Tap "Profile" row → testID: `settings-profile-row`
2. Profile screen appears → testID: `settings-profile-screen`
3. Tap "Edit" → testID: `settings-profile-edit-button`
4. Change sex → testID: `settings-profile-sex-male` or `settings-profile-sex-female`
5. Adjust height → testIDs: `settings-profile-height-minus`, `settings-profile-height-plus`
6. Select activity level → testID: `settings-profile-activity-level-{level}`
7. Tap "Save" → Profile updated → testID: `settings-profile-save-button`

**Success Criteria:** Profile data is saved and calorie/macro targets recalculate.
**Potential Failure Points:**
- Date picker for birthday not dismissing properly
- Height unit toggle behavior
- Activity level selection clearing other fields

---

### Flow 12: Change Theme

**Priority:** Medium
**Description:** Switch between light, dark, and system themes.
**Preconditions:** User on Settings screen.

**Steps:**

1. On Settings screen → testID: `settings-screen`
2. Scroll to Appearance section → testID: `settings-scroll-view`
3. Tap "Dark" theme option → testID: `settings-theme-dark`
4. Verify app theme changes to dark mode
5. Tap "Light" theme option → testID: `settings-theme-light`
6. Verify app theme changes to light mode
7. Tap "System" theme option → testID: `settings-theme-system`

**Success Criteria:** App visually switches themes and persists the selection.
**Potential Failure Points:**
- Theme not applying to all screens immediately
- System theme detection on different OS versions

---

### Flow 13: Import Data

**Priority:** Medium
**Description:** Import food logging data from a CSV file.
**Preconditions:** User on Settings screen, has a CSV export file.

**Steps:**

1. Tap "Import Data" row → testID: `settings-import-row`
2. Import Welcome screen appears → testID: `import-index-screen`
3. Tap "Get Started" → testID: `import-index-get-started-button`
4. Select import source → testID: `import-source-screen`
5. Tap CSV file button → File picker opens → testID: `import-source-csv-button`
6. Select file → Continue to type selection → testID: `import-source-continue-button`
7. Type screen appears → testID: `import-type-screen`
8. Continue → testID: `import-type-continue-button`
9. Preview screen shows data → testID: `import-preview-screen`
10. Tap "Import" → testID: `import-preview-import-button`
11. Progress screen shows import progress → testID: `import-progress-screen`
12. Success screen appears → testID: `import-success-screen`
13. Tap "Done" → Returns to app → testID: `import-success-done-button`

**Success Criteria:** Data is imported and visible in the food log/progress screens.
**Potential Failure Points:**
- File picker not opening (platform-specific)
- CSV parsing errors → testID: `import-clear-error-button`
- Large file causing memory issues during preview
- Import progress stalling

---

### Flow 14: Water Tracking

**Priority:** Medium
**Description:** Track water intake using the water widget on the Home screen.
**Preconditions:** Water tracker widget is on the dashboard.

**Steps:**

1. On Home screen, locate water tracker widget → testID: `widget-water-tracker`
2. Tap add water button → testID: `water-add-button`
3. Water count increases, glass fills → testID: `water-glass-indicator-{index}`
4. (Optional) Tap remove to correct → testID: `water-remove-button`

**Success Criteria:** Water glass count updates visually and persists.
**Potential Failure Points:**
- Widget not on dashboard (need to add it first)
- Haptic feedback causing test flakiness
- Count exceeding daily goal

---

### Flow 15: Navigate Between Date Days

**Priority:** Medium
**Description:** Browse food logs for different dates.
**Preconditions:** User on Home screen with some logged data.

**Steps:**

1. On Home screen → testID: `home-screen`
2. Note current date → testID: `home-date-label`
3. Tap left arrow to go to previous day → testID: `home-date-prev-button`
4. Verify date label changes
5. Verify meal data changes to previous day's data
6. Tap right arrow to return to today → testID: `home-date-next-button`
7. Verify back on today's data

**Success Criteria:** Date navigation works correctly, showing different data for different days.
**Potential Failure Points:**
- Future date blocking (should not go past today)
- Data loading for different dates
- Animation transitions between days

---

### Flow 16: Weekly Reflection

**Priority:** Medium
**Description:** Complete the weekly reflection flow.
**Preconditions:** End of a tracking week, reflection prompt available.

**Steps:**

1. Weekly reflection modal appears (or trigger from Home) → testID: `reflection-screen`
2. Enter reflection notes → testID: `reflection-notes-input`
3. Choose to keep targets or accept new ones:
   - Keep targets → testID: `reflection-keep-targets-button`
   - Accept new → testID: `reflection-accept-new-button`
4. Tap "Done" → Reflection saved → testID: `reflection-done-button`

**Success Criteria:** Reflection is saved and targets are updated if "Accept new" was chosen.
**Potential Failure Points:**
- Reflection not triggering at the right time
- Modal not dismissing properly
- Target recalculation errors

---

### Flow 17: Delete All Data (Destructive)

**Priority:** Medium
**Description:** Delete all app data from Settings.
**Preconditions:** User on Settings screen with existing data.

**Steps:**

1. Scroll to bottom of Settings → testID: `settings-scroll-view`
2. Tap "Delete All Data" → testID: `settings-delete-all-data-row`
3. Confirmation dialog appears → testID: `ui-confirm-dialog`
4. Tap "Confirm" → testID: `ui-confirm-dialog-confirm`
5. All data cleared, app resets

**Success Criteria:** All data is deleted, app returns to a clean state.
**Potential Failure Points:**
- Confirmation dialog not appearing
- Incomplete data deletion
- App crash during reset
- Navigation state not clearing properly

---

### Flow 18: Favorite a Food

**Priority:** Medium
**Description:** Mark a food as favorite during logging and find it in favorites section.
**Preconditions:** User is logging a food.

**Steps:**

1. On Log Food screen → testID: `log-food-screen`
2. Tap favorite button (star icon) → testID: `log-food-favorite-button`
3. Star becomes filled/highlighted
4. Complete logging → testID: `log-food-add-button`
5. Return to Add Food screen → testID: `add-food-screen`
6. Check Favorites section → testID: `add-food-favorites-section`
7. Verify the food appears in favorites

**Success Criteria:** Food is marked as favorite and appears in the favorites section.
**Potential Failure Points:**
- Favorite state not persisting
- Haptic/animation causing delays
- Favorites section not refreshing

---

## Environment Notes

### Technology Stack

- **Framework:** React Native with Expo (Expo Router for navigation)
- **State Management:** Zustand stores (`useRestaurantStore`, `useOnboardingStore`, `useSettingsStore`, etc.)
- **Database:** Local-first (AsyncStorage / SQLite via Expo)
- **Premium:** RevenueCat for subscription management
- **Animations:** `react-native-reanimated` for animated components
- **Haptics:** `expo-haptics` for tactile feedback

### API & Networking

- **Local-first architecture:** No mandatory API calls for core functionality
- **AI features:** Require network for photo analysis
- **Restaurant data:** Bundled with app, loaded from local database on initialization
- **Food database:** Pre-populated, can be extended with custom foods
- **RevenueCat:** Network call for subscription status (can be mocked via developer toggle)

### Test Data Setup

Use the Developer Settings to prepare test state:

1. **Seed Database:** `settings-developer-seed-button` — Creates sample data with configurable months
2. **Clear Data:** `settings-developer-clear-data-button` — Resets to empty state
3. **Toggle Premium:** `settings-dev-premium-toggle` — Enables/disables premium features without a real subscription
4. **Fresh Session:** `settings-dev-fresh-session` — Resets to first-launch state (triggers legal + onboarding)

### Platform Differences

- **Apple Health integration:** iOS only (`settings-apple-health-row`)
- **Health Connect integration:** Android only (`settings-health-connect-row`)
- **Barcode scanner:** Requires physical camera (not available in simulators)
- **Haptic feedback:** Device-dependent, tests should not depend on haptic timing
- **Modal presentation:** iOS uses sheet presentation, Android uses full-screen with slide animation

---

## Known Quirks

### Timing Considerations

- **Search debounce:** 300ms delay before search results appear (configurable via `SEARCH_SETTINGS.debounceMs`)
- **Restaurant data initialization:** Async loading on first visit to restaurant list — wait for `restaurant-list-screen` to appear
- **Animations:** `react-native-reanimated` animations (spring, fade) may need ~400-500ms to complete
- **Haptic feedback:** `expo-haptics` calls are fire-and-forget (`.catch(() => {})`) — won't block UI
- **Widget picker modal:** Animated appearance may need brief wait after `home-add-widget-button` tap

### Navigation Patterns

- **CustomTabBar:** The app uses a custom tab bar rather than React Navigation's default — tab testIDs are on the custom Pressable components
- **Modal screens:** Log Weight, Weekly Reflection, and Log Entry use `presentation: 'modal'` with `slide_from_bottom` — swipe down to dismiss (iOS), back button to dismiss (Android)
- **Full screen modals:** Legal, Onboarding, Paywall block gesture dismiss (`gestureEnabled: false`)
- **Stack reset:** After onboarding, `router.replace()` is used — the navigation stack is reset, not pushed

### Data Dependencies

- **Restaurant list:** Requires `initializeData()` + `loadRestaurants()` to complete before items are visible
- **Search results:** Depend on database being populated (either bundled data or seeded data)
- **Progress charts:** Require historical data to display meaningful charts — use seed data
- **Widget list:** Default widgets are loaded on first launch — can be customized via edit mode

### Input Handling

- **Numeric inputs:** Weight, calories, macros accept decimal values — keyboard type varies by platform
- **Text inputs:** Food search uses debounced input — don't assert immediately after typing
- **Scroll containers:** Some screens require scrolling to reach elements — use Maestro's scroll commands
- **Keyboard dismissal:** Some screens have `keyboardShouldPersistTaps="handled"` — keyboard may stay visible

### Premium Feature Gates

These features require premium (or developer toggle):
- Macro Cycling Setup (`/macro-cycling-setup`)
- AI Photo Analysis (`/add-food/ai-photo`)
- Micronutrient Tracking
- Add Planned Meal (`/add-planned-meal`)
- Advanced widgets (AI Daily Insight, Weekly Recap)

Use `settings-dev-premium-toggle` to bypass subscription checks during testing.
