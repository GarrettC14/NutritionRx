/**
 * Voice Assistant E2E Test Specs (Maestro Format)
 *
 * These specs define end-to-end test scenarios for the voice assistant feature.
 * They are designed to be run with Maestro or similar E2E testing frameworks.
 *
 * Note: Actual Siri/Google Assistant voice testing requires manual testing
 * or specialized voice testing tools. These specs test the deep link handling
 * and UI responses.
 */

export const voiceAssistantE2ESpecs = {
  /**
   * Test: Add water via deep link
   * Simulates: "Hey Siri, add water in NutritionRx"
   */
  addWaterDeepLink: {
    description: 'User adds water via voice command deep link',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://water/add?waterAmount=1' },
      { action: 'waitForElement', selector: 'toast-container' },
      { action: 'assertVisible', text: '+1 Water' },
      { action: 'wait', duration: 2500 },
      { action: 'assertNotVisible', selector: 'toast-container' },
    ],
  },

  /**
   * Test: Add multiple glasses of water
   * Simulates: "Hey Siri, add 3 glasses of water"
   */
  addMultipleWaterDeepLink: {
    description: 'User adds multiple glasses of water via voice',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://water/add?waterAmount=3' },
      { action: 'waitForElement', selector: 'toast-container' },
      { action: 'assertVisible', text: '+3 Water' },
    ],
  },

  /**
   * Test: Quick add calories
   * Simulates: "Hey Siri, quick add 400 calories"
   */
  quickAddCaloriesDeepLink: {
    description: 'User quick adds calories via voice command',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://quickadd?calories=400' },
      { action: 'waitForElement', selector: 'toast-container' },
      { action: 'assertVisible', text: '+400 cal' },
      // Verify meal is auto-detected based on time
      { action: 'assertVisible', textPattern: /(Breakfast|Lunch|Dinner|Snack)/ },
    ],
  },

  /**
   * Test: Quick add with specific meal
   * Simulates: "Hey Siri, quick add 500 calories for dinner"
   */
  quickAddWithMealDeepLink: {
    description: 'User quick adds calories for specific meal via voice',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://quickadd?calories=500&meal=dinner' },
      { action: 'waitForElement', selector: 'toast-container' },
      { action: 'assertVisible', text: '+500 cal' },
      { action: 'assertVisible', text: 'Dinner' },
    ],
  },

  /**
   * Test: Query calories
   * Simulates: "Hey Siri, how many calories today"
   */
  queryCaloriesDeepLink: {
    description: 'User queries calorie count via voice',
    steps: [
      // First add some calories so we have data
      { action: 'openDeepLink', url: 'nutritionrx://quickadd?calories=400' },
      { action: 'wait', duration: 1000 },
      // Then query
      { action: 'openDeepLink', url: 'nutritionrx://query/calories' },
      // Should show or navigate to home with calorie count highlighted
      { action: 'assertVisible', textPattern: /calories/i },
    ],
  },

  /**
   * Test: Query macros
   * Simulates: "Hey Siri, how much protein"
   */
  queryMacrosDeepLink: {
    description: 'User queries protein intake via voice',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://query/macros?queryType=protein' },
      { action: 'assertVisible', textPattern: /protein/i },
    ],
  },

  /**
   * Test: Log weight
   * Simulates: "Hey Siri, log my weight as 175 pounds"
   */
  logWeightDeepLink: {
    description: 'User logs weight via voice command',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://weight/log?weight=175&unit=pounds' },
      { action: 'waitForElement', selector: 'toast-container' },
      { action: 'assertVisible', text: '175 lbs' },
      { action: 'assertVisible', text: 'Weight logged' },
    ],
  },

  /**
   * Test: Log weight in kilograms
   * Simulates: "Hey Siri, log weight 79.5 kilograms"
   */
  logWeightKilogramsDeepLink: {
    description: 'User logs weight in kilograms via voice',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://weight/log?weight=79.5&unit=kilograms' },
      { action: 'waitForElement', selector: 'toast-container' },
      { action: 'assertVisible', text: '79.5 kg' },
    ],
  },

  /**
   * Test: Voice Assistant Settings Screen
   */
  voiceAssistantSettingsNavigation: {
    description: 'User navigates to Voice Assistant settings',
    steps: [
      { action: 'tap', selector: 'tab-settings' },
      { action: 'scrollDown' },
      { action: 'tap', text: 'Voice Assistant' },
      { action: 'assertVisible', text: 'Available Commands' },
      { action: 'assertVisible', text: '"Add water"' },
      { action: 'assertVisible', text: '"Quick add' },
    ],
  },

  /**
   * Test: Voice Assistant settings shows platform-specific info
   */
  voiceAssistantPlatformInfo: {
    description: 'Voice Assistant settings shows correct platform info',
    steps: [
      { action: 'tap', selector: 'tab-settings' },
      { action: 'tap', text: 'Voice Assistant' },
      // On iOS, should show Siri; on Android, should show Google Assistant
      { action: 'assertVisible', textPattern: /(Siri|Google Assistant)/ },
    ],
  },

  /**
   * Test: Haptic feedback toggle
   */
  hapticFeedbackToggle: {
    description: 'User can toggle haptic feedback in voice settings',
    steps: [
      { action: 'tap', selector: 'tab-settings' },
      { action: 'tap', text: 'Voice Assistant' },
      { action: 'scrollDown' },
      { action: 'assertVisible', text: 'Haptic Feedback' },
      { action: 'tap', selector: 'haptic-toggle' },
      // Toggle should change state
    ],
  },

  /**
   * Test: Toast auto-dismisses
   */
  toastAutoDismiss: {
    description: 'Toast notification auto-dismisses after 2 seconds',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://water/add?waterAmount=1' },
      { action: 'waitForElement', selector: 'toast-container' },
      { action: 'assertVisible', text: '+1 Water' },
      { action: 'wait', duration: 2500 },
      { action: 'assertNotVisible', selector: 'toast-container' },
    ],
  },

  /**
   * Test: Error handling - invalid calories
   */
  invalidCaloriesError: {
    description: 'App handles invalid calorie amount gracefully',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://quickadd?calories=invalid' },
      // Should not show success toast, might show error or navigate to quick add screen
      { action: 'assertNotVisible', text: '+invalid cal' },
    ],
  },

  /**
   * Test: Error handling - invalid weight
   */
  invalidWeightError: {
    description: 'App handles invalid weight gracefully',
    steps: [
      { action: 'openDeepLink', url: 'nutritionrx://weight/log?weight=invalid' },
      // Should not crash, might navigate to weight entry screen
      { action: 'assertNotVisible', text: 'Weight logged' },
    ],
  },

  /**
   * Test: Water count updates in UI
   */
  waterCountUpdatesAfterVoice: {
    description: 'Water count in UI updates after voice command',
    steps: [
      // Navigate to home
      { action: 'tap', selector: 'tab-home' },
      // Get initial water count
      { action: 'recordValue', selector: 'water-count', as: 'initialCount' },
      // Add water via voice
      { action: 'openDeepLink', url: 'nutritionrx://water/add?waterAmount=1' },
      { action: 'wait', duration: 1000 },
      // Water count should have increased
      { action: 'assertValueIncreased', selector: 'water-count', comparedTo: 'initialCount' },
    ],
  },

  /**
   * Test: Quick add appears in food log
   */
  quickAddAppearsInFoodLog: {
    description: 'Quick add entry appears in food log after voice command',
    steps: [
      // Add via voice
      { action: 'openDeepLink', url: 'nutritionrx://quickadd?calories=350&meal=lunch' },
      { action: 'wait', duration: 1000 },
      // Navigate to food log
      { action: 'tap', selector: 'tab-home' },
      // Should see the entry
      { action: 'assertVisible', text: '350' },
    ],
  },

  /**
   * Test: Weight entry appears in progress
   */
  weightAppearsInProgress: {
    description: 'Weight entry appears in progress after voice command',
    steps: [
      // Log weight via voice
      { action: 'openDeepLink', url: 'nutritionrx://weight/log?weight=175&unit=pounds' },
      { action: 'wait', duration: 1000 },
      // Navigate to progress
      { action: 'tap', selector: 'tab-progress' },
      // Should see the weight entry
      { action: 'assertVisible', text: '175' },
    ],
  },
};

