/**
 * Centralized Test ID Constants
 * Used for Maestro E2E testing and accessibility targeting.
 *
 * Naming convention: [feature]-[component]-[element] (kebab-case)
 * Dynamic IDs use template helpers at the bottom of this file.
 */

export const TestIDs = {
  // ===========================================================
  // Legal Acknowledgment
  // ===========================================================
  Legal: {
    Screen: 'legal-screen',
    ScrollView: 'legal-scroll-view',
    Checkbox: 'legal-checkbox',
    ScrollToBottom: 'legal-scroll-to-bottom',
    ScrollComplete: 'legal-scroll-complete',
    ProceedButton: 'legal-proceed-button',
    TermsLink: 'legal-terms-link',
  },

  // ===========================================================
  // Onboarding
  // ===========================================================
  Onboarding: {
    // Welcome
    WelcomeScreen: 'onboarding-welcome-screen',
    BeginButton: 'onboarding-begin-button',

    // Goal
    GoalScreen: 'onboarding-goal-screen',
    GoalBackButton: 'onboarding-goal-back-button',
    GoalOptionLose: 'onboarding-goal-option-lose',
    GoalOptionMaintain: 'onboarding-goal-option-maintain',
    GoalOptionBuild: 'onboarding-goal-option-build',
    GoalOptionTrack: 'onboarding-goal-option-track',
    GoalContinueButton: 'onboarding-goal-continue-button',

    // Preferences
    PreferencesScreen: 'onboarding-preferences-screen',
    PreferencesBackButton: 'onboarding-preferences-back-button',
    EnergyCalories: 'onboarding-energy-calories',
    EnergyKilojoules: 'onboarding-energy-kilojoules',
    WeightLbs: 'onboarding-weight-lbs',
    WeightKg: 'onboarding-weight-kg',
    PreferencesContinueButton: 'onboarding-preferences-continue-button',

    // Ready
    ReadyScreen: 'onboarding-ready-screen',
    ReadyBackButton: 'onboarding-ready-back-button',
    ReadyScanBarcode: 'onboarding-ready-scan-barcode',
    ReadySearchFood: 'onboarding-ready-search-food',
    ReadyExploreApp: 'onboarding-ready-explore-app',
  },

  // ===========================================================
  // Tab Navigation
  // ===========================================================
  TabBar: {
    Container: 'tab-bar-container',
    HomeTab: 'tab-bar-home',
    FoodTab: 'tab-bar-food',
    ProgressTab: 'tab-bar-progress',
    SettingsTab: 'tab-bar-settings',
  },

  // ===========================================================
  // Home / Dashboard (Today)
  // ===========================================================
  Home: {
    Screen: 'home-screen',
    DatePrevButton: 'home-date-prev-button',
    DateNextButton: 'home-date-next-button',
    DateLabel: 'home-date-label',
    DayMenuButton: 'home-day-menu-button',
    EditButton: 'home-edit-button',
    RestoreButton: 'home-restore-button',
    AddWidgetButton: 'home-add-widget-button',
    StreakBadge: 'home-streak-badge',
    DayTypeBadge: 'home-day-type-badge',
    WidgetList: 'home-widget-list',
    WidgetPickerModal: 'home-widget-picker-modal',
    DayMenuModal: 'home-day-menu-modal',
  },

  // ===========================================================
  // Dashboard Widgets
  // ===========================================================
  Widget: {
    CalorieRing: 'widget-calorie-ring',
    MacroBars: 'widget-macro-bars',
    WeeklyAverage: 'widget-weekly-average',
    ProteinFocus: 'widget-protein-focus',
    GoalsSummary: 'widget-goals-summary',
    TodaysMeals: 'widget-todays-meals',
    WaterTracker: 'widget-water-tracker',
    StreakBadge: 'widget-streak-badge',
    NutritionOverview: 'widget-nutrition-overview',
    QuickAdd: 'widget-quick-add',
    MealIdeas: 'widget-meal-ideas',
    FastingTimer: 'widget-fasting-timer',
    MicronutrientSnapshot: 'widget-micronutrient-snapshot',
    AIDailyInsight: 'widget-ai-daily-insight',
    WeeklyRecap: 'widget-weekly-recap',
    WeightTrend: 'widget-weight-trend',
  },

  // ===========================================================
  // Meal Sections (on Home screen)
  // ===========================================================
  Meal: {
    BreakfastSection: 'meal-breakfast-section',
    LunchSection: 'meal-lunch-section',
    DinnerSection: 'meal-dinner-section',
    SnackSection: 'meal-snack-section',
    AddFoodButton: 'meal-add-food-button',       // dynamic: use helper
    CopyMealButton: 'meal-copy-button',           // dynamic: use helper
    EntryItem: 'meal-entry-item',                 // dynamic: use helper
    DeleteEntryButton: 'meal-delete-entry-button', // dynamic: use helper
  },

  // ===========================================================
  // Progress / Journey Screen
  // ===========================================================
  Progress: {
    Screen: 'progress-screen',
    LogWeightButton: 'progress-log-weight-button',
    TimeRange7d: 'progress-time-range-7d',
    TimeRange14d: 'progress-time-range-14d',
    TimeRange30d: 'progress-time-range-30d',
    TimeRange90d: 'progress-time-range-90d',
    TimeRangeAll: 'progress-time-range-all',
    WeightChart: 'progress-weight-chart',
    CalorieChart: 'progress-calorie-chart',
    MacroChart: 'progress-macro-chart',
  },

  // ===========================================================
  // Add Food Flow
  // ===========================================================
  AddFood: {
    Screen: 'add-food-screen',
    SearchInput: 'add-food-search-input',
    ClearSearchButton: 'add-food-clear-search-button',
    ScanFAB: 'add-food-scan-fab',
    TabAll: 'add-food-tab-all',
    TabRestaurants: 'add-food-tab-restaurants',
    TabMyFoods: 'add-food-tab-my-foods',
    FavoritesSection: 'add-food-favorites-section',
    RecentSection: 'add-food-recent-section',
    QuickAddButton: 'add-food-quick-add-button',
    AIPhotoButton: 'add-food-ai-photo-button',
    CreateFoodButton: 'add-food-create-food-button',
    BrowseRestaurantsButton: 'add-food-browse-restaurants-button',
    SearchResultItem: 'add-food-search-result-item', // dynamic: use helper
  },

  // ===========================================================
  // Log Food Screen
  // ===========================================================
  LogFood: {
    Screen: 'log-food-screen',
    BackButton: 'log-food-back-button',
    FavoriteButton: 'log-food-favorite-button',
    AmountInput: 'log-food-amount-input',
    UnitPill: 'log-food-unit-pill',               // dynamic: use helper
    MealBreakfast: 'log-food-meal-breakfast',
    MealLunch: 'log-food-meal-lunch',
    MealDinner: 'log-food-meal-dinner',
    MealSnack: 'log-food-meal-snack',
    AddButton: 'log-food-add-button',
  },

  // ===========================================================
  // Quick Add Screen
  // ===========================================================
  QuickAdd: {
    Screen: 'quick-add-screen',
    BackButton: 'quick-add-back-button',
    CaloriesInput: 'quick-add-calories-input',
    ProteinInput: 'quick-add-protein-input',
    CarbsInput: 'quick-add-carbs-input',
    FatInput: 'quick-add-fat-input',
    MealBreakfast: 'quick-add-meal-breakfast',
    MealLunch: 'quick-add-meal-lunch',
    MealDinner: 'quick-add-meal-dinner',
    MealSnack: 'quick-add-meal-snack',
    DescriptionInput: 'quick-add-description-input',
    AddButton: 'quick-add-add-button',
  },

  // ===========================================================
  // Create Food Screen
  // ===========================================================
  CreateFood: {
    Screen: 'create-food-screen',
    BackButton: 'create-food-back-button',
    NameInput: 'create-food-name-input',
    BrandInput: 'create-food-brand-input',
    ServingAmountInput: 'create-food-serving-amount-input',
    ServingUnitInput: 'create-food-serving-unit-input',
    CaloriesInput: 'create-food-calories-input',
    ProteinInput: 'create-food-protein-input',
    CarbsInput: 'create-food-carbs-input',
    FatInput: 'create-food-fat-input',
    CreateButton: 'create-food-create-button',
    CancelButton: 'create-food-cancel-button',
  },

  // ===========================================================
  // Barcode Scanner Screen
  // ===========================================================
  Scanner: {
    Screen: 'scanner-screen',
    CloseButton: 'scanner-close-button',
    FlashToggle: 'scanner-flash-toggle',
    ScanAgainButton: 'scanner-scan-again-button',
    EnterManuallyButton: 'scanner-enter-manually-button',
    AllowCameraButton: 'scanner-allow-camera-button',
    GoBackButton: 'scanner-go-back-button',
  },

  // ===========================================================
  // AI Photo Screen
  // ===========================================================
  AIPhoto: {
    Screen: 'ai-photo-screen',
    CloseButton: 'ai-photo-close-button',
    FlashToggle: 'ai-photo-flash-toggle',
    GalleryButton: 'ai-photo-gallery-button',
    CaptureButton: 'ai-photo-capture-button',
    RetakeButton: 'ai-photo-retake-button',
    AnalyzeButton: 'ai-photo-analyze-button',
    FoodCheckbox: 'ai-photo-food-checkbox',       // dynamic: use helper
    FoodEditButton: 'ai-photo-food-edit-button',   // dynamic: use helper
    EditModal: 'ai-photo-edit-modal',
    EditNameInput: 'ai-photo-edit-name-input',
    EditCaloriesInput: 'ai-photo-edit-calories-input',
    EditProteinInput: 'ai-photo-edit-protein-input',
    EditCarbsInput: 'ai-photo-edit-carbs-input',
    EditFatInput: 'ai-photo-edit-fat-input',
    EditSaveButton: 'ai-photo-edit-save-button',
    AddToMealButton: 'ai-photo-add-to-meal-button',
  },

  // ===========================================================
  // Restaurant Flow
  // ===========================================================
  Restaurant: {
    ListScreen: 'restaurant-list-screen',
    SearchInput: 'restaurant-search-input',
    ClearSearchButton: 'restaurant-clear-search-button',
    BackButton: 'restaurant-back-button',
    RestaurantItem: 'restaurant-item',             // dynamic: use helper
    RecentSection: 'restaurant-recent-section',

    // Menu screen
    MenuScreen: 'restaurant-menu-screen',
    MenuBackButton: 'restaurant-menu-back-button',
    MenuSearchInput: 'restaurant-menu-search-input',
    CategoryAll: 'restaurant-category-all',
    CategoryChip: 'restaurant-category-chip',       // dynamic: use helper
    MenuItem: 'restaurant-menu-item',               // dynamic: use helper

    // Food detail screen
    FoodScreen: 'restaurant-food-screen',
    FoodBackButton: 'restaurant-food-back-button',
    FoodAmountInput: 'restaurant-food-amount-input',
    FoodMealBreakfast: 'restaurant-food-meal-breakfast',
    FoodMealLunch: 'restaurant-food-meal-lunch',
    FoodMealDinner: 'restaurant-food-meal-dinner',
    FoodMealSnack: 'restaurant-food-meal-snack',
    FoodAddButton: 'restaurant-food-add-button',
  },

  // ===========================================================
  // Settings Screen
  // ===========================================================
  Settings: {
    Screen: 'settings-screen',
    ScrollView: 'settings-scroll-view',

    // Section rows
    PremiumRow: 'settings-premium-row',
    GoalsRow: 'settings-goals-row',
    NutritionRow: 'settings-nutrition-row',
    MealPlanningRow: 'settings-meal-planning-row',
    MacroCyclingRow: 'settings-macro-cycling-row',
    WaterRow: 'settings-water-row',
    FastingRow: 'settings-fasting-row',
    ProfileRow: 'settings-profile-row',
    UnitsRow: 'settings-units-row',
    ThemeSystem: 'settings-theme-system',
    ThemeLight: 'settings-theme-light',
    ThemeDark: 'settings-theme-dark',
    AppleHealthRow: 'settings-apple-health-row',
    HealthConnectRow: 'settings-health-connect-row',
    WidgetsRow: 'settings-widgets-row',
    RestoreLayoutRow: 'settings-restore-layout-row',
    ImportRow: 'settings-import-row',
    HelpRow: 'settings-help-row',
    HealthNoticeRow: 'settings-health-notice-row',
    AboutRow: 'settings-about-row',
    TermsRow: 'settings-terms-row',
    PrivacyRow: 'settings-privacy-row',
    DeleteAllDataRow: 'settings-delete-all-data-row',

    // Developer section
    DevPremiumToggle: 'settings-dev-premium-toggle',
    DevFreshSession: 'settings-dev-fresh-session',
    DevSeedDatabase: 'settings-dev-seed-database',
  },

  // ===========================================================
  // Settings Sub-screens
  // ===========================================================
  SettingsProfile: {
    Screen: 'settings-profile-screen',
    ScrollView: 'settings-profile-scroll-view',
    BackButton: 'settings-profile-back-button',
    EditButton: 'settings-profile-edit-button',
    SexMale: 'settings-profile-sex-male',
    SexFemale: 'settings-profile-sex-female',
    BirthdayButton: 'settings-profile-birthday-button',
    DatePickerDone: 'settings-profile-date-picker-done',
    HeightMinus: 'settings-profile-height-minus',
    HeightPlus: 'settings-profile-height-plus',
    HeightUnitToggle: 'settings-profile-height-unit-toggle',
    ActivityLevel: 'settings-profile-activity-level', // dynamic: use helper
    CancelButton: 'settings-profile-cancel-button',
    SaveButton: 'settings-profile-save-button',
  },

  SettingsGoals: {
    Screen: 'settings-goals-screen',
    ScrollView: 'settings-goals-scroll-view',
    BackButton: 'settings-goals-back-button',
    EditButton: 'settings-goals-edit-button',
    GoalLose: 'settings-goals-goal-lose',
    GoalMaintain: 'settings-goals-goal-maintain',
    GoalGain: 'settings-goals-goal-gain',
    TargetWeightInput: 'settings-goals-target-weight-input',
    RateOption: 'settings-goals-rate-option',         // dynamic: use helper
    CancelButton: 'settings-goals-cancel-button',
    SaveButton: 'settings-goals-save-button',
  },

  SettingsUnits: {
    Screen: 'settings-units-screen',
    ScrollView: 'settings-units-scroll-view',
    BackButton: 'settings-units-back-button',
    WeightUnitOption: 'settings-units-weight-unit-option', // dynamic: use helper
  },

  SettingsWater: {
    Screen: 'settings-water-screen',
    ScrollView: 'settings-water-scroll-view',
    BackButton: 'settings-water-back-button',
    GlassGoalOption: 'settings-water-glass-goal-option', // dynamic: use helper
    CustomGoalButton: 'settings-water-custom-goal-button',
    CustomGoalInput: 'settings-water-custom-goal-input',
    GlassSizeOption: 'settings-water-glass-size-option', // dynamic: use helper
  },

  SettingsHealthNotice: {
    Screen: 'settings-health-notice-screen',
    ScrollView: 'settings-health-notice-scroll-view',
    BackButton: 'settings-health-notice-back-button',
  },

  SettingsPrivacyPolicy: {
    Screen: 'settings-privacy-policy-screen',
    ScrollView: 'settings-privacy-policy-scroll-view',
    BackButton: 'settings-privacy-policy-back-button',
  },

  SettingsTermsOfService: {
    Screen: 'settings-terms-of-service-screen',
    ScrollView: 'settings-terms-of-service-scroll-view',
    BackButton: 'settings-terms-of-service-back-button',
  },

  SettingsHealthConnect: {
    Screen: 'settings-health-connect-screen',
    BackButton: 'settings-health-connect-back-button',
  },

  SettingsAppleHealth: {
    Screen: 'settings-apple-health-screen',
    BackButton: 'settings-apple-health-back-button',
  },

  SettingsFasting: {
    Screen: 'settings-fasting-screen',
    ScrollView: 'settings-fasting-scroll-view',
    BackButton: 'settings-fasting-back-button',
    EnableToggle: 'settings-fasting-enable-toggle',
    ProtocolOption: 'settings-fasting-protocol-option', // dynamic: use helper
    StartTimeButton: 'settings-fasting-start-time-button',
    EndTimeButton: 'settings-fasting-end-time-button',
    NotifyWindowOpens: 'settings-fasting-notify-window-opens',
    NotifyWindowCloses: 'settings-fasting-notify-window-closes',
    NotifyFastComplete: 'settings-fasting-notify-fast-complete',
  },

  SettingsWidgets: {
    Screen: 'settings-widgets-screen',
    ScrollView: 'settings-widgets-scroll-view',
    BackButton: 'settings-widgets-back-button',
    ClearAllButton: 'settings-widgets-clear-all-button',
    RemovePinnedItem: 'settings-widgets-remove-pinned-item', // dynamic: use helper
  },

  SettingsAbout: {
    Screen: 'settings-about-screen',
    BackButton: 'settings-about-back-button',
  },

  SettingsMealPlanning: {
    Screen: 'settings-meal-planning-screen',
    ScrollView: 'settings-meal-planning-scroll-view',
    EnableToggle: 'settings-meal-planning-enable-toggle',
    ShowOnTodayToggle: 'settings-meal-planning-show-on-today-toggle',
    WeekPrevButton: 'settings-meal-planning-week-prev-button',
    WeekNextButton: 'settings-meal-planning-week-next-button',
    CancelCopyButton: 'settings-meal-planning-cancel-copy-button',
    DayCell: 'settings-meal-planning-day-cell',             // dynamic: use helper
    ModalOverlay: 'settings-meal-planning-modal-overlay',
    ModalContent: 'settings-meal-planning-modal-content',
    ModalCloseButton: 'settings-meal-planning-modal-close-button',
    ModalScrollView: 'settings-meal-planning-modal-scroll-view',
    AddMealButton: 'settings-meal-planning-add-meal-button', // dynamic: use helper
    DeleteMealButton: 'settings-meal-planning-delete-meal-button', // dynamic: use helper
    CopyDayButton: 'settings-meal-planning-copy-day-button',
    ClearDayButton: 'settings-meal-planning-clear-day-button',
  },

  SettingsNutrition: {
    Screen: 'settings-nutrition-screen',
    ScrollView: 'settings-nutrition-scroll-view',
    BackButton: 'settings-nutrition-back-button',
    EditButton: 'settings-nutrition-edit-button',
    EatingStyleOption: 'settings-nutrition-eating-style-option', // dynamic: use helper
    ProteinPriorityOption: 'settings-nutrition-protein-priority-option', // dynamic: use helper
    CancelButton: 'settings-nutrition-cancel-button',
    SaveButton: 'settings-nutrition-save-button',
  },

  SettingsDeveloper: {
    Screen: 'settings-developer-screen',
    ScrollView: 'settings-developer-scroll-view',
    BackButton: 'settings-developer-back-button',
    ClearExistingToggle: 'settings-developer-clear-existing-toggle',
    EdgeCasesToggle: 'settings-developer-edge-cases-toggle',
    MonthsMinus: 'settings-developer-months-minus',
    MonthsPlus: 'settings-developer-months-plus',
    VerboseToggle: 'settings-developer-verbose-toggle',
    SeedButton: 'settings-developer-seed-button',
    ClearDataButton: 'settings-developer-clear-data-button',
    ResetButton: 'settings-developer-reset-button',
    RefreshButton: 'settings-developer-refresh-button',
    DismissResultButton: 'settings-developer-dismiss-result-button',
  },

  // ===========================================================
  // Macro Cycling Setup
  // ===========================================================
  MacroCycling: {
    Screen: 'macro-cycling-screen',
    ScrollView: 'macro-cycling-scroll-view',
    CloseButton: 'macro-cycling-close-button',
    PatternOption: 'macro-cycling-pattern-option',     // dynamic: use helper
    DayPill: 'macro-cycling-day-pill',                 // dynamic: use helper
    DisableButton: 'macro-cycling-disable-button',
    BackStepButton: 'macro-cycling-back-step-button',
    ContinueButton: 'macro-cycling-continue-button',
    EnableButton: 'macro-cycling-enable-button',
  },

  // ===========================================================
  // Add Planned Meal
  // ===========================================================
  AddPlannedMeal: {
    Screen: 'add-planned-meal-screen',
    SearchInput: 'add-planned-meal-search-input',
    ClearSearchButton: 'add-planned-meal-clear-search-button',
    ClearSelectionButton: 'add-planned-meal-clear-selection-button',
    ServingsMinusButton: 'add-planned-meal-servings-minus-button',
    ServingsInput: 'add-planned-meal-servings-input',
    ServingsPlusButton: 'add-planned-meal-servings-plus-button',
    AddButton: 'add-planned-meal-add-button',
    SectionsScrollView: 'add-planned-meal-sections-scroll-view',
  },

  // ===========================================================
  // Log Weight Screen
  // ===========================================================
  LogWeight: {
    Screen: 'log-weight-screen',
    CloseButton: 'log-weight-close-button',
    MinusButton: 'log-weight-minus-button',
    WeightInput: 'log-weight-input',
    PlusButton: 'log-weight-plus-button',
    QuickMinus1: 'log-weight-quick-minus-1',
    QuickMinus05: 'log-weight-quick-minus-05',
    QuickPlus05: 'log-weight-quick-plus-05',
    QuickPlus1: 'log-weight-quick-plus-1',
    NotesInput: 'log-weight-notes-input',
    SaveButton: 'log-weight-save-button',
  },

  // ===========================================================
  // Weekly Reflection Screen
  // ===========================================================
  Reflection: {
    Screen: 'reflection-screen',
    CloseButton: 'reflection-close-button',
    NotesInput: 'reflection-notes-input',
    KeepTargetsButton: 'reflection-keep-targets-button',
    AcceptNewButton: 'reflection-accept-new-button',
    DoneButton: 'reflection-done-button',
  },

  // ===========================================================
  // Food Detail Screen
  // ===========================================================
  FoodDetail: {
    Screen: 'food-detail-screen',
    ScrollView: 'food-detail-scroll-view',
    BackButton: 'food-detail-back-button',
    FavoriteButton: 'food-detail-favorite-button',
    AddToLogButton: 'food-detail-add-to-log-button',
    DeleteButton: 'food-detail-delete-button',
    GoBackButton: 'food-detail-go-back-button',
  },

  // ===========================================================
  // Log Entry Edit Screen
  // ===========================================================
  LogEntry: {
    Screen: 'log-entry-screen',
    CloseButton: 'log-entry-close-button',
    AmountInput: 'log-entry-amount-input',
    MealBreakfast: 'log-entry-meal-breakfast',
    MealLunch: 'log-entry-meal-lunch',
    MealDinner: 'log-entry-meal-dinner',
    MealSnack: 'log-entry-meal-snack',
    SaveButton: 'log-entry-save-button',
    DeleteButton: 'log-entry-delete-button',
  },

  // ===========================================================
  // Paywall
  // ===========================================================
  Paywall: {
    Screen: 'paywall-screen',
    CloseButton: 'paywall-close-button',
    SubscribeButton: 'paywall-subscribe-button',
    RestoreButton: 'paywall-restore-button',
    TermsLink: 'paywall-terms-link',
    PrivacyLink: 'paywall-privacy-link',
  },

  // ===========================================================
  // Import Data Flow
  // ===========================================================
  Import: {
    IndexScreen: 'import-index-screen',
    IndexScrollView: 'import-index-scroll-view',
    IndexBackButton: 'import-index-back-button',
    IndexGetStartedButton: 'import-index-get-started-button',
    SeedDataButton: 'import-seed-data-button',
    ClearSeedDataButton: 'import-clear-seed-data-button',
    TypeScreen: 'import-type-screen',
    TypeScrollView: 'import-type-scroll-view',
    TypeBackButton: 'import-type-back-button',
    TypeContinueButton: 'import-type-continue-button',
    SourceScreen: 'import-source-screen',
    SourceScrollView: 'import-source-scroll-view',
    SourceBackButton: 'import-source-back-button',
    SourceContinueButton: 'import-source-continue-button',
    SourceInstructionsBackButton: 'import-source-instructions-back-button',
    SourceInstructionsScrollView: 'import-source-instructions-scroll-view',
    SourceCSVButton: 'import-source-csv-button',
    ClearErrorButton: 'import-clear-error-button',
    PreviewScreen: 'import-preview-screen',
    PreviewScrollView: 'import-preview-scroll-view',
    PreviewBackButton: 'import-preview-back-button',
    PreviewImportButton: 'import-preview-import-button',
    ProgressScreen: 'import-progress-screen',
    SuccessScreen: 'import-success-screen',
    SuccessDoneButton: 'import-success-done-button',
    BackButton: 'import-back-button',
    ContinueButton: 'import-continue-button',
    ImportButton: 'import-import-button',
    DoneButton: 'import-done-button',
  },

  // ===========================================================
  // Chat / Nutrition Assistant
  // ===========================================================
  Chat: {
    Screen: 'chat-screen',
    ClearButton: 'chat-clear-button',
    MessageInput: 'chat-message-input',
    SendButton: 'chat-send-button',
    UpgradeButton: 'chat-upgrade-button',
  },

  // ===========================================================
  // Shared UI Components
  // ===========================================================
  UI: {
    ConfirmDialog: 'ui-confirm-dialog',
    ConfirmDialogConfirm: 'ui-confirm-dialog-confirm',
    ConfirmDialogCancel: 'ui-confirm-dialog-cancel',
    TooltipModal: 'ui-tooltip-modal',
    TooltipDismiss: 'ui-tooltip-dismiss',
    FloatingActionButton: 'ui-fab',
    Toast: 'ui-toast',
  },

  // ===========================================================
  // Water Tracking
  // ===========================================================
  Water: {
    AddButton: 'water-add-button',
    RemoveButton: 'water-remove-button',
    GlassIndicator: 'water-glass-indicator',       // dynamic: use helper
  },
} as const;

