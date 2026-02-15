/**
 * Tests for src/services/llm/deviceClassifier.ts
 *
 * Validates device classification logic including ARM64 checks,
 * Apple Intelligence eligibility, and RAM-based tiering.
 */

const mockDeviceInfo = {
  getTotalMemory: jest.fn(),
  supportedAbis: jest.fn(),
  getModel: jest.fn(),
};

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: mockDeviceInfo,
}));

// We need to control Platform.OS and Platform.Version per-test.
// The global react-native mock (from moduleNameMapper) provides Platform.
// We import and mutate it directly.
import { Platform } from 'react-native';

describe('deviceClassifier', () => {
  // Helper to set up device info mocks
  function setupDeviceMocks(opts: {
    ramGB: number;
    abis?: string[];
    model?: string;
  }) {
    const ramBytes = opts.ramGB * 1024 * 1024 * 1024;
    mockDeviceInfo.getTotalMemory.mockResolvedValue(ramBytes);
    mockDeviceInfo.supportedAbis.mockResolvedValue(opts.abis ?? ['arm64-v8a']);
    mockDeviceInfo.getModel.mockResolvedValue(opts.model ?? 'iPhone15,2');
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to defaults
    (Platform as any).OS = 'ios';
    (Platform as any).Version = '17.0';
  });

  describe('classifyDevice', () => {
    it('returns unsupported fallback when DeviceInfo is unavailable', async () => {
      // To simulate DeviceInfo being null, we need to re-require the module
      // after changing the mock to throw on require.
      jest.resetModules();

      // Re-mock device-info to throw (simulating it not being available).
      // Use jest.doMock to avoid hoisting issues with jest.resetModules.
      jest.doMock('react-native-device-info', () => {
        throw new Error('Module not found');
      });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result).toEqual({
        capability: 'unsupported',
        ramGB: 0,
        architecture: 'unknown',
        model: 'unknown',
        isAppleIntelligenceEligible: false,
      });
    });

    it('returns unsupported when architecture is not ARM64', async () => {
      // Re-require to get fresh module with working DeviceInfo
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      setupDeviceMocks({ ramGB: 8, abis: ['x86_64'], model: 'Pixel 7' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.capability).toBe('unsupported');
      expect(result.architecture).toBe('x86_64');
      expect(result.isAppleIntelligenceEligible).toBe(false);
    });

    it('returns apple_foundation for iOS 26+ with iPhone17+ model and arm64', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      // Must set Platform before requiring module since module reads Platform at call time
      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '26.0';

      setupDeviceMocks({ ramGB: 8, abis: ['arm64'], model: 'iPhone17,1' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.capability).toBe('apple_foundation');
      expect(result.isAppleIntelligenceEligible).toBe(true);
    });

    it('returns standard for 8GB RAM ARM64 device', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '17.0';

      setupDeviceMocks({ ramGB: 8, abis: ['arm64'], model: 'iPhone15,2' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.capability).toBe('standard');
      expect(result.ramGB).toBe(8);
    });

    it('returns compact for 5GB RAM ARM64 device', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '17.0';

      setupDeviceMocks({ ramGB: 5, abis: ['arm64'], model: 'iPhone15,2' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.capability).toBe('compact');
      expect(result.ramGB).toBe(5);
    });

    it('returns minimal for 3.5GB RAM ARM64 device', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '17.0';

      setupDeviceMocks({ ramGB: 3.5, abis: ['arm64'], model: 'iPhone15,2' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.capability).toBe('minimal');
      expect(result.ramGB).toBe(3.5);
    });

    it('returns unsupported for 2GB RAM ARM64 device', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '17.0';

      setupDeviceMocks({ ramGB: 2, abis: ['arm64'], model: 'iPhone15,2' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.capability).toBe('unsupported');
      expect(result.ramGB).toBe(2);
    });
  });

  describe('checkAppleIntelligenceEligibility (via classifyDevice)', () => {
    // Since checkAppleIntelligenceEligibility is not exported, we test it
    // indirectly through classifyDevice's isAppleIntelligenceEligible field.

    it('returns true for iPhone17,1', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '17.0';

      setupDeviceMocks({ ramGB: 8, abis: ['arm64'], model: 'iPhone17,1' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.isAppleIntelligenceEligible).toBe(true);
    });

    it('returns false for iPhone16,1', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '17.0';

      setupDeviceMocks({ ramGB: 8, abis: ['arm64'], model: 'iPhone16,1' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.isAppleIntelligenceEligible).toBe(false);
    });

    it('returns true for iPad14,1', async () => {
      jest.resetModules();
      jest.mock('react-native-device-info', () => ({
        __esModule: true,
        default: mockDeviceInfo,
      }));

      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';
      reactNative.Platform.Version = '17.0';

      setupDeviceMocks({ ramGB: 8, abis: ['arm64'], model: 'iPad14,1' });

      const { classifyDevice } = require('../../../services/llm/deviceClassifier');
      const result = await classifyDevice();

      expect(result.isAppleIntelligenceEligible).toBe(true);
    });
  });
});
