/**
 * Expo Config Plugin for Android Widgets (Jetpack Glance)
 * Adds NutritionRx widgets to the Android build
 */

const { withAndroidManifest, withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const WIDGET_PACKAGE = 'com.nutritionrx.app.widget';
const SHARED_PREFS_NAME = 'nutritionrx_widget_data';

/**
 * Add Glance dependencies to app/build.gradle
 */
function withGlanceDependencies(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Check if Glance is already added
    if (buildGradle.includes('androidx.glance')) {
      return config;
    }

    // Add Compose and Glance dependencies
    const dependenciesBlock = `
    // Jetpack Glance for Widgets
    implementation "androidx.glance:glance:1.1.0"
    implementation "androidx.glance:glance-appwidget:1.1.0"
    implementation "androidx.glance:glance-material3:1.1.0"
`;

    // Find the dependencies block and add our dependencies
    const dependenciesMatch = buildGradle.match(/dependencies\s*\{/);
    if (dependenciesMatch) {
      const insertIndex = dependenciesMatch.index + dependenciesMatch[0].length;
      config.modResults.contents =
        buildGradle.slice(0, insertIndex) +
        dependenciesBlock +
        buildGradle.slice(insertIndex);
    }

    return config;
  });
}

/**
 * Add widget receivers to AndroidManifest.xml
 */
function withWidgetReceivers(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];

    if (!mainApplication) {
      return config;
    }

    // Initialize receivers array if it doesn't exist
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    // Today Summary Widget Receiver
    const todaySummaryReceiver = {
      $: {
        'android:name': `${WIDGET_PACKAGE}.TodaySummaryWidgetReceiver`,
        'android:exported': 'true',
        'android:label': 'Today Summary',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/today_summary_widget_info',
          },
        },
      ],
    };

    // Water Tracking Widget Receiver
    const waterTrackingReceiver = {
      $: {
        'android:name': `${WIDGET_PACKAGE}.WaterTrackingWidgetReceiver`,
        'android:exported': 'true',
        'android:label': 'Water Tracking',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/water_tracking_widget_info',
          },
        },
      ],
    };

    // Quick Add Widget Receiver
    const quickAddReceiver = {
      $: {
        'android:name': `${WIDGET_PACKAGE}.QuickAddWidgetReceiver`,
        'android:exported': 'true',
        'android:label': 'Quick Add',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/quick_add_widget_info',
          },
        },
      ],
    };

    // Launch Activity for widget clicks
    const launchActivity = {
      $: {
        'android:name': `${WIDGET_PACKAGE}.LaunchActivity`,
        'android:exported': 'true',
        'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
      },
    };

    // Check if receivers already exist
    const existingReceivers = mainApplication.receiver.map((r) => r.$?.['android:name']);

    if (!existingReceivers.includes(`${WIDGET_PACKAGE}.TodaySummaryWidgetReceiver`)) {
      mainApplication.receiver.push(todaySummaryReceiver);
    }

    if (!existingReceivers.includes(`${WIDGET_PACKAGE}.WaterTrackingWidgetReceiver`)) {
      mainApplication.receiver.push(waterTrackingReceiver);
    }

    if (!existingReceivers.includes(`${WIDGET_PACKAGE}.QuickAddWidgetReceiver`)) {
      mainApplication.receiver.push(quickAddReceiver);
    }

    // Add launch activity if it doesn't exist
    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }

    const existingActivities = mainApplication.activity.map((a) => a.$?.['android:name']);
    if (!existingActivities.includes(`${WIDGET_PACKAGE}.LaunchActivity`)) {
      mainApplication.activity.push(launchActivity);
    }

    return config;
  });
}

/**
 * Copy widget source files to the Android project
 */
function copyWidgetFiles(config) {
  return config;
}

/**
 * Main plugin
 */
function withAndroidWidget(config) {
  config = withGlanceDependencies(config);
  config = withWidgetReceivers(config);
  return config;
}

module.exports = withAndroidWidget;