// ===========================================================
// Dynamic ID Helpers
// ===========================================================

/** Meal section add-food button: `meal-add-food-button-breakfast` */
export const mealAddFoodButton = (meal: string) =>
  `${TestIDs.Meal.AddFoodButton}-${meal}` as const;

/** Meal entry item: `meal-entry-item-{id}` */
export const mealEntryItem = (id: string) =>
  `${TestIDs.Meal.EntryItem}-${id}` as const;

/** Meal entry delete button: `meal-delete-entry-button-{id}` */
export const mealDeleteEntry = (id: string) =>
  `${TestIDs.Meal.DeleteEntryButton}-${id}` as const;

/** Meal copy button: `meal-copy-button-breakfast` */
export const mealCopyButton = (meal: string) =>
  `${TestIDs.Meal.CopyMealButton}-${meal}` as const;

/** Food search result: `add-food-search-result-item-{id}` */
export const foodSearchResult = (id: string) =>
  `${TestIDs.AddFood.SearchResultItem}-${id}` as const;

/** Log food unit pill: `log-food-unit-pill-{unit}` */
export const logFoodUnitPill = (unit: string) =>
  `${TestIDs.LogFood.UnitPill}-${unit}` as const;

/** AI photo food checkbox: `ai-photo-food-checkbox-{index}` */
export const aiPhotoFoodCheckbox = (index: number) =>
  `${TestIDs.AIPhoto.FoodCheckbox}-${index}` as const;

