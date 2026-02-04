// Mock for react-native-device-info
const DeviceInfo = {
  getTotalMemory: jest.fn().mockResolvedValue(8 * 1024 * 1024 * 1024), // 8 GB default
  supportedAbis: jest.fn().mockResolvedValue(['arm64-v8a', 'armeabi-v7a']),
  getModel: jest.fn().mockResolvedValue('iPhone14,2'), // iPhone 13 Pro
  getSystemVersion: jest.fn().mockResolvedValue('17.0'),
  getBrand: jest.fn().mockResolvedValue('Apple'),
  getDeviceId: jest.fn().mockResolvedValue('iPhone14,2'),
  getUniqueId: jest.fn().mockResolvedValue('test-device-id'),
  isEmulator: jest.fn().mockResolvedValue(false),
};

export default DeviceInfo;
