// We need to control Platform.OS across fresh module loads.
// The moduleNameMapper maps 'react-native' to src/__mocks__/react-native.ts,
// but jest.mock takes precedence over moduleNameMapper, so we can override it here.
// We use a shared mutable object so that even after jest.resetModules(),
// newly required copies of 'react-native' still read from our controlled state.

const platformState = { OS: 'ios' as string };

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return platformState.OS;
    },
    select: jest.fn((options: Record<string, any>) => options[platformState.OS] ?? options.default),
  },
  StyleSheet: { create: jest.fn((s: any) => s) },
}));

jest.mock('@/services/healthkit/healthSyncAdapter', () => ({
  createHealthKitSyncAdapter: jest.fn(),
}));

jest.mock('@/services/healthconnect/healthSyncAdapter', () => ({
  createHealthConnectSyncAdapter: jest.fn(),
}));

function makeFakeAdapter(platformName: 'apple_health' | 'health_connect') {
  return {
    isAvailable: jest.fn().mockResolvedValue(true),
    connect: jest.fn().mockResolvedValue({ granted: [], denied: [] }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(false),
    writeNutrition: jest.fn().mockResolvedValue({ success: true }),
    writeWeight: jest.fn().mockResolvedValue({ success: true }),
    writeWater: jest.fn().mockResolvedValue({ success: true }),
    readWeightChanges: jest.fn().mockResolvedValue([]),
    readActiveCalories: jest.fn().mockResolvedValue(0),
    readSteps: jest.fn().mockResolvedValue(0),
    getLastSyncTime: jest.fn().mockResolvedValue(null),
    getPlatformName: jest.fn().mockReturnValue(platformName),
  };
}

/**
 * Resets the module registry, sets Platform.OS via our shared state,
 * configures adapter mock return values, then requires the service fresh.
 */
function loadServiceWithPlatform(
  platform: string,
  healthKitAdapter?: ReturnType<typeof makeFakeAdapter>,
  healthConnectAdapter?: ReturnType<typeof makeFakeAdapter>,
) {
  jest.resetModules();
  platformState.OS = platform;

  // After resetModules, re-require the mocked adapter modules to get fresh mock fns
  const { createHealthKitSyncAdapter } = require('@/services/healthkit/healthSyncAdapter');
  const { createHealthConnectSyncAdapter } = require('@/services/healthconnect/healthSyncAdapter');

  if (healthKitAdapter) {
    createHealthKitSyncAdapter.mockReturnValue(healthKitAdapter);
  }
  if (healthConnectAdapter) {
    createHealthConnectSyncAdapter.mockReturnValue(healthConnectAdapter);
  }

  const { getHealthSyncService } = require('@/services/healthSyncService');

  return {
    getHealthSyncService,
    createHealthKitSyncAdapter,
    createHealthConnectSyncAdapter,
  };
}

describe('healthSyncService', () => {
  afterEach(() => {
    platformState.OS = 'ios';
  });

  // ---------- iOS Platform ----------

  describe('iOS platform', () => {
    it('returns HealthKit adapter when Platform.OS is ios', () => {
      const fakeAdapter = makeFakeAdapter('apple_health');
      const { getHealthSyncService, createHealthKitSyncAdapter, createHealthConnectSyncAdapter } =
        loadServiceWithPlatform('ios', fakeAdapter);

      const service = getHealthSyncService();

      expect(service).toBe(fakeAdapter);
      expect(createHealthKitSyncAdapter).toHaveBeenCalledTimes(1);
      expect(createHealthConnectSyncAdapter).not.toHaveBeenCalled();
    });

    it('HealthKit adapter has correct platform name', () => {
      const fakeAdapter = makeFakeAdapter('apple_health');
      const { getHealthSyncService } = loadServiceWithPlatform('ios', fakeAdapter);

      const service = getHealthSyncService();

      expect(service).not.toBeNull();
      expect(service!.getPlatformName()).toBe('apple_health');
    });
  });

  // ---------- Android Platform ----------

  describe('Android platform', () => {
    it('returns Health Connect adapter when Platform.OS is android', () => {
      const fakeAdapter = makeFakeAdapter('health_connect');
      const { getHealthSyncService, createHealthKitSyncAdapter, createHealthConnectSyncAdapter } =
        loadServiceWithPlatform('android', undefined, fakeAdapter);

      const service = getHealthSyncService();

      expect(service).toBe(fakeAdapter);
      expect(createHealthConnectSyncAdapter).toHaveBeenCalledTimes(1);
      expect(createHealthKitSyncAdapter).not.toHaveBeenCalled();
    });

    it('Health Connect adapter has correct platform name', () => {
      const fakeAdapter = makeFakeAdapter('health_connect');
      const { getHealthSyncService } = loadServiceWithPlatform('android', undefined, fakeAdapter);

      const service = getHealthSyncService();

      expect(service).not.toBeNull();
      expect(service!.getPlatformName()).toBe('health_connect');
    });
  });

  // ---------- Unsupported Platform ----------

  describe('unsupported platform', () => {
    it('returns null when Platform.OS is web', () => {
      const { getHealthSyncService, createHealthKitSyncAdapter, createHealthConnectSyncAdapter } =
        loadServiceWithPlatform('web');

      const service = getHealthSyncService();

      expect(service).toBeNull();
      expect(createHealthKitSyncAdapter).not.toHaveBeenCalled();
      expect(createHealthConnectSyncAdapter).not.toHaveBeenCalled();
    });

    it('returns null when Platform.OS is windows', () => {
      const { getHealthSyncService } = loadServiceWithPlatform('windows');

      const service = getHealthSyncService();

      expect(service).toBeNull();
    });

    it('returns null on repeated calls for unsupported platform', () => {
      const { getHealthSyncService } = loadServiceWithPlatform('web');

      const first = getHealthSyncService();
      const second = getHealthSyncService();

      expect(first).toBeNull();
      expect(second).toBeNull();
    });
  });

  // ---------- Singleton Caching ----------

  describe('singleton caching', () => {
    it('returns the same instance on second call without re-creating adapter', () => {
      const fakeAdapter = makeFakeAdapter('apple_health');
      const { getHealthSyncService, createHealthKitSyncAdapter } =
        loadServiceWithPlatform('ios', fakeAdapter);

      const first = getHealthSyncService();
      const second = getHealthSyncService();

      expect(first).toBe(second);
      expect(first).toBe(fakeAdapter);
      // Factory called only once -- singleton cache prevents re-creation
      expect(createHealthKitSyncAdapter).toHaveBeenCalledTimes(1);
    });

    it('caches android adapter on subsequent calls', () => {
      const fakeAdapter = makeFakeAdapter('health_connect');
      const { getHealthSyncService, createHealthConnectSyncAdapter } =
        loadServiceWithPlatform('android', undefined, fakeAdapter);

      const first = getHealthSyncService();
      const second = getHealthSyncService();
      const third = getHealthSyncService();

      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(createHealthConnectSyncAdapter).toHaveBeenCalledTimes(1);
    });

    it('fresh module load produces a new instance (singleton is per-module-load)', () => {
      const fakeAdapter1 = makeFakeAdapter('apple_health');
      const { getHealthSyncService: getService1 } = loadServiceWithPlatform('ios', fakeAdapter1);
      const firstService = getService1();

      const fakeAdapter2 = makeFakeAdapter('apple_health');
      const { getHealthSyncService: getService2 } = loadServiceWithPlatform('ios', fakeAdapter2);
      const secondService = getService2();

      expect(firstService).toBe(fakeAdapter1);
      expect(secondService).toBe(fakeAdapter2);
      expect(firstService).not.toBe(secondService);
    });
  });

  // ---------- Module Exports ----------

  describe('module exports', () => {
    it('exports getHealthSyncService as a function', () => {
      const { getHealthSyncService } = loadServiceWithPlatform('ios');
      expect(typeof getHealthSyncService).toBe('function');
    });
  });
});