/** AI photo food edit button: `ai-photo-food-edit-button-{index}` */
export const aiPhotoFoodEditButton = (index: number) =>
  `${TestIDs.AIPhoto.FoodEditButton}-${index}` as const;

/** Restaurant list item: `restaurant-item-{id}` */
export const restaurantItem = (id: string) =>
  `${TestIDs.Restaurant.RestaurantItem}-${id}` as const;

/** Restaurant category chip: `restaurant-category-chip-{id}` */
export const restaurantCategoryChip = (id: string) =>
  `${TestIDs.Restaurant.CategoryChip}-${id}` as const;

/** Restaurant menu item: `restaurant-menu-item-{id}` */
export const restaurantMenuItem = (id: string) =>
  `${TestIDs.Restaurant.MenuItem}-${id}` as const;

/** Settings profile activity level: `settings-profile-activity-level-{level}` */
export const settingsActivityLevel = (level: string) =>
  `${TestIDs.SettingsProfile.ActivityLevel}-${level}` as const;

/** Settings goals rate option: `settings-goals-rate-option-{rate}` */
export const settingsRateOption = (rate: string) =>
  `${TestIDs.SettingsGoals.RateOption}-${rate}` as const;

/** Water glass indicator: `water-glass-indicator-{index}` */
export const waterGlassIndicator = (index: number) =>
  `${TestIDs.Water.GlassIndicator}-${index}` as const;

