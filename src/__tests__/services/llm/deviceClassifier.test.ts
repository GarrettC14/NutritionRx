/**
 * Device Classifier Tests
 * Validates device capability detection and model recommendation logic.
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { classifyDevice } from '@/services/llm/deviceClassifier';

// Cast mocks for type-safe access
const mockGetTotalMemory = DeviceInfo.getTotalMemory as jest.Mock;
const mockSupportedAbis = DeviceInfo.supportedAbis as jest.Mock;
const mockGetModel = DeviceInfo.getModel as jest.Mock;

describe('classifyDevice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: 8GB arm64 iPhone on iOS
    mockGetTotalMemory.mockResolvedValue(8 * 1024 * 1024 * 1024);
    mockSupportedAbis.mockResolvedValue(['arm64-v8a', 'armeabi-v7a']);
    mockGetModel.mockResolvedValue('iPhone14,2');
    (Platform as any).OS = 'ios';
    (Platform as any).Version = '17';
  });

  describe('capabilities detection', () => {
    it('reports correct totalRamMB', async () => {
      mockGetTotalMemory.mockResolvedValue(6 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.capabilities.totalRamMB).toBe(6 * 1024);
    });

    it('detects arm64 from ABIs', async () => {
      mockSupportedAbis.mockResolvedValue(['arm64-v8a']);
      const result = await classifyDevice();
      expect(result.capabilities.isArm64).toBe(true);
    });

    it('detects aarch64 as arm64', async () => {
      mockSupportedAbis.mockResolvedValue(['aarch64']);
      const result = await classifyDevice();
      expect(result.capabilities.isArm64).toBe(true);
    });

    it('detects non-arm64 device', async () => {
      mockSupportedAbis.mockResolvedValue(['x86_64', 'x86']);
      const result = await classifyDevice();
      expect(result.capabilities.isArm64).toBe(false);
    });

    it('parses iOS version on iOS', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).Version = '17';
      const result = await classifyDevice();
      expect(result.capabilities.iosVersion).toBe(17);
    });

    it('returns null iosVersion on Android', async () => {
      (Platform as any).OS = 'android';
      const result = await classifyDevice();
      expect(result.capabilities.iosVersion).toBeNull();
    });

    it('records device model', async () => {
      mockGetModel.mockResolvedValue('Pixel 7');
      const result = await classifyDevice();
      expect(result.capabilities.deviceModel).toBe('Pixel 7');
    });
  });

  describe('Apple Intelligence eligibility', () => {
    it('eligible for iPhone16 on iOS 26+', async () => {
      mockGetModel.mockResolvedValue('iPhone16,1');
      (Platform as any).Version = '26';
      const result = await classifyDevice();
      expect(result.capabilities.isAppleIntelligenceEligible).toBe(true);
      expect(result.maybeAppleFoundation).toBe(true);
    });

    it('eligible for iPhone17 on iOS 26+', async () => {
      mockGetModel.mockResolvedValue('iPhone17,3');
      (Platform as any).Version = '26';
      const result = await classifyDevice();
      expect(result.maybeAppleFoundation).toBe(true);
    });

    it('not eligible for iPhone15 Pro (too old model identifier)', async () => {
      // iPhone 14 Pro = iPhone15,x - not in the eligible list
      mockGetModel.mockResolvedValue('iPhone15,2');
      (Platform as any).Version = '26';
      const result = await classifyDevice();
      expect(result.capabilities.isAppleIntelligenceEligible).toBe(false);
      expect(result.maybeAppleFoundation).toBe(false);
    });

    it('not eligible on iOS < 26', async () => {
      mockGetModel.mockResolvedValue('iPhone16,1');
      (Platform as any).Version = '17';
      const result = await classifyDevice();
      expect(result.capabilities.isAppleIntelligenceEligible).toBe(false);
      expect(result.maybeAppleFoundation).toBe(false);
    });

    it('not eligible on Android', async () => {
      (Platform as any).OS = 'android';
      mockGetModel.mockResolvedValue('iPhone16,1');
      (Platform as any).Version = '26';
      const result = await classifyDevice();
      expect(result.capabilities.isAppleIntelligenceEligible).toBe(false);
      expect(result.maybeAppleFoundation).toBe(false);
    });

    it('eligible for M1+ iPads on iOS 26+', async () => {
      mockGetModel.mockResolvedValue('iPad14,1');
      (Platform as any).Version = '26';
      const result = await classifyDevice();
      expect(result.maybeAppleFoundation).toBe(true);
    });
  });

  describe('model recommendation', () => {
    it('recommends standard model for 8GB+ arm64 device', async () => {
      mockGetTotalMemory.mockResolvedValue(8 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.recommendedModel).not.toBeNull();
      expect(result.recommendedModel!.id).toBe('standard');
    });

    it('recommends standard model for exactly 6GB arm64 device', async () => {
      mockGetTotalMemory.mockResolvedValue(6 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.recommendedModel).not.toBeNull();
      expect(result.recommendedModel!.id).toBe('standard');
    });

    it('recommends compact model for 5GB arm64 device', async () => {
      mockGetTotalMemory.mockResolvedValue(5 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.recommendedModel).not.toBeNull();
      expect(result.recommendedModel!.id).toBe('compact');
    });

    it('recommends compact model for exactly 4GB arm64 device', async () => {
      mockGetTotalMemory.mockResolvedValue(4 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.recommendedModel).not.toBeNull();
      expect(result.recommendedModel!.id).toBe('compact');
    });

    it('recommends minimal model for 3.5GB arm64 device', async () => {
      mockGetTotalMemory.mockResolvedValue(3.5 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.recommendedModel).not.toBeNull();
      expect(result.recommendedModel!.id).toBe('minimal');
    });

    it('recommends minimal model for exactly 3GB arm64 device', async () => {
      mockGetTotalMemory.mockResolvedValue(3 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.recommendedModel).not.toBeNull();
      expect(result.recommendedModel!.id).toBe('minimal');
    });

    it('returns null for device with < 3GB RAM', async () => {
      mockGetTotalMemory.mockResolvedValue(2 * 1024 * 1024 * 1024);
      const result = await classifyDevice();
      expect(result.recommendedModel).toBeNull();
    });

    it('returns null for non-arm64 device even with enough RAM', async () => {
      mockGetTotalMemory.mockResolvedValue(8 * 1024 * 1024 * 1024);
      mockSupportedAbis.mockResolvedValue(['x86_64']);
      const result = await classifyDevice();
      expect(result.recommendedModel).toBeNull();
    });
  });
});
