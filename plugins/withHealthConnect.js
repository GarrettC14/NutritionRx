/**
 * Expo Config Plugin for Health Connect
 * Adds necessary Android manifest configurations for Health Connect integration
 */

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withHealthConnect(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Find MainActivity
    const mainActivity = mainApplication.activity?.find(
      (activity) => activity.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      // Initialize intent-filter array if it doesn't exist
      if (!mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = [];
      }

      // Check if Health Connect intent filter already exists
      const hasHealthConnectFilter = mainActivity['intent-filter'].some(
        (filter) =>
          filter.action?.some(
            (action) =>
              action.$['android:name'] === 'android.intent.action.VIEW_PERMISSION_USAGE'
          )
      );

      // Add intent filter for Health Connect permissions rationale if not present
      if (!hasHealthConnectFilter) {
        mainActivity['intent-filter'].push({
          action: [
            {
              $: {
                'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE',
              },
            },
          ],
          category: [
            {
              $: {
                'android:name': 'android.intent.category.HEALTH_PERMISSIONS',
              },
            },
          ],
        });
      }
    }

    // Add Health Connect permissions to manifest if not present
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    const healthConnectPermissions = [
      'android.permission.health.READ_NUTRITION',
      'android.permission.health.WRITE_NUTRITION',
      'android.permission.health.READ_HYDRATION',
      'android.permission.health.WRITE_HYDRATION',
      'android.permission.health.READ_WEIGHT',
      'android.permission.health.WRITE_WEIGHT',
      'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
      'android.permission.health.READ_TOTAL_CALORIES_BURNED',
    ];

    healthConnectPermissions.forEach((permission) => {
      const hasPermission = androidManifest.manifest['uses-permission'].some(
        (p) => p.$['android:name'] === permission
      );
      if (!hasPermission) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });
};