/** Widget item in widget list: `home-widget-list-{widgetType}` */
export const homeWidgetItem = (widgetType: string) =>
  `${TestIDs.Home.WidgetList}-${widgetType}` as const;

/** Settings units weight unit option: `settings-units-weight-unit-option-{unit}` */
export const settingsWeightUnitOption = (unit: string) =>
  `${TestIDs.SettingsUnits.WeightUnitOption}-${unit}` as const;

/** Settings water glass goal option: `settings-water-glass-goal-option-{count}` */
export const settingsWaterGlassGoalOption = (count: number) =>
  `${TestIDs.SettingsWater.GlassGoalOption}-${count}` as const;

/** Settings water glass size option: `settings-water-glass-size-option-{size}` */
export const settingsWaterGlassSizeOption = (size: number) =>
  `${TestIDs.SettingsWater.GlassSizeOption}-${size}` as const;

/** Settings fasting protocol option: `settings-fasting-protocol-option-{protocol}` */
export const settingsFastingProtocolOption = (protocol: string) =>
  `${TestIDs.SettingsFasting.ProtocolOption}-${protocol}` as const;

/** Settings widgets remove pinned item: `settings-widgets-remove-pinned-item-{id}` */
export const settingsWidgetsRemovePinnedItem = (id: string) =>
  `${TestIDs.SettingsWidgets.RemovePinnedItem}-${id}` as const;

