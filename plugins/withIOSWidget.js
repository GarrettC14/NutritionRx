/**
 * Expo Config Plugin for iOS Widget Extension
 * Adds NutritionRx widget extension to the iOS build
 */

const { withXcodeProject, withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP_IDENTIFIER = 'group.com.nutritionrx.app';
const WIDGET_EXTENSION_NAME = 'NutritionRxWidget';
const WIDGET_BUNDLE_ID_SUFFIX = '.widget';

/**
 * Add App Groups entitlement to main app
 */
function withAppGroups(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP_IDENTIFIER];
    return config;
  });
}

/**
 * Add widget extension to Xcode project
 */
function withWidgetExtension(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const bundleIdentifier = config.ios?.bundleIdentifier || 'com.nutritionrx.app';
    const widgetBundleId = `${bundleIdentifier}${WIDGET_BUNDLE_ID_SUFFIX}`;

    // Get the project root
    const projectRoot = config.modRequest.projectRoot;
    const widgetSourcePath = path.join(projectRoot, 'widgets', 'ios', WIDGET_EXTENSION_NAME);
    const iosPath = path.join(projectRoot, 'ios');
    const widgetTargetPath = path.join(iosPath, WIDGET_EXTENSION_NAME);

    // Copy widget files if they exist
    if (fs.existsSync(widgetSourcePath)) {
      copyFolderRecursive(widgetSourcePath, widgetTargetPath);
    }

    // Create Info.plist for widget
    const widgetInfoPlist = createWidgetInfoPlist(bundleIdentifier);
    const infoPlistPath = path.join(widgetTargetPath, 'Info.plist');
    fs.writeFileSync(infoPlistPath, widgetInfoPlist);

    // Create entitlements for widget
    const widgetEntitlements = createWidgetEntitlements();
    const entitlementsPath = path.join(widgetTargetPath, `${WIDGET_EXTENSION_NAME}.entitlements`);
    fs.writeFileSync(entitlementsPath, widgetEntitlements);

    // Add widget target to Xcode project
    const widgetTarget = xcodeProject.addTarget(
      WIDGET_EXTENSION_NAME,
      'app_extension',
      WIDGET_EXTENSION_NAME,
      widgetBundleId
    );

    // Add source files to widget target
    const widgetGroup = xcodeProject.addPbxGroup(
      [
        'NutritionRxWidgetBundle.swift',
        'WidgetData.swift',
        'TodaySummaryWidget.swift',
        'WaterTrackingWidget.swift',
        'QuickAddWidget.swift',
        'Info.plist',
        `${WIDGET_EXTENSION_NAME}.entitlements`,
      ],
      WIDGET_EXTENSION_NAME,
      WIDGET_EXTENSION_NAME
    );

    // Get the main group
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroup);

    // Add Swift files to build phase
    const swiftFiles = [
      'NutritionRxWidgetBundle.swift',
      'WidgetData.swift',
      'TodaySummaryWidget.swift',
      'WaterTrackingWidget.swift',
      'QuickAddWidget.swift',
    ];

    for (const file of swiftFiles) {
      xcodeProject.addSourceFile(
        `${WIDGET_EXTENSION_NAME}/${file}`,
        { target: widgetTarget.uuid },
        widgetGroup.uuid
      );
    }

    // Configure widget target build settings
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
        const buildSettings = configurations[key].buildSettings;
        if (buildSettings.PRODUCT_NAME === `"${WIDGET_EXTENSION_NAME}"`) {
          buildSettings.SWIFT_VERSION = '5.0';
          buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
          buildSettings.INFOPLIST_FILE = `${WIDGET_EXTENSION_NAME}/Info.plist`;
          buildSettings.CODE_SIGN_ENTITLEMENTS = `${WIDGET_EXTENSION_NAME}/${WIDGET_EXTENSION_NAME}.entitlements`;
          buildSettings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = 'WidgetBackground';
          buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = 'AccentColor';
        }
      }
    }

    // Add widget to app's embed extensions build phase
    xcodeProject.addBuildPhase(
      [],
      'PBXCopyFilesBuildPhase',
      'Embed App Extensions',
      xcodeProject.getFirstTarget().uuid,
      'app_extension'
    );

    return config;
  });
}

/**
 * Helper: Copy folder recursively
 */
function copyFolderRecursive(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyFolderRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * Create Info.plist for widget extension
 */
function createWidgetInfoPlist(bundleIdentifier) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>NutritionRx</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
}

/**
 * Create entitlements for widget extension
 */
function createWidgetEntitlements() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP_IDENTIFIER}</string>
  </array>
</dict>
</plist>`;
}

/**
 * Main plugin
 */
function withIOSWidget(config) {
  config = withAppGroups(config);
  config = withWidgetExtension(config);
  return config;
}

module.exports = withIOSWidget;