/**
 * Voice Response Quality Tests
 * These verify that voice responses follow the "Nourished Calm" design philosophy
 */
export const voiceResponseQualityTests = {
  /**
   * Verify responses don't contain judgmental language
   */
  noJudgmentalLanguage: {
    description: 'Voice responses do not contain judgmental language',
    forbiddenPatterns: [
      /great job/i,
      /good job/i,
      /excellent/i,
      /awesome/i,
      /too much/i,
      /too little/i,
      /only \d+/i, // "only 500 calories" is judgmental
      /wow/i,
      /amazing/i,
      /you should/i,
      /you need to/i,
      /on track/i,
      /off track/i,
      /behind/i,
      /ahead/i,
    ],
    responsesToCheck: [
      "Added water. You've had 5 of 8 today.",
      "400 calories added to lunch.",
      "You've had 1,450 calories today.",
      "You've had 85 grams of protein.",
      "Weight logged: 175 pounds.",
    ],
  },

  /**
   * Verify responses are concise
   */
  conciseResponses: {
    description: 'Voice responses are concise (under 50 characters)',
    maxLength: 50,
    responsesToCheck: [
      "Added water. You've had 5 of 8 today.",
      "400 calories added to lunch.",
      "You've had 1,450 calories today.",
    ],
  },

  /**
   * Verify responses are informative
   */
  informativeResponses: {
    description: 'Voice responses contain relevant information',
    requiredInfo: {
      water: ['added', 'glasses', 'today'],
      quickAdd: ['calories', 'added'],
      calorieQuery: ['had', 'calories', 'today'],
      macroQuery: ['had', 'grams'],
      weight: ['logged', 'pounds|kilograms'],
    },
  },
};