/** Settings meal planning day cell: `settings-meal-planning-day-cell-{date}` */
export const settingsMealPlanningDayCell = (date: string) =>
  `${TestIDs.SettingsMealPlanning.DayCell}-${date}` as const;

/** Settings meal planning add meal button: `settings-meal-planning-add-meal-button-{slot}` */
export const settingsMealPlanningAddMealButton = (slot: string) =>
  `${TestIDs.SettingsMealPlanning.AddMealButton}-${slot}` as const;

/** Settings meal planning delete meal button: `settings-meal-planning-delete-meal-button-{id}` */
export const settingsMealPlanningDeleteMealButton = (id: string) =>
  `${TestIDs.SettingsMealPlanning.DeleteMealButton}-${id}` as const;

/** Settings nutrition eating style option: `settings-nutrition-eating-style-option-{style}` */
export const settingsNutritionEatingStyleOption = (style: string) =>
  `${TestIDs.SettingsNutrition.EatingStyleOption}-${style}` as const;

/** Settings nutrition protein priority option: `settings-nutrition-protein-priority-option-{priority}` */
export const settingsNutritionProteinPriorityOption = (priority: string) =>
  `${TestIDs.SettingsNutrition.ProteinPriorityOption}-${priority}` as const;

/** Macro cycling pattern option: `macro-cycling-pattern-option-{pattern}` */
export const macroCyclingPatternOption = (pattern: string) =>
  `${TestIDs.MacroCycling.PatternOption}-${pattern}` as const;

/** Macro cycling day pill: `macro-cycling-day-pill-{day}` */
export const macroCyclingDayPill = (day: number) =>
  `${TestIDs.MacroCycling.DayPill}-${day}` as const;
