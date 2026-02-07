/**
 * Device Classifier
 * Classify device capability to determine which LLM provider to use.
 */

import { Platform } from 'react-native';

// Lazy load react-native-device-info — throws at import time in Expo Go
let DeviceInfo: any = null;
try {
  DeviceInfo = require('react-native-device-info').default;
} catch {
  console.log('[DeviceClassifier] react-native-device-info not available');
}

export type DeviceCapability =
  | 'apple_foundation'
  | 'standard'
  | 'compact'
  | 'minimal'
  | 'unsupported';

export interface DeviceClassification {
  capability: DeviceCapability;
  ramGB: number;
  architecture: string;
  model: string;
  isAppleIntelligenceEligible: boolean;
}

const UNSUPPORTED_FALLBACK: DeviceClassification = {
  capability: 'unsupported',
  ramGB: 0,
  architecture: 'unknown',
  model: 'unknown',
  isAppleIntelligenceEligible: false,
};

export async function classifyDevice(): Promise<DeviceClassification> {
  if (!DeviceInfo) return UNSUPPORTED_FALLBACK;

  const totalMemory = await DeviceInfo.getTotalMemory();
  const ramGB = totalMemory / (1024 * 1024 * 1024);
  const abis = await DeviceInfo.supportedAbis();
  const model = await DeviceInfo.getModel();
  const architecture = abis[0] || 'unknown';

  const isAppleIntelligenceEligible = checkAppleIntelligenceEligibility(model);

  // ARM64 required for on-device inference
  const isARM64 = abis.some(
    (abi) => abi.includes('arm64') || abi.includes('aarch64'),
  );

  if (!isARM64) {
    return {
      capability: 'unsupported',
      ramGB,
      architecture,
      model,
      isAppleIntelligenceEligible: false,
    };
  }

  // iOS 26+ with eligible hardware -> Apple Foundation Models
  if (
    Platform.OS === 'ios' &&
    typeof Platform.Version === 'string' &&
    parseInt(Platform.Version, 10) >= 26 &&
    isAppleIntelligenceEligible
  ) {
    return {
      capability: 'apple_foundation',
      ramGB,
      architecture,
      model,
      isAppleIntelligenceEligible,
    };
  }

  // RAM-based tiering for llama.rn
  if (ramGB >= 6)
    return { capability: 'standard', ramGB, architecture, model, isAppleIntelligenceEligible };
  if (ramGB >= 4)
    return { capability: 'compact', ramGB, architecture, model, isAppleIntelligenceEligible };
  if (ramGB >= 3)
    return { capability: 'minimal', ramGB, architecture, model, isAppleIntelligenceEligible };

  return {
    capability: 'unsupported',
    ramGB,
    architecture,
    model,
    isAppleIntelligenceEligible: false,
  };
}

function checkAppleIntelligenceEligibility(model: string): boolean {
  // iPhone 16 family and later (iPhone17,x = iPhone 16 in identifier scheme)
  const iphoneMatch = model.match(/iPhone(\d+)/);
  if (iphoneMatch && parseInt(iphoneMatch[1], 10) >= 17) return true;

  // iPad with M1+ (iPad14,x and later for Pro/Air with M chips)
  const ipadMatch = model.match(/iPad(\d+)/);
  if (ipadMatch && parseInt(ipadMatch[1], 10) >= 14) return true;

  return false;
}
